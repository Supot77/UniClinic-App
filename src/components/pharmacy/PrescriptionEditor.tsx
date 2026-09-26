'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Medication } from '@/types/database';
import type { PrescribedMedItem, PrescriptionOrder } from './PrescriptionsTab';
import { changePharmacyPrescription } from '@/services/pharmacyPrescriptionService';

const field = 'mt-1.5 h-11 w-full rounded-xl border border-brand-border-soft bg-white px-3 text-sm text-brand-ink focus:border-brand-strong focus:outline-none focus:ring-2 focus:ring-brand-soft';

export default function PrescriptionEditor({ order, medications, onClose, onSaved }: {
  order: PrescriptionOrder; medications: Medication[]; onClose: () => void;
  onSaved: (items: PrescribedMedItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState(() => order.prescribed_medications.map((item) => ({ ...item })));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  const change = (index: number, value: Partial<PrescribedMedItem>) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...value } : item));
  const active = medications.filter((med) => med.is_active);
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs sm:p-6">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="prescription-edit-title"
      className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl outline-none"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key !== 'Tab') return;
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? []);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="flex items-start justify-between gap-4 border-b border-brand-border-soft p-5 sm:p-6">
        <div><h2 id="prescription-edit-title" className="text-xl font-bold text-brand-ink">แก้ไขใบสั่งยา</h2>
          <p className="mt-1 text-sm text-brand-muted">{order.patient_name} · เปลี่ยนยา จำนวน และวิธีใช้ก่อนจ่าย</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="ปิดการแก้ไขใบสั่งยา" className="rounded-lg px-3 py-2 text-brand-body hover:bg-brand-soft">✕</button>
      </header>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!items.length || new Set(items.map((item) => item.medication_id)).size !== items.length) { setError('ต้องมีรายการยาและห้ามเลือกยาซ้ำ'); return; }
        if (items.some((item) => !active.some((med) => med.id === item.medication_id))) { setError('กรุณาเลือกยาในคลังที่เปิดใช้งานให้ครบ'); return; }
        setBusy(true); setError('');
        try {
          const saved = await changePharmacyPrescription({ recordId: order.id, expected: order.prescribed_medications, items, reason, action: 'edit' });
          await onSaved(saved); onClose();
        } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกใบสั่งยาไม่สำเร็จ'); }
        finally { setBusy(false); }
      }}>
        <fieldset disabled={busy} className="space-y-4 p-5 sm:p-6">
          <p className="rounded-xl bg-brand-surface p-3 text-xs leading-5 text-brand-body">การแก้ใบสั่งยาไม่เพิ่มหรือตัดสต็อก ระบบบันทึกผู้แก้ เหตุผล และข้อมูลก่อน–หลังไว้ตรวจสอบ</p>
          {items.map((item, index) => <section key={index} className="space-y-4 rounded-2xl border border-brand-border-soft p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-brand-ink">รายการที่ {index + 1}</h3><button type="button" onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))} className="text-xs text-rose-700">ลบรายการที่ {index + 1}</button></div>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <label className="text-xs text-brand-body">ยา รายการที่ {index + 1}
                <select required className={field} value={item.medication_id} onChange={(e) => change(index, { medication_id: e.target.value, name: active.find((med) => med.id === e.target.value)?.name ?? '' })}>
                  <option value="">เลือกยาในคลัง</option>
                  {!active.some((med) => med.id === item.medication_id) && item.medication_id && <option value={item.medication_id} disabled>ไม่พบ/พักใช้งาน: {item.name}</option>}
                  {active.map((med) => <option key={med.id} value={med.id}>{med.name} {med.dosage ?? ''} · คงเหลือ {med.stock} {med.unit}</option>)}
                </select>
              </label>
              <label className="text-xs text-brand-body">จำนวนที่สั่ง รายการที่ {index + 1}<input className={field} required type="number" min="1" max="100000" step="1" value={item.quantity || ''} onChange={(e) => change(index, { quantity: Number(e.target.value) })} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-brand-body">ขนาดต่อครั้ง<input className={field} required maxLength={500} value={item.dosage} onChange={(e) => change(index, { dosage: e.target.value })} /></label>
              <label className="text-xs text-brand-body">วิธีใช้ / ความถี่<input className={field} required maxLength={500} value={item.frequency} onChange={(e) => change(index, { frequency: e.target.value })} /></label>
              <label className="text-xs text-brand-body">จำนวนวัน<input className={field} required type="number" min="1" max="365" step="1" value={item.duration_days || ''} onChange={(e) => change(index, { duration_days: Number(e.target.value) })} /></label>
            </div>
          </section>)}
          <button type="button" disabled={items.length >= 50} onClick={() => setItems((rows) => [...rows, { medication_id: '', name: '', dosage: '', frequency: '', duration_days: 1, quantity: 1 }])} className="rounded-xl border border-dashed border-brand-strong px-4 py-3 text-sm font-semibold text-brand-strong">+ เพิ่มรายการยา</button>
          <label className="block text-sm text-brand-body">เหตุผลการแก้ไขใบสั่งยา<textarea required maxLength={1000} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-brand-border-soft p-3" placeholder="เช่น รายการเดิมถูกลบจากคลัง จึงเลือกข้อมูลยาที่ถูกต้อง" /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        </fieldset>
        <footer className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-border-soft bg-white p-4">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-brand-border-soft px-4 py-3 text-sm text-brand-body">ยกเลิก</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-brand-strong px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'บันทึกใบสั่งยา'}</button>
        </footer>
      </form>
    </div>
  </div>, document.body);
}
