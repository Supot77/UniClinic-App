# Owner Documentation Views

เอกสารชุดนี้เป็นมุมมองแยกตามผู้รับผิดชอบ โดยอ้างอิง code path ปัจจุบันใน repository ณ 20 กันยายน 2569 และไม่แทนที่เอกสารกลาง

กำหนดส่งรอบปัจจุบันคือ **25 กันยายน 2569**. ความคืบหน้า code โดยรวมประมาณ 90% เป็น progress estimate เท่านั้น ไม่ใช่หลักฐาน acceptance, deployment, RLS หรือ browser QA

## เจ้าของและคู่ตรวจ

| โฟลเดอร์ | เจ้าของ | คู่ตรวจ | ขอบเขต |
| --- | --- | --- | --- |
| [feem](feem/README.md) | ฟีม | เฮิร์บ | สมาชิก โปรไฟล์ สิทธิ์ session และ patient search |
| [shop-supot](shop-supot/README.md) | ช้อป (สุพจน์) | ปาย | แผนก แพทย์ บริการ วันลา ตาราง และ slot |
| [pai](pai/README.md) | ปาย | ช้อป (สุพจน์) | นัดหมาย คิว ผลตรวจ และเวชระเบียน |
| [kan](kan/README.md) | กัญจน์ | กลอง | คลังยาและการจ่ายยา |
| [klong](klong/README.md) | กลอง | กัญจน์ | รายการเตือนและประวัติมื้อแบบ manual |
| [herb](herb/README.md) | เฮิร์บ | ฟีม | Broadcast, notifications และ Dashboard |
| [_shared](_shared/README.md) | ประสานงานร่วมกัน | ทุกโมดูล | type, client, constants, common UI, mocks และ migration ร่วม |

## วิธีอ่าน

1. อ่าน [เอกสารกลาง](../00_reading_guide.md) และ [ข้อสรุปทีม](../10_team_decisions.md) ก่อน
2. อ่าน `README.md` ของเจ้าของเพื่อดูขอบเขตและ dependency
3. อ่าน `as-built.md` เพื่อ trace จาก requirement ไปยัง code และ test
4. อ่าน `status.md` เพื่อดูหลักฐาน ข้อจำกัด และงานค้าง

ลำดับ source of truth คือ [10 ข้อสรุปทีม](../10_team_decisions.md) → [08 กติกาและเกณฑ์ตรวจรับ](../08_system_rules_and_acceptance.md) → [09 แผนพัฒนา](../09_implementation_plan.md) → [11 Functional Requirements](../11_functional_requirements.md) ส่วน `as-built` ตัดสินจาก code/test ที่พบจริง

## สถานะที่ใช้ร่วมกัน

- `ทำแล้วใน code` — พบ route และ logic ที่เกี่ยวข้องใน source
- `ทำบางส่วน/ยังมีช่องว่าง` — มี code path แต่ยังขาด behavior หรือขอบเขตบางส่วน
- `เป็น target ยังไม่พบ code` — มีใน requirement/plan แต่ยังไม่พบ implementation ที่ตรงกัน
- `ยังไม่ยืนยัน DB/RLS` — พบ migration หรือ repository แต่ไม่มีหลักฐาน integration กับฐานเป้าหมาย
- `ยังไม่ตรวจ browser` — ไม่มีหลักฐาน Chrome 360px/1280px และ keyboard QA
- `นอก scope` — ถูกตัดออกจากขอบเขตปัจจุบัน

การมี migration, type, repository หรือ mock ใน repository ไม่ใช่หลักฐานว่า deploy แล้วหรือผ่านการตรวจรับบนฐานจริง

## Evidence request ต่อโมดูล

เมื่อจะปิดสถานะ ให้แนบหลักฐานแยกตาม owner: migration history/SQL result, DB/RLS verification, repository/RPC result, automated test path, owner confirmation และ browser QA. จนกว่าจะมีหลักฐาน ให้คงสถานะ `ยังไม่ยืนยัน DB/RLS` หรือ `ยังไม่ตรวจ browser` ไว้

### หลักฐาน DB snapshot ที่ได้รับ

ไฟล์ [Database_check.md](../Database_check.md) เป็น snapshot ที่ผู้ใช้ยืนยันว่าเป็น target ปัจจุบันเดียวกับ runtime: พบตาราง `appointments`/`medical_records`, column health profile, RLS และ RPC บางส่วน แต่ไม่พบ `pai_appointments`, `pai_medical_records` และ `broadcast_recipients`; `broadcast_recipients` สอดคล้องกับ migration `05` ที่ตั้งใจยุบข้อมูลผู้รับมาไว้ใน `notifications`. Policy บางรายการยังอ้าง role เก่าโดยตั้งใจคงไว้ชั่วคราวจน reset ฐานทดสอบ. ผู้ใช้ยืนยันว่า migration ที่เกี่ยวข้อง deploy แล้ว แต่ยังไม่ใช่หลักฐานว่า session-based RLS ผ่าน
