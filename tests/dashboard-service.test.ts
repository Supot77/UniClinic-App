import { beforeEach, describe, expect, it, vi } from 'vitest';

const { database, supabaseMock } = vi.hoisted(() => {
  const tables: Record<string, Array<Record<string, unknown>>> = {};
  const upsertCalls: Array<{ values: unknown; options: unknown }> = [];
  const from = vi.fn((table: string) => {
    let rows = [...(tables[table] ?? [])];
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: unknown) => { rows = rows.filter((row) => row[column] === value); return query; }),
      in: vi.fn((column: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[column])); return query; }),
      is: vi.fn((column: string, value: unknown) => { rows = rows.filter((row) => row[column] === value || (value === null && row[column] == null)); return query; }),
      gte: vi.fn((column: string, value: unknown) => { rows = rows.filter((row) => String(row[column]) >= String(value)); return query; }),
      lte: vi.fn((column: string, value: unknown) => { rows = rows.filter((row) => String(row[column]) <= String(value)); return query; }),
      order: vi.fn((column: string, options?: { ascending?: boolean }) => {
        rows.sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (options?.ascending === false ? -1 : 1));
        return query;
      }),
      limit: vi.fn((limit: number) => { rows = rows.slice(0, limit); return query; }),
      upsert: vi.fn((values: unknown, options: unknown) => { upsertCalls.push({ values, options }); return query; }),
      single: vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error: null })),
      then: (resolve: (value: { data: typeof rows; error: null }) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return query;
  });
  return { database: tables, supabaseMock: { rpc: vi.fn(), from, upsertCalls } };
});

vi.mock('@/utils/supabase/client', () => ({ createClient: () => supabaseMock }));

import {
  deleteStaffProfile,
  getBroadcastHistory,
  getDashboardView,
  getNotifications,
  getUnreadNotificationRecipients,
  getStaffProfileDirectory,
  recordPatientMedicationTaken,
  requestPatientAppointmentCancellation,
  sendBroadcast,
} from '@/services/dashboardService';

const profileRow = (id: string, firstName: string, lastName: string, role: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: null,
  first_name: firstName,
  last_name: lastName,
  role,
  is_active: true,
  ...extra,
});

