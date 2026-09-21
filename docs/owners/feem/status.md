# ฟีม — Status

## ภาพรวมล่าสุด

- Auth service รองรับ signup, sign-in, sign-out, password reset และ profile update
- Role canonical มี 3 ค่า และมี server-side route helper สำหรับตรวจ session/role
- Patient directory รองรับ search และ staff-admin update path
- Patient search ปรับเป็นค้นหาเมื่อผู้ใช้กดค้นหา, จำกัด field ที่ service ส่งกลับ, รองรับคำค้นหาเบอร์โทรที่มีรูปแบบต่างกัน และแยกข้อมูลสุขภาพให้เฉพาะ `medical`
- Registration ปัจจุบันยังรับข้อมูลพื้นฐานเป็นหลัก; ยังไม่มี health fields สำหรับ allergy/chronic disease พร้อม guard ตอนสมัคร
- DB snapshot มี column `allergy_status`, `allergies`, `chronic_disease_status` และ `chronic_diseases` แล้ว แต่ยังไม่มีหลักฐานว่า registration flow เขียนค่าเหล่านี้

## หลักฐาน

- Code: `src/services/authService.ts`, `src/lib/requireRole.ts`, `src/context/AuthContext.tsx`
- Tests: `tests/register.test.tsx`, `tests/login.test.tsx`, `tests/password-reset.test.tsx`, `tests/require-role.test.ts`, `tests/dashboard-access.test.tsx`
- Patient search verification: `npx --no-install tsc --noEmit` ผ่าน, `npm.cmd run test` ผ่าน 36 ไฟล์/313 tests, และ targeted ESLint ของ patient search ผ่าน; full lint ยังติด error เดิมที่ `src/components/settings/SettingsContent.tsx:101`
- Migration: role consolidation, patient search และ profile permission migrations ใน `supabase/migrations/`

## งานค้าง/ข้อจำกัด

- D27 session timeout ยังเป็นงานรอพัฒนา
- งานต่อไปของ Feem: เพิ่ม `yes/no/unknown` สำหรับ allergy/chronic disease, บังคับรายละเอียดเมื่อเป็น `yes`, เก็บรายละเอียดเป็น `null` เมื่อเป็น `no/unknown`, และใช้ Zod/runtime validation ควบคู่ service validation
- ยังไม่ตรวจ Supabase integration/RLS บน development/staging
- Snapshot ของ policy `profiles` ยังมีเงื่อนไข role เก่า `admin`/`staff`; ต้องยืนยันและทำให้ตรง canonical roles ก่อนปิด RLS evidence
- ยังไม่ตรวจ browser responsive/keyboard และ email จริง; component test ครอบคลุม initial, search, role visibility และ validation แล้ว

## Handoff

โมดูลอื่นต้องรับ role จาก session จริง ไม่สร้าง role switcher ใน production และไม่ข้าม service/RLS
