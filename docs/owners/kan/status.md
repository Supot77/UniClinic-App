# กัญจน์ — Status

สถานะส่งต่อ: **เสร็จแบบรอยืนยัน**. Catalog, inventory และ dispense path มีอยู่ใน code; transaction/RLS/test evidence ยังต้องยืนยันก่อนปิดงาน

## ภาพรวมล่าสุด

- มี service สำหรับ catalog, low-stock, inventory logs และ dispense
- Pharmacy เป็น route แยกจาก PAI และมี UI สำหรับ prescriptions
- `dispenseMedication` ตรวจ stock ก่อนลดจำนวนและบันทึก log แต่การดำเนินการยังเป็นหลายคำสั่งต่อเนื่อง

## หลักฐาน

- Code: `src/services/medicationService.ts`, `src/components/pharmacy/PharmacyContent.tsx`, `src/components/pharmacy/PrescriptionsTab.tsx`
- Tests: `tests/pharmacy-access.test.tsx`, `tests/pharmacy-content-roles.test.tsx`
- Migrations: `01_schema.sql`, `03_normalized_transactions.sql`, `12_allow_medical_manage_medications.sql`, `26_medication_details_coverage.sql`, `27_medication_unit_pack.sql`

## งานค้าง/ข้อจำกัด

- Full test evidence ล่าสุดมี failure เดิมที่ปุ่ม `ปิดหน้าต่าง` ซ้ำใน `tests/pharmacy-content-roles.test.tsx:380`
- ยังไม่ยืนยัน dispense transaction, RLS และฐาน deployment จริง
- DB snapshot ยืนยันว่าตารางยาและ inventory logs มี RLS แต่ policy ยังเปิดเงื่อนไข role เก่า `doctor`, `pharmacist`, `staff`, `admin`; ยังไม่ถือเป็น canonical RLS proof
- ยังไม่ตรวจ browser QA

## Handoff

สร้าง reminder ได้เฉพาะจาก dispensing ที่จ่ายเต็มตามกติกา และต้องส่งข้อมูล dispensing ให้ klong
