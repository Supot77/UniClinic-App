# 13. แผนการปรับปรุงสถาปัตยกรรม: การลดความซ้ำซ้อน, การจัดการ Hardcode และการนำ Dynamic Routing มาใช้

เอกสารฉบับนี้จัดทำขึ้น ณ วันที่ 19 กันยายน 2569 (2026-09-19) เพื่อเป็นแนวทางทางเทคนิคและแผนดำเนินงานสำหรับสมาชิกในทีมทุกคน ในการขจัดความซ้ำซ้อนของโค้ด (Code Redundancy), แก้ไขจุดที่มีการ Hardcode ข้อมูล, และนำฟีเจอร์ **Dynamic Routing** ของ Next.js App Router มาประยุกต์ใช้เพื่อยกระดับโครงสร้างระบบและประสบการณ์ผู้ใช้งาน (UX) โดยไม่กระทบต่อสัญญาข้อมูล (Contracts) และกฎระเบียบของระบบที่ระบุใน `docs/00_reading_guide.md` ถึง `docs/10_team_decisions.md`

---

## 1. ภาพรวมการสำรวจสถานะปัจจุบัน (Current State Audit)

### 1.1 การใช้งาน Dynamic Routing
- **จุดที่มีการใช้งานอยู่แล้ว**:
  - `src/app/(clinic)/patients/[patientId]/edit/page.tsx`: รับ parameter `[patientId]` สำหรับแก้ไขข้อมูลผู้ป่วย
  - **ข้อสังเกต**: มีเฉพาะหน้า `/edit` แต่ยังไม่มีหน้าดูข้อมูลทั่วไป `/patients/[patientId]` (หากเข้า URL นี้ตรง ๆ จะพบข้อผิดพลาด 404)
- **จุดที่ควรเปลี่ยนมาใช้ Dynamic Routing**:
  1. `/patients/[patientId]`: หน้ารายละเอียดและประวัติผู้ป่วย (Read-only overview)
  2. `/records/[recordId]`: หน้าบันทึกเวชระเบียนและผลการตรวจเฉพาะรอบ (แทนที่ Query parameter `?appointment=xxx`)
  3. `/appointments/[appointmentId]`: หน้ารายละเอียดบัตรนัดและบัตรคิวตรวจ (Queue Ticket with Live Status / QR)
  4. `/pharmacy/[tab]`: แยกแท็บคลังยาและใบสั่งยา `/pharmacy/inventory` และ `/pharmacy/prescriptions` (แทน Client State)
  5. `/pharmacy/medications/[medicationId]`: หน้ารายละเอียดเวชภัณฑ์, ล็อตยา (Batch), และประวัติการเบิกจ่าย
  6. `/departments/[departmentId]`: หน้ารายละเอียดแผนกและแพทย์ประจำแผนก

### 1.2 โค้ดที่ซ้ำซ้อน (Code Redundancy)
1. **การแปลง Role และ Session Query**:
   - ฟังก์ชัน `canonicalRole(role: string)` ถูกประกาศซ้ำใน `src/lib/requireRole.ts` และ `src/app/(clinic)/schedules/page.tsx`
   - ใน `schedules/page.tsx` มีฟังก์ชัน `getScheduleUser()` ที่เขียนตรรกะ query session และ profile ซ้ำซ้อนกับ `requireRole()`
2. **Dashboard Pages ซ้ำซ้อน 100% (Duplicate Routes)**:
   - `src/app/(dashboard)/dashboard/doctor/page.tsx` และ `src/app/(dashboard)/dashboard/medical/page.tsx` มีโค้ดเหมือนกันทุกตัวอักษร
   - `src/app/(dashboard)/dashboard/staff/page.tsx` และ `src/app/(dashboard)/dashboard/staff_admin/page.tsx` มีโค้ดเหมือนกันทุกตัวอักษร
3. **ค่าคงที่วัน-เดือนภาษาไทย (Thai DateTime Constants)**:
   - มีการประกาศ Array ชื่อเดือนและชื่อวันภาษาไทยซ้ำกันถึง 4 ไฟล์ ได้แก่ `DatePicker.tsx`, `ScheduleWorkspace.tsx`, `DepartmentWorkspace.tsx`, และ `appointments.tsx`
