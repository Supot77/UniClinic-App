# กัญจน์ — คลังยาและการจ่ายยา

## เจ้าของ

- เจ้าของ: กัญจน์
- คู่ตรวจ: กลอง
- ขอบเขต: medication catalog, inventory log, stock และ dispensing

## Code boundary

- `src/app/(clinic)/pharmacy/`
- `src/components/pharmacy/`
- `src/services/medicationService.ts`
- medication/inventory migrations และ pharmacy tests

## Dependency และ handoff

รับ prescription จาก pai และส่ง dispensing id กับจำนวนที่จ่ายเต็มให้ klong; ไม่เปิด diagnosis ใน flow คลังยา

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [Database and ER](../../03_database_design_and_er.md)
- [Acceptance Criteria](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
