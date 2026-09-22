'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Toast from '@/components/common/Toast';
import { getPatientMedicalRecords, getReminders } from '@/services/reminderService';

export default function LoginToastListener() {
  const { user, role, isLoading } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;

    if (typeof window === 'undefined') return;

    const isPending = sessionStorage.getItem('login_welcome_toast');
    if (!isPending) return;

    sessionStorage.removeItem('login_welcome_toast');
    const userRole = (role || user.role || '').toString().toLowerCase();

    if (userRole !== 'patient') return;

    let isMounted = true;

    async function loadReminderToast() {
      const patientId = user!.id;
      const medNames: string[] = [];

      // 1. ดึงรายการยาที่แพทย์สั่งจ่ายจาก medical_records ใน Supabase ผ่าน API
      try {
        const records = await getPatientMedicalRecords(patientId);
        for (const r of records || []) {
          if (Array.isArray(r.prescribed_medications)) {
            for (const p of r.prescribed_medications) {
              if (p.name && !medNames.includes(p.name)) {
                medNames.push(p.name);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch medical records for reminder toast from Supabase API:', err);
      }

      // 2. ดึงรายการแจ้งเตือนยาจาก medication_reminders ใน Supabase ผ่าน API
      try {
        const reminders = await getReminders(patientId);
        for (const rem of reminders || []) {
          if (rem.status !== 'paused' && rem.medication?.name) {
            if (!medNames.includes(rem.medication.name)) {
              medNames.push(rem.medication.name);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch reminders for reminder toast from Supabase API:', err);
      }

      if (!isMounted) return;

      if (medNames.length > 0) {
        const medListText =
          medNames.slice(0, 2).join(', ') +
          (medNames.length > 2 ? ` และอีก ${medNames.length - 2} รายการ` : '');
        setToastMessage(`แจ้งเตือนยา: ${medListText}`);
      } else {
        setToastMessage('แจ้งเตือนยา: ไม่มีรายการยาที่ต้องทานในขณะนี้');
      }
    }

    void loadReminderToast();

    return () => {
      isMounted = false;
    };
  }, [user, role, isLoading]);

  if (!toastMessage) return null;

  return (
    <Toast
      message={toastMessage}
      onDismiss={() => setToastMessage(null)}
      variant="info"
      position="top-right"
      duration={4500}
    />
  );
}