4. **คอมโพเนนต์ DatePicker ซ้ำซ้อน**:
   - ใน `src/features/appointments.tsx` มีการสร้าง `AppointmentDatePicker` ขึ้นมาใช้เองภายในไฟล์ ทั้งที่ระบบมี `src/components/common/DatePicker.tsx` ที่มีความสามารถครบถ้วนและรองรับธีมคลินิกอยู่แล้ว

### 1.3 จุดที่มีการ Hardcode ข้อมูล
1. **ช่วงเวลามาตรฐานคลินิก (Preset Time Blocks)**:
   - มีการ hardcode เวลา `"08:30"`, `"12:00"`, `"13:00"`, `"16:30"` ฝังใน JSX ของแบบฟอร์มสร้างหลายวันและคัดลอกวันก่อน
2. **วันที่ Mock Data**:
   - วันที่ `'2026-09-05'` ถึง `'2026-09-10'` ถูก hardcode ไว้ใน `clinicDatabase.ts` และ `scheduleData.ts` เมื่อเวลาจริงผ่านพ้นสัปดาห์ดังกล่าว จะทำให้หน้าตารางตรวจกลายเป็นสัปดาห์ว่าง
3. **ตัวเลือกเหตุผลการลา**:
   - ตัวเลือก "ไปราชการ", "ลาป่วย", "ประชุมวิชาการ" hardcode อยู่ใน tag `<option>` ใน modal บันทึกวันลา

---

## 2. แผนการปรับปรุงและผู้รับผิดชอบตามโมดูล

อ้างอิงตามตารางเจ้าของงานใน `docs/05_folder_and_git_workflow.md` หัวข้อ 11

```
+-------------------------------------------------------------------------------+
|                             แผนที่ผู้รับผิดชอบงาน                             |
+-------------------+-----------------------------------+-----------------------+
| เจ้าของงาน        | โมดูลที่รับผิดชอบ                 | คู่ตรวจ               |
+-------------------+-----------------------------------+-----------------------+
| ฟีม               | สมาชิก โปรไฟล์ สิทธิ์ และผู้ป่วย   | เฮิร์บ                |
| ช้อป (สุพจน์)     | แผนก แพทย์ วันลา ตารางและ Slot    | ปาย                   |
| ปาย               | นัด คิว ผลตรวจ เวชระเบียน         | ช้อป (สุพจน์)         |
| กัญจน์            | คลังยาและจ่ายยา                   | กลอง                  |
| เฮิร์บ            | Broadcast และ Dashboard           | ฟีม                   |
| กลอง              | แจ้งเตือนและเตือนความจำ           | กัญจน์                |
| ร่วมกัน           | ไฟล์กลาง (Shared / Core)          | ทุกคน                 |
+-------------------+-----------------------------------+-----------------------+
```

---

### 2.1 โมดูลสมาชิก โปรไฟล์ สิทธิ์ และผู้ป่วย
- **เจ้าของงาน**: **ฟีม** | **คู่ตรวจ**: **เฮิร์บ**
- **ขอบเขตไฟล์**: `src/app/(auth)/`, `src/components/profile/`, `src/lib/requireRole.ts`, `src/components/patients/`, `src/app/(clinic)/patients/`

#### รายละเอียดงานและวิธีแก้ไข:
1. **สร้างหน้า Dynamic Route ผู้ป่วย `src/app/(clinic)/patients/[patientId]/page.tsx`**:
   - รับ dynamic parameter `const { patientId } = await params;`
   - เรียก service/repository เพื่อดึงข้อมูลประวัติผู้ป่วย, ข้อมูลการแพ้ยา, โรคประจำตัว, และประวัตินัดหมายล่าสุด
   - แสดงผลแบบ Read-only Overview และเพิ่มปุ่มนำทางไปยัง `/patients/[patientId]/edit`
