import type { AppointmentStatus } from '@/types/database';

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'รอยืนยัน', className: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'ยืนยันแล้ว', className: 'bg-sky-50 text-sky-700' },
  in_progress: { label: 'กำลังตรวจ', className: 'bg-indigo-50 text-indigo-700' },
  completed: { label: 'ตรวจเสร็จ', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-zinc-100 text-zinc-500' },
  no_show: { label: 'ไม่มาตามนัด', className: 'bg-red-50 text-red-700' },
  rejected: { label: 'ปฏิเสธ', className: 'bg-red-50 text-red-700' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
