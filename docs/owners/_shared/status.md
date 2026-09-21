# Shared / Core — Status

## ภาพรวมล่าสุด

- Shared contract ปัจจุบันใช้ role `patient`, `medical`, `staff_admin`
- มี Supabase client แยก browser/server/middleware และมี mock adapter สำหรับ test/offline
- มี constants กลางสำหรับ Bangkok date, clinic time blocks และ leave reasons
- `ConfirmationModal` เป็น shared component ที่ schedule และ department workspace ใช้ยืนยันคำสั่งสำคัญ
- Shared inventory ไม่ได้ปิดสถานะของโมดูลที่ใช้งานอยู่: PAI, Scheduling, pharmacy, reminders และ dashboard ต้องอ้าง owner view ของตน
- `docs/Database_check.md` เป็น target ปัจจุบันเดียวกับ runtime ตามที่ผู้ใช้ยืนยัน; RLS เปิดในตารางหลักที่ snapshot ตรวจ แต่ยังมี policy อ้าง `admin`, `staff`, `doctor`, `pharmacist` และไม่มีตาราง `pai_appointments`, `pai_medical_records`, `broadcast_recipients`

## หลักฐาน

- Source: `src/types/`, `src/lib/`, `src/utils/supabase/`, `src/constants/`, `src/components/common/`, `src/mocks/`
- Tests: `tests/require-role.test.ts`, `tests/date-time-and-mock-anchor.test.ts`, `tests/toast.test.tsx`, `tests/setup.ts`
- ผู้ใช้ยืนยันว่า migration ที่เกี่ยวข้อง deploy แล้ว; role เก่าจะคงไว้ชั่วคราวเพราะฐานนี้เป็นข้อมูลทดสอบและมีแผน reset; session-based RLS ยังต้องตรวจแยก

## งานค้าง/ข้อจำกัด

- ยังไม่ตรวจ browser 360px/1280px และ keyboard ใน environment นี้
- ยังไม่ยืนยัน session-based RLS บนฐานเป้าหมาย แม้ผู้ใช้ยืนยัน migration deployment แล้ว
- PAI RPC ใช้ `appointments`/`medical_records` ตาม migration รุ่นปัจจุบัน; `pai_*` tables รุ่นแรกไม่ใช่ target ปัจจุบัน
- การแก้ shared type/client ต้องแจ้งเจ้าของทุกโมดูลก่อนเสมอ

## สถานะตรวจของงานเอกสาร

`ทำแล้วใน code` สำหรับ inventory และ owner routing; `ยังไม่ยืนยัน DB/RLS` และ `ยังไม่ตรวจ browser` สำหรับ runtime evidence. งานเอกสารนี้ไม่สร้าง shared API/type/schema ใหม่