2. **ปรับปรุง `src/lib/requireRole.ts` ให้เป็น Single Source of Truth**:
   - Export ฟังก์ชัน `canonicalRole(role: string): UserRole` เพื่อให้โมดูลอื่นเรียกใช้ได้โดยไม่ต้องเขียนซ้ำ
   - เพิ่มฟังก์ชัน `getCurrentUserAndRole()` ที่คืนค่า `{ user, role, rawRole }` โดยไม่สั่ง redirect อัตโนมัติ สำหรับ Server Components ที่ต้องการ fallback เมื่อเป็น guest
3. **ปรับปรุงการเชื่อมโยงใน `src/components/patients/PatientSearchContent.tsx`**:
   - ปรับการคลิกแถวผู้ป่วยให้ลิงก์ไปยัง `/patients/${patient.id}` (หน้าดูข้อมูล) แทนการบังคับเข้า `/edit` โดยตรง

---

### 2.2 โมดูลแผนก แพทย์ วันลา ตารางและ Slot
- **เจ้าของงาน**: **ช้อป (สุพจน์)** | **คู่ตรวจ**: **ปาย**
- **ขอบเขตไฟล์**: `src/app/(clinic)/schedules/`, `src/app/(clinic)/departments/`, `src/components/schedules/`, `src/features/shop/`

#### รายละเอียดงานและวิธีแก้ไข:
1. **ขจัดโค้ดซ้ำซ้อนใน `src/app/(clinic)/schedules/page.tsx`**:
   - ลบฟังก์ชัน `canonicalRole` และ `getScheduleUser` ในไฟล์ทิ้ง
   - เรียกใช้ `requireRole(['patient', 'medical', 'staff_admin'])` หรือ `getCurrentUserAndRole()` จาก `@/lib/requireRole`
2. **นำเข้าค่าคงที่กลาง (Centralized Constants)**:
   - นำเข้า `THAI_MONTHS_SHORT`, `WEEKDAY_NAMES` จาก `@/constants/dateTime` มาใช้แทน array ใน `ScheduleWorkspace.tsx` และ `DepartmentWorkspace.tsx`
   - นำเข้า `CLINIC_TIME_BLOCKS` สำหรับปุ่มช่วงเวลาเช้า/บ่าย
   - นำเข้า `LEAVE_REASONS` มาใช้ render ตัวเลือกเหตุผลการลา
3. **พิจารณา Dynamic Routing สำหรับแผนก**:
   - สร้าง `src/app/(clinic)/departments/[departmentId]/page.tsx` เพื่อแยกดูตารางเวรและบริการเฉพาะแผนก

---

### 2.3 โมดูลนัดหมาย คิว ผลตรวจ และเวชระเบียน
- **เจ้าของงาน**: **ปาย** | **คู่ตรวจ**: **ช้อป (สุพจน์)**
- **ขอบเขตไฟล์**: `src/app/(clinic)/appointments/`, `src/app/(clinic)/records/`, `src/features/appointments.tsx`, `src/features/medical-records.tsx`

#### รายละเอียดงานและวิธีแก้ไข:
1. **ลดความซ้ำซ้อนของ DatePicker ใน `src/features/appointments.tsx`**:
   - ลบฟังก์ชัน `AppointmentDatePicker` และ array วัน-เดือนในไฟล์ (บรรทัดที่ 42–133)
   - นำเข้าคอมโพเนนต์กลาง `<DatePicker />` จาก `@/components/common/DatePicker` มาใช้งานแทน
2. **ปรับปรุงเวชระเบียนเป็น Dynamic Route `src/app/(clinic)/records/[recordId]/page.tsx`**:
   - เปลี่ยนจากการส่ง query `?appointment=xxx` เป็น dynamic segment `/records/[recordId]`
   - หน้าจอแสดงผลบันทึกการรักษา, การสั่งยา, และการวินิจฉัยโรค รองรับการแชร์ลิงก์และสั่งพิมพ์ (Print-friendly view)
3. **เพิ่ม Dynamic Route บัตรคิว `src/app/(clinic)/appointments/[appointmentId]/page.tsx`**:
   - แสดงบัตรยืนยันนัดหมาย, รหัสคิวตรวจ, สถานะคิวสด (Live Queue Tracker), และ QR Code สแกนเข้าจุดคัดกรอง

