# กลอง — As-built Trace

| Requirement | Route/component | Function/service/data path | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| CRUD รายการเตือน | `/reminders` | `getReminders`, `getAvailableMedications`, `createReminder`, `updateReminder`, `deleteReminder` | `src/app/(patient)/reminders/page.tsx`, `src/services/reminderService.ts`, migrations `01`, `03`, `07`, `11` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| บันทึกผลการกินยา | `src/app/(patient)/reminders/page.tsx` | `src/services/reminderService.ts`: `getMedicationLogs`, `getMedicationLogsByReminderIds`, `logMedicationTaken` | `src/services/reminderService.ts`, `src/app/(patient)/reminders/page.tsx` | ทำแล้วใน code; integration ยังไม่ยืนยัน |
| จัดการสถานะ reminder | `src/app/(patient)/reminders/page.tsx` | `src/services/reminderService.ts`: `pauseReminder`, `resumeReminder`, `completeReminder` | `src/services/reminderService.ts`, `docs/12_medication_reminders_updates.md` | ทำแล้วใน code แต่เกิน target manual ที่ตัด pause ออก |
| missed/automation/email/worker | `src/app/(patient)/reminders/page.tsx` | ไม่พบ worker หรือ email provider ใน active path | `docs/02_user_stories.md`, `docs/08_system_rules_and_acceptance.md` | นอก scope |
| สร้าง reminder จาก dispensing เต็มเท่านั้น | `src/app/(patient)/reminders/page.tsx`, `src/services/reminderService.ts` | ไม่พบหลักฐาน end-to-end enforcement จาก PAI/pharmacy ถึง reminder ใน active UI | `docs/02_user_stories.md`, as-built note | เป็น target ยังไม่พบ code; ยังไม่ยืนยัน end-to-end |

## ข้อจำกัด

โค้ดมี pause/resume และ log missed แต่ target ล่าสุดระบุ manual-first ไม่มี missed, reminder ซ้ำ, worker หรือ email ต้องติดป้ายความต่างนี้ไว้เสมอ
