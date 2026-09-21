import { userRoles, type AppointmentStatus, type InventoryAction, type Medication, type MedicationReminderStatus, type Notification, type UserRole } from '@/types/database';
import { dashboardRangeLabels, type BroadcastHistoryItem, type DashboardGenderCount, type DashboardMetric, type DashboardRange, type DashboardView, type SendBroadcastInput } from '@/features/dashboard/types';
import { ClinicMockDatabase, mockResult } from './engine';

function subtractDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));

  value.setUTCDate(value.getUTCDate() - days);

  return value.toISOString().slice(0, 10);
}

function toBangkokDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).formatToParts(new Date(value));

  const dateParts = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function bangkokTime(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
}

function isUpcomingToday(slotDate: string | undefined, startTime: string | undefined, today: string, currentTime: string): boolean {
  if (slotDate !== today || !startTime) return false;
  return currentTime < startTime.slice(0, 5);
}

function isUpcomingAppointment(slotDate: string | undefined, startTime: string | undefined, today: string, currentTime: string): boolean {
  if (!slotDate || !startTime) return false;
  if (slotDate > today) return true;
  if (slotDate < today) return false;
  return currentTime < startTime.slice(0, 5);
}

function nextReminderTime(reminderTimes: string[], currentTime: string): string | null {
  const times = reminderTimes.map((time) => time.slice(0, 5)).filter(Boolean).sort();
  return times.find((time) => time > currentTime) ?? times[0] ?? null;
}

