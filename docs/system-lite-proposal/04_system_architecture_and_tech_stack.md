# 04. สถาปัตยกรรมและ Tech Stack ฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: ข้อเสนอทางสถาปัตยกรรมเท่านั้น ยังไม่อนุญาตให้สร้าง migration เชื่อม project จริง หรือใช้ secret

## Tech Stack ที่เสนอ

- Next.js, React และ TypeScript ตามเวอร์ชันใน `package.json`
- Tailwind CSS สำหรับ UI
- Supabase Auth สำหรับ signup, login, logout และ session
- Supabase PostgreSQL สำหรับข้อมูล runtime ทั้งหมด
- Supabase JS ผ่าน repository adapter
- PostgreSQL RLS สำหรับ role และ ownership
- PostgreSQL RPC หนึ่งคำสั่งสำหรับจ่ายยาและตัด stock แบบ transaction
- Vitest และ mock repository สำหรับ automated tests
- Chrome รุ่นปัจจุบันเป็น browser เป้าหมาย

## หลักข้อมูล

- Runtime ไม่มี localStorage, in-memory store หรือ mock data เป็นแหล่งข้อมูลหลัก
- Password อยู่ใน Supabase Auth ไม่เก็บใน `profiles`
- 7 ตารางธุรกิจอยู่ใน PostgreSQL และอ้าง `auth.users`
- Browser ใช้ `NEXT_PUBLIC_SUPABASE_URL` และ publishable key เท่านั้น; legacy anon key ใช้เฉพาะกรณี project เดิมยังไม่ย้าย
- Secret/legacy `service_role` key ห้ามอยู่ใน browser, source code, test fixture หรือ Git และแอปฉบับย่อไม่ต้องใช้
- Doctor/Staff สร้างโดยผู้ดูแลผ่าน Supabase Dashboard ไม่มีหน้าจอ Admin ในแอป
- Automated tests ใช้ mock/fake ตาม contract เดียวกัน เพื่อไม่แตะฐานจริง

ตัวแปรฝั่ง browser ที่เสนอ:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

ใช้ placeholder ใน Git และเก็บค่าจริงใน environment ของเครื่อง/hosting

## ชั้นระบบ

```text
Next.js UI
  → Feature service/domain function
    → Repository contract
      ├── Supabase repository   # runtime
      └── Mock repository       # automated tests เท่านั้น

Supabase repository
  → Supabase Auth
  → PostgreSQL tables + RLS
  → dispense_prescriptions RPC
```

### UI

- แสดงหน้าและเมนูตาม role จาก session/profile
- รับ input และแสดง validation, loading, empty และ error
- ไม่เรียก table โดยตรงจาก component
- ไม่ใช้ role ใน UI เป็นด่านสิทธิ์เพียงชั้นเดียว

### Service/Domain

- ตรวจ input, status transition และ business rule พื้นฐาน
- เรียก repository contract โดยไม่ผูกกับ Supabase response shape
- แปล database/auth error เป็น code ที่ UI ใช้ได้
- ไม่เก็บสำเนาข้อมูลถาวรใน browser

### Repository Contract

- ซ่อน query, join และ Supabase error mapping จาก UI/domain
- `SupabaseRepository` ใช้จริงใน runtime
- `MockRepository` ใช้เฉพาะ unit/component/integration tests
- ทั้งสอง implementation คืน type และ `Result<T>` แบบเดียวกัน

### Supabase

- Auth ดูแล credential, email verification และ session
- PostgreSQL เก็บข้อมูล application ทุก Entity
- RLS จำกัด row ตาม `auth.uid()`, role และความสัมพันธ์
- constraints ป้องกันค่าพื้นฐานผิด เช่น stock ติดลบและ quantity ไม่บวก
- RPC จ่ายยารวม validation และ update หลายตารางใน transaction เดียว

## Service ที่เสนอ

| Service | หน้าที่ | Supabase ที่ใช้ |
| --- | --- | --- |
| `AuthService` | signup/login/logout/session/profile | Auth + `profiles` |
| `ScheduleService` | สร้าง แก้ เปิด ปิด และอ่านรอบ | `schedules` |
| `AppointmentService` | จอง ยืนยัน ยกเลิก และอ่านนัด | `appointments` + join `schedules` |
| `MedicalService` | บันทึกผล เพิ่มยา และปิดตรวจ | `medical_records`, `prescriptions`, `appointments` |
| `PharmacyService` | จัด Catalog/stock และจ่ายใบสั่ง | `medications` + RPC |
| `ReminderService` | สร้าง เปิด ปิด และบันทึกการกินล่าสุด | `reminders` + join `prescriptions` |

## การไหลข้อมูล

### สมัครและ session

1. Patient ส่ง email/password ให้ Supabase Auth และยืนยันอีเมลตาม project setting
2. Auth สร้าง `auth.users`
3. `on_auth_user_created` trigger ตรวจ email/metadata และสร้าง `profiles` role `patient`
4. หลัง login แอปอ่าน session และ profile
5. ถ้า profile inactive แอปออกจากระบบ และ RLS ปฏิเสธข้อมูลธุรกิจ
6. RLS ใช้ `auth.uid()` ตรวจทุก query