describe('Supabase Broadcast service', () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockClear();
    supabaseMock.upsertCalls.length = 0;
    for (const table of Object.keys(database)) delete database[table];
  });

  it('sends a clinic-wide Broadcast through the database RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{ recipient_count: 17, created: true }],
      error: null,
    });

    await expect(sendBroadcast('แจ้งปิดคลินิก', 'คลินิกปิดเวลา 16:00 น.', 'request-1')).resolves.toEqual({
      recipientCount: 17,
      created: true,
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith('send_broadcast', {
      p_title: 'แจ้งปิดคลินิก',
      p_message: 'คลินิกปิดเวลา 16:00 น.',
      p_request_key: 'request-1',
    });
  });

  it('maps database Broadcast history for the staff dashboard', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{
        id: 'broadcast-1',
        title: 'ประกาศ',
        message: 'ข้อความ',
        sent_at: '2026-09-08T03:00:00.000Z',
        recipient_count: 17,
        read_count: 6,
        role_read_counts: {
          patient: { read: 3, total: 10 },
          medical: { read: 2, total: 4 },
          staff_admin: { read: 1, total: 3 },
        },
      }],
      error: null,
    });

    await expect(getBroadcastHistory()).resolves.toEqual([{
      id: 'broadcast-1',
      title: 'ประกาศ',
      message: 'ข้อความ',
      sentAt: '2026-09-08T03:00:00.000Z',
      recipientCount: 17,
      readCount: 6,
      roleReadCounts: {
        patient: { read: 3, total: 10 },
        medical: { read: 2, total: 4 },
        staff_admin: { read: 1, total: 3 },
      },
    }]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_broadcast_history', { p_limit: 20 });
  });

  it('passes the selected date range to staff notification RPCs', async () => {
    const dateRange = {
      startAt: '2026-09-07T17:00:00.000Z',
      endAt: '2026-09-13T16:59:59.999Z',
    };
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    await getBroadcastHistory(100, dateRange);
    await getUnreadNotificationRecipients(100, dateRange);

    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, 'get_broadcast_history', {
      p_limit: 100,
      p_start_at: dateRange.startAt,
      p_end_at: dateRange.endAt,
    });
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, 'get_unread_notification_recipients', {
      p_limit: 100,
      p_start_at: dateRange.startAt,
      p_end_at: dateRange.endAt,
    });
  });

  it('surfaces an RPC error without reporting a false success', async () => {
    const error = new Error('permission denied');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(sendBroadcast('ประกาศ', 'ข้อความ', 'request-2')).rejects.toBe(error);
  });

  it('maps the staff-only profile directory returned by the database RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [{
        id: 'patient-1',
        display_name: 'ผู้ป่วยหนึ่ง',
        title: null,
        first_name: 'ผู้ป่วย',
        last_name: 'หนึ่ง',
        email: 'patient@example.com',
        phone: '0812345678',
        created_at: '2026-09-08T03:00:00.000Z',
        role: 'patient',
        is_active: true,
      }],
      error: null,
    });

    await expect(getStaffProfileDirectory()).resolves.toEqual([{
      id: 'patient-1',
      title: null,
      firstName: 'ผู้ป่วย',
      lastName: 'หนึ่ง',
      fullName: 'ผู้ป่วยหนึ่ง',
      email: 'patient@example.com',
      phone: '0812345678',
      createdAt: '2026-09-08T03:00:00.000Z',
      role: 'patient',
      isActive: true,
    }]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_staff_profile_directory');
  });

  it('requests permanent deletion through the protected staff RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await expect(deleteStaffProfile('suspended-1')).resolves.toBeUndefined();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('staff_admin_delete_profile', {
      p_profile_id: 'suspended-1',
    });
  });

  it('requests patient appointment cancellation through the protected PAI RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: null });

    await requestPatientAppointmentCancellation('appointment-1');

    expect(supabaseMock.rpc).toHaveBeenCalledWith('pai_transition_appointment', {
      p_appointment_id: 'appointment-1',
      p_action: 'request_cancel',
      p_reason: null,
    });
  });

  it('upserts a manual medication taken log by its scheduled dose', async () => {
    await recordPatientMedicationTaken('reminder-1', '2026-09-14T08:00:00+07:00');

    expect(supabaseMock.from).toHaveBeenCalledWith('medication_logs');
    expect(supabaseMock.upsertCalls).toEqual([{
      values: expect.objectContaining({
        reminder_id: 'reminder-1',
        scheduled_datetime: '2026-09-14T08:00:00+07:00',
        status: 'taken',
      }),
      options: { onConflict: 'reminder_id,scheduled_datetime' },
    }]);
  });
});

