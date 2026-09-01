# Original User Request

## Initial Request — 2026-08-28T03:10:00Z

พัฒนาระบบเว็บแอปพลิเคชันบริหารจัดการคลินิกสุขภาพมหาวิทยาลัยและการแจ้งเตือนการทานยา (WU Clinic Booking & Medication System) ครอบคลุม 6 โมดูลหลักตามข้อกำหนดวิชา COE67-331 มหาวิทยาลัยวลัยลักษณ์ พร้อมเชื่อมต่อฐานข้อมูล Supabase และรองรับ Full CRUD

Working directory: D:\Mini Project WEB\wu-clinic-booking
Integrity mode: demo

## Requirements

### R1. ระบบบริการและแผนกสุขภาพมหาวิทยาลัย (University Clinic Service & Master Data)
- จัดเตรียมและจัดการข้อมูลแผนกบริการหลัก 5 แผนก:
  1. บริการตรวจรักษาโรคทั่วไปและทำแผล (General Medicine & Primary Care)
  2. บริการให้คำปรึกษาสุขภาพจิตและความเครียด (Mental Health & Counseling)
  3. บริการตรวจสุขภาพและออกใบรับรองแพทย์ไปฝึกงาน/สมัครงาน/ลาป่วย (Medical Certificate)
  4. บริการฉีดวัคซีนและเวชศาสตร์ป้องกัน (Vaccinations & Preventive Care)
  5. บริการกายภาพบำบัดและฟื้นฟูออฟฟิศซินโดรม (Physical Therapy)
- รองรับการกำหนดระยะเวลาตรวจต่อคิว (Slot duration เช่น 15, 30, 45 นาที) ตามประเภทบริการ

### R2. ระบบจัดการตารางแพทย์และการจองคิวออนไลน์ (Doctor Schedules & Appointment Booking)
- เจ้าหน้าที่สามารถสร้าง/แก้ไข/ลบ Slot เวลาว่างของแพทย์ในแต่ละวันได้
- นักศึกษา/บุคลากรสามารถค้นหาแพทย์ตามแผนก/วันที่ และเลือกจองคิวตรวจได้
- มีกลไกป้องกันการจองคิวซ้อน (Race Condition & Concurrency Prevention) และตรวจสอบสถานะ Slot แบบ Realtime
- รองรับการติดตามสถานะนัดหมาย (Pending, Confirmed, Completed, Cancelled) พร้อมระบบขอยกเลิกหรือเลื่อนนัด

### R3. ระบบจัดการฐานข้อมูลคลังยาและเวชภัณฑ์ (Medication Inventory & Master Data)
- ระบบจัดการรายการยากลาง (ชื่อยา, ชื่อสามัญ, ขนาดยา, หมวดหมู่, วันหมดอายุ, ยอดสต็อกคงเหลือ และเกณฑ์ขั้นต่ำ Min Stock)
- ระบบแจ้งเตือนสต็อกวิกฤต (Low stock alerts) และระบบค้นหายาแบบมี Debounce

### R4. ระบบแจ้งเตือนการทานยาส่วนบุคคลและบันทึกประวัติ (Personal Medication Reminders & Compliance)
- ผู้ป่วยสามารถสร้างตารางแจ้งเตือนการทานยา กำหนดช่วงเวลา/ความถี่ต่อวัน
- หน้าจอกดยืนยันการทานยา  กินแล้ว / ข้ามมื้อ พร้อมบันทึกลงประวัติ (Medication Logs)
- แสดงผลสรุปความสม่ำเสมอในการทานยา (Compliance Rate)

### R5. ศูนย์แจ้งเตือนและแดชบอร์ดสรุปผลผู้บริหารคลินิก (Notification Center & Admin Dashboard)
- ศูนย์รวมการแจ้งเตือน Realtime สำหรับผู้ใช้แต่ละคน (แจ้งเตือนนัดหมาย, เตือนทานยา, ประกาศทั่วไป)
- หน้า Admin Dashboard สรุปข้อมูลสถิติภาพรวม: คิวตรวจประจำวัน, สถิติแยกตามแผนก, อัตราการมาตามนัด (No-show rate), สถานะคลังยา

### R6. ระบบสมาชิก การควบคุมสิทธิ์และความปลอดภัย (Authentication & PDPA / RLS Security)
- รองรับการสมัครสมาชิกและเข้าสู่ระบบด้วย Supabase Auth (แยก Role: Student/Patient และ Staff/Admin)
- บังคับใช้ Row Level Security (RLS) อย่างเข้มงวด ป้องกันการเข้าถึงข้อมูลสุขภาพข้ามผู้ใช้
- ทุกหน้าจอรองรับ Mobile-First Responsive, Loading Skeletons, Empty States และ Error Handling

## Acceptance Criteria

### Authentication & Security
- [ ] ผู้ใช้ที่ไม่ผ่านการยืนยันตัวตน (Unauthenticated) ไม่สามารถเข้าถึงหน้าที่เป็น Protected Route ได้
- [ ] ผู้ใช้ทั่วไป (Student) ไม่สามารถอ่านหรือแก้ไขข้อมูลนัดหมายและประวัติยาของผู้ใช้อื่นได้ผ่าน API / Supabase Client SDK

### Clinic Services & Booking
- [ ] ระบบแสดงรายการแผนกทั้ง 5 แผนก พร้อมแพทย์ประจำแผนกและตาราง Slot เวลาว่างจริงจาก DB
- [ ] การจองคิวใน Slot เดียวกันโดยผู้ใช้ 2 คนพร้อมกัน ต้องอนุญาตให้เพียง 1 คำขอสำเร็จ และแจ้งเตือนข้อผิดพลาดแก่คำขอที่ซ้อนทับ

### Medication & Reminders
- [ ] การกดยืนยัน กินยาแล้ว บันทึกลงตาราง medication_logs พร้อม Timestamp ทันที และอัปเดตอัตรา Compliance ได้ถูกต้อง
- [ ] การเพิ่ม/ตัดสต็อกยาในคลังยา คำนวณยอดคงเหลือและแสดงสถานะ (มีเพียงพอ / ต้องสั่งเพิ่ม / วิกฤต) อย่างถูกต้อง

### Quality & Performance
- [ ] ทุกหน้าจอดึงข้อมูลจริงจาก Supabase (Full CRUD) โดยไม่มีข้อผิดพลาด Console Error
- [ ] ผ่านเกณฑ์การทดสอบอย่างน้อย 10 Test Cases (ทั้งกรณี Valid และ Invalid/Error Handling)
