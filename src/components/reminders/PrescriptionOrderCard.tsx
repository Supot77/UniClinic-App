'use client';

/**
 * =============================================================================
 * ไฟล์: PrescriptionOrderCard.tsx
 * =============================================================================
 * การ์ดแสดงรายการใบสั่งยาและการแจ้งเตือนการทานยา (Prescription Order Card)
 * 
 * ส่วนประกอบภายในไฟล์นี้:
 * 1. ส่วนหัวการ์ด (Order Header):
 *    - ข้อมูลแพทย์ผู้สั่งตรวจและสั่งยา (Doctor Name)
 *    - วันที่และเวลาที่บันทึกคำสั่งยา (Created DateTime ฟอร์แมตไทย/อังกฤษ)
 *    - ป้ายสถานะแจ้งเตือนสีเขียว "แจ้งกินยา" (Medication Reminders Status Badge)
 * 2. แถบเตือนสต็อกยา (Stock Shortage Warning):
 *    - ขึ้นเตือนเมื่อพบว่ายาบางตัวมีจำนวนในคลังน้อยกว่าที่แพทย์สั่งจ่าย
 * 3. ตารางรายการยาตามใบสั่ง (Medications Table):
 *    - รายการยาและเวชภัณฑ์: ชื่อยาและประเภทยา (เช่น Tablet, Capsule)
 *    - ขนาดยาและวิธีใช้: Dosage, Frequency (ก่อน/หลังอาหาร), และ Duration Days
 *    - จำนวนที่สั่ง: ตัวเลขจำนวนยาที่จ่าย
 *    - สถานะการจ่าย: ป้าย "พร้อมจ่าย", "สต็อกขาด X หน่วย", หรือ "ไม่พบยาในคลัง"
 * =============================================================================
 */

import React from 'react';
import {
  User,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Pill,
  AlertTriangle,
} from 'lucide-react';
import type { Medication } from '@/types/database';
import type { PatientPrescriptionOrder } from './types';
import { formatDisplayDateTime } from './utils';
import { useLocale } from '@/context/LocaleContext';

export interface PrescriptionOrderCardProps {
  order: PatientPrescriptionOrder;
  availableMeds?: Medication[];
}

/**
 * การ์ดแสดงรายการใบสั่งยาตามแพทย์สั่ง (Prescription Order Card)
 * - ส่วนหัว: ข้อมูลผู้ป่วย, ข้อมูลแพทย์, วันที่และเวลาที่สั่ง, ป้าย "แจ้งกินยา"
 * - ตารางรายการยาตามใบสั่ง: รายการยา, ขนาดยาและวิธีใช้, จำนวนที่สั่ง, สถานะการจ่ายยา
 */
export function PrescriptionOrderCard({
  order,
  availableMeds = [],
}: PrescriptionOrderCardProps) {
  const { locale, text } = useLocale();
  const hasShortage = order.prescribed_medications.some((item) => {
    const med = availableMeds.find(
      (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
    );
    return med ? med.stock < item.quantity : false;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border-soft bg-white shadow-xs transition hover:border-brand-border-strong">
      {/* Order Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <Stethoscope className="h-4 w-4 text-sky-600" />
            {text('สั่งจ่ายโดย:', 'Prescribed by:')} <strong>{order.doctor_name}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDisplayDateTime(order.created_at, locale)}
          </span>
        </div>

        {/* Status Badge: "แจ้งกินยา" */}
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="h-4 w-4" />
            {text('แจ้งกินยา', 'Medication reminders')}
          </span>
        </div>
      </div>

      {/* Medications Table */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-sky-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {text(`รายการยาตามใบสั่ง (${order.prescribed_medications.length} รายการ)`, `Prescribed medications (${order.prescribed_medications.length})`)}
            </h4>
          </div>
          {hasShortage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {text('สต็อกยาไม่พอสำหรับบางรายการ', 'Some medications are out of stock.')}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">{text('รายการยาและเวชภัณฑ์', 'Medication')}</th>
                <th className="px-3.5 py-2.5 font-semibold">{text('ขนาดยาและวิธีใช้', 'Dose and instructions')}</th>
                <th className="px-3.5 py-2.5 font-semibold text-center">{text('จำนวนที่สั่ง', 'Quantity')}</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">{text('สถานะการจ่าย', 'Dispensing status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {order.prescribed_medications.map((item, idx) => {
                const med = availableMeds.find(
                  (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
                );
                const currentStock = med ? med.stock : 0;
                const isSufficient = med ? currentStock >= item.quantity : false;

                return (
                  <tr key={`${item.medication_id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2.5 font-medium text-slate-900">
                      {item.name}
                      {med?.type && (
                        <span className="ml-1.5 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {med.type}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600">
                      <div>{item.dosage}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.frequency} {item.duration_days ? `· ${item.duration_days} ${text('วัน', 'days')}` : ''}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {!med ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {text('ไม่พบยาในคลัง', 'Not in stock')}
                        </span>
                      ) : isSufficient ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <CheckCircle2 className="h-3 w-3" />
                          {text('พร้อมจ่าย', 'Available')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                          <AlertTriangle className="h-3 w-3" />
                          {text(`สต็อกขาด ${item.quantity - currentStock}`, `Short by ${item.quantity - currentStock}`)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionOrderCard;