export function createClinicRepositories(
  database: ClinicMockDatabase,
) {
  return {
    profiles: {
      list: () =>
        database.select('profiles'),

      getById: (id: string) =>
        database.findById('profiles', id),

      update: (
        id: string,
        changes: Parameters<
          typeof database.updateById<'profiles'>
        >[2],
      ) =>
        database.updateById(
          'profiles',
          id,
          changes,
        ),
    },

    schedules: {
      listDepartments: () =>
        database.select('departments'),

      listDoctors: () =>
        database.select('doctors'),

      listSlots: () =>
        database.select('appointment_slots'),
    },

    appointments: {
      list: () =>
        database.select('appointments'),

      listWithDetails: async (
        patientId?: string,
      ) => {
        const tables = database.snapshot();

        const data = tables.appointments
          .filter(
            (item) =>
              !patientId ||
              (item.patient_id || item.user_id) === patientId,
          )
          .map((appointment) => {
            const slot =
              tables.appointment_slots.find(
                (item) =>
                  item.id === appointment.slot_id,
              );

            const doctor =
              slot &&
              tables.doctors.find(
                (item) =>
                  item.id === slot.doctor_id,
              );

            return {
              ...appointment,

              patient:
                tables.profiles.find(
                  (item) =>
                    item.id === (appointment.patient_id || appointment.user_id),
                ),

              slot: slot && {
                ...slot,

                doctor: doctor && {
                  ...doctor,

                  profile:
                    tables.profiles.find(
                      (item) =>
                        item.id === doctor.id,
                    ),

                  department:
                    tables.departments.find(
                      (item) =>
                        item.id === doctor.department_id,
                    ),
                },
              },
            };
          })
          .sort((a, b) =>
            b.created_at.localeCompare(
              a.created_at,
            ),
          );

        return mockResult.ok(data);
      },

      updateStatus: (
        id: string,
        status: AppointmentStatus,
      ) =>
        database.updateById(
          'appointments',
          id,
          {
            status,
            updated_at:
              new Date().toISOString(),
          },
        ),
    },

    records: {
      list: () =>
        database.select('medical_records'),

      listWithDetails: async (
        patientId?: string,
      ) => {
        const tables = database.snapshot();

        return mockResult.ok(
          tables.medical_records
            .filter(
              (item) =>
                !patientId ||
                item.patient_id === patientId,
            )
            .map((record) => ({
              ...record,

              patient:
                tables.profiles.find(
                  (item) =>
                    item.id === record.patient_id,
                ),

              appointment:
                tables.appointments.find(
                  (item) =>
                    item.id === record.appointment_id,
                ),

              doctor: {
                ...tables.doctors.find(
                  (item) =>
                    item.id === record.doctor_id,
                )!,

                profile:
                  tables.profiles.find(
                    (item) =>
                      item.id === record.doctor_id,
                  ),
              },
            })),
        );
      },
    },

    pharmacy: {
      listMedications: async () => {
        const result =
          await database.select(
            'medications',
          );

        return result.error
          ? result
          : mockResult.ok(
              result.data.filter(
                (item) => item.is_active,
              ),
            );
      },

      listInventoryLogs: () =>
        database.select('inventory_logs'),

      saveMedication: async (
        input: Pick<
          Medication,
          | 'name'
          | 'type'
          | 'category'
          | 'stock'
          | 'min_stock'
          | 'expiry_date'
        > &
          Partial<
            Pick<
              Medication,
              | 'dosage'
              | 'brand_name'
              | 'coverage_type'
              | 'manufacturer'
              | 'mfg_date'
              | 'description'
              | 'ingredients'
              | 'is_active'
              | 'unit'
              | 'pack_unit'
              | 'pack_size'
            >
          >,
        id?: string,
      ) => {
        if (
          !input.name.trim() ||
          !input.category.trim() ||
          input.stock < 0 ||
          input.min_stock < 0
        ) {
          return mockResult.fail<Medication>(
            'ข้อมูลยาไม่ถูกต้อง',
            '23514',
          );
        }

        if (id) {
          return database.updateById(
            'medications',
            id,
            {
              ...input,
              updated_at:
                new Date().toISOString(),
            },
          );
        }

        const revision =
          database.getRevision();

        return database.transaction(
          revision,
          (draft) => {
            if (
              draft.medications.some(
                (item) =>
                  item.name.toLowerCase() ===
                  input.name.toLowerCase(),
              )
            ) {
              return mockResult.fail<Medication>(
                'ชื่อยานี้มีอยู่แล้ว',
                '23505',
              );
            }

            const medication: Medication = {
              ...input,
              unit: input.unit ?? 'เม็ด',
              dosage: input.dosage ?? null,
              brand_name: input.brand_name ?? null,
              coverage_type: input.coverage_type ?? 'covered',
              manufacturer: input.manufacturer ?? null,
              mfg_date: input.mfg_date ?? null,
              id: crypto.randomUUID(),
              description: input.description ?? null,
              ingredients: input.ingredients ?? null,
              is_active: input.is_active ?? true,
              created_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            };

            draft.medications.push(
              medication,
            );

            return mockResult.ok(
              medication,
            );
          },
        );
      },

      deleteMedication: async (
        id: string,
      ) => {
        const revision =
          database.getRevision();

        return database.transaction(
          revision,
          (draft) => {
            const medication =
              draft.medications.find(
                (item) => item.id === id,
              );

            if (!medication) {
              return mockResult.fail<
                'deleted' | 'disabled'
              >(
                'ไม่พบยา',
                'PGRST116',
              );
            }

            const referenced =
              draft.inventory_logs.some(
                (item) =>
                  item.medication_id === id,
              ) ||
              draft.medication_reminders.some(
                (item) =>
                  item.medication_id === id,
              ) ||
              draft.medical_records.some(
                (record) =>
                  record.prescribed_medications?.some(
                    (item) =>
                      item.medication_id === id,
                  ),
              );

            if (referenced) {
              medication.is_active = false;

              medication.updated_at =
                new Date().toISOString();

              return mockResult.ok<
                'deleted' | 'disabled'
              >('disabled');
            }

            draft.medications =
              draft.medications.filter(
                (item) =>
                  item.id !== id,
              );

            return mockResult.ok<
              'deleted' | 'disabled'
            >('deleted');
          },
        );
      },
      adjustStock: async (
        medicationId: string,
        pharmacistId: string,
        action: InventoryAction,
        quantity: number,
        reason: string | null = null,
      ) => {
        const revision = database.getRevision();

        return database.transaction(revision, (draft) => {
          const medication = draft.medications.find((item) => item.id === medicationId);

          if (!medication) {
            return mockResult.fail('ไม่พบยา', '23503');
          }

          const delta = action === 'add' ? quantity : -quantity;

          if (!Number.isInteger(quantity) || quantity <= 0 || medication.stock + delta < 0) {
            return mockResult.fail('จำนวนสต๊อกไม่ถูกต้อง', '23514');
          }

          medication.stock += delta;
          medication.updated_at = new Date().toISOString();

          draft.inventory_logs.push({
            id: crypto.randomUUID(),
            medication_id: medicationId,
            pharmacist_id: pharmacistId,
            action,
            quantity,
            reason,
            created_at: new Date().toISOString(),
          });

          return mockResult.ok(medication);
        });
      },
    },

    medications: {
      list: () => database.select('medications'),
    },

    reminders: {
      list: () => database.select('medication_reminders'),

      listWithMedication: async (userId?: string) => {
        const tables = database.snapshot();

        return mockResult.ok(
          tables.medication_reminders
            .filter((item) => !userId || item.user_id === userId)
            .map((reminder) => ({
              ...reminder,
              medication: tables.medications.find((item) => item.id === reminder.medication_id),
              logs: tables.medication_logs.filter((item) => item.reminder_id === reminder.id),
            })),
        );
      },

      listLogs: () => database.select('medication_logs'),

      updateStatus: (id: string, status: MedicationReminderStatus) =>
        database.updateById('medication_reminders', id, {
          status,
          updated_at: new Date().toISOString(),
        }),

      update: (
        id: string,
        changes: Parameters<typeof database.updateById<'medication_reminders'>>[2],
      ) =>
        database.updateById('medication_reminders', id, {
          ...changes,
          updated_at: new Date().toISOString(),
        }),

      delete: (id: string) => database.deleteById('medication_reminders', id),

      create: async (input: {
        patient_id?: string;
        user_id?: string;
        medication_id: string;
        reminder_times: string[];
        start_date: string;
        end_date?: string | null;
        status?: MedicationReminderStatus;
      }) => {
        const revision = database.getRevision();
        return database.transaction(revision, (draft) => {
          const reminder = {
            id: `reminder-${crypto.randomUUID()}`,
            user_id: input.user_id || input.patient_id || 'profile-peter-parker',
            medication_id: input.medication_id,
            reminder_times: input.reminder_times,
            start_date: input.start_date,
            end_date: input.end_date ?? null,
            status: input.status ?? 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          draft.medication_reminders.push(reminder);
          return mockResult.ok(reminder);
        });
      },
    },

    notifications: {
      list: () =>
        database.select(
          'notifications',
        ),

      listInbox: async (
        userId: string,
      ) => {
        const tables =
          database.snapshot();

        return mockResult.ok(
          tables.notifications
            .filter(
              (item) =>
                item.user_id === userId &&
                !item.deleted_at,
            )
            .sort((a, b) =>
              b.created_at.localeCompare(
                a.created_at,
              ),
            ),
        );
      },

      markRead: (id: string) =>
        database.updateById(
          'notifications',
          id,
          {
            is_read: true,
          },
        ),

      markReadForUser: async (
        id: string,
        userId: string,
      ) => {
        const revision =
          database.getRevision();

        return database.transaction<Notification>(
          revision,
          (draft) => {
            const notification =
              draft.notifications.find(
                (item) =>
                  item.id === id,
              );

            if (
              !notification ||
              notification.user_id !==
                userId ||
              notification.deleted_at
            ) {
              return mockResult.fail(
                'ไม่มีสิทธิ์แก้ไขข้อความนี้',
                '42501',
              );
            }

            notification.is_read =
              true;

            notification.read_at =
              new Date().toISOString();

            return mockResult.ok(
              notification,
            );
          },
        );
      },

      deleteForUser: async (
        id: string,
        userId: string,
      ) => {
        const revision =
          database.getRevision();

        return database.transaction<Notification>(
          revision,
          (draft) => {
            const notification =
              draft.notifications.find(
                (item) =>
                  item.id === id,
              );

            if (
              !notification ||
              notification.user_id !==
                userId ||
              notification.deleted_at
            ) {
              return mockResult.fail(
                'ไม่มีสิทธิ์ลบข้อความนี้',
                '42501',
              );
            }

            notification.deleted_at =
              new Date().toISOString();

            return mockResult.ok(
              notification,
            );
          },
        );
      },
      listBroadcastHistory: async () => {
        const tables = database.snapshot();
        const items: BroadcastHistoryItem[] = tables.broadcasts
          .slice()
          .sort((a, b) => b.sent_at.localeCompare(a.sent_at))
          .map((item) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            sentAt: item.sent_at,
            recipientCount: tables.notifications.filter((n) => n.broadcast_id === item.id).length,
          }));
        return mockResult.ok(items);
      },
      sendBroadcast: async (input: SendBroadcastInput) => {
        const revision = database.getRevision();
        return database.transaction(revision, (draft) => {
          if (input.actorRole !== 'staff_admin') {
            return mockResult.fail<{ recipientCount: number; created: boolean }>('เฉพาะเจ้าหน้าที่/แอดมินเท่านั้นที่ส่ง Broadcast ได้', '42501');
          }
          const title = input.title.trim();
          const message = input.message.trim();
          if (!title || !message) {
            return mockResult.fail<{ recipientCount: number; created: boolean }>('กรุณากรอกหัวข้อและข้อความ', '23514');
          }
          const existing = draft.broadcasts.find((item) => item.request_key === input.requestKey);
          if (existing) {
            const recipientCount = draft.notifications.filter((item) => item.broadcast_id === existing.id).length;
            return mockResult.ok({ recipientCount, created: false });
          }
          const recipientIds = new Set(draft.profiles.map((profile) => profile.id));
          if (recipientIds.size === 0) {
            return mockResult.fail<{ recipientCount: number; created: boolean }>('กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน', '23514');
          }
          const now = new Date().toISOString();
          const broadcastId = crypto.randomUUID();
          draft.broadcasts.push({
            id: broadcastId,
            sent_by: input.actorId,
            title,
            message,
            notification_type: 'broadcast',
            audience: { all: true, roles: [] },
            request_key: input.requestKey,
            sent_at: now,
            created_at: now,
          });
          recipientIds.forEach((userId) => {
            draft.notifications.push({
              id: crypto.randomUUID(),
              user_id: userId,
              type: 'broadcast',
              title,
              message,
              is_read: false,
              event_key: `broadcast:${broadcastId}:${userId}`,
              broadcast_id: broadcastId,
              read_at: null,
              deleted_at: null,
              created_at: now,
            });
          });

          return mockResult.ok({
            recipientCount: recipientIds.size,
            created: true,
          });
        });
      },
    },

    dashboard: {
      getSummary: async () => {
        const tables =
          database.snapshot();

        const today =
          '2026-09-05';

        const todaySlotIds =
          new Set(
            tables.appointment_slots
              .filter(
                (item) =>
                  item.slot_date === today,
              )
              .map(
                (item) => item.id,
              ),
          );

        const todayAppointments =
          tables.appointments.filter(
            (item) =>
              todaySlotIds.has(
                item.slot_id,
              ),
          );

        return mockResult.ok({
          todayAppointments:
            todayAppointments.length,

          patients:
            tables.profiles.filter(
              (item) =>
                item.role ===
                'patient',
            ).length,

          unreadNotifications:
            tables.notifications.filter(
              (item) =>
                !item.is_read,
            ).length,

          lowStockMedications:
            tables.medications.filter(
              (item) =>
                item.is_active &&
                item.stock <=
                  item.min_stock,
            ).length,

          expiredMedications:
            tables.medications.filter(
              (item) =>
                item.expiry_date &&
                item.expiry_date < today,
            ).length,

          appointmentStatuses: {
            pending:
              todayAppointments.filter(
                (item) =>
                  item.status ===
                  'pending',
              ).length,

            confirmed:
              todayAppointments.filter(
                (item) =>
                  item.status ===
                  'confirmed',
              ).length,

            in_progress:
              todayAppointments.filter(
                (item) =>
                  item.status ===
                  'in_progress',
              ).length,

            completed:
              todayAppointments.filter(
                (item) =>
                  item.status ===
                  'completed',
              ).length,
          },
        });
      },
      getView: async (role: UserRole, requestedUserId?: string, today = '2026-09-06', range: DashboardRange = 'today') => {
        const tables = database.snapshot();
        const rangeDays: Record<DashboardRange, number> = { today: 1, '7d': 7, '30d': 30 };
        const startDate = subtractDays(today, rangeDays[range] - 1);
        const isInRange = (date: string | undefined) => Boolean(date && date >= startDate && date <= today);
        const rangeLabel = dashboardRangeLabels[range];
        const rangeSuffix = range === 'today' ? rangeLabel : ` ${rangeLabel}`;
        const matchedActor = requestedUserId
          ? tables.profiles.find((profile) => profile.id === requestedUserId && profile.role === role)
          : null;
        const defaultProfile = role === 'medical'
          ? tables.profiles.find((profile) => profile.role === role && tables.doctors.some((doctor) => doctor.id === profile.id))
            ?? tables.profiles.find((profile) => profile.role === role)
          : tables.profiles.find((profile) => profile.role === role);
        const actor = matchedActor
          ?? (requestedUserId ? { id: requestedUserId, full_name: 'บัญชีที่เข้าสู่ระบบ' } : defaultProfile)
          ?? null;
        const activeStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'no_show'];
        const slotsById = new Map(tables.appointment_slots.map((slot) => [slot.id, slot]));
        const activeAppointments = tables.appointments.filter((appointment) => activeStatuses.includes(appointment.status));
        const isDoctorActor = Boolean(actor && tables.doctors.some((doctor) => doctor.id === actor.id));
        const scopedAppointments = activeAppointments.filter((appointment) => {
          if (!actor) return false;
          if (role === 'patient') return (appointment.patient_id || appointment.user_id) === actor.id;
          if (role === 'medical' && isDoctorActor) return slotsById.get(appointment.slot_id)?.doctor_id === actor.id;
          return true;
        });
        const rangeAppointments = scopedAppointments.filter((appointment) => isInRange(slotsById.get(appointment.slot_id)?.slot_date));
        const queueRemaining = rangeAppointments.filter((appointment) => appointment.status === 'confirmed' || appointment.status === 'in_progress').length;
        const completedInRange = rangeAppointments.filter((appointment) => appointment.status === 'completed').length;
        const currentBangkokTime = bangkokTime();
        const statusAppointments = range === 'today' && role !== 'staff_admin'
          ? rangeAppointments.filter((appointment) => {
              const slot = slotsById.get(appointment.slot_id);
              return isUpcomingToday(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
            })
          : rangeAppointments;
        const unreadNotifications = actor
          ? tables.notifications.filter((notification) => notification.user_id === actor.id && !notification.is_read && !notification.deleted_at && isInRange(toBangkokDate(notification.created_at))).length
          : 0;
        const activeMedications = tables.medications.filter((medication) => medication.is_active);
        const lowStock = activeMedications.filter((medication) => medication.stock <= medication.min_stock && (!medication.expiry_date || medication.expiry_date >= today));
        const expired = activeMedications.filter((medication) => medication.expiry_date && medication.expiry_date < today);
        const patientReminders = actor
          ? tables.medication_reminders.filter((reminder) => reminder.user_id === actor.id && reminder.status === 'active')
          : [];
        const patientMedicationIds = new Set(patientReminders.map((reminder) => reminder.medication_id));
        const upcomingPatientAppointmentCount = role === 'patient'
          ? scopedAppointments.filter((appointment) => {
              const slot = slotsById.get(appointment.slot_id);
              return (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'in_progress')
                && isUpcomingAppointment(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
            }).length
          : 0;
        const pendingDispensing = tables.medical_records.filter((record) => {
          const medications = record.prescribed_medications ?? [];
          return medications.length > 0 && medications.some((medication) => !medication.dispensed);
        }).length;
        const roleCounts = userRoles.map((profileRole) => ({
          role: profileRole,
          count: tables.profiles.filter((profile) => profile.role === profileRole && profile.is_active !== false).length,
        }));
        const activeProfiles = tables.profiles.filter((profile) => profile.is_active !== false);
        const genderLabels = {
          male: 'ผู้ชาย',
          female: 'ผู้หญิง',
          unspecified: 'ไม่ระบุเพศ',
        } as const;
        const buildGenderCounts = (genderProfiles: typeof tables.profiles): DashboardGenderCount[] => {
          const total = genderProfiles.length;
          return (['male', 'female', 'unspecified'] as const).map((gender) => ({
            gender,
            label: genderLabels[gender],
            count: genderProfiles.filter((profile) => (profile.gender ?? 'unspecified') === gender).length,
            percentage: total > 0
              ? Math.round((genderProfiles.filter((profile) => (profile.gender ?? 'unspecified') === gender).length / total) * 1000) / 10
              : 0,
          }));
        };
        const patientGenderCounts = buildGenderCounts(activeProfiles.filter((profile) => profile.role === 'patient'));
        const doctorIds = new Set(tables.doctors.map((doctor) => doctor.id));
        const doctorGenderCounts = buildGenderCounts(activeProfiles.filter((profile) => doctorIds.has(profile.id)));
        const metric = (value: number | string, id: string, label: string, description: string, href: string, tone: DashboardMetric['tone']): DashboardMetric => ({
          id, label, value, description, href, tone,
        });

        const metricsByRole: Record<
          UserRole,
          DashboardMetric[]
        > = {
          staff_admin: [
            metric(
              rangeAppointments.length,
              'appointments-in-range',
              `นัดหมาย${rangeSuffix}`,
              'ไม่รวมรายการยกเลิกและปฏิเสธ',
              '/appointments',
              'blue',
            ),

            metric(
              queueRemaining,
              'remaining-queue',
              range === 'today'
                ? 'คิวที่เหลือ'
                : 'คิวในช่วงที่เลือก',
              'ยืนยันแล้วและกำลังตรวจ',
              '/appointments',
              'amber',
            ),
          ],

          medical: [
            metric(
              rangeAppointments.length,
              isDoctorActor
                ? 'own-appointments'
                : 'appointments-in-range',
              isDoctorActor
                ? `นัดของฉัน${rangeSuffix}`
                : `นัดหมาย${rangeSuffix}`,
              isDoctorActor
                ? 'เฉพาะตารางแพทย์ที่เข้าสู่ระบบ'
                : 'ข้อมูลนัดที่บันทึกแล้ว',
              '/appointments',
              'blue',
            ),

            metric(
              isDoctorActor
                ? queueRemaining
                : pendingDispensing,
              isDoctorActor
                ? 'own-queue'
                : 'pending-dispensing',
              isDoctorActor
                ? range === 'today'
                  ? 'คิวของฉันที่เหลือ'
                  : 'คิวของฉันในช่วงที่เลือก'
                : 'รอจ่ายยา',
              isDoctorActor
                ? 'ยืนยันแล้วและกำลังตรวจ'
                : 'ใบสั่งยาที่มีรายการยา',
              isDoctorActor
                ? '/appointments'
                : '/pharmacy',
              'amber',
            ),

            metric(
              isDoctorActor
                ? completedInRange
                : lowStock.length,
              isDoctorActor
                ? 'completed-in-range'
                : 'low-stock',
              isDoctorActor
                ? `ตรวจเสร็จ${rangeSuffix}`
                : 'ยาใกล้หมด',
              isDoctorActor
                ? 'นับสถานะเสร็จสิ้น'
                : 'สต๊อกต่ำกว่าหรือเท่าจุดสั่งซื้อ',
              isDoctorActor
                ? '/appointments'
                : '/pharmacy',
              isDoctorActor
                ? 'emerald'
                : 'rose',
            ),

            ...(isDoctorActor ? [] : [metric(
              expired.length,
              'expired',
              'ยาหมดอายุ',
              'แยกออกจากรายการยาใกล้หมด',
              '/pharmacy',
              'violet',
            )]),
          ],

          patient: [
            metric(
              patientMedicationIds.size,
              'my-medications',
              'ยาที่กำลังใช้',
              'นับจากรายการเตือนยาที่ใช้งาน',
              '/reminders',
              'violet',
            ),

            metric(
              upcomingPatientAppointmentCount,
              'next-appointment',
              'นัดหมายถัดไป',
              'นัดหมายที่กำลังจะถึง',
              '/appointments',
              'blue',
            ),

            metric(
              unreadNotifications,
              'unread-notifications',
              'การแจ้งเตือน',
              'ข้อความของบัญชีนี้ที่ยังไม่ได้อ่าน',
              '/notifications',
              'emerald',
            ),
          ],
        };

        const statusDefinitions: Array<{
          status: AppointmentStatus;
          label: string;
        }> = [
          {
            status: 'pending',
            label: 'รอยืนยัน',
          },
          {
            status: 'confirmed',
            label: 'ยืนยันแล้ว',
          },
          {
            status: 'in_progress',
            label: 'กำลังตรวจ',
          },
          {
            status: 'completed',
            label: 'เสร็จสิ้น',
          },
        ];

        const departmentLoads =
          tables.departments.map(
            (department) => {
              const doctorIds =
                new Set(
                  tables.doctors
                    .filter(
                      (doctor) =>
                        doctor.department_id ===
                        department.id,
                    )
                    .map(
                      (doctor) =>
                        doctor.id,
                    ),
                );

              const slots =
                tables.appointment_slots.filter(
                  (slot) =>
                    isInRange(
                      slot.slot_date,
                    ) &&
                    doctorIds.has(
                      slot.doctor_id,
                    ),
                );

              const slotIds =
                new Set(
                  slots.map(
                    (slot) => slot.id,
                  ),
                );

              return {
                departmentId:
                  department.id,

                departmentName:
                  department.name,

                appointmentCount:
                  activeAppointments.filter(
                    (appointment) =>
                      slotIds.has(
                        appointment.slot_id,
                      ),
                  ).length,

                capacity:
                  slots.reduce(
                    (sum, slot) =>
                      sum +
                      slot.max_capacity,
                    0,
                  ),
              };
            },
          );

        const mappedAppointmentQueue =
          rangeAppointments.map((appointment) => {
              const slot =
                slotsById.get(
                  appointment.slot_id,
                );

              const doctor = slot
                ? tables.profiles.find(
                    (profile) =>
                      profile.id ===
                      slot.doctor_id,
                  )
                : null;

              const doctorRecord =
                slot
                  ? tables.doctors.find(
                      (item) =>
                        item.id ===
                        slot.doctor_id,
                    )
                  : null;

              const department =
                doctorRecord
                  ? tables.departments.find(
                      (item) =>
                        item.id ===
                        doctorRecord.department_id,
                    )
                  : null;

              const patient =
                tables.profiles.find(
                  (profile) =>
                    profile.id ===
                    (appointment.patient_id || appointment.user_id),
                );

              return {
                id: appointment.id,

                queueNumber:
                  appointment.queue_number,

                date:
                  slot?.slot_date ?? '',

                startTime:
                  slot?.start_time ?? '',

                status:
                  appointment.status,

                patientName:
                  patient?.full_name ??
                  'ไม่พบบัญชีผู้ป่วย',

                doctorName:
                  doctor?.full_name ??
                  'ไม่พบแพทย์',

                departmentName:
                  department?.name ??
                  'ไม่ระบุแผนก',
              };
            });
        const mappedFutureAppointments = role === 'patient'
          ? scopedAppointments
              .filter((appointment) => (slotsById.get(appointment.slot_id)?.slot_date ?? '') > today)
              .map((appointment) => {
                const slot = slotsById.get(appointment.slot_id);
                const doctor = slot
                  ? tables.profiles.find((profile) => profile.id === slot.doctor_id)
                  : null;
                const doctorRecord = slot
                  ? tables.doctors.find((item) => item.id === slot.doctor_id)
                  : null;
                const department = doctorRecord
                  ? tables.departments.find((item) => item.id === doctorRecord.department_id)
                  : null;
                const patient = tables.profiles.find((profile) => profile.id === (appointment.patient_id || appointment.user_id));
                return {
                  id: appointment.id,
                  queueNumber: appointment.queue_number,
                  date: slot?.slot_date ?? '',
                  startTime: slot?.start_time?.slice(0, 5) ?? '',
                  status: appointment.status,
                  patientName: patient?.full_name ?? 'ไม่พบบัญชีผู้ป่วย',
                  doctorName: doctor?.full_name ?? 'ไม่พบแพทย์',
                  departmentName: department?.name ?? 'ไม่ระบุแผนก',
                };
              })
          : [];
        const nextAppointment = mappedAppointmentQueue
          .concat(mappedFutureAppointments)
          .filter((appointment) => (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'in_progress')
            && isUpcomingAppointment(appointment.date, appointment.startTime, today, currentBangkokTime))
          .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0] ?? null;
        const appointmentQueue = mappedAppointmentQueue
          .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`))
          .slice(0, 8);

        const medicationById = new Map(tables.medications.map((medication) => [medication.id, medication]));
        const patientMedications = role === 'patient'
          ? patientReminders.map((reminder) => {
              const medication = medicationById.get(reminder.medication_id);
              const reminderTimes = (reminder.reminder_times ?? []).map((time) => time.slice(0, 5)).filter(Boolean).sort();
              const reminderLogs = tables.medication_logs.filter((log) => log.reminder_id === reminder.id);
              return {
                id: reminder.id,
                name: medication?.name ?? 'ไม่พบชื่อยา',
                dosage: medication?.dosage || `1 ${medication?.type ?? 'ครั้ง'}`,
                instruction: medication?.description || `รับประทานตามเวลา ${reminderTimes.join(' · ') || 'ที่กำหนด'}`,
                reminderTimes,
                nextDoseTime: reminderTimes.length > 0 ? nextReminderTime(reminderTimes, currentBangkokTime) : null,
                endDate: reminder.end_date,
                takenDoses: reminderLogs.filter((log) => log.status === 'taken').length,
                totalDoses: reminderLogs.length,
              };
            })
          : [];
        const patientTreatmentHistory = role === 'patient'
          ? tables.medical_records
              .filter((record) => record.patient_id === actor?.id)
              .map((record) => {
                const doctorRecord = tables.doctors.find((doctor) => doctor.id === record.doctor_id);
                return {
                  id: record.id,
                  date: record.created_at,
                  doctorName: tables.profiles.find((profile) => profile.id === record.doctor_id)?.full_name ?? 'ไม่พบแพทย์',
                  departmentName: doctorRecord?.department_id ? tables.departments.find((department) => department.id === doctorRecord.department_id)?.name ?? 'ไม่ระบุแผนก' : 'ไม่ระบุแผนก',
                  summary: record.diagnosis || record.treatment_notes || 'ไม่มีสรุปการรักษา',
                  medicationCount: record.prescribed_medications?.length ?? 0,
                };
              })
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
          : [];
        const pendingPrescriptions = role === 'medical' && !isDoctorActor
          ? tables.medical_records
              .map((record) => {
                const medications = record.prescribed_medications ?? [];
                const doctorRecord = tables.doctors.find((doctor) => doctor.id === record.doctor_id);
                const dispensedCount = medications.filter((medication) => Boolean(medication.dispensed)).length;
                return {
                  id: record.id,
                  patientName: tables.profiles.find((profile) => profile.id === record.patient_id)?.full_name ?? 'ไม่พบชื่อผู้ป่วย',
                  doctorName: tables.profiles.find((profile) => profile.id === record.doctor_id)?.full_name ?? 'ไม่พบชื่อแพทย์',
                  departmentName: doctorRecord?.department_id
                    ? tables.departments.find((department) => department.id === doctorRecord.department_id)?.name ?? 'ไม่ระบุแผนก'
                    : 'ไม่ระบุแผนก',
                  date: record.created_at,
                  diagnosis: record.diagnosis || record.treatment_notes || 'ไม่ได้ระบุอาการ',
                  medicationCount: medications.length,
                  dispensedCount,
                };
              })
              .filter((record) => record.medicationCount > 0 && record.dispensedCount < record.medicationCount)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
          : [];

        const copyByRole: Record<
          UserRole,
          {
            title: string;
            description: string;
          }
        > = {
          staff_admin: {
            title:
              'ภาพรวมงานคลินิกและผู้ดูแลระบบ',

            description:
              'ติดตามนัดหมาย คิว แผนก และบัญชีของคลินิก',
          },

          medical: {
            title:
              'ภาพรวมงานแพทย์',

            description:
              isDoctorActor
                ? 'แสดงเฉพาะตารางและคิวของแพทย์ที่เข้าสู่ระบบ พร้อมข้อมูลยา'
                : 'ติดตามงานจ่ายยาและสถานะคลังยา',
          },

          patient: {
            title:
              'ภาพรวมสุขภาพของฉัน',

            description:
              'นัดหมาย ยา การเตือน และข้อความของบัญชีนี้เท่านั้น',
          },
        };

        const view: DashboardView = {
          role,

          actor: actor
            ? {
                id: actor.id,
                fullName:
                  actor.full_name,
              }
            : null,

          date: today,
          startDate,
          range,

          ...copyByRole[role],

          metrics:
            metricsByRole[role],

          appointmentStatuses:
            statusDefinitions.map(
              ({ status, label }) => ({
                status,
                label,

                count:
                  statusAppointments.filter(
                    (appointment) =>
                      appointment.status ===
                      status,
                  ).length,
              }),
            ),

          appointmentQueue,

          patientGenderCounts: role === 'staff_admin' ? patientGenderCounts : undefined,

          doctorGenderCounts: role === 'staff_admin' ? doctorGenderCounts : undefined,

          nextAppointment,

          patientMedications,

          patientTreatmentHistory,

          pendingPrescriptions,

          departmentLoads,

          medicationAlerts:
            activeMedications
              .filter(
                (medication) =>
                  medication.stock <=
                    medication.min_stock ||
                  Boolean(
                    medication.expiry_date &&
                      medication.expiry_date <
                        today,
                  ),
              )
              .map((medication) => ({
                id: medication.id,
                name: medication.name,
                stock: medication.stock,
                minimumStock:
                  medication.min_stock,
                expiryDate:
                  medication.expiry_date,

                lowStock:
                  medication.stock <=
                    medication.min_stock &&
                  (!medication.expiry_date ||
                    medication.expiry_date >=
                      today),

                expired: Boolean(
                  medication.expiry_date &&
                    medication.expiry_date <
                      today,
                ),
              })),

          recentNotifications: actor
            ? tables.notifications
                .filter(
                  (notification) =>
                    notification.user_id ===
                      actor.id &&
                    !notification.deleted_at &&
                    isInRange(
                      toBangkokDate(
                        notification.created_at,
                      ),
                    ),
                )
                .sort((a, b) =>
                  b.created_at.localeCompare(
                    a.created_at,
                  ),
                )
                .slice(0, 5)
            : [],

          unreadNotificationCount: unreadNotifications,

          roleCounts,
        };

        return mockResult.ok(view);
      },
    },
  };
}

export type ClinicRepositories =
  ReturnType<
    typeof createClinicRepositories
  >;