### จองนัด

1. UI ส่ง `scheduleId` และ `reason`
2. Service ตรวจรูปแบบและอ่านรอบจาก Supabase
3. RLS บังคับ `patient_id = auth.uid()`
4. Repository สร้าง appointment `pending`
5. UI refetch รอบและนัด

ระบบฉบับย่อตรวจ capacity ก่อน insert แต่ยังไม่รับประกัน race condition จากการจองพร้อมกันระดับ production ข้อจำกัดนี้ระบุชัดใน scope เพื่อหลีกเลี่ยง RPC เพิ่ม

### ปิดตรวจ

1. Doctor เปิด appointment `confirmed` ที่ schedule เป็นของตน
2. บันทึก medical record และ prescriptions
3. Service ตรวจ field บังคับ
4. เปลี่ยน appointment เป็น `completed`; สถานะนี้ใช้ล็อก record และเปิดให้ Patient อ่าน

### จ่ายยา

1. Staff เลือก appointment `completed`
2. Repository เรียก `dispense_prescriptions(medicalRecordId)`
3. RPC ตรวจ role, ownership, status และ stock ทุกรายการ
4. ถ้าไม่พอ rollback ทั้ง transaction
5. ถ้าพอ ลด stock และตั้ง prescriptions เป็น `dispensed`

### เตือนในเว็บ

1. Patient เลือก prescription ที่ `dispensed`
2. RLS ตรวจว่า Patient เป็นเจ้าของ appointment ต้นทาง
3. Supabase เก็บ reminder time, active state และ last taken
4. เมื่อเปิดเว็บ UI โหลด reminder จาก Supabase และเทียบเวลา Asia/Bangkok
5. กดกินแล้ว update `last_taken_at` ใน Supabase

ไม่มี background worker จึงไม่รับประกันการแจ้งขณะ browser ปิด

## RLS แนวทางขั้นต่ำ

- ใช้ `auth.uid()` เป็นตัวระบุผู้ใช้ ไม่รับ user ID สำคัญจาก client โดยไม่ตรวจ
- อ่าน role จาก `profiles` ผ่าน helper `security definer` ใน private schema พร้อม `search_path = ''` และ schema-qualified names
- Patient policy เชื่อม ownership ผ่าน appointment ต้นทาง
- Doctor policy เชื่อม `schedules.doctor_id = auth.uid()`
- Staff policy อนุญาตเฉพาะตารางงาน ไม่เปิด diagnosis โดยตรง
- ตารางเปิด RLS ทั้งหมดก่อนใส่ข้อมูล demo
- role `anon` ที่ยังไม่ login ใช้ได้เฉพาะ Auth flow ไม่มี grant/policy อ่านตารางธุรกิจ
- กำหนด table grants และ policy แยกต่อ operation; การเปิด RLS อย่างเดียวไม่แทน least-privilege grants
- Function revoke execute จาก `public`/`anon` และ grant เฉพาะ role ที่ต้องใช้

## Error Handling

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; field?: string }
```

ตัวอย่าง code: `UNAUTHORIZED`, `INVALID_INPUT`, `SCHEDULE_FULL`, `INVALID_STATUS`, `OUT_OF_STOCK`, `NOT_FOUND`, `DATABASE_ERROR`

- Network/database error แสดงข้อความ retry ได้
- RLS denial แสดงไม่มีสิทธิ์ ไม่เปิดรายละเอียด row
- RPC error แปลเป็นข้อความ stock ไม่พอหรือสถานะไม่ถูกต้อง
- UI ไม่แสดง array ว่างหรือเลข 0 แทน error

## การทดสอบ

- Unit/component/integration tests ใช้ MockRepository เท่านั้นตามกฎ repository
- Mock ต้องจำลอง success, validation, RLS-like denial และ transaction rollback
- RLS/RPC ตรวจแยกกับ Supabase local/test project เมื่อได้รับอนุญาต ไม่ใช้ production data
- ก่อนกล่าวว่าเชื่อม Supabase สำเร็จ ต้องมีหลักฐาน signup/login, CRUD, RLS denial และ RPC rollback จริง

## สิ่งที่ไม่อยู่ในสถาปัตยกรรมนี้

- Email provider, worker, cron และ Web Push
- Realtime subscription
- Broadcast, notification inbox และ Dashboard analytics
- Partial dispensing, backorder, stock reservation และ audit log
- Server-side secret/legacy `service_role` workflow ในแอป
- Production concurrency guarantee สำหรับการจอง

## เอกสารอ้างอิง Supabase

- [User Management](https://supabase.com/docs/guides/auth/managing-user-data) — profile trigger และ user metadata
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — grants, policies และ `auth.uid()`
- [Database Functions](https://supabase.com/docs/guides/database/functions) — function privileges และ `search_path`
- [API Keys](https://supabase.com/docs/guides/getting-started/api-keys) — publishable/secret keys และข้อห้ามเปิดเผย key ที่ bypass RLS
