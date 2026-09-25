'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { useScheduling } from '@/features/scheduling/context/SchedulingProvider';
import ConfirmationModal, { type ConfirmationModalRequest } from '@/components/common/ConfirmationModal';
import Toast from '@/components/common/Toast';
import type {
  DoctorAvailability,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  DoctorLeave,
} from '@/types/schedule';
import { getBangkokToday, isDoctorOnLeave } from '@/features/scheduling/domain/rules';
import { THAI_MONTHS_SHORT } from '@/constants/dateTime';

const inputClass =
  'h-11 w-full min-w-0 rounded-lg border border-brand-border-soft bg-brand-surface px-3.5 text-sm text-brand-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-brand-muted hover:border-brand-border focus:border-brand-strong focus:ring-4 focus:ring-brand-soft';
const textareaClass =
  'w-full rounded-xl border border-brand-border-soft bg-brand-surface p-3 text-sm text-brand-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-brand-muted focus:border-brand-strong focus:ring-4 focus:ring-brand-soft';
const modalBackdropClass =
  'clinic-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-xs sm:p-6';
const modalPanelClass =
  'flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-brand-border-soft bg-brand-surface text-brand-ink shadow-2xl sm:max-h-[calc(100dvh-3rem)]';
const modalHeaderClass =
  'flex shrink-0 items-start justify-between gap-4 border-b border-brand-border-soft px-5 py-4 sm:px-6 sm:py-5';
const modalBodyClass = 'min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6';
const modalFooterClass =
  'flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-brand-border-soft px-5 py-4 sm:px-6';
const modalLabelClass = 'text-sm font-semibold text-brand-ink';
const modalCancelClass =
  'rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-body transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';
const modalSaveClass =
  'inline-flex items-center gap-2 rounded-xl bg-brand-strong px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50';
const textActionClass = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50';

type WorkspaceTab = 'departments' | 'doctors' | 'services';

function formatLeaveDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return `${day} ${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`;
}

function formatLeaveRange(leave: DoctorLeave) {
  return leave.startDate === leave.endDate
    ? formatLeaveDate(leave.startDate)
    : `${formatLeaveDate(leave.startDate)}–${formatLeaveDate(leave.endDate)}`;
}

interface DepartmentDraft {
  name: string;
  description: string;
}

interface DoctorDraft {
  profileId: string;
  fullName: string;
  email: string;
  initials: string;
  specialty: string;
  departmentId: string;
  availability: DoctorAvailability;
}

interface ServiceDraft {
  code: string;
  name: string;
  description: string;
}

const emptyDepartmentDraft: DepartmentDraft = {
  name: '',
  description: '',
};

const emptyDoctorDraft: DoctorDraft = {
  profileId: '',
  fullName: '',
  email: '',
  initials: '',
  specialty: '',
  departmentId: '',
  availability: 'active',
};

const emptyServiceDraft: ServiceDraft = {
  code: '',
  name: '',
  description: '',
};

