# 09. Implementation Plan ฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: แผนเชิงข้อเสนอเท่านั้น ไม่ใช่คำสั่งเริ่มพัฒนา ไม่มีการแก้โค้ดหรือฐานข้อมูลจากเอกสารนี้

## เป้าหมายของแผน

หากทีมอนุมัติระบบฉบับย่อ ให้พัฒนา 6 ฟีเจอร์โดยเก็บข้อมูล runtime ทั้งหมดใน Supabase รักษา flow หลักและไม่ดึงความซับซ้อนจากระบบเดิมกลับมา

## เงื่อนไขก่อนเริ่ม

1. ทีมยืนยันว่าจะใช้ข้อเสนอนี้แทนหรือเป็น demo track แยกจากระบบหลัก
2. ยืนยัน 3 role, 7 Entity, status และขอบเขต Out of Scope
3. เลือกว่าจะปรับโค้ดเดิมหรือทำ flow แยก โดยต้องไม่ลบงานเดิมโดยพลการ
4. เจ้าของโมดูลและ reviewer ยืนยัน schema, RLS, RPC และ repository contract กลาง
5. เตรียม Supabase local/test และ project runtime พร้อม URL/publishable key โดยไม่เผย secret/legacy `service_role` key
6. ตรวจ `git status`, sync `origin/develop` และอ่าน Next.js docs ที่ตรงกับงานก่อนเขียนโค้ด

## Contract ส่งต่องานที่เสนอ

| ผู้ส่ง → ผู้รับ | ข้อมูลที่ต้องส่ง |
| --- | --- |
| Auth → ทุกโมดูล | `profileId`, `role`, `isActive` และผลตรวจ ownership |
| Schedule → Appointment | `scheduleId`, `doctorId`, วัน เวลา capacity, status และจำนวนใช้ |
| Appointment → Medical | `appointmentId`, `patientId`, `doctorId` และ status confirmed |
| Medical → Pharmacy | `medicalRecordId`, `appointmentId`, `prescriptionId`, `medicationId`, quantity, instructions และ appointment completed status |
| Pharmacy → Reminder | `prescriptionId`, `patientId`, status dispensed |
| Reminder → Patient UI | `reminderTime`, `isActive`, `lastTakenAt` |

## ลำดับพัฒนาเสนอ

### ขั้น 1 — Supabase และ Domain Foundation

- ตรึง schema/type ของ 7 ตารางและการอ้าง `auth.users`
- ตรึง status enum และ `Result<T>`
- สร้าง migration สำหรับ constraints, indexes, role helper และ RLS
- สร้าง repository interface พร้อม Supabase implementation สำหรับ runtime
- สร้าง mock implementation/fixture สำหรับ automated tests เท่านั้น
- สร้าง seed สังเคราะห์สำหรับ local/test

ผลที่ต้องได้: Supabase local/test ติดตั้งใหม่ได้ RLS เปิดครบ และ mock tests reset ได้แบบ deterministic

### ขั้น 2 — Auth/Profile

- สมัคร Patient และ login/logout/session ผ่าน Supabase Auth
- สร้าง profile role patient หลัง signup
- ผู้ดูแลสร้างบัญชี Doctor/Staff ผ่าน Supabase Dashboard
- Route/menu ตาม role
- Profile อ่านและแก้ข้อมูลพื้นฐาน

ผลที่ต้องได้: LITE-AC01–04 ผ่าน

### ขั้น 3 — Schedule

- หน้า Staff สร้าง/แก้/เปิด/ปิดรอบ
- หน้า Doctor ดูรอบตน
- หน้า Patient ดูรอบ open ที่ยังไม่เต็ม
- Domain ตรวจเวลา ทับซ้อน capacity และข้อจำกัดการแก้; RLS ตรวจ role

ผลที่ต้องได้: LITE-AC05–07 ผ่าน

### ขั้น 4 — Appointment

- Patient สร้างและยกเลิกนัด
- Staff ยืนยันและยกเลิก
- Doctor ดู confirmed appointments ของตน
- คำนวณจำนวนใช้จาก pending/confirmed ด้วย query Supabase

ผลที่ต้องได้: LITE-AC08–12 ผ่าน

### ขั้น 5 — Medical Record

- Doctor สร้าง/แก้ผลขณะ appointment เป็น confirmed
- เพิ่มและลบ prescription ก่อนปิด
- เปลี่ยน appointment เป็น completed เพื่อปิดและล็อก record
- Patient อ่าน record ของตนเมื่อ appointment เป็น completed

ผลที่ต้องได้: LITE-AC13–15 ผ่าน

### ขั้น 6 — Pharmacy

- Staff จัด Medication Catalog และ stock
- แสดง completed appointments ที่มี prescription pending
- สร้าง RPC `dispense_prescriptions`
- RPC ตรวจ stock ทุกรายการ ล็อก row และเปลี่ยนข้อมูลใน transaction

