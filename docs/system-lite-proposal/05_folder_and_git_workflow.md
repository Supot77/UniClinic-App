# 05. โฟลเดอร์และ Git Workflow ฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: ข้อเสนอเท่านั้น โครงสร้างด้านล่างยังไม่ได้ถูกสร้างใน source code

## ขอบเขตเอกสารรอบนี้

การเปลี่ยนแปลงรอบนี้จำกัดที่ `docs/system-lite-proposal/00`–`11` ไม่มีการย้าย ลบ หรือแก้ source code, tests, mock data, migration หรือเอกสารหลัก

## โครงสร้าง source ที่เสนอหากอนุมัติพัฒนา

```text
src/
├── app/
│   ├── (auth)/              # สมัครและเข้าสู่ระบบ
│   ├── (patient)/           # นัด ผลตรวจ ยา และเตือนของ Patient
│   ├── (doctor)/            # ตาราง นัด และผลตรวจของ Doctor
│   └── (staff)/             # ตาราง นัด Catalog และการจ่ายยา
├── features/
│   ├── auth/
│   ├── schedules/
│   ├── appointments/
│   ├── medical-records/
│   ├── pharmacy/
│   └── reminders/
├── repositories/
│   ├── contracts/           # interface ที่ feature เรียก
│   ├── supabase/             # implementation ที่ runtime เปิดใช้
│   └── mock/                 # implementation สำหรับ tests เท่านั้น
├── types/                   # type ของ 7 Entity และ Result
└── components/common/       # input, button, dialog, state message

supabase/
├── migrations/              # 7 ตาราง, constraints, helper, RLS และ RPC
└── seed.sql                 # ข้อมูลสังเคราะห์สำหรับ local/test

tests/
├── auth.test.ts
├── schedules.test.ts
├── appointments.test.ts
├── medical-records.test.ts
├── pharmacy.test.ts
└── reminders.test.ts
```

ชื่อจริงต้องตรวจโครงสร้างปัจจุบันและ Next.js docs ของเวอร์ชันติดตั้งก่อนเริ่มพัฒนา โครงนี้แสดงขอบเขต ไม่ใช่คำสั่งให้ย้ายไฟล์เดิม

## เจ้าของงานที่เสนอ

| พื้นที่ | เจ้าของ | ผู้ตรวจ | ขอบเขต |
| --- | --- | --- | --- |
| Auth/Profile | ฟีม | เฮิร์บ | role 3 แบบและข้อมูลผู้ใช้ |
| Schedule | ช้อป | ปาย | รอบตรวจและความจุ |
| Appointment/Record | ปาย | ช้อป | นัด ผลตรวจ และรายการสั่งยา |
| Pharmacy | กัญจน์ | กลอง | Catalog, stock และจ่ายเต็ม |
| Reminder | กลอง | กัญจน์ | เวลาเตือนและ last taken |
| Shared UI/Flow QA | เฮิร์บ | ฟีม | component ร่วมและ flow รวม |

ทีมต้องยืนยันตารางนี้อีกครั้งก่อนเริ่ม implementation โดยเฉพาะไฟล์กลางและ contract ที่หลายโมดูลใช้

## กฎการแก้ไฟล์

- แก้เฉพาะ feature ที่รับผิดชอบ
- Repository contract และ types เป็นไฟล์กลาง ต้องมีเจ้าของ feature ที่กระทบตรวจ
- UI เรียกผ่าน service/repository ไม่เรียก table หรือ import mock data ตรง
- Runtime ใช้ Supabase repository; mock repository ใช้เฉพาะ tests
- Migration/RLS/RPC เป็นไฟล์กลาง ต้องให้เจ้าของที่กระทบและคู่ตรวจตรวจ
- ห้ามใส่ secret/legacy `service_role` key หรือข้อมูลจริงใน browser, source, fixture หรือ Git
- ไม่ลบระบบเดิมก่อนมีแผนย้ายและการอนุมัติเป็นลายลักษณ์อักษร
- พฤติกรรมใหม่ต้องมี tests ครอบคลุม success, validation และ state ไม่เปลี่ยนเมื่อ error

## Git Workflow ที่เสนอ

1. เริ่มจาก `develop` ล่าสุดและตรวจ working tree
2. สร้าง branch ตาม feature เช่น `feat/lite-appointments`
3. แก้เฉพาะโมดูลและ test ที่เกี่ยวข้อง
4. sync `origin/develop` ก่อนส่ง PR
5. รัน `npm run lint`, `npx --no-install tsc --noEmit`, `npm run test`, `npm run build`
6. เปิด PR จาก feature ไป `develop` พร้อมผล gate และข้อจำกัด
7. ไม่ push เข้า `main` โดยตรง

## Definition of Done ต่อ feature

- User Story และ FR ที่รับผิดชอบมี implementation ครบ
- Error ไม่ทำให้ state เปลี่ยนบางส่วน
- Automated tests ไม่มี network หรือ secret; การทดสอบ RLS/RPC ใช้ local/test project แยก
- หน้าหลักมี loading, empty และ error
- ใช้ keyboard ได้และตรวจที่ 360px/1280px
- Reviewer ตรวจ diff และผล tests จริง