export default function DepartmentWorkspace() {
  const {
    departments,
    doctors,
    services,
    doctorLeaves = [],
    doctorAccounts,
    isLoading,
    saveDepartment: persistDepartment,
    toggleDepartment: persistDepartmentToggle,
    saveDoctor: persistDoctor,
    saveService: persistService,
    toggleService: persistServiceToggle,
    deleteDoctorLeave: persistDoctorLeaveDelete,
  } = useScheduling();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('departments');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  // Modal state
  const [departmentDrawerOpen, setDepartmentDrawerOpen] = useState(false);
  const [doctorDrawerOpen, setDoctorDrawerOpen] = useState(false);
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(emptyDepartmentDraft);
  const [doctorDraft, setDoctorDraft] = useState<DoctorDraft>(emptyDoctorDraft);
  const [isSpecialtyListOpen, setIsSpecialtyListOpen] = useState(false);
  const [activeSpecialtyIndex, setActiveSpecialtyIndex] = useState(-1);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalRequest | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (confirmation || (!departmentDrawerOpen && !doctorDrawerOpen && !serviceDrawerOpen)) return;
    const modal = modalRef.current;
    modal?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea')?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (departmentDrawerOpen) setDepartmentDrawerOpen(false);
        if (doctorDrawerOpen) setDoctorDrawerOpen(false);
        if (serviceDrawerOpen) setServiceDrawerOpen(false);
      }
      if (e.key === 'Tab' && modal) {
        const controls = modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      modalTriggerRef.current?.focus();
    };
  }, [confirmation, departmentDrawerOpen, doctorDrawerOpen, serviceDrawerOpen]);

  const normalizedSearch = search.trim().toLocaleLowerCase('th');

  const visibleDepartments = useMemo(
    () =>
      departments.filter((department) => {
        const matchesSearch = `${department.name} ${department.description}`
          .toLocaleLowerCase('th')
          .includes(normalizedSearch);
        return matchesSearch && (showInactive || department.isActive);
      }),
    [departments, normalizedSearch, showInactive],
  );

  const visibleDoctors = useMemo(
    () =>
      doctors.filter((doctor) => {
        const matchesSearch = `${doctor.fullName} ${doctor.specialty} ${doctor.email}`
          .toLocaleLowerCase('th')
          .includes(normalizedSearch);
        const matchesDepartment = departmentFilter === 'all' || doctor.departmentId === departmentFilter;
        const matchesStatus = showInactive || doctor.availability !== 'inactive';
        return matchesSearch && matchesDepartment && matchesStatus;
      }),
    [departmentFilter, doctors, normalizedSearch, showInactive],
  );

  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesSearch = `${service.code} ${service.name} ${service.description}`
          .toLocaleLowerCase('th')
          .includes(normalizedSearch);
        return matchesSearch && (showInactive || service.isActive);
      }),
    [normalizedSearch, services, showInactive],
  );

  const specialtyOptions = useMemo(
    () => Array.from(new Set(doctors.map((doctor) => doctor.specialty.trim()).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, 'th')),
    [doctors],
  );
  const normalizedSpecialty = doctorDraft.specialty.trim().toLocaleLowerCase('th');
  const filteredSpecialtyOptions = specialtyOptions.filter((specialty) =>
    specialty.toLocaleLowerCase('th').includes(normalizedSpecialty),
  );
  const hasMatchingSpecialty = specialtyOptions.some(
    (specialty) => specialty.toLocaleLowerCase('th') === normalizedSpecialty,
  );
  const canAddSpecialty = Boolean(normalizedSpecialty) && !hasMatchingSpecialty;
  const specialtyItemCount = filteredSpecialtyOptions.length + Number(canAddSpecialty);

  const openDepartmentForm = (department?: ScheduleDepartment) => {
    modalTriggerRef.current = document.activeElement as HTMLElement;
    setFormError('');
    setNotice('');
    setEditingDepartmentId(department?.id ?? null);
    setDepartmentDraft(
      department
        ? {
            name: department.name,
            description: department.description,
          }
        : emptyDepartmentDraft,
    );
    setDepartmentDrawerOpen(true);
  };

  const closeDepartmentDrawer = () => {
    setDepartmentDrawerOpen(false);
    setEditingDepartmentId(null);
    setDepartmentDraft(emptyDepartmentDraft);
    setFormError('');
  };

  const saveDepartment = async () => {
    setFormError('');
    setIsSaving(true);
    const result = await persistDepartment(departmentDraft, editingDepartmentId ?? undefined);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setNotice(editingDepartmentId ? 'อัปเดตข้อมูลแผนกแล้ว' : 'เพิ่มแผนกแล้ว');
    closeDepartmentDrawer();
  };

  const confirmToggleDepartment = async (department: ScheduleDepartment) => {
    setIsSaving(true);
    const result = await persistDepartmentToggle(department.id);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    if (result.value === 'disabled') {
      setShowInactive(true);
    }

    setConfirmation(null);
    setNotice(result.value === 'deleted' ? 'ลบแผนกแล้ว' : result.value === 'disabled' ? 'ปิดใช้งานแผนกแล้ว' : 'เปิดใช้งานแผนกแล้ว');
  };

  const toggleDepartment = (department: ScheduleDepartment) => {
    setFormError('');
    setNotice('');
    const impact = doctors.some((doctor) => doctor.departmentId === department.id)
      ? ' แพทย์และประวัติเดิมจะยังคงเชื่อมกับแผนกนี้'
      : '';
    setConfirmation({
      title: department.isActive ? 'ยืนยันการปิดใช้งานแผนก' : 'ยืนยันการเปิดใช้งานแผนก',
      message: department.isActive
        ? `ยืนยันการปิดใช้งานแผนก “${department.name}”?${impact}`
        : `ยืนยันการเปิดใช้งานแผนก “${department.name}” อีกครั้ง?`,
      confirmLabel: department.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน',
      tone: department.isActive ? 'danger' : 'primary',
      onConfirm: () => confirmToggleDepartment(department),
    });
  };

  const selectDoctorAccount = (profileId: string) => {
    const account = doctorAccounts.find((item) => item.profileId === profileId);
    setDoctorDraft((current) => ({
      ...current,
      profileId,
      fullName: account?.fullName ?? current.fullName,
      email: account?.email ?? current.email,
      initials: account?.initials ?? current.initials,
    }));
  };

  const selectSpecialty = (specialty: string) => {
    setDoctorDraft((current) => ({ ...current, specialty }));
    setIsSpecialtyListOpen(false);
    setActiveSpecialtyIndex(-1);
  };

  const openDoctorForm = (doctor?: ScheduleDoctor) => {
    modalTriggerRef.current = document.activeElement as HTMLElement;
    setFormError('');
    setNotice('');
    setEditingDoctorId(doctor?.id ?? null);
    setIsSpecialtyListOpen(false);
    setActiveSpecialtyIndex(-1);
    setDoctorDraft(
      doctor
        ? {
            profileId: doctor.profileId,
            fullName: doctor.fullName,
            email: doctor.email,
            initials: doctor.initials,
            specialty: doctor.specialty,
            departmentId: doctor.departmentId,
            availability: doctor.availability,
          }
        : emptyDoctorDraft,
    );
    setDoctorDrawerOpen(true);
  };

  const closeDoctorDrawer = () => {
    setDoctorDrawerOpen(false);
    setIsSpecialtyListOpen(false);
    setActiveSpecialtyIndex(-1);
    setEditingDoctorId(null);
    setDoctorDraft(emptyDoctorDraft);
    setFormError('');
  };

  const saveDoctor = async () => {
    setFormError('');
    setIsSaving(true);
    const result = await persistDoctor(doctorDraft, editingDoctorId ?? undefined);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setNotice(editingDoctorId ? 'อัปเดตข้อมูลแพทย์แล้ว' : 'เพิ่มแพทย์ในแผนกแล้ว');
    closeDoctorDrawer();
  };

  const openServiceForm = (service?: ScheduleService) => {
    modalTriggerRef.current = document.activeElement as HTMLElement;
    setFormError('');
    setNotice('');
    setEditingServiceId(service?.id ?? null);
    setServiceDraft(
      service
        ? { code: service.code, name: service.name, description: service.description }
        : emptyServiceDraft,
    );
    setServiceDrawerOpen(true);
  };

  const closeServiceDrawer = () => {
    setServiceDrawerOpen(false);
    setEditingServiceId(null);
    setServiceDraft(emptyServiceDraft);
    setFormError('');
  };

  const saveService = async () => {
    setFormError('');
    setIsSaving(true);
    const wasEditing = Boolean(editingServiceId);
    try {
      const result = await persistService(serviceDraft, editingServiceId ?? undefined);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      setNotice(wasEditing ? 'อัปเดตบริการแล้ว' : 'เพิ่มบริการแล้ว');
      closeServiceDrawer();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'บันทึกบริการไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmToggleService = async (service: ScheduleService) => {
    setIsSaving(true);
    const result = await persistServiceToggle(service.id);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    if (result.value === 'disabled') setShowInactive(true);
    setConfirmation(null);
    setNotice(result.value === 'deleted' ? 'ลบบริการแล้ว' : result.value === 'enabled' ? 'เปิดใช้งานบริการแล้ว' : 'ปิดใช้งานบริการแล้ว');
  };

  const toggleService = (service: ScheduleService) => {
    setFormError('');
    setNotice('');
    const action = service.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    setConfirmation({
      title: `ยืนยันการ${action}บริการ`,
      message: service.isActive
        ? `ปิดใช้งานบริการ “${service.name}”? ข้อมูลบริการและรอบตรวจเดิมจะยังคงอยู่`
        : `เปิดใช้งานบริการ “${service.name}” อีกครั้ง?`,
      confirmLabel: action,
      tone: service.isActive ? 'danger' : 'primary',
      onConfirm: () => confirmToggleService(service),
    });
  };

  const confirmCancelDoctorLeave = async (leave: DoctorLeave, doctorName: string) => {
    setIsSaving(true);
    const result = await persistDoctorLeaveDelete(leave.id);
    setIsSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setConfirmation(null);
    setNotice(`ยกเลิกวันลาของ ${doctorName} แล้ว`);
  };

  const cancelDoctorLeave = (leave: DoctorLeave, doctorName: string) => {
    setFormError('');
    setNotice('');
    setConfirmation({
      title: 'ยืนยันการยกเลิกวันลา',
      message: `ยกเลิกวันลาของ ${doctorName} ช่วง ${formatLeaveRange(leave)}? รอบตรวจเดิมจะไม่เปลี่ยนแปลง`,
      confirmLabel: 'ยกเลิกวันลา',
      tone: 'danger',
      onConfirm: () => confirmCancelDoctorLeave(leave, doctorName),
    });
  };

  const changeTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setSearch('');
  };

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <h1 className="relative pl-4 text-3xl font-bold tracking-tight text-brand-ink before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand sm:text-4xl">จัดการแผนก แพทย์ และบริการ</h1>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (activeTab === 'departments') openDepartmentForm();
            else if (activeTab === 'doctors') openDoctorForm();
            else openServiceForm();
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-brand-button bg-brand-strong px-5 text-sm font-semibold text-white shadow-brand-button transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {activeTab === 'departments' ? 'เพิ่มแผนก' : activeTab === 'doctors' ? 'เพิ่มแพทย์' : 'เพิ่มบริการ'}
        </button>
      </header>

      <div className="flex items-end gap-1.5 sm:gap-2 border-b-2 border-brand-border-soft pt-3" role="tablist" aria-label="เลือกข้อมูลที่ต้องการจัดการ">
        {([
          ['departments', 'แผนก', departments.length, Building2],
          ['doctors', 'แพทย์', doctors.length, Stethoscope],
          ['services', 'บริการ', services.length, ClipboardList],
        ] as const).map(([tab, label, count, Icon]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              id={`${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => changeTab(tab)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const tabs: WorkspaceTab[] = ['departments', 'doctors', 'services'];
                const currentIndex = tabs.indexOf(tab);
                const nextTab = event.key === 'Home'
                  ? 'departments'
                  : event.key === 'End'
                    ? 'services'
                    : tabs[(currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                changeTab(nextTab);
                document.getElementById(`${nextTab}-tab`)?.focus();
              }}
              className={`group relative flex min-h-12 items-center gap-2.5 rounded-t-2xl px-3 py-3 text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:px-5 ${
                isActive
                  ? '-mb-[2px] z-10 border-t-4 border-t-brand border-x-2 border-b-2 border-x-brand-border-soft border-b-white bg-white text-brand-strong shadow-xs'
                  : 'border-t-2 border-x border-b-0 border-transparent bg-slate-100/80 text-brand-body hover:bg-brand-surface hover:text-brand-strong'
              }`}
            >
              <Icon className={`h-4 w-4 transition-colors duration-200 ${isActive ? 'text-brand-strong' : 'text-brand-muted group-hover:text-brand-strong'}`} aria-hidden="true" />
              <span>{label}</span>
              {count !== null && <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums transition-all duration-300 ${
                  isActive
                    ? 'bg-brand-soft font-bold text-brand-strong'
                    : 'bg-slate-200/80 font-normal text-brand-muted group-hover:bg-brand-soft/70 group-hover:text-brand-strong'
                }`}
              >
                {count}
              </span>}
            </button>
          );
        })}
      </div>

      <section aria-label="ค้นหาและกรองรายการ" className="flex flex-wrap items-end gap-4 border-y border-brand-border-soft bg-brand-surface/60 px-4 py-4">
        <label className="grid w-full gap-2 text-sm text-brand-body sm:w-80">
          <span>{activeTab === 'departments' ? 'ค้นหาแผนก' : activeTab === 'doctors' ? 'ค้นหาแพทย์' : 'ค้นหาบริการ'}</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-brand-body" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={activeTab === 'departments' ? 'ชื่อแผนกหรือคำอธิบาย' : activeTab === 'doctors' ? 'ชื่อแพทย์ ความเชี่ยวชาญ หรืออีเมล' : 'รหัส ชื่อ หรือคำอธิบายบริการ'}
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>
        {activeTab === 'doctors' && (
          <label className="grid w-full gap-2 text-sm text-brand-body sm:w-60">
            <span>แผนก</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={inputClass}>
              <option value="all">ทุกแผนก</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-brand-body">
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 accent-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" />
          แสดงรายการที่ปิดใช้งาน
        </label>
      </section>
      <Toast message={notice} onDismiss={() => setNotice('')} />
      <ConfirmationModal
        request={confirmation}
        onCancel={() => setConfirmation(null)}
        isBusy={isSaving}
      />
      <div aria-live="polite" className="space-y-3 empty:hidden">
        {formError && !departmentDrawerOpen && !doctorDrawerOpen && !serviceDrawerOpen && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              {formError}
            </span>
            <button
              type="button"
              onClick={() => setFormError('')}
              className="rounded-lg p-1 text-rose-700 hover:bg-rose-100"
              aria-label="ปิดข้อความแจ้งเตือน"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

      </div>

      {activeTab === 'departments' && (
        <section id="departments-panel" role="tabpanel" aria-labelledby="departments-tab" aria-busy={isLoading} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">รายการแผนก</h2>
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium tabular-nums text-brand-strong">{visibleDepartments.length} แผนก</span>
          </div>
          {isLoading ? (
            <ListLoading label="กำลังโหลดรายการแผนก" />
          ) : visibleDepartments.length === 0 ? (
            <EmptyPanel title="ไม่พบแผนก" detail="ลองเปลี่ยนคำค้นหา หรือเลือก “แสดงรายการที่ปิดใช้งาน”" />
          ) : (
            <div className="divide-y divide-brand-border-soft border-y border-brand-border-soft">
              {visibleDepartments.map((department) => {
                const affiliatedDoctors = doctors.filter((doctor) => doctor.departmentId === department.id);
                return (
                  <article key={department.id} className="grid gap-5 py-6 transition-colors hover:bg-brand-surface/60 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-8">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-brand-ink">{department.name}</h3>
                      {department.description && <p className="mt-2 text-sm leading-6 text-brand-body">{department.description}</p>}
                      <p className={`mt-3 flex items-center gap-2 text-sm ${department.isActive ? 'text-status-success' : 'text-status-neutral'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${department.isActive ? 'bg-status-success' : 'bg-status-neutral'}`} aria-hidden="true" />
                        {department.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </p>
                      <Link href={`/departments/${department.id}`} className={`${textActionClass} mt-3 text-brand-strong`}>
                        ดูตารางและบริการ
                      </Link>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-2 text-sm font-medium text-brand-body">แพทย์ในแผนก <span className="tabular-nums">({affiliatedDoctors.length})</span></p>
                      {affiliatedDoctors.length === 0 ? (
                        <div className="flex flex-wrap items-center gap-x-3">
                          <span className="text-sm text-brand-body">ยังไม่มีแพทย์</span>
                          <button type="button" onClick={() => { openDoctorForm(); setDoctorDraft((current) => ({ ...current, departmentId: department.id })); }} className={`${textActionClass} text-brand-strong`}>
                            <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มแพทย์
                          </button>
                        </div>
                      ) : (
                        <ul className="space-y-2 text-sm leading-6 text-brand-ink">
                          {affiliatedDoctors.map((doctor) => {
                            const latestLeave = doctorLeaves.filter((leave) => leave.doctorId === doctor.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
                            const onLeaveToday = isDoctorOnLeave(doctorLeaves, doctor.id, getBangkokToday());
                            return (
                              <li key={doctor.id} className="break-words">
                                {doctor.fullName}
                                {(onLeaveToday || doctor.availability === 'on_leave') && <span className="ml-2 text-xs text-status-warning">ลาตรวจ{latestLeave ? ` (${formatLeaveRange(latestLeave)})` : ''}</span>}
                                {doctor.availability === 'inactive' && <span className="ml-2 text-xs text-status-neutral">ปิดใช้งาน</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-x-4 lg:justify-end">
                      <button type="button" onClick={() => openDepartmentForm(department)} className={`${textActionClass} text-brand-strong`} aria-label={`แก้ไข ${department.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />แก้ไข
                      </button>
                      <button type="button" disabled={isSaving} onClick={() => toggleDepartment(department)} className={`${textActionClass} ${department.isActive ? 'text-status-critical' : 'text-status-success'}`} aria-label={`${department.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} ${department.name}`}>
                        <Power className="h-4 w-4" aria-hidden="true" />{department.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'doctors' && (
        <section id="doctors-panel" role="tabpanel" aria-labelledby="doctors-tab" aria-busy={isLoading} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">รายการแพทย์</h2>
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium tabular-nums text-brand-strong">{visibleDoctors.length} คน</span>
          </div>
          {isLoading ? (
            <ListLoading label="กำลังโหลดรายการแพทย์" />
          ) : visibleDoctors.length === 0 ? (
            <EmptyPanel title="ไม่พบแพทย์" detail="ลองเปลี่ยนคำค้นหา แผนก หรือเลือก “แสดงรายการที่ปิดใช้งาน”" />
          ) : (
            <div className="border-y border-brand-border-soft">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_140px] gap-6 border-b border-brand-border-soft bg-brand-surface/60 px-3 py-4 text-sm text-brand-body lg:grid">
                <span>แพทย์ / บัญชี</span><span>แผนก / ความเชี่ยวชาญ</span><span>สถานะ</span><span className="text-right">จัดการ</span>
              </div>
              <div className="divide-y divide-brand-border-soft">
                {visibleDoctors.map((doctor) => {
                  const department = departments.find((item) => item.id === doctor.departmentId);
                  const latestLeave = doctorLeaves.filter((leave) => leave.doctorId === doctor.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
                  const onLeaveToday = isDoctorOnLeave(doctorLeaves, doctor.id, getBangkokToday());
                  const statusConfig: Record<DoctorAvailability, { label: string; text: string; dot: string }> = {
                    active: { label: 'พร้อมออกตรวจ', text: 'text-status-success', dot: 'bg-status-success' },
                    on_leave: { label: 'ลาตรวจ', text: 'text-status-warning', dot: 'bg-status-warning' },
                    inactive: { label: 'ปิดใช้งาน', text: 'text-status-neutral', dot: 'bg-status-neutral' },
                  };
                  const currentStatus = onLeaveToday || doctor.availability === 'on_leave'
                    ? { label: latestLeave ? `ลาตรวจ (${formatLeaveRange(latestLeave)})` : 'ลาตรวจ', text: 'text-status-warning', dot: 'bg-status-warning' }
                    : statusConfig[doctor.availability] ?? statusConfig.active;
                  return (
                    <article key={doctor.id} className="grid gap-4 py-6 transition-colors hover:bg-brand-surface/60 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_140px] lg:items-center lg:gap-6">
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold text-brand-ink">{doctor.fullName}</h3>
                        {doctor.email && <p className="mt-1 break-all text-sm text-brand-body">{doctor.email}</p>}
                      </div>
                      <div className="min-w-0 text-sm leading-6">
                        <p className="text-brand-ink"><span className="text-brand-body lg:hidden">แผนก: </span>{department?.name ?? 'ยังไม่มีแผนกสังกัด'}</p>
                        {doctor.specialty && <p className="text-brand-body"><span className="lg:hidden">ความเชี่ยวชาญ: </span>{doctor.specialty}</p>}
                      </div>
                      <p className={`flex items-center gap-2 text-sm ${currentStatus.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${currentStatus.dot}`} aria-hidden="true" />{currentStatus.label}
                      </p>
                      <div className="flex items-center gap-4 lg:justify-end">
                        <button type="button" onClick={() => openDoctorForm(doctor)} className={`${textActionClass} text-brand-strong`} aria-label={`แก้ไข ${doctor.fullName}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />แก้ไข
                        </button>
                        {latestLeave && (
                          <button type="button" disabled={isSaving} onClick={() => cancelDoctorLeave(latestLeave, doctor.fullName)} className={`${textActionClass} text-violet-800`} aria-label={`ยกเลิกวันลา ${doctor.fullName}`}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />ยกเลิกวันลา
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
      {activeTab === 'services' && (
        <section id="services-panel" role="tabpanel" aria-labelledby="services-tab" aria-busy={isLoading} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">รายการบริการ</h2>
            <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium tabular-nums text-brand-strong">{visibleServices.length} บริการ</span>
          </div>
          {isLoading ? (
            <ListLoading label="กำลังโหลดรายการบริการ" />
          ) : visibleServices.length === 0 ? (
            <EmptyPanel
              title={services.length === 0 ? 'ยังไม่มีบริการ' : 'ไม่พบบริการ'}
              detail={services.length === 0 ? 'เพิ่มบริการเพื่อใช้กำหนดรอบตรวจที่เปิดรับจอง' : 'ลองเปลี่ยนคำค้นหา หรือเลือก “แสดงรายการที่ปิดใช้งาน”'}
            />
          ) : (
            <div className="border-y border-brand-border-soft">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_150px_180px] gap-6 border-b border-brand-border-soft bg-brand-surface/60 px-3 py-4 text-sm text-brand-body lg:grid">
                <span>รหัสบริการ</span><span>รายละเอียด</span><span>สถานะ</span><span className="text-right">จัดการ</span>
              </div>
              <div className="divide-y divide-brand-border-soft">
                {visibleServices.map((service) => (
                  <article key={service.id} className="grid gap-4 py-5 transition-colors hover:bg-brand-surface/60 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_150px_180px] lg:items-center lg:gap-6">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-brand-body lg:hidden">รหัสบริการ</p>
                      <p className="break-all font-mono text-sm font-semibold text-brand-strong">{service.code}</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold text-brand-ink">{service.name}</h3>
                      {service.description && <p className="mt-1 break-words text-sm leading-6 text-brand-body">{service.description}</p>}
                    </div>
                    <p className={`flex items-center gap-2 text-sm ${service.isActive ? 'text-status-success' : 'text-status-neutral'}`}>
                      <span className={`h-2 w-2 rounded-full ${service.isActive ? 'bg-status-success' : 'bg-status-neutral'}`} aria-hidden="true" />
                      {service.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end">
                      <button type="button" onClick={() => openServiceForm(service)} className={`${textActionClass} text-brand-strong`} aria-label={`แก้ไข ${service.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />แก้ไข
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => toggleService(service)}
                        className={`${textActionClass} ${service.isActive ? 'text-status-critical' : 'text-status-success'}`}
                        aria-label={`${service.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} ${service.name}`}
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />{service.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Department modal */}
      {departmentDrawerOpen && (
        <div className={modalBackdropClass} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDepartmentDrawer(); }}>
          <div ref={modalRef} className={modalPanelClass} aria-labelledby="department-modal-title" role="dialog" aria-modal="true">
              <div className={modalHeaderClass}>
                <div>
                  <h2 id="department-modal-title" className="mt-1 text-xl font-bold text-brand-ink">
                    {editingDepartmentId ? 'แก้ไขแผนก' : 'เพิ่มแผนก'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDepartmentDrawer}
                  className="rounded-xl p-2 text-brand-muted transition-colors hover:bg-brand-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
                  aria-label="ปิดหน้าต่างแก้ไขแผนก"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className={modalBodyClass}>
                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-status-critical/30 bg-brand-surface p-3 text-sm text-status-critical" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="dept-name" className={modalLabelClass}>
                    ชื่อแผนก <span className="text-status-critical">*</span>
                  </label>
                  <input
                    id="dept-name"
                    value={departmentDraft.name}
                    onChange={(e) => setDepartmentDraft((curr) => ({ ...curr, name: e.target.value }))}
                    placeholder="เช่น เวชปฏิบัติทั่วไป, กุมารเวชกรรม"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dept-desc" className={modalLabelClass}>
                    คำอธิบายแผนก
                  </label>
                  <textarea
                    id="dept-desc"
                    rows={4}
                    value={departmentDraft.description}
                    onChange={(e) => setDepartmentDraft((curr) => ({ ...curr, description: e.target.value }))}
                    placeholder="ระบุขอบเขตการรักษาหรือข้อมูลสำหรับผู้รับบริการ"
                    className={textareaClass}
                  />
                </div>
              </div>

              <div className={modalFooterClass}>
                <button
                  type="button"
                  onClick={closeDepartmentDrawer}
                  className={modalCancelClass}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  onClick={saveDepartment}
                  className={modalSaveClass}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>กำลังบันทึก…</span>
                    </>
                  ) : (
                    <span>บันทึกข้อมูลแผนก</span>
                  )}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Doctor modal */}
      {doctorDrawerOpen && (
        <div className={modalBackdropClass} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDoctorDrawer(); }}>
          <div ref={modalRef} className={modalPanelClass} aria-labelledby="doctor-modal-title" role="dialog" aria-modal="true">
              <div className={modalHeaderClass}>
                <div>
                  <h2 id="doctor-modal-title" className="mt-1 text-xl font-bold text-brand-ink">
                    {editingDoctorId ? 'แก้ไขข้อมูลแพทย์' : 'เพิ่มแพทย์'}
                  </h2>
                  <p className="mt-1 text-xs text-brand-muted">
                    เลือกบัญชีแพทย์และระบุแผนกสังกัด
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDoctorDrawer}
                  className="rounded-xl p-2 text-brand-muted transition-colors hover:bg-brand-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
                  aria-label="ปิดหน้าต่างแก้ไขแพทย์"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className={modalBodyClass}>
                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-status-critical/30 bg-brand-surface p-3 text-sm text-status-critical" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="doc-account" className={modalLabelClass}>
                    เลือกบัญชีแพทย์ <span className="text-status-critical">*</span>
                  </label>
                  <select
                    id="doc-account"
                    value={doctorDraft.profileId}
                    disabled={Boolean(editingDoctorId)}
                    onChange={(e) => selectDoctorAccount(e.target.value)}
                    className={`${inputClass} disabled:bg-brand-soft disabled:text-brand-muted`}
                  >
                    <option value="">เลือกบัญชีแพทย์</option>
                    {editingDoctorId && (
                      <option value={doctorDraft.profileId}>
                        {doctorDraft.fullName} {doctorDraft.email ? `(${doctorDraft.email})` : ''}
                      </option>
                    )}
                    {!editingDoctorId &&
                      doctorAccounts
                        .filter((account) => !doctors.some((doctor) => doctor.profileId === account.profileId))
                        .map((account) => (
                          <option key={account.profileId} value={account.profileId}>
                            {account.fullName} {account.email ? `(${account.email})` : ''}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="doc-dept" className={modalLabelClass}>
                    แผนกสังกัด <span className="text-status-critical">*</span>
                  </label>
                  <select
                    id="doc-dept"
                    value={doctorDraft.departmentId}
                    onChange={(e) => setDoctorDraft((curr) => ({ ...curr, departmentId: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">เลือกแผนก</option>
                    {departments
                      .filter((department) => department.isActive)
                      .map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="doc-spec" className={modalLabelClass}>
                    ความเชี่ยวชาญ
                  </label>
                  <div className="relative">
                    <input
                      id="doc-spec"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-haspopup="listbox"
                      aria-expanded={isSpecialtyListOpen}
                      aria-controls={isSpecialtyListOpen ? 'doctor-specialty-options' : undefined}
                      aria-activedescendant={isSpecialtyListOpen && activeSpecialtyIndex >= 0 ? `doctor-specialty-option-${activeSpecialtyIndex}` : undefined}
                      autoComplete="off"
                      value={doctorDraft.specialty}
                      onFocus={() => {
                        setIsSpecialtyListOpen(true);
                        setActiveSpecialtyIndex(-1);
                      }}
                      onChange={(event) => {
                        setDoctorDraft((current) => ({ ...current, specialty: event.target.value }));
                        setIsSpecialtyListOpen(true);
                        setActiveSpecialtyIndex(-1);
                      }}
                      onBlur={(event) => {
                        if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
                          setIsSpecialtyListOpen(false);
                          setActiveSpecialtyIndex(-1);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setIsSpecialtyListOpen(true);
                          setActiveSpecialtyIndex((current) => specialtyItemCount === 0 ? -1 : (current + 1) % specialtyItemCount);
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setIsSpecialtyListOpen(true);
                          setActiveSpecialtyIndex((current) => specialtyItemCount === 0 ? -1 : current <= 0 ? specialtyItemCount - 1 : current - 1);
                        } else if (event.key === 'Enter' && isSpecialtyListOpen) {
                          event.preventDefault();
                          if (activeSpecialtyIndex >= 0 && activeSpecialtyIndex < filteredSpecialtyOptions.length) {
                            selectSpecialty(filteredSpecialtyOptions[activeSpecialtyIndex]);
                          } else if (activeSpecialtyIndex === filteredSpecialtyOptions.length && canAddSpecialty) {
                            selectSpecialty(doctorDraft.specialty.trim());
                          } else if (canAddSpecialty) {
                            selectSpecialty(doctorDraft.specialty.trim());
                          } else {
                            setIsSpecialtyListOpen(false);
                          }
                        } else if (event.key === 'Escape' && isSpecialtyListOpen) {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsSpecialtyListOpen(false);
                          setActiveSpecialtyIndex(-1);
                        }
                      }}
                      placeholder="พิมพ์เพื่อค้นหาหรือเพิ่มความเชี่ยวชาญ"
                      className={inputClass}
                    />
                    {isSpecialtyListOpen && (
                      <div
                        id="doctor-specialty-options"
                        role="listbox"
                        aria-label="ตัวเลือกความเชี่ยวชาญ"
                        className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-brand-border-soft bg-brand-surface p-1.5 text-sm text-brand-ink shadow-xl"
                      >
                        {filteredSpecialtyOptions.map((specialty, index) => (
                          <div
                            key={specialty}
                            id={`doctor-specialty-option-${index}`}
                            role="option"
                            tabIndex={-1}
                            aria-selected={activeSpecialtyIndex === index}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectSpecialty(specialty)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') selectSpecialty(specialty);
                            }}
                            className={`cursor-pointer rounded-lg px-3 py-2.5 ${activeSpecialtyIndex === index ? 'bg-brand-soft text-brand-ink' : 'hover:bg-brand-soft'}`}
                          >
                            {specialty}
                          </div>
                        ))}
                        {canAddSpecialty && (
                          <div
                            id={`doctor-specialty-option-${filteredSpecialtyOptions.length}`}
                            role="option"
                            tabIndex={-1}
                            aria-selected={activeSpecialtyIndex === filteredSpecialtyOptions.length}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectSpecialty(doctorDraft.specialty.trim())}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') selectSpecialty(doctorDraft.specialty.trim());
                            }}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 font-medium ${activeSpecialtyIndex === filteredSpecialtyOptions.length ? 'bg-brand-soft text-brand-ink' : 'hover:bg-brand-soft'}`}
                          >
                            <Plus className="h-4 w-4 text-brand-strong" aria-hidden="true" />
                            <span>เพิ่ม “{doctorDraft.specialty.trim()}”</span>
                          </div>
                        )}
                        {specialtyItemCount === 0 && (
                          <div role="option" aria-disabled="true" className="px-3 py-2.5 text-brand-muted">
                            ยังไม่มีตัวเลือกความเชี่ยวชาญ
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className={modalFooterClass}>
                <button
                  type="button"
                  onClick={closeDoctorDrawer}
                  className={modalCancelClass}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  onClick={saveDoctor}
                  className={modalSaveClass}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>กำลังบันทึก…</span>
                    </>
                  ) : (
                    <span>บันทึกข้อมูลแพทย์</span>
                  )}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Service modal */}
      {serviceDrawerOpen && (
        <div className={modalBackdropClass} onMouseDown={(event) => { if (event.target === event.currentTarget) closeServiceDrawer(); }}>
          <div ref={modalRef} className={modalPanelClass} aria-labelledby="service-modal-title" role="dialog" aria-modal="true">
              <div className={modalHeaderClass}>
                <div>
                  <h2 id="service-modal-title" className="mt-1 text-xl font-bold text-brand-ink">
                    {editingServiceId ? 'แก้ไขบริการ' : 'เพิ่มบริการ'}
                  </h2>
                  <p className="mt-1 text-xs text-brand-muted">บริการนี้ใช้กำหนดรอบตรวจที่เปิดรับจอง</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={closeServiceDrawer}
                  className="rounded-xl p-2 text-brand-muted transition-colors hover:bg-brand-soft hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50"
                  aria-label="ปิดหน้าต่างแก้ไขบริการ"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className={modalBodyClass}>
                {formError && (
                  <div className="flex items-center gap-2 rounded-xl border border-status-critical/30 bg-brand-surface p-3 text-sm text-status-critical" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="service-code" className={modalLabelClass}>
                    รหัสบริการ <span className="text-status-critical">*</span>
                  </label>
                  <input
                    id="service-code"
                    value={serviceDraft.code}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, code: event.target.value }))}
                    placeholder="เช่น GEN-CONSULT"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="service-name" className={modalLabelClass}>
                    ชื่อบริการ <span className="text-status-critical">*</span>
                  </label>
                  <input
                    id="service-name"
                    value={serviceDraft.name}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="เช่น ตรวจโรคทั่วไป"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="service-description" className={modalLabelClass}>คำอธิบายบริการ</label>
                  <textarea
                    id="service-description"
                    rows={4}
                    value={serviceDraft.description}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="รายละเอียดสำหรับผู้รับบริการ"
                    className={textareaClass}
                  />
                </div>
              </div>

              <div className={modalFooterClass}>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={closeServiceDrawer}
                  className={`${modalCancelClass} disabled:opacity-50`}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  onClick={saveService}
                  className={modalSaveClass}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {isSaving ? 'กำลังบันทึก…' : 'บันทึกบริการ'}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-t border-brand-border-soft py-12">
      <h3 className="text-base font-semibold text-brand-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-brand-body">{detail}</p>
    </div>
  );
}

function ListLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="divide-y divide-brand-border-soft border-y border-brand-border-soft">
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden="true" className="grid gap-5 py-6 motion-safe:animate-pulse sm:grid-cols-2">
          <div className="space-y-3">
            <div className="h-5 w-36 rounded bg-brand-border-soft" />
            <div className="h-3 w-52 rounded bg-brand-border-soft" />
          </div>
          <div className="h-3 w-28 rounded bg-brand-border-soft" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