ผลที่ต้องได้: LITE-AC16–19 และ LITE-SCN-04–05 ผ่าน

### ขั้น 7 — Reminder

- Patient สร้าง แก้เวลา เปิด และปิด reminder
- เก็บ reminder ทั้งหมดใน Supabase
- แสดงรายการถึงเวลาขณะหน้าเว็บเปิด
- กดกินแล้ว update และแสดง `lastTakenAt`
- ตรวจ prescription status และ ownership

ผลที่ต้องได้: LITE-AC20–23 และ LITE-SCN-06 ผ่าน

### ขั้น 8 — Integration และ Quality

- เชื่อม LITE-SCN-01–06
- เพิ่ม LITE-SCN-07 ตรวจ RLS โดยเรียก Supabase ด้วยบัญชีผิด role
- เพิ่ม loading, empty, field/global error และ retry
- ตรวจข้อมูลคงอยู่หลัง reload และไม่มี localStorage/mock fallback
- ตรวจ keyboard และ focus
- ตรวจ Chrome 360px/1280px
- รัน full quality gates

ผลที่ต้องได้: LITE-AC24–29 ผ่านและมีหลักฐานผลจริง

## ขอบเขตความสอดคล้องของข้อมูล

ข้อเสนอนี้ใช้วิธีเล็กที่สุดต่อคำสั่ง:

1. จอง: Service ตรวจ capacity แล้ว insert appointment; ไม่รับประกัน race condition ระดับ production
2. ปิดตรวจ: update appointment เป็น completed ครั้งเดียว; status นี้ล็อก record ผ่าน RLS
3. จ่าย: RPC ตรวจ stock ทุกตัว แล้วลด stock/เปลี่ยน prescription ทุกตัวใน transaction เดียว

MockRepository ต้องจำลองผลเดียวกับ Supabase รวม RPC success/rollback แต่ใช้เฉพาะ automated tests

## Test Plan เสนอ

| ระดับ | สิ่งที่ทดสอบ |
| --- | --- |
| Domain unit | validation, role, ownership, status transition และ stock calculation |
| Repository | Contract เดียวกันของ Supabase/Mock และ error mapping |
| Component | form error, loading, empty, success และ disabled state |
| Automated integration | LITE-SCN-01–06 ด้วย MockRepository |
| Supabase verification | migration, Auth, CRUD, RLS denial, persistence และ RPC rollback บน local/test project แยกจาก npm automated suite |
| Manual UI | Chrome 360px/1280px และ keyboard |

## Quality Gates

หากมีการพัฒนา ต้องรันจาก root:

```bash
npm run lint
npx --no-install tsc --noEmit
npm run test
npm run build
```

รายงานผลตามจริง ห้ามทำเครื่องหมายผ่านจากเพียงแผนนี้

## ความเสี่ยง

| ความเสี่ยง | วิธีควบคุมที่เสนอ |
| --- | --- |
| โค้ดเดิมมี feature ใหญ่และ contract ต่างกัน | สำรวจ diff/ผู้ใช้เดิมก่อนเลือกแก้หรือแยก flow |
| Staff รวมหลายหน้าที่จนเมนูเยอะ | แบ่งเมนู Schedule, Appointments, Pharmacy ชัดเจน |
| RLS ซับซ้อนหรือเกิด recursion | ใช้ helper role แบบกำหนด `search_path` และทดสอบทุก role |
| จองพร้อมกันอาจเกิน capacity | ระบุเป็นข้อจำกัด; หากต้องรองรับให้เพิ่ม booking RPC ในข้อเสนอใหม่ |
| Network/Supabase ล้มเหลว | แสดง error/retry และไม่ fallback ไปข้อมูลปลอม |
| ไม่มี worker | ระบุใน UI ว่าเตือนทำงานเมื่อเปิดเว็บ |
| ไม่มีประวัติการกิน | แสดงคำว่า “บันทึกล่าสุด” ไม่เรียกประวัติ |
| ข้อเสนอถูกเข้าใจว่าเสร็จแล้ว | ใส่สถานะข้อเสนอในทุกเอกสารและหลักฐานทดสอบแยก |

## เกณฑ์จบแผน

- ไม่มี feature นอก 6 รายการ
- ไม่มี Entity นอก 7 รายการ เว้นแต่ทีมอนุมัติเปลี่ยนข้อเสนอ
- LITE-AC01–29 และ LITE-SCN-01–07 มีผลทดสอบจริง
- Full gates ผ่านใน commit เดียวกัน
- ข้อมูล runtime ทั้งหมดอยู่ Supabase และคงอยู่หลัง reload
- Automated tests ไม่มี network/secret; RLS/RPC tests ใช้ local/test project แยก