describe('Supabase dashboard service', () => {
  beforeEach(() => {
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockClear();
    supabaseMock.upsertCalls.length = 0;
    for (const table of Object.keys(database)) delete database[table];

    database.profiles = [
      profileRow('patient-1', 'ผู้ป่วย', 'หนึ่ง', 'patient', { gender: 'male' }),
      profileRow('medical-1', 'แพทย์', 'หนึ่ง', 'medical'),
      profileRow('staff-1', 'เจ้าหน้าที่', 'หนึ่ง', 'staff_admin'),
    ];
    database.departments = [{ id: 'department-1', name: 'เวชทั่วไป', is_active: true }];
    database.doctors = [{ id: 'medical-1', department_id: 'department-1' }];
    database.appointment_slots = [{
      id: 'slot-1', doctor_id: 'medical-1', slot_date: '2026-09-08', start_time: '09:00:00',
      daily_service_offering_id: 'offering-1', max_capacity: 10, status: 'available',
    }];
    database.daily_service_offerings = [{ id: 'offering-1', service_id: 'service-1' }];
    database.services = [{ id: 'service-1', name: 'ตรวจโรคทั่วไป' }];
    database.appointments = [{
      id: 'appointment-1', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-1', queue_number: 1, status: 'confirmed', cancel_requested_at: null,
    }];
    database.notifications = [
      { id: 'notification-patient', user_id: 'patient-1', type: 'broadcast', title: 'ประกาศ', message: 'ข้อความ', read_at: null, deleted_at: null, created_at: '2026-09-08T03:00:00.000Z' },
      { id: 'notification-medical', user_id: 'medical-1', type: 'broadcast', title: 'ประกาศ', message: 'ข้อความ', read_at: null, deleted_at: null, created_at: '2026-09-08T03:00:00.000Z' },
    ];
    database.medication_reminders = [{
      id: 'reminder-1', user_id: 'patient-1', medication_id: 'medicine-1', status: 'active',
      reminder_times: ['08:00', '18:00'], start_date: '2026-09-01', end_date: '2026-09-30',
    }];
    database.medications = [{ id: 'medicine-1', name: 'ยา A', description: 'รับประทานหลังอาหาร', stock: 2, min_stock: 5, expiry_date: null, is_active: true }];
    database.medical_records = [{
      id: 'record-1', appointment_id: 'appointment-1', patient_id: 'patient-1', doctor_id: 'medical-1',
      diagnosis: 'ติดตามอาการ', treatment_notes: 'พักผ่อนให้เพียงพอ', prescribed_medications: [], created_at: '2026-09-08T04:00:00.000Z',
    }];
  });

  it('scopes a patient dashboard to the signed-in patient data', async () => {
    const view = await getDashboardView('patient', 'patient-1', '2026-09-08', 'today');

    expect(view.actor).toEqual({ id: 'patient-1', fullName: 'ผู้ป่วย หนึ่ง' });
    expect(view.metrics.map((metric) => metric.value)).toEqual([1, 0, 1]);
    expect(view.appointmentQueue).toHaveLength(1);
    expect(view.appointmentQueue[0].patientName).toBe('ผู้ป่วย หนึ่ง');
    expect(view.appointmentQueue[0].serviceName).toBe('ตรวจโรคทั่วไป');
    expect(view.patientMedications).toEqual([expect.objectContaining({ id: 'reminder-1', name: 'ยา A', instruction: 'รับประทานหลังอาหาร', reminderTimes: ['08:00', '18:00'] })]);
    expect(view.patientTreatmentHistory).toEqual([expect.objectContaining({ id: 'record-1', summary: 'ติดตามอาการ', doctorName: 'แพทย์ หนึ่ง', departmentName: 'เวชทั่วไป' })]);
    expect(view.recentNotifications).toHaveLength(1);
  });

  it('returns all completed patient treatment history for dashboard filtering', async () => {
    database.medical_records.push({
      id: 'record-older', appointment_id: 'appointment-older', patient_id: 'patient-1', doctor_id: 'medical-1',
      diagnosis: 'older summary', treatment_notes: 'older advice', prescribed_medications: [], created_at: '2026-09-01T04:00:00.000Z',
    });

    const view = await getDashboardView('patient', 'patient-1', '2026-09-08', 'today');

    expect(view.patientTreatmentHistory?.map((record) => record.id)).toEqual(['record-1', 'record-older']);
  });

  it('finds the next patient appointment after the selected date range', async () => {
    database.appointment_slots = [
      { id: 'slot-today', doctor_id: 'medical-1', slot_date: '2026-09-08', start_time: '08:00:00', max_capacity: 10, status: 'available' },
      { id: 'slot-future', doctor_id: 'medical-1', slot_date: '2026-09-10', start_time: '14:00:00', max_capacity: 10, status: 'available' },
    ];
    database.appointments = [
      { id: 'appointment-today', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-today', queue_number: 1, status: 'confirmed' },
      { id: 'appointment-future', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-future', queue_number: 2, status: 'pending' },
    ];
    vi.useFakeTimers({ now: new Date('2026-09-08T02:30:00.000Z') });

    try {
      const view = await getDashboardView('patient', 'patient-1', '2026-09-08', 'today');
      expect(view.nextAppointment).toMatchObject({ id: 'appointment-future', date: '2026-09-10', startTime: '14:00' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts only upcoming appointments in today status summary', async () => {
    database.appointment_slots = [
      { id: 'slot-past', doctor_id: 'medical-1', slot_date: '2026-09-08', start_time: '08:00:00', max_capacity: 10, status: 'available' },
      { id: 'slot-upcoming', doctor_id: 'medical-1', slot_date: '2026-09-08', start_time: '10:00:00', max_capacity: 10, status: 'available' },
      { id: 'slot-previous-day', doctor_id: 'medical-1', slot_date: '2026-09-07', start_time: '12:00:00', max_capacity: 10, status: 'available' },
    ];
    database.appointments = [
      { id: 'appointment-past', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-past', queue_number: 1, status: 'confirmed' },
      { id: 'appointment-upcoming', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-upcoming', queue_number: 2, status: 'pending' },
      { id: 'appointment-previous-day', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-previous-day', queue_number: 3, status: 'completed' },
    ];
    vi.useFakeTimers({ now: new Date('2026-09-08T02:30:00.000Z') });

    try {
      const view = await getDashboardView('patient', 'patient-1', '2026-09-08', 'today');

      expect(view.appointmentStatuses).toEqual([
        { status: 'pending', label: 'รอยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 0 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'เสร็จสิ้น', count: 0 },
        { status: 'cancelled', label: 'ยกเลิก', count: 0 },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('filters a notification inbox by the selected date range', async () => {
    database.notifications = [
      { id: 'notification-in-range', user_id: 'patient-1', type: 'system', title: 'วันนี้', message: 'ในช่วงเวลา', read_at: null, deleted_at: null, created_at: '2026-09-08T03:00:00.000Z' },
      { id: 'notification-out-of-range', user_id: 'patient-1', type: 'system', title: 'เก่า', message: 'นอกช่วงเวลา', read_at: null, deleted_at: null, created_at: '2026-08-01T03:00:00.000Z' },
    ];

    await expect(getNotifications('patient-1', 100, {
      startAt: '2026-09-07T17:00:00.000Z',
      endAt: '2026-09-13T16:59:59.999Z',
    })).resolves.toEqual([expect.objectContaining({ id: 'notification-in-range', title: 'วันนี้' })]);
  });

  it('scopes a doctor dashboard to that doctor slots', async () => {
    const view = await getDashboardView('medical', 'medical-1', '2026-09-08', 'today');

    expect(view.metrics.map((metric) => metric.value)).toEqual([1, 1, 0, 0]);
    expect(view.metrics.some((metric) => metric.id === 'unread-notifications')).toBe(false);
    expect(view.appointmentQueue).toHaveLength(1);
    expect(view.appointmentQueue[0].doctorName).toBe('แพทย์ หนึ่ง');
    expect(view.departmentLoads).toEqual([]);
  });

  it('returns aggregate clinic data for staff_admin without diagnosis fields', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-08T02:00:00.000Z') });

    try {
      const view = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');

      expect(view.metrics.map((metric) => metric.value)).toEqual([1, 1]);
      expect(view.departmentLoads).toEqual([expect.objectContaining({
        departmentId: 'department-1', departmentName: 'เวชทั่วไป', appointmentCount: 1, capacity: 10,
        patientCount: 1, doctorCount: 1, activeDoctorCount: 1, densityPercent: 10, densityStatus: 'normal',
      })]);
      expect(view.appointmentStatuses.map((item) => item.status)).toEqual([
        'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show',
      ]);
      expect(view.servedAppointmentCount).toBe(0);
      expect(view.doctorStatuses).toEqual([expect.objectContaining({
        doctorId: 'medical-1', doctorName: 'แพทย์ หนึ่ง', departmentName: 'เวชทั่วไป', status: 'available',
      })]);
      expect(view.roleCounts).toEqual([
        { role: 'patient', count: 1 }, { role: 'medical', count: 1 }, { role: 'staff_admin', count: 1 },
      ]);
      expect(JSON.stringify(view)).not.toContain('diagnosis');
    } finally {
      vi.useRealTimers();
    }
  });

  it('includes expired medication alerts from the medication table', async () => {
    database.medications = [{
      id: 'medicine-expired', name: 'ยาใกล้หมดอายุ', dosage: '1 เม็ด', type: 'tablet', description: null,
      stock: 20, min_stock: 5, expiry_date: '2026-09-07', is_active: true,
    }];

    const view = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');

    expect(view.medicationAlerts).toEqual([expect.objectContaining({
      id: 'medicine-expired', name: 'ยาใกล้หมดอายุ', expiryDate: '2026-09-07', expired: true, lowStock: false,
    })]);
  });

  it('derives clinic doctor availability from today activity, leave, and opening hours', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-08T04:00:00.000Z') });

    try {
      database.appointments[0].status = 'completed';
      const completedView = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');
      expect(completedView.doctorStatuses).toEqual([expect.objectContaining({ doctorId: 'medical-1', status: 'available' })]);

      database.doctor_leaves = [{ doctor_id: 'medical-1', start_date: '2026-09-08', end_date: '2026-09-08' }];
      const leaveView = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');
      expect(leaveView.doctorStatuses).toEqual([expect.objectContaining({ doctorId: 'medical-1', status: 'away' })]);

      delete database.doctor_leaves;
      vi.setSystemTime(new Date('2026-09-08T01:00:00.000Z'));
      const closedView = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');
      expect(closedView.doctorStatuses).toEqual([expect.objectContaining({ doctorId: 'medical-1', status: 'away' })]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows all patient appointment statuses, including older records and cancellation requests', async () => {
    database.appointment_slots = [
      { id: 'slot-old', doctor_id: 'medical-1', slot_date: '2025-01-10', start_time: '09:00:00', max_capacity: 10, status: 'closed' },
      { id: 'slot-requested', doctor_id: 'medical-1', slot_date: '2026-09-20', start_time: '09:00:00', max_capacity: 10, status: 'available' },
    ];
    database.appointments = [
      { id: 'appointment-old', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-old', queue_number: 1, status: 'completed', cancel_requested_at: null },
      { id: 'appointment-requested', patient_id: 'patient-1', user_id: 'patient-1', slot_id: 'slot-requested', queue_number: 2, status: 'confirmed', cancel_requested_at: '2026-09-09T02:00:00.000Z' },
    ];

    const view = await getDashboardView('patient', 'patient-1', '2026-09-08', 'today');

    expect(view.appointmentQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'appointment-old', status: 'completed' }),
      expect.objectContaining({ id: 'appointment-requested', status: 'confirmed', cancelRequestedAt: '2026-09-09T02:00:00.000Z' }),
    ]));
  });

  it('summarizes active patient gender counts for staff_admin', async () => {
    database.profiles.push(
      profileRow('patient-2', 'ผู้ป่วย', 'สอง', 'patient', { gender: 'female' }),
      profileRow('patient-3', 'ผู้ป่วย', 'สาม', 'patient', { gender: null }),
      profileRow('patient-inactive', 'ผู้ป่วยที่ปิดใช้งาน', 'บัญชี', 'patient', { is_active: false, gender: 'male' }),
    );

    const view = await getDashboardView('staff_admin', 'staff-1', '2026-09-08', 'today');

    expect(view.patientGenderCounts).toEqual([
      { gender: 'male', label: 'ผู้ชาย', count: 1, percentage: 33.3 },
      { gender: 'female', label: 'ผู้หญิง', count: 1, percentage: 33.3 },
      { gender: 'unspecified', label: 'ไม่ระบุเพศ', count: 1, percentage: 33.3 },
    ]);
    expect(view.doctorGenderCounts).toEqual([
      { gender: 'male', label: 'ผู้ชาย', count: 0, percentage: 0 },
      { gender: 'female', label: 'ผู้หญิง', count: 0, percentage: 0 },
      { gender: 'unspecified', label: 'ไม่ระบุเพศ', count: 1, percentage: 100 },
    ]);
  });

  it('rejects a dashboard role that does not match the signed-in profile', async () => {
    await expect(getDashboardView('staff_admin', 'patient-1', '2026-09-08', 'today'))
      .rejects.toThrow('ไม่มีสิทธิ์เปิด Dashboard');
  });
});