---

### 2.4 โมดูลคลังยาและจ่ายยา
- **เจ้าของงาน**: **กัญจน์** | **คู่ตรวจ**: **กลอง**
- **ขอบเขตไฟล์**: `src/app/(clinic)/pharmacy/`, `src/components/pharmacy/`, `src/services/medicationService.ts`

#### รายละเอียดงานและวิธีแก้ไข:
1. **แยกแท็บหน้าจอด้วย Dynamic Route `src/app/(clinic)/pharmacy/[tab]/page.tsx`**:
   - รองรับ `/pharmacy/inventory` (คลังเวชภัณฑ์) และ `/pharmacy/prescriptions` (ใบสั่งยา)
   - กำหนดให้ `/pharmacy` redirect ไปยัง `/pharmacy/inventory` อัตโนมัติ เพื่อรักษาประวัติการเข้าชม (History) และไม่หลุดแท็บเมื่อรีเฟรช
2. **สร้างหน้าเจาะลึกตัวยา `src/app/(clinic)/pharmacy/medications/[medicationId]/page.tsx`**:
   - แสดงข้อมูลจำเพาะ, ข้อบ่งใช้, จุดเตือนสต็อกขั้นต่ำ, ล็อตยา (Batch / Expiry Date), และประวัติการเบิกจ่าย
   - สามารถประยุกต์ใช้ Next.js Intercepting Route `(.)medications/[medicationId]` เพื่อให้เปิดเป็น Modal ได้เมื่อคลิกจากหน้ารายการ แต่แสดงเป็นหน้าเต็มเมื่อเปิดผ่านลิงก์ตรง

---

### 2.5 โมดูล Dashboard และ Broadcast
- **เจ้าของงาน**: **เฮิร์บ** | **คู่ตรวจ**: **ฟีม**
- **ขอบเขตไฟล์**: `src/app/(dashboard)/dashboard/`, `src/components/dashboard/`, `src/features/dashboard/`

#### รายละเอียดงานและวิธีแก้ไข:
1. **ขจัดโฟลเดอร์ Route ที่ซ้ำซ้อน**:
   - ลบโฟลเดอร์ `src/app/(dashboard)/dashboard/doctor/` และ `src/app/(dashboard)/dashboard/staff/` ออก
   - คงไว้เฉพาะ 3 บทบาทหลักตาม Canonical Roles:
     - `src/app/(dashboard)/dashboard/medical/page.tsx`
     - `src/app/(dashboard)/dashboard/staff_admin/page.tsx`
     - `src/app/(dashboard)/dashboard/patient/page.tsx`
2. **เพิ่ม Redirects ใน `next.config.ts`**:
   - เพื่อรองรับ URL เดิมโดยไม่ต้องมีโค้ดหน้าจอซ้ำ:
     ```ts
     async redirects() {
       return [
         { source: '/dashboard/doctor', destination: '/dashboard/medical', permanent: true },
         { source: '/dashboard/staff', destination: '/dashboard/staff_admin', permanent: true },
       ];
     }
     ```

---

### 2.6 ส่วนงานไฟล์กลาง (Shared / Core)
- **ผู้รับผิดชอบ**: **ประสานงานร่วมกันทุกโมดูล**
- **ขอบเขตไฟล์**: `src/constants/`, `src/components/common/`, `src/mocks/`

#### รายละเอียดงานและวิธีแก้ไข:
1. **สร้างไฟล์ค่าคงที่กลาง `src/constants/dateTime.ts`**:
   ```ts
   export const THAI_MONTHS = [
     'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
     'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
   ];

   export const THAI_MONTHS_SHORT = [
     'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
     'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
   ];

   export const THAI_WEEKDAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

   export const CLINIC_TIME_BLOCKS = [
     { label: 'ช่วงเช้า 08:30–12:00', startTime: '08:30', endTime: '12:00' },
     { label: 'ช่วงบ่าย 13:00–16:30', startTime: '13:00', endTime: '16:30' },
   ];

   export const LEAVE_REASONS = ['ไปราชการ', 'ลาป่วย', 'ประชุมวิชาการ', 'อบรม', 'อื่น ๆ'];
   ```
