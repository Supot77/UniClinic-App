'use client';

import React, { useState } from 'react';
import { X, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Medication, PrescribedMedication } from '@/types/database';
import type { PatientOption } from './types';
import { inputClass, getMealTimingForMed } from './utils';

export interface AddMedicationFormData {
  medicationId: string;
  mealTiming: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  chosenMed?: Medication;
}

export interface AddMedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: PatientOption;
  prescribedMedsForPatient: PrescribedMedication[];
  availableMeds: Medication[];
  onSubmit: (data: AddMedicationFormData) => Promise<void>;
  onError: (msg: string) => void;
}

/**
 * หน้าต่าง Modal สั่งจ่ายยาและตั้งเวลาเตือนใหม่ (Prescribe Medication Modal)
 */
export function AddMedicationModal({
  isOpen,
  onClose,
  currentPatient,
  prescribedMedsForPatient,
  availableMeds,
  onSubmit,
  onError,
}: AddMedicationModalProps) {
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedMealTiming, setSelectedMealTiming] = useState<string>('หลังอาหาร');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['08:00', '18:00']);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedMedId('');
    setSelectedMealTiming('หลังอาหาร');
    setSelectedTimes(['08:00', '18:00']);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // เปลี่ยนตัวยาที่เลือก (พร้อมวิเคราะห์เวลามื้อยาและรอบเวลาอัตโนมัติ)
  const handleMedSelectChange = (medId: string) => {
    setSelectedMedId(medId);
    const prescribed = prescribedMedsForPatient.find((p) => p.medication_id === medId);
    const chosen = availableMeds.find((m) => m.id === medId);

    if (prescribed) {
      // 1. วิเคราะห์มื้ออาหารจาก frequency ของแพทย์ หรือจากชื่อยา
      const freq = prescribed.frequency || '';
      let timing = 'หลังอาหาร';
      if (freq.includes('ก่อนอาหาร')) timing = 'ก่อนอาหาร';
      else if (freq.includes('ก่อนนอน')) timing = 'ก่อนนอน';
      else if (freq.includes('พร้อมอาหาร')) timing = 'พร้อมอาหาร';
      else if (chosen) timing = getMealTimingForMed(chosen.name, chosen.category, chosen.description);
      else timing = getMealTimingForMed(prescribed.name);
      setSelectedMealTiming(timing);

      // 2. วิเคราะห์รอบเวลาทานยาจากความถี่ที่แพทย์สั่ง
      if (freq.includes('วันละ 4 ครั้ง') || freq.includes('4 ครั้ง')) {
        setSelectedTimes(['08:00', '12:00', '18:00', '21:00']);
      } else if (freq.includes('วันละ 3 ครั้ง') || freq.includes('3 ครั้ง')) {
        setSelectedTimes(['08:00', '12:00', '18:00']);
      } else if (freq.includes('วันละ 2 ครั้ง') || freq.includes('2 ครั้ง')) {
        setSelectedTimes(['08:00', '18:00']);
      } else if (freq.includes('ก่อนนอน') || (freq.includes('1 ครั้ง') && timing === 'ก่อนนอน')) {
        setSelectedTimes(['21:00']);
      } else if (freq.includes('วันละ 1 ครั้ง') || freq.includes('1 ครั้ง')) {
        setSelectedTimes(['08:00']);
      } else {
        setSelectedTimes(['08:00', '18:00']);
      }

      // 3. คำนวณวันสิ้นสุดจาก duration_days ที่แพทย์สั่ง
      if (prescribed.duration_days && prescribed.duration_days > 0) {
        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + prescribed.duration_days);
        setEndDate(end.toISOString().split('T')[0]);
      }
    } else if (chosen) {
      setSelectedMealTiming(getMealTimingForMed(chosen.name, chosen.category, chosen.description));
    }
  };

  const toggleTimeSelection = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) {
      onError('กรุณาเลือกตัวยาที่ต้องการจ่าย');
      return;
    }
    if (selectedTimes.length === 0) {
      onError('กรุณาเลือกรอบเวลาอย่างน้อย 1 ช่วงเวลา');
      return;
    }

    const chosenMed = availableMeds.find((m) => m.id === selectedMedId);

    // ระบบแจ้งเตือนความปลอดภัย: ตรวจสอบประวัติการแพ้ยาของผู้ป่วย
    if (currentPatient.allergies && chosenMed) {
      const allergyLower = currentPatient.allergies.toLowerCase();
      const medNameLower = chosenMed.name.toLowerCase();
      if (
        (allergyLower.includes('penicillin') || allergyLower.includes('เพนิซิลลิน')) &&
        (medNameLower.includes('amoxicillin') || medNameLower.includes('penicillin'))
      ) {
        const proceed = confirm(
          `⚠️ คำเตือนความปลอดภัย:\nผู้ป่วยมีประวัติ ${currentPatient.allergies}\nยานี้คือ ${chosenMed.name}\nคุณแน่ใจหรือไม่ว่าต้องการจ่ายยานี้?`
        );
        if (!proceed) return;
      }
    }

    setIsSaving(true);
    try {
      await onSubmit({
        medicationId: selectedMedId,
        mealTiming: selectedMealTiming,
        times: selectedTimes,
        startDate,
        endDate: endDate || null,
        chosenMed,
      });
      handleClose();
    } catch (err: unknown) {
      console.error('Error handling add submit via API:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      onError(`เกิดข้อผิดพลาดในการทำรายการ: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-brand-hero border border-brand-border-soft animate-in zoom-in-95 duration-150">
        {/* ส่วนหัวของ Modal */}
        <div className="flex items-center justify-between border-b border-brand-border-soft pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-ink">
              สั่งจ่ายยาและตั้งเวลาเตือน
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              สำหรับผู้ป่วย: <span className="font-semibold text-brand-ink">{currentPatient.name}</span> ({currentPatient.studentId})
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-brand-muted hover:text-brand-ink p-1 rounded-lg transition cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        {/* แถบเตือนประวัติการแพ้ยาของผู้ป่วยก่อนสั่งจ่ายยา */}
        {currentPatient.allergies && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>ประวัติการแพ้ยา: {currentPatient.allergies}</span>
          </div>
        )}

        {/* ฟอร์มกรอกข้อมูลการสั่งจ่ายยา */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* ช่องเลือกตัวยาที่แพทย์สั่งจ่ายจาก medical_records */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-brand-ink">
                เลือกรายการยาที่แพทย์สั่งจ่าย *
              </label>
              {prescribedMedsForPatient.length > 0 && (
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  แพทย์สั่งจ่าย {prescribedMedsForPatient.length} รายการ
                </span>
              )}
            </div>
            <select
              required
              value={selectedMedId}
              onChange={(e) => handleMedSelectChange(e.target.value)}
              className={inputClass}
              disabled={prescribedMedsForPatient.length === 0}
            >
              <option value="">
                {prescribedMedsForPatient.length > 0
                  ? 'เลือกยาที่แพทย์สั่งจ่าย'
                  : 'ไม่มีรายการยาที่แพทย์สั่งจ่ายสำหรับผู้ป่วยรายนี้'}
              </option>
              {prescribedMedsForPatient.map((item, idx) => (
                <option key={`${item.medication_id}-${idx}`} value={item.medication_id}>
                  {item.name} · {item.dosage} ({item.frequency || 'ตามแพทย์สั่ง'}{item.duration_days ? ` · ${item.duration_days} วัน` : ''})
                </option>
              ))}
            </select>
            {prescribedMedsForPatient.length === 0 ? (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">ไม่พบรายการยาที่แพทย์สั่งจ่าย</p>
                  <p className="mt-0.5 text-amber-700">
                    ยังไม่มีประวัติการสั่งยาจากแพทย์สำหรับผู้ป่วยรายนี้ ระบบจะแสดงและตั้งเตือนได้เฉพาะยาที่แพทย์สั่งจ่ายเท่านั้น
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-brand-muted mt-1">
                แสดงเฉพาะรายการยาที่แพทย์ระบุในใบสั่งยาของผู้ป่วยรายนี้
              </p>
            )}
          </div>

          {/* ช่องเลือกการใช้ยากับอาหาร */}
          <div>
            <label className="block text-xs font-semibold text-brand-ink mb-1.5">
              วิธีรับประทานกับมื้ออาหาร *
            </label>
            <select
              required
              value={selectedMealTiming}
              onChange={(e) => setSelectedMealTiming(e.target.value)}
              className={inputClass}
            >
              <option value="หลังอาหาร">หลังอาหาร (ทันที หรือ 15-30 นาที)</option>
              <option value="ก่อนอาหาร">ก่อนอาหาร (30 นาที)</option>
              <option value="พร้อมอาหาร">พร้อมอาหาร</option>
              <option value="ก่อนนอน">ก่อนนอน</option>
              <option value="ไม่ขึ้นกับมื้ออาหาร">ไม่ขึ้นกับมื้ออาหาร</option>
            </select>
          </div>

          {/* ช่องเลือกรอบเวลาที่ต้องทานยา */}
          <div>
            <label className="block text-xs font-semibold text-brand-ink mb-2">
              รอบเวลาทานยา *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'เช้า (08:00 น.)', time: '08:00' },
                { label: 'กลางวัน (12:00 น.)', time: '12:00' },
                { label: 'เย็น (18:00 น.)', time: '18:00' },
                { label: 'ก่อนนอน (21:00 น.)', time: '21:00' },
              ].map((slot) => {
                const isSelected = selectedTimes.includes(slot.time);
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => toggleTimeSelection(slot.time)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition text-left cursor-pointer ${
                      isSelected
                        ? 'border-brand-strong bg-brand-soft text-brand-strong font-semibold'
                        : 'border-brand-border-soft bg-white text-brand-body hover:border-brand-border-strong'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isSelected
                          ? 'bg-brand-strong border-brand-strong text-white'
                          : 'border-brand-border-strong bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                    <span>{slot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* วันที่เริ่มต้น และวันที่สิ้นสุดการทานยา */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                วันที่สิ้นสุด (ไม่บังคับ)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
              <p className="text-[11px] text-brand-muted mt-1">
                {endDate ? `สิ้นสุดวันที่ ${endDate}` : 'เว้นว่างไว้หากรับประทานต่อเนื่อง'}
              </p>
            </div>
          </div>

          {/* ปุ่มยกเลิก และปุ่มบันทึกการสั่งจ่ายยา */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-soft">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-brand-muted hover:text-brand-ink hover:bg-brand-soft rounded-lg transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving || prescribedMedsForPatient.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'กำลังบันทึก…' : 'บันทึกการจ่ายยา'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddMedicationModal;

