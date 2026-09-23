# กัญจน์ — As-built Trace

| Requirement | Route/component | Function/service/data path | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| ดูและจัดการ medication catalog | `/pharmacy`, `PharmacyContent` | `getMedications`, `getMedicationById`, `createMedication`, `updateMedication` | `tests/pharmacy-access.test.tsx`, `tests/pharmacy-content-roles.test.tsx`, migrations `01`, `12`, `26`, `27` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| low stock และ inventory log | pharmacy inventory UI | `getLowStockMedications`, `getInventoryLogs`, `createInventoryLog` | `src/services/medicationService.ts`, inventory schema/migrations | ทำแล้วใน code; integration ยังไม่ยืนยัน |
| ดู prescription และจ่ายยา | `PrescriptionsTab`, pharmacy route | `dispenseMedication`, `PrescriptionOrder` และ UI dispensing path ผ่าน medication API | `tests/pharmacy-content-roles.test.tsx`, `tests/pharmacy-access.test.tsx` | ทำบางส่วน; ยังไม่เชื่อม PAI appointment end-to-end |
| จ่ายเต็มเมื่อ stock เพียงพอ | `src/components/pharmacy/PrescriptionsTab.tsx`, pharmacy route | `src/services/medicationService.ts`: อ่าน stock → `updateMedication` → `createInventoryLog` ผ่าน API | `src/services/medicationService.ts`, `tests/pharmacy-access.test.tsx`, AC08/AC09 | ทำบางส่วน; ยังไม่พบ transaction/RPC ที่ยืนยัน atomicity |
| ปฏิเสธเมื่อ stock ไม่พอ | `src/components/pharmacy/PrescriptionsTab.tsx`, dispensing action | `src/services/medicationService.ts`: `dispenseMedication` ตรวจ `med.stock < quantity` ก่อน update | `src/services/medicationService.ts`, `tests/pharmacy-content-roles.test.tsx` | ทำแล้วใน code; DB/RLS/integration ยังไม่ยืนยัน |

## ข้อจำกัด

Runtime ของ pharmacy ใช้ medication API ไม่มี mock/local-storage data fallback; ยังไม่สรุปว่า dispense เชื่อม PAI แบบ end-to-end หรือ atomic แล้ว
