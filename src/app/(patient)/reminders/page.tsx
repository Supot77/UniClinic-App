'use client';

/**
 * =============================================================================
 * หน้าแสดงรายการยาและการแจ้งเตือนการทานยา (Medication Reminders Page)
 * =============================================================================
 * - แสดงรายการใบสั่งยาและการแจ้งเตือนการทานยาตามที่แพทย์สั่งจ่าย (Prescription Orders)
 * - ผู้ป่วย (Patient): ตรวจสอบตารางการทานยา, คำแนะนำการใช้ยากับอาหาร และสถานะแจ้งเตือน
 * - บุคลากรทางการแพทย์ (Staff): ค้นหา/เลือกดูข้อมูลผู้ป่วย, สั่งจ่ายยา และตรวจสอบประวัติการแพ้ยา
 * =============================================================================
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pill, X, Check, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatProfileName } from '@/lib/profileName';
import {
  createReminder,
  getAvailableMedications,
  getPatientMedicalRecords,
} from '@/services/reminderService';
import type {
  Medication,
  PrescribedMedication,
  Profile,
  MedicalRecord,
} from '@/types/database';
import { getPatients, getProfile } from '@/services/authService';
import { useLocale } from '@/context/LocaleContext';

import {
  PatientOption,
  PatientPrescriptionOrder,
  isUuid,
  PatientMetaBar,
  PrescriptionOrderCard,
  AddMedicationModal,
  AddMedicationFormData,
} from '@/components/reminders';

export default function RemindersPage() {
  // ---------------------------------------------------------------------------
  // 1. ระบบยืนยันตัวตน และการตรวจสอบสิทธิ์การใช้งาน (Auth & Role Check)
  // ---------------------------------------------------------------------------
  const { user, role, isLoading: authLoading } = useAuth();
  const { text } = useLocale();

  // State สำหรับบันทึกตัวเลือกผู้ป่วยที่บุคลากรทางการแพทย์เลือกดู
  const [selectedPatientOverride, setSelectedPatientOverride] = useState<string | null>(null);
  // รายชื่อผู้ป่วยที่โหลดมาจากตาราง profiles (role = 'patient')
  const [dbPatients, setDbPatients] = useState<PatientOption[]>([]);
  // ข้อมูลโปรไฟล์ของผู้ใช้ที่เข้าสู่ระบบอยู่ในขณะนี้
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  // ตรวจสอบสิทธิ์: บุคลากรทางการแพทย์/เจ้าหน้าที่คลินิก
  const effectiveRole = (currentUserProfile?.role || user?.role || role || '')
    .toString()
    .toLowerCase()
    .trim();
  const canManageMedication =
    !authLoading &&
    ['medical', 'staff_admin', 'doctor', 'pharmacist', 'staff', 'admin'].includes(effectiveRole);
  const isPatient = !canManageMedication;

  // โหลดข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน
  useEffect(() => {
    if (user && isUuid(user.id)) {
      getProfile(user.id)
        .then((p) => {
          if (p) setCurrentUserProfile(p);
        })
        .catch((e) => console.warn('Could not fetch user profile:', e));
    }
  }, [user]);

  // ฟังก์ชันโหลดรายชื่อผู้ป่วยทั้งหมดจากฐานข้อมูล Supabase ผ่าน API
  const loadPatients = useCallback(async () => {
    try {
      const patients = await getPatients();
      if (patients && patients.length > 0) {
        const mapped: PatientOption[] = patients.map((p) => ({
          id: p.id,
          name: formatProfileName(p) || 'ไม่ระบุชื่อ',
          studentId: p.student_id || '-',
          allergies: p.allergies || null,
          phone: p.phone || undefined,
        }));
        setDbPatients(mapped);
        return;
      }
      setDbPatients([]);
    } catch (err) {
      console.warn('Could not fetch patients from Supabase profiles API:', err);
      setDbPatients([]);
    }
  }, []);

  // หากเป็นบุคลากร ให้โหลดรายชื่อผู้ป่วยเพื่อใส่ใน Dropdown เลือกผู้ป่วย
  useEffect(() => {
    if (canManageMedication) {
      const frame = requestAnimationFrame(() => {
        void loadPatients();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [canManageMedication, loadPatients]);

  // คำนวณผู้ป่วยที่เลือกอย่างปลอดภัย
  const selectedPatientId = useMemo(() => {
    if (!canManageMedication) {
      return user?.id || '';
    }
    if (selectedPatientOverride) {
      return selectedPatientOverride;
    }
    if (dbPatients.length > 0) {
      return dbPatients[0].id;
    }
    return '';
  }, [canManageMedication, user, selectedPatientOverride, dbPatients]);

  // ---------------------------------------------------------------------------
  // 2. State จัดการข้อมูลและข้อความแจ้งเตือน (Data & Feedback States)
  // ---------------------------------------------------------------------------
  const [availableMeds, setAvailableMeds] = useState<Medication[]>([]);
  const [prescribedMedsForPatient, setPrescribedMedsForPatient] = useState<PrescribedMedication[]>([]);
  const [patientOrders, setPatientOrders] = useState<PatientPrescriptionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ---------------------------------------------------------------------------
  // 3. State สำหรับ Modal สั่งจ่ายยา (Prescribe Modal State)
  // ---------------------------------------------------------------------------
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Helper แสดงข้อความแจ้งเตือนสำเร็จ (Toast Notice)
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => {
      setNotice((curr) => (curr === msg ? '' : curr));
    }, 4000);
  };

  // Helper แสดงข้อความแจ้งเตือนข้อผิดพลาด (Error Alert)
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage((curr) => (curr === msg ? '' : curr));
    }, 5000);
  };

  // รายชื่อผู้ป่วยทั้งหมดที่มีใน database
  const allPatients = useMemo<PatientOption[]>(() => {
    if (!canManageMedication) {
      if (user) {
        return [
          {
            id: user.id,
            name: formatProfileName(currentUserProfile) || user.displayName || user.email || 'ฉัน (บัญชีปัจจุบัน)',
            studentId: currentUserProfile?.student_id || (user as unknown as { student_id?: string }).student_id || 'บัญชีฉัน',
            allergies: currentUserProfile?.allergies || (user as unknown as { allergies?: string | null }).allergies || null,
            phone: currentUserProfile?.phone || (user as unknown as { phone?: string }).phone,
          },
        ];
      }
      return [];
    }

    return dbPatients;
  }, [canManageMedication, user, currentUserProfile, dbPatients]);

  const allPatientsRef = useRef<PatientOption[]>([]);
  allPatientsRef.current = allPatients;

  // ข้อมูลของผู้ป่วยที่กำลังดูอยู่ในปัจจุบัน
  const currentPatient = useMemo<PatientOption>(() => {
    return (
      allPatients.find((p) => p.id === selectedPatientId) ||
      allPatients[0] || {
        id: '',
        name: 'ผู้ป่วย',
        studentId: '-',
        allergies: null,
      }
    );
  }, [allPatients, selectedPatientId]);

  // ---------------------------------------------------------------------------
  // 4. การดึงข้อมูลรายการยาและการแจ้งเตือน (Data Fetching)
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async (patientId: string) => {
    setIsLoading(true);
    try {
      // ดึงรายชื่อยาที่มีทั้งหมดในคลังยาจาก Supabase ผ่าน API
      let meds: Medication[] = [];
      try {
        meds = await getAvailableMedications();
      } catch (e) {
        console.warn('Could not fetch medications from Supabase API:', e);
      }
      setAvailableMeds(meds || []);

      // ดึงรายการประวัติการตรวจและยาที่แพทย์สั่งจ่ายจาก medical_records ของผู้ป่วยรายนี้
      let records: MedicalRecord[] = [];
      try {
        records = await getPatientMedicalRecords(patientId);
      } catch (e) {
        console.warn('Could not fetch medical records from Supabase API:', e);
      }

      const doctorPrescriptions: PrescribedMedication[] = [];
      for (const rec of records || []) {
        if (Array.isArray(rec.prescribed_medications)) {
          doctorPrescriptions.push(...(rec.prescribed_medications as PrescribedMedication[]));
        }
      }
      // จัดกลุ่มและตัดรายการซ้ำตาม medication_id
      const uniquePrescriptionsMap = new Map<string, PrescribedMedication>();
      for (const p of doctorPrescriptions) {
        if (p.medication_id) {
          uniquePrescriptionsMap.set(p.medication_id, p);
        }
      }
      setPrescribedMedsForPatient(Array.from(uniquePrescriptionsMap.values()));

      // สร้างรายการใบสั่งยาสำหรับแสดงผลในการ์ดแจ้งเตือน (Prescription Order Cards)
      const validRecords = (records || []).filter(
        (r) => Array.isArray(r.prescribed_medications) && r.prescribed_medications.length > 0
      );
      const patientInfo = allPatientsRef.current.find((p) => p.id === patientId);
      const orders: PatientPrescriptionOrder[] = validRecords.map((r) => {
        const patientProfile = (r as unknown as { patient?: Profile }).patient;
        const doctorProfile =
          (r as unknown as { doctor?: { profile?: Profile } & Profile }).doctor?.profile ||
          (r as unknown as { doctor?: Profile }).doctor;

        let patientName = formatProfileName(patientProfile);
        if (!patientName) {
          patientName = patientInfo?.name || 'ผู้ป่วยไม่ระบุนาม';
        }
        const patientPhone = patientProfile?.phone || patientInfo?.phone || null;
        const patientStudentId = patientProfile?.student_id || patientInfo?.studentId || null;
        const doctorName = formatProfileName(doctorProfile) || 'นพ.สมชาย ใจดี';

        return {
          id: r.id,
          appointment_id: r.appointment_id,
          patient_id: r.patient_id,
          patient_name: patientName,
          patient_student_id: patientStudentId,
          patient_phone: patientPhone,
          doctor_name: doctorName,
          created_at: r.created_at,
          prescribed_medications: r.prescribed_medications,
        };
      });
      setPatientOrders(orders);
    } catch (err) {
      console.error('Error loading reminders data from Supabase API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // โหลดข้อมูลยาใหม่ทุกครั้งที่ผู้ป่วยที่เลือกเปลี่ยนแปลง
  useEffect(() => {
    void loadData(selectedPatientId);
  }, [loadData, selectedPatientId]);

  // ---------------------------------------------------------------------------
  // 5. การสั่งจ่ายยาและสร้างการแจ้งเตือนใหม่ (Prescribe & Add Reminder)
  // ---------------------------------------------------------------------------
  const handleAddMedication = async (data: AddMedicationFormData) => {
    if (isPatient) {
      showError('บัญชีนี้อยู่ในบทบาทผู้ป่วย ไม่มีสิทธิ์สั่งจ่ายยา');
      return;
    }

    const created = await createReminder({
      user_id: selectedPatientId,
      medication_id: data.medicationId,
      reminder_times: [...data.times].sort(),
      start_date: data.startDate,
      end_date: data.endDate || null,
    });

    if (created) {
      showNotice(
        `บันทึกการจ่ายยา "${created.medication?.name ?? data.chosenMed?.name ?? 'ยา'}" (${data.mealTiming}) ให้ ${currentPatient.name} แล้ว`
      );
    }

    await loadData(selectedPatientId);
  };

  // ---------------------------------------------------------------------------
  // 6. ส่วนแสดงผล UI หน้าเว็บ (JSX Rendering)
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-brand-surface py-6 sm:py-8 px-4 sm:px-6 lg:px-8 xl:px-12 font-sans text-brand-body selection:bg-brand-soft selection:text-brand-ink">
      <div className="w-full max-w-[1720px] mx-auto space-y-6 sm:space-y-8">
        {/* === ส่วนหัวของหน้า (Header & Primary Action) === */}
        <header className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
              {text('รายการยาและการแจ้งเตือน', 'Medications and reminders')}
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              {text('ตารางเวลาและคำแนะนำการรับประทานยาสำหรับผู้ป่วย', 'Your medication schedule and instructions.')}
            </p>
          </div>

          {/* ปุ่มสั่งจ่ายยา (แสดงเฉพาะบุคลากรทางการแพทย์ / เจ้าหน้าที่) */}
          {canManageMedication && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {text('สั่งจ่ายยา', 'Prescribe medication')}
            </button>
          )}
        </header>

        {/* === กล่องแจ้งเตือนผลการทำรายการ (Notification & Error Banners) === */}
        <div aria-live="polite" className="space-y-3 empty:hidden">
          {/* แถบแจ้งเตือนสำเร็จ (Success Notice) */}
          {notice && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {notice}
              </span>
              <button
                type="button"
                onClick={() => setNotice('')}
                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                aria-label={text('ปิดแจ้งเตือน', 'Dismiss notification')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* แถบแจ้งเตือนข้อผิดพลาด (Error Alert) */}
          {errorMessage && (
            <div
              className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
              role="alert"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                {errorMessage}
              </span>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="rounded-lg p-1 text-rose-700 hover:bg-rose-100 cursor-pointer"
                aria-label={text('ปิดข้อความแจ้งเตือน', 'Dismiss message')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* === ข้อมูลผู้ป่วย ตัวเลือกสลับผู้ป่วย (Patient Meta Bar) === */}
        <PatientMetaBar
          currentPatient={currentPatient}
          allPatients={allPatients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={(id) => setSelectedPatientOverride(id)}
          canManageMedication={canManageMedication}
          orderCount={patientOrders.length}
        />

        {/* === รายการใบสั่งยาและการ์ดแจ้งเตือน (Prescription Cards List) === */}
        <section aria-label={text('รายการยาและการแจ้งเตือน', 'Medications and reminders')} aria-busy={isLoading}>
          {/* สถานะกำลังโหลด (Loading Skeleton) */}
          {isLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-brand-border-soft bg-white p-5 animate-pulse flex items-center justify-between"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-11 h-11 bg-brand-soft rounded-xl"></div>
                    <div className="space-y-2.5">
                      <div className="h-4 w-48 bg-brand-soft rounded"></div>
                      <div className="h-3 w-32 bg-brand-surface rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-brand-soft rounded-full"></div>
                </div>
              ))}
            </div>
          ) : patientOrders.length > 0 ? (
            /* แสดงรายการใบสั่งยาในรูปแบบการ์ดแจ้งเตือน (Prescription Order Cards) */
            <div className="space-y-6">
              {patientOrders.map((order) => (
                <PrescriptionOrderCard
                  key={order.id}
                  order={order}
                  availableMeds={availableMeds}
                />
              ))}
            </div>
          ) : (
            /* กรณีไม่มีรายการยาในระบบเลย (Empty State) */
            <div className="rounded-2xl border border-dashed border-brand-border-strong p-10 text-center space-y-4 bg-white/40">
              <div className="w-12 h-12 rounded-full bg-brand-soft text-brand-strong mx-auto flex items-center justify-center">
                <Pill size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-ink">
                  {isPatient
                    ? text('คุณยังไม่มีรายการยาในระบบ', 'You do not have any medications yet.')
                    : text(`ยังไม่มีรายการยาสำหรับ ${currentPatient.name}`, `There are no medications for ${currentPatient.name} yet.`)}
                </h3>
                <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-md mx-auto">
                  {isPatient
                    ? text('เมื่อแพทย์สั่งจ่ายยา รายการยาและเวลาแจ้งเตือนจะแสดงที่นี่', 'Medications and reminder times will appear here after your clinician prescribes them.')
                    : text('กดปุ่ม "สั่งจ่ายยา" เพื่อบันทึกรายการยาและตั้งเวลาเตือน', 'Select “Prescribe medication” to record a medication and set a reminder.')}
                </p>
              </div>
              {canManageMedication && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white hover:bg-brand-hover cursor-pointer"
                  >
                    <Plus size={16} /> {text('สั่งจ่ายยา', 'Prescribe medication')}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* =======================================================================
          7. Modal: สั่งจ่ายยาและเพิ่มการแจ้งเตือนยาใหม่ (Prescribe Medication Modal)
          ======================================================================= */}
      <AddMedicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentPatient={currentPatient}
        prescribedMedsForPatient={prescribedMedsForPatient}
        availableMeds={availableMeds}
        onSubmit={handleAddMedication}
        onError={showError}
      />
    </div>
  );
}
