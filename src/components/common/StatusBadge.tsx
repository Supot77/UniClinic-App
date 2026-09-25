'use client';

import type { AppointmentStatus } from '@/types/database';
import { useLocale } from '@/context/LocaleContext';

const statusConfig: Record<AppointmentStatus, { thai: string; english: string; className: string }> = {
  pending: { thai: 'รอยืนยัน', english: 'Pending', className: 'bg-status-warning-bg text-status-warning' },
  confirmed: { thai: 'ยืนยันแล้ว', english: 'Confirmed', className: 'bg-status-info-bg text-status-info' },
  in_progress: { thai: 'กำลังตรวจ', english: 'In progress', className: 'bg-status-info-bg text-status-info' },
  completed: { thai: 'ตรวจเสร็จ', english: 'Completed', className: 'bg-status-success-bg text-status-success' },
  cancelled: { thai: 'ยกเลิก', english: 'Cancelled', className: 'bg-status-neutral-bg text-status-neutral' },
  no_show: { thai: 'ไม่มาตามนัด', english: 'Missed', className: 'bg-status-critical-bg text-status-critical' },
  rejected: { thai: 'ปฏิเสธ', english: 'Rejected', className: 'bg-status-critical-bg text-status-critical' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];
  const { text } = useLocale();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {text(config.thai, config.english)}
    </span>
  );
}
