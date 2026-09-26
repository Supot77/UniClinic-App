'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PatientOption } from './types';
import { useLocale } from '@/context/LocaleContext';

export interface PatientMetaBarProps {
  currentPatient: PatientOption;
  allPatients: PatientOption[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  canManageMedication: boolean;
  orderCount?: number;
}

/**
 * แถบแสดงข้อมูลผู้ป่วยด้านบน: Avatar, ชื่อ, รหัสนักศึกษา, เบอร์โทร, ป้ายจำนวนใบสั่งยา, ป้ายเตือนแพ้ยา และ Dropdown สลับผู้ป่วยสำหรับเจ้าหน้าที่
 */
export function PatientMetaBar({
  currentPatient,
  allPatients,
  selectedPatientId,
  onSelectPatient,
  canManageMedication,
  orderCount = 0,
}: PatientMetaBarProps) {
  const patientInitial = currentPatient.name ? currentPatient.name.charAt(0) : 'ผ';
  const { text } = useLocale();

  return (
    <section
      aria-label={text('ข้อมูลผู้ป่วย', 'Patient information')}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-brand-border-soft text-sm"
    >
      {/* ฝั่งซ้าย: ข้อมูลผู้ป่วยปัจจุบัน (ชื่อ, รหัสนักศึกษา, เบอร์โทร, ป้ายจำนวนใบสั่งยา) */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
         {/* แก้ไข Avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-soft text-brand-strong font-bold text-sm flex items-center justify-center border border-brand-border-soft shrink-0">
          {patientInitial}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-brand-ink text-base">{currentPatient.name}</span>
          <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {currentPatient.studentId}
          </span>
          {currentPatient.phone && (
            <span className="text-xs text-brand-muted">
              · {text('โทร:', 'Phone:')} {currentPatient.phone}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">
            {text(`ใบสั่งยา ${orderCount} รายการ`, `${orderCount} prescriptions`)}
          </span>
        </div>
      </div>

      {/* ฝั่งขวา: ตัวเลือกเปลี่ยนผู้ป่วยสำหรับเจ้าหน้าที่ และแถบเตือนประวัติแพ้ยา */}
      {(canManageMedication || currentPatient.allergies) && (
        <div className="flex flex-wrap items-center gap-3">
          {/* แถบเตือนประวัติการแพ้ยา (Allergy Badge) */}
          {currentPatient.allergies && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-1.5 text-xs font-semibold">
              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
              <span>{text('ประวัติการแพ้ยา:', 'Medication allergies:')} {currentPatient.allergies}</span>
            </div>
          )}

          {canManageMedication && (
            <label className="flex items-center gap-2 text-sm text-brand-body">
              <span className="text-xs font-semibold text-brand-ink whitespace-nowrap">{text('ผู้ป่วย:', 'Patient:')}</span>
              <select
                value={selectedPatientId}
                onChange={(e) => onSelectPatient(e.target.value)}
                className="h-10 rounded-lg border border-brand-border-strong bg-white px-3 text-xs text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
              >
                {allPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.studentId}) {p.allergies ? `[⚠️ ${p.allergies}]` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </section>
  );
}

export default PatientMetaBar;
