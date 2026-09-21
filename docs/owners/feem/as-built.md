# ฟีม — As-built Trace

| Requirement | Route/component | Function/service/data path | Test/evidence | สถานะ |
| --- | --- | --- | --- | --- |
| สมัครและเข้าสู่ระบบด้วย role ที่ถูกต้อง | `/register`, `/login` | `authService.signUp`, `signIn`; `AuthContext` | `tests/register.test.tsx`, `tests/login.test.tsx`; role constraint ใน migration | ทำแล้วใน code; auth/RLS runtime ยังไม่ยืนยัน |
| รีเซ็ตรหัสผ่านและเปลี่ยนรหัสผ่าน | `/forgot-password`, `/reset-password`, `/settings` | `requestPasswordReset`, `updatePassword`, `changePassword`, `signOut` | `tests/password-reset.test.tsx` | ทำแล้วใน code; email provider ยังไม่ตรวจ |
| แก้ข้อมูลส่วนตัวและประวัติสุขภาพของตน | `/profile`, `ProfileContent` | `updateMyPersonalProfile`, `updateMyHealthProfile`, `getProfile` | `src/components/profile/`; service validation | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| สมัครพร้อมข้อมูลสุขภาพที่ละเอียดอ่อน | `/register` | ยังไม่พบ field/submit contract สำหรับ `allergy_status`, `allergies`, `chronic_disease_status`, `chronic_diseases` ใน `signUp` | `src/app/(auth)/register/page.tsx`, `src/services/authService.ts` มีเฉพาะ health update ภายหลัง | เป็น target ยังไม่พบ code; ต้องเพิ่ม Zod/runtime และ service validation ภายหลัง |
| route/session/role guard | auth, clinic และ dashboard layouts | `canonicalRole`, `getCurrentUserAndRole`, `requireRole`, `useRequireAuth` | `tests/require-role.test.ts`, `tests/dashboard-access.test.tsx` | ทำแล้วใน code |
| ค้นหาและแก้ข้อมูลผู้ป่วยตามสิทธิ์ | `/patients/search`, `/patients/[patientId]/edit` | `searchPatients`, `searchProfilesByGroup`, `getPatientForStaffAdmin`, `staffAdminUpdatePatient` | `PatientSearchContent`, `tests/patient-search-content.test.tsx`, migrations `08`, `18`, `19`, `21` | ทำแล้วใน code; patient search แสดงข้อมูลสุขภาพเฉพาะ `medical`, staff-admin เห็นข้อมูลระบุตัวตน/ติดต่อและแก้ไขได้; ยังไม่ยืนยัน DB/RLS |
| inactivity/absolute session timeout ตาม D27 | `AuthContext`/middleware | ยังไม่พบ idle timer และ warning flow ที่ตรงกับ D27 | D27 ใน `docs/10_team_decisions.md` | เป็น target ยังไม่พบ code |

## ข้อจำกัด

การมี route guard ไม่แทน service authorization และ RLS; เอกสารนี้ไม่ยืนยัน deployment หรือข้อมูลผู้ใช้จริง
