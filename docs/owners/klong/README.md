# กลอง — รายการเตือนและประวัติมื้อ

## เจ้าของ

- เจ้าของ: กลอง
- คู่ตรวจ: กัญจน์
- ขอบเขต: manual medication reminders และ medication logs

## Code boundary

- `src/app/(patient)/reminders/page.tsx`
- `src/services/reminderService.ts`
- `src/components/reminders/`
- reminder/log schema, RLS migrations และ fixture ที่เกี่ยวข้อง

## Dependency และ handoff

รับ dispensing id และจำนวนที่จ่ายเต็มจาก kan; ผู้ป่วยเป็นผู้กดบันทึกผลเอง ไม่มี worker หรือ email

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [Medication Reminder Updates](../../12_medication_reminders_updates.md)
- [Acceptance Criteria](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