2. **ปรับปรุง Dynamic Anchor สำหรับ Mock Data**:
   - ปรับวันที่ใน `src/mocks/scheduleData.ts` และ `clinicDatabase.ts` ให้คำนวณสัมพันธ์กับวันปัจจุบัน (เช่น อิงจากวันจันทร์ของสัปดาห์ปัจจุบัน `getCurrentWeekMonday()`) แทนการระบุวันที่ตายตัว เพื่อป้องกันปัญหาเปิดระบบมาแล้วพบตารางว่างเปล่า

#### สถานะหลังแก้ไข 19 กันยายน 2569

- [x] สร้าง `src/constants/dateTime.ts` พร้อม constants ตามข้อกำหนด และ helper สำหรับ Bangkok date, date shifting และ current-week Monday
- [x] ปรับ `src/components/common/DatePicker.tsx` ให้ใช้ `THAI_MONTHS`, `THAI_MONTHS_SHORT` และ `THAI_WEEKDAYS` จาก constants กลาง
- [x] ปรับ `src/mocks/scheduleData.ts` และ `src/mocks/clinicDatabase.ts` ให้ schedule mock อิงวันจันทร์ของสัปดาห์ปัจจุบัน โดยคง offset ของ history/current slots
- [x] เพิ่ม/ปรับ tests สำหรับ constants, dynamic anchor, dashboard และ schedule rules
- ผลตรวจและข้อจำกัดบันทึกไว้ที่ [14 บันทึกการเปลี่ยนแปลง](14_change_log.md)

---

## 3. เทคนิคขั้นสูงสำหรับ Next.js App Router เพื่อลดความซ้ำซ้อน

### 3.1 Intercepting Routes ควบคู่กับ Parallel Routes (Modal Pattern)
เหมาะสำหรับหน้าที่ต้องการ UX แบบ Modal ลื่นไหลเมื่อผู้ใช้คลิกเลือกในหน้าเว็บ แต่ยังคงรองรับการแชร์ URL หรือเปิดแท็บใหม่เป็นหน้าเต็ม:
```text
src/app/(clinic)/pharmacy/
├── layout.tsx
├── page.tsx
├── @modal/
│   └── (.)medications/
│       └── [medicationId]/
│           └── page.tsx        <-- แสดงผลเป็น Popup Modal เมื่อนำทางภายในแอป
└── medications/
    └── [medicationId]/
        └── page.tsx            <-- แสดงผลเป็นหน้าเว็บเต็มเมื่อ Refresh หรือเปิดลิงก์ตรง
```

### 3.2 Layout & Server Component Data Fetching
- ย้ายการตรวจสอบสิทธิ์และดึงข้อมูลพื้นฐาน (User, Role, Notifications) ขึ้นไปไว้ที่ `layout.tsx` ของแต่ละ Route Group
- ส่งต่อข้อมูลผ่าน React Context หรือ Server Component composition เพื่อลดการเรียก Supabase ซ้ำซ้อนในทุก Page Component

---

## 4. มาตรการและขั้นตอนการส่งมอบ (Quality Gates Checklist)

ทุกการเปลี่ยนแปลงตามแผนนี้ จะต้องปฏิบัติตามมาตรฐานที่ระบุใน `AGENTS.md`:
1. ทำงานเฉพาะบน feature branch ของตนเอง และซิงค์ `develop` ก่อนเริ่มงาน
2. ประสานงานกับคู่ตรวจและเจ้าของโมดูลที่ได้รับผลกระทบก่อนเริ่มแก้ไข
3. ผ่าน Quality Gates ครบทั้ง 4 คำสั่งจาก root repository:
   ```bash
   npm run lint
   npx --no-install tsc --noEmit
   npm run test
   npm run build
   ```
4. ตรวจสอบ Responsive ที่ขนาด 360px และ 1280px รวมถึง Keyboard Navigation และ Accessible ARIA Labels

