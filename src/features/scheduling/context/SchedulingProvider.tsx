'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createSchedulingRepository } from '../data/repositoryFactory';
import { ApiSchedulingRepository } from '../data/apiRepository';
import type { SchedulingRepository, SchedulingSnapshot } from '../domain/repository';
import type {
  DoctorWeeklySchedule,
  DoctorAvailabilityTemplate,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';
import type { SchedulingResult, SlotBatchInput, SlotInput } from '../domain/rules';

interface SchedulingContextValue extends SchedulingSnapshot {
  isLoading: boolean;
  refresh(): Promise<void>;
  saveDepartment(
    input: Omit<ScheduleDepartment, 'id' | 'isActive'>,
    id?: string,
  ): Promise<SchedulingResult<ScheduleDepartment>>;
  toggleDepartment(id: string): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>>;
  saveService(
    input: Omit<ScheduleService, 'id' | 'isActive'>,
    id?: string,
  ): Promise<SchedulingResult<ScheduleService>>;
  toggleService(id: string): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>>;
  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): Promise<SchedulingResult<ScheduleDoctor>>;
  toggleDoctor(id: string): Promise<SchedulingResult<ScheduleDoctor | 'deleted'>>;
  saveDoctorLeave(input: DoctorLeaveInput, id?: string, actorId?: string, role?: UserRole): Promise<SchedulingResult<DoctorLeave>>;
  deleteDoctorLeave(id: string, actorId?: string, role?: UserRole): Promise<SchedulingResult<DoctorLeave>>;
  saveSlot(
    input: SlotInput,
    id?: string,
    todayDate?: string,
  ): Promise<SchedulingResult<ScheduleSlot>> | SchedulingResult<ScheduleSlot>;
  createSlotBatch(
    input: SlotBatchInput,
    todayDate?: string,
    actorId?: string,
    role?: UserRole,
  ): Promise<SchedulingResult<number>> | SchedulingResult<number>;
  toggleSlot(
    id: string,
    actorId?: string,
    role?: UserRole,
  ): Promise<SchedulingResult<ScheduleSlot>> | SchedulingResult<ScheduleSlot>;
  saveWeeklySchedule(
    input: Omit<DoctorWeeklySchedule, 'id'>,
    id?: string,
  ): SchedulingResult<DoctorWeeklySchedule>;
  generateSlotsForRange(
    startDate: string,
    endDate: string,
    today: string,
    serviceId?: string,
  ): Promise<SchedulingResult<number>> | SchedulingResult<number>;
  getDoctorTemplates(doctorId: string): DoctorAvailabilityTemplate[];
  saveDoctorTemplate(
    input: Omit<DoctorAvailabilityTemplate, 'id' | 'usageCount' | 'lastUsedAt'>,
  ): SchedulingResult<DoctorAvailabilityTemplate>;
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null);

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const dbRepo = useMemo(() => new ApiSchedulingRepository(), []);

  const [repository] = useState<SchedulingRepository>(() => createSchedulingRepository());
  const [snapshot, setSnapshot] = useState<SchedulingSnapshot>(() => {
    // When Supabase is configured, initialize empty so mock data never appears in real database mode
    if (typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return {
        departments: [],
        doctors: [],
        services: [],
        dailyServiceOfferings: [],
        slots: [],
        doctorLeaves: [],
        weeklySchedules: [],
        doctorAccounts: [],
      };
    }
    return repository.snapshot();
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!dbRepo) return;
    const results = await Promise.allSettled([
      dbRepo.fetchDepartments(),
      dbRepo.fetchDoctors(),
      dbRepo.fetchServices(),
      dbRepo.fetchDailyServiceOfferings(),
      dbRepo.fetchDoctorAccounts(),
      dbRepo.fetchSlots(),
      dbRepo.fetchDoctorLeaves(),
    ]);

    const read = <T,>(result: PromiseSettledResult<T>, fallback: T, resource: string): T => {
      if (result.status === 'fulfilled') return result.value;
      console.warn(`SchedulingProvider ${resource} load error:`, result.reason);
      return fallback;
    };

    setSnapshot((current) => ({
      departments: read(results[0], current.departments, 'departments'),
      doctors: read(results[1], current.doctors, 'doctors'),
      services: read(results[2], current.services, 'services'),
      dailyServiceOfferings: read(results[3], current.dailyServiceOfferings, 'daily service offerings'),
      doctorAccounts: read(results[4], current.doctorAccounts, 'doctor accounts'),
      slots: read(results[5], current.slots, 'slots'),
      doctorLeaves: read(results[6], current.doctorLeaves, 'doctor leaves'),
      weeklySchedules: current.weeklySchedules,
    }));
  }, [dbRepo]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      await refresh();
      if (isMounted) setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!dbRepo) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [dbRepo, refresh]);

  const run = useCallback(
    <T,>(command: () => SchedulingResult<T>) => {
      const result = command();
      if (result.ok) setSnapshot(repository.snapshot());
      return result;
    },
    [repository],
  );

  const handleSaveDepartment = useCallback(
    async (
      input: Omit<ScheduleDepartment, 'id' | 'isActive'>,
      id?: string,
    ): Promise<SchedulingResult<ScheduleDepartment>> => {
      const isDbId = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : true;
      if (dbRepo) {
        if (!isDbId) {
          return { ok: false, error: 'รหัสแผนกไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        try {
          const result = await dbRepo.saveDepartment(input, snapshot.departments, id);
          if (result.ok) {
            await refresh();
          }
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกแผนก' };
        }
      }
      return run(() => repository.saveDepartment(input, id));
    },
    [dbRepo, refresh, repository, run, snapshot.departments],
  );

  const handleToggleDepartment = useCallback(
    async (id: string): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> => {
      const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (dbRepo) {
        if (!isDbId) {
          return { ok: false, error: 'รหัสแผนกไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        const target = snapshot.departments.find((d) => d.id === id);
        if (target) {
          try {
            const result = await dbRepo.toggleDepartment(id, target.isActive);
            if (result.ok) {
              await refresh();
            }
            return result;
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะแผนก' };
          }
        }
        return { ok: false, error: 'ไม่พบแผนกที่ต้องการแก้ไข' };
      }
      return run(() => repository.toggleDepartment(id));
    },
    [dbRepo, refresh, repository, run, snapshot.departments],
  );

  const handleSaveDoctor = useCallback(
    async (
      input: Omit<ScheduleDoctor, 'id'>,
      id?: string,
    ): Promise<SchedulingResult<ScheduleDoctor>> => {
      const isDbId = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : true;
      if (dbRepo) {
        if (!isDbId) {
          return { ok: false, error: 'รหัสแพทย์ไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        try {
          const result = await dbRepo.saveDoctor(input, snapshot.doctors, id);
          if (result.ok) {
            await refresh();
          }
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลแพทย์' };
        }
      }
      return run(() => repository.saveDoctor(input, id));
    },
    [dbRepo, refresh, repository, run, snapshot.doctors],
  );

  const handleSaveService = useCallback(
    async (
      input: Omit<ScheduleService, 'id' | 'isActive'>,
      id?: string,
    ): Promise<SchedulingResult<ScheduleService>> => {
      const isDbId = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : true;
      if (dbRepo) {
        if (!isDbId) return { ok: false, error: 'รหัสบริการไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        try {
          const result = await dbRepo.saveService(input, snapshot.services, id);
          if (result.ok) await refresh();
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกบริการ' };
        }
      }
      return run(() => repository.saveService(input, id));
    },
    [dbRepo, refresh, repository, run, snapshot.services],
  );

  const handleToggleService = useCallback(
    async (id: string): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> => {
      const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (dbRepo) {
        if (!isDbId) return { ok: false, error: 'รหัสบริการไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        const target = snapshot.services.find((service) => service.id === id);
        if (!target) return { ok: false, error: 'ไม่พบบริการที่ต้องการแก้ไข' };
        try {
          const result = await dbRepo.toggleService(id, target.isActive);
          if (result.ok) await refresh();
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะบริการ' };
        }
      }
      return run(() => repository.toggleService(id));
    },
    [dbRepo, refresh, repository, run, snapshot.services],
  );

  const handleToggleDoctor = useCallback(
    async (id: string): Promise<SchedulingResult<ScheduleDoctor | 'deleted'>> => {
      const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (dbRepo) {
        if (!isDbId) {
          return { ok: false, error: 'รหัสแพทย์ไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        const target = snapshot.doctors.find((d) => d.id === id);
        if (target) {
          try {
            const result = await dbRepo.toggleDoctor(id, target.availability);
            if (result.ok) {
              await refresh();
            }
            return result;
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะแพทย์' };
          }
        }
        return { ok: false, error: 'ไม่พบแพทย์ที่ต้องการแก้ไข' };
      }
      return run(() => repository.toggleDoctor(id));
    },
    [dbRepo, refresh, repository, run, snapshot.doctors],
  );

  const handleSaveSlot = useCallback(
    async (input: SlotInput, id?: string, todayDate?: string): Promise<SchedulingResult<ScheduleSlot>> => {
      const isDbId = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : true;
      const isDbDoctor = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.doctorId);
      if (dbRepo) {
        if (!isDbDoctor) {
          return { ok: false, error: 'รหัสแพทย์ไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        if (id && !isDbId) {
          return { ok: false, error: 'รหัสรอบตรวจไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        try {
          const result = await dbRepo.saveSlot(
            input,
            snapshot.slots,
            snapshot.doctors,
            snapshot.services,
            id,
            todayDate,
            snapshot.doctorLeaves,
          );
          if (result.ok) {
            await refresh();
          }
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรอบตรวจ' };
        }
      }
      return run(() => repository.saveSlot(input, id, todayDate));
    },
    [dbRepo, refresh, repository, run, snapshot.doctors, snapshot.doctorLeaves, snapshot.services, snapshot.slots],
  );

  const handleCreateSlotBatch = useCallback(
    async (
      input: SlotBatchInput,
      todayDate?: string,
      actorId?: string,
      role?: UserRole,
    ): Promise<SchedulingResult<number>> => {
      if (dbRepo) {
        const isDbDoctor = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.doctorId);
        if (!isDbDoctor) {
          return { ok: false, error: 'รหัสแพทย์ไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)', field: 'doctorId' };
        }
        try {
          const result = await dbRepo.createSlotBatch(
            input,
            snapshot.slots,
            snapshot.doctors,
            snapshot.services,
            snapshot.doctorLeaves,
            todayDate,
            actorId,
            role,
          );
          if (result.ok) await refresh();
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างรอบตรวจหลายวัน' };
        }
      }
      return run(() => repository.createSlotBatch(input, todayDate, actorId, role));
    },
    [dbRepo, refresh, repository, run, snapshot.doctors, snapshot.doctorLeaves, snapshot.services, snapshot.slots],
  );

  const handleSaveDoctorLeave = useCallback(
    async (
      input: DoctorLeaveInput,
      id?: string,
      actorId?: string,
      role?: UserRole,
    ): Promise<SchedulingResult<DoctorLeave>> => {
      const isDbId = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : true;
      if (dbRepo) {
        if (!isDbId) return { ok: false, error: 'รหัสวันลาไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        try {
          const result = await dbRepo.saveDoctorLeave(input, snapshot.doctorLeaves, snapshot.doctors, id, actorId, role);
          if (result.ok) await refresh();
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกวันลาแพทย์' };
        }
      }
      return run(() => repository.saveDoctorLeave(input, id, actorId, role));
    },
    [dbRepo, refresh, repository, run, snapshot.doctorLeaves, snapshot.doctors],
  );

  const handleDeleteDoctorLeave = useCallback(
    async (id: string, actorId?: string, role?: UserRole): Promise<SchedulingResult<DoctorLeave>> => {
      const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (dbRepo) {
        if (!isDbId) return { ok: false, error: 'รหัสวันลาไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        try {
          const result = await dbRepo.deleteDoctorLeave(id, snapshot.doctorLeaves, snapshot.doctors, actorId, role);
          if (result.ok) await refresh();
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกวันลาแพทย์' };
        }
      }
      return run(() => repository.deleteDoctorLeave(id, actorId, role));
    },
    [dbRepo, refresh, repository, run, snapshot.doctorLeaves, snapshot.doctors],
  );

  const handleToggleSlot = useCallback(
    async (
      id: string,
      actorId?: string,
      role?: UserRole,
    ): Promise<SchedulingResult<ScheduleSlot>> => {
      const isDbId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (dbRepo) {
        if (!isDbId) {
          return { ok: false, error: 'รหัสรอบตรวจไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
        }
        const target = snapshot.slots.find((s) => s.id === id);
        if (target) {
          try {
            const result = await dbRepo.toggleSlot(id, target, actorId, role);
            if (result.ok) {
              await refresh();
            }
            return result;
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปรับสถานะรอบตรวจ' };
          }
        }
        return { ok: false, error: 'ไม่พบรอบตรวจที่ต้องการแก้ไข' };
      }
      return run(() => repository.toggleSlot(id, actorId, role));
    },
    [dbRepo, refresh, repository, run, snapshot.slots],
  );

  const handleGenerateSlotsForRange = useCallback(
    async (startDate: string, endDate: string, today: string, serviceId?: string): Promise<SchedulingResult<number>> => {
      if (dbRepo) {
        try {
          const result = await dbRepo.generateSlotsForRange(
            startDate,
            endDate,
            today,
            snapshot.weeklySchedules,
            snapshot.slots,
            snapshot.services,
            serviceId,
            snapshot.doctorLeaves,
          );
          if (result.ok) {
            await refresh();
          }
          return result;
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างรอบตรวจ' };
        }
      }
      return run(() => repository.generateSlotsForRange(startDate, endDate, today, serviceId));
    },
    [dbRepo, refresh, repository, run, snapshot.doctorLeaves, snapshot.services, snapshot.slots, snapshot.weeklySchedules],
  );

  const value = useMemo<SchedulingContextValue>(
    () => ({
      ...snapshot,
      isLoading,
      refresh,
      saveDepartment: handleSaveDepartment,
      toggleDepartment: handleToggleDepartment,
      saveService: handleSaveService,
      toggleService: handleToggleService,
      saveDoctor: handleSaveDoctor,
      toggleDoctor: handleToggleDoctor,
      saveDoctorLeave: handleSaveDoctorLeave,
      deleteDoctorLeave: handleDeleteDoctorLeave,
      saveSlot: handleSaveSlot,
      createSlotBatch: handleCreateSlotBatch,
      toggleSlot: handleToggleSlot,
      saveWeeklySchedule: (input, id) => run(() => repository.saveWeeklySchedule(input, id)),
      generateSlotsForRange: handleGenerateSlotsForRange,
      getDoctorTemplates: (doctorId) => repository.getDoctorTemplates(doctorId),
      saveDoctorTemplate: (input) => run(() => repository.saveDoctorTemplate(input)),
    }),
    [
      snapshot,
      isLoading,
      refresh,
      handleSaveDepartment,
      handleToggleDepartment,
      handleSaveService,
      handleToggleService,
      handleSaveDoctor,
      handleToggleDoctor,
      handleSaveDoctorLeave,
      handleDeleteDoctorLeave,
      handleSaveSlot,
      handleCreateSlotBatch,
      handleToggleSlot,
      handleGenerateSlotsForRange,
      run,
      repository,
    ],
  );

  return <SchedulingContext.Provider value={value}>{children}</SchedulingContext.Provider>;
}

export function useScheduling() {
  const value = useContext(SchedulingContext);
  if (!value) throw new Error('useScheduling must be used inside SchedulingProvider');
  return value;
}
