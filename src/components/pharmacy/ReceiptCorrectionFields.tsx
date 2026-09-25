import type { Medication, MedicationProcurement } from '@/types/database';

export default function ReceiptCorrectionFields({ order, medications, quantity, onQuantity, reason, onReason }: {
  order: MedicationProcurement; medications: Medication[]; quantity: number; onQuantity: (value: number) => void;
  reason: string; onReason: (value: string) => void;
}) {
  const stock = medications.find((med) => med.id === order.medication_id)?.stock;
  const delta = quantity - (order.received_units ?? order.total_units);
  return <section className="space-y-4 rounded-2xl border border-brand-border-soft bg-brand-surface p-5">
    <div><h4 className="font-semibold text-brand-ink">แก้ไขการรับเข้าคลัง</h4><p className="mt-1 text-xs leading-5 text-brand-muted">ปรับเฉพาะส่วนต่างของจำนวนที่รับจริง โดยคงยาและหน่วยเดิม</p></div>
    <label className="block text-sm text-brand-body">จำนวนรับเข้าที่ถูกต้อง ({order.unit})
      <input type="number" min="1" step="1" required value={quantity || ''} onChange={(e) => onQuantity(Number(e.target.value))} className="mt-2 h-11 w-full rounded-xl border border-brand-border-soft bg-white px-3" />
    </label>
    <div className="rounded-xl bg-white p-4 text-sm text-brand-ink">
      <p>รับเข้าเดิม {(order.received_units ?? order.total_units).toLocaleString()} {order.unit}</p>
      <p className="mt-2 font-semibold">สต็อก {stock ?? '—'} → {stock === undefined ? '—' : stock + delta} {order.unit}</p>
      <p className="mt-1 text-xs text-brand-muted">ส่วนต่าง {delta > 0 ? '+' : ''}{delta} {order.unit} · ตรวจยอดจริงอีกครั้งตอนบันทึก</p>
    </div>
    <label className="block text-sm text-brand-body">เหตุผลการแก้ไข
      <textarea required maxLength={1000} rows={3} value={reason} onChange={(e) => onReason(e.target.value)} className="mt-2 w-full rounded-xl border border-brand-border-soft bg-white p-3" placeholder="เช่น ตรวจรับจริง 24 ขวด แต่บันทึกไว้ 12 ขวด" />
    </label>
  </section>;
}
