# เฮิร์บ — Status

สถานะส่งต่อ: **function เสร็จ เหลือ UI polish**. Notification behavior คงไว้ก่อน; รอบนี้เน้นบันทึก dashboard UI audit ไม่เปลี่ยน business code

## ภาพรวมล่าสุด

- มี dashboard route สำหรับ canonical roles และ role normalization helper
- Dashboard มี loading/error/empty, range filter, role sections, queue table และลิงก์ notifications; งานที่เหลือเป็น UI detail และ browser QA
- Notification inbox รองรับ unread/read, delete และ date range
- Broadcast ใช้ service/RPC และมี history path

## หลักฐาน

- Code: `src/services/dashboardService.ts`, `src/components/dashboard/DashboardScreen.tsx`, `src/features/dashboard/`, `src/app/(patient)/notifications/page.tsx`
- Tests: `tests/dashboard-access.test.tsx`, `tests/dashboard-service.test.ts`, `tests/dashboard-notifications.test.ts`
- Migrations: `04_broadcast_notification_type.sql`, `05_simplify_broadcast_recipients.sql`, `09_broadcast_rpc.sql`, `24_unread_notification_recipients.sql`, `25_notification_time_filters.sql`

## งานค้าง/ข้อจำกัด

- Dashboard metric บางส่วนยังใช้ mock repository ตาม as-built note
- Notifications ยังไม่ปรับ behavior เพิ่มในรอบนี้ เพราะ function path ปัจจุบันมี inbox/filter/read/delete และ Broadcast history แล้ว
- ยังไม่ยืนยัน Broadcast RPC/RLS บนฐาน development/staging
- DB snapshot พบ Broadcast RPC และตาราง `broadcasts` แต่ไม่พบ `broadcast_recipients`; repository migration `05_simplify_broadcast_recipients.sql` ระบุว่าตั้งใจยุบ recipient snapshot ลง `notifications.broadcast_id` และ unique `(broadcast_id, user_id)`. ผู้ใช้ยืนยันให้ใช้ design นี้ต่อไป; เหลือตรวจ session/RLS จริง
- ยังไม่ตรวจ browser responsive/keyboard

## Handoff

รับ role/session จาก feem และข้อมูล domain จากทุกโมดูล; ห้ามเปิด diagnosis หรือข้อมูลผู้ป่วยเกินสิทธิ์ใน dashboard รวม
