<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

use skill caveman

# มาตรฐานการทำงานของ Agent

กฎส่วนนี้ใช้กับ Agent และสมาชิกทุกคนที่แก้ไข repository นี้ ให้อ่านเอกสารที่เกี่ยวข้องก่อนเริ่มงาน โดยยึดลำดับข้อมูลจาก `docs/00_reading_guide.md`: ข้อสรุปล่าสุดใน `docs/10_team_decisions.md` เป็นหลัก ตามด้วยเกณฑ์ตรวจรับใน `docs/08_system_rules_and_acceptance.md` และแผนใน `docs/09_implementation_plan.md` ห้ามถือว่าเอกสารข้อกำหนดเป็นหลักฐานว่าโค้ดหรือฐานข้อมูลพัฒนาเสร็จหรือผ่านการทดสอบแล้ว

## ขอบเขตและเจ้าของงาน

- ทำงานเฉพาะโมดูลที่ได้รับมอบหมายตามตารางเจ้าของงานใน `README.md` และ `docs/05_folder_and_git_workflow.md` เว้นแต่ผู้ใช้หรือเจ้าของโครงการสั่งเปลี่ยนขอบเขตอย่างชัดเจน
- ตรวจ `git status` และ diff ก่อนแก้ไข รักษาการเปลี่ยนแปลงเดิมของผู้อื่น และห้ามเขียนทับ ย้อนกลับ หรือลบงานที่ไม่ได้อยู่ในขอบเขต
- หากงานจำเป็นต้องแก้โมดูล สัญญาข้อมูล หรือไฟล์ที่ผู้อื่นเป็นเจ้าของ ให้ประสานเจ้าของโมดูลและคู่ตรวจก่อน รวมทั้งระบุผลกระทบไว้ในการส่งมอบหรือ PR
- เมื่อการเปลี่ยนแปลงของหลายโมดูลขัดกัน ให้ข้อกำหนดและการเปลี่ยนแปลงที่เจ้าของโมดูลนั้นอนุมัติเป็นหลัก ห้ามแก้ conflict ด้วยการเลือกงานของตนเองทับงานเจ้าของส่วนดังกล่าวโดยพลการ
- ไฟล์กลาง เช่น types, repository interfaces, mock data, shared components, layout, Supabase client และ migration ไม่มีเจ้าของคนเดียว การแก้ไขต้องรักษาความเข้ากันได้กับทุกโมดูลที่ใช้งาน และต้องแจ้งเจ้าของโมดูลที่ได้รับผลกระทบพร้อมคู่ตรวจ
- จำกัดการ refactor ให้อยู่ในสิ่งที่จำเป็นต่อเป้าหมาย ห้ามเปลี่ยน branch, merge, commit หรือ push เว้นแต่ได้รับคำสั่ง

## แนวทางข้อมูลและ Backend ในช่วง Mock

- สถานะปัจจุบันใช้ mock data และ mock repository เป็นแหล่งข้อมูลสำหรับการพัฒนา การสาธิต และ automated tests
- แยก UI และ business/domain logic ออกจากแหล่งข้อมูล โดยเรียกข้อมูลผ่าน repository หรือ service contract ที่ชัดเจน ห้ามให้ component ผูกกับรายละเอียดของ mock data หรือ Supabase โดยตรง
- Backend ต้องแยกเป็นสอง implementation ภายใต้ contract เดียวกัน: mock adapter/repository ซึ่งเป็น implementation ที่เปิดใช้งานในปัจจุบัน และ database adapter/repository สำหรับเชื่อมฐานข้อมูลจริงในอนาคต ซึ่งเตรียมโครงสร้างและขอบเขตไว้ได้แต่ยังไม่เปิดใช้งาน
- การเตรียม database adapter ต้องไม่ทำ network request ไปยังฐานข้อมูลจริง ไม่เปลี่ยน runtime ให้ใช้ Supabase และไม่สร้างความต้องการ secret เพื่อให้แอปหรือ tests ทำงาน เว้นแต่ได้รับมอบหมายอย่างชัดเจน
- พฤติกรรมและชนิดผลลัพธ์ของ mock adapter ต้องสอดคล้องกับ contract ที่ database adapter จะใช้ เพื่อให้สลับ implementation ได้โดยไม่แก้ UI หรือ domain logic
- ห้ามอนุมานว่า schema, migration, seed หรือ `src/types/database.ts` ปัจจุบันตรงกับข้อสรุปล่าสุด ตรวจเอกสารและประสานเจ้าของโมดูลก่อนเปลี่ยน contract ส่วนกลาง
- ห้ามรัน migration/seed กับฐานข้อมูลจริง ใช้ข้อมูลจริง หรือใช้/เปิดเผย `service_role`, `.env.local` และ secret ใด ๆ โดยไม่ได้รับอนุญาต
- Automated tests ต้องทำงานแบบ deterministic ด้วย mock/fake และต้องไม่พึ่ง network, บัญชีภายนอก หรือฐานข้อมูลจริง

## ขั้นตอนการทำงาน

1. อ่าน `AGENTS.md`, เอกสารข้อกำหนดที่เกี่ยวข้อง และไฟล์ใน flow เดิมก่อนเสนอหรือแก้ไขงาน
2. ก่อนเขียนโค้ด Next.js ให้อ่านคู่มือหัวข้อที่เกี่ยวข้องใน `node_modules/next/dist/docs/` ตามกฎด้านบน และทำตาม API/convention ของเวอร์ชันที่ติดตั้งจริง
3. ตรวจสถานะ Git, ระบุเจ้าของโมดูล ไฟล์ที่ต้องแก้ ขอบเขตผลกระทบ และ acceptance criteria ที่เกี่ยวข้อง
4. ทำการเปลี่ยนแปลงที่เล็กและตรงขอบเขต ตามรูปแบบที่มีอยู่ แยก domain logic ให้ทดสอบได้ และรักษา contract ระหว่างโมดูล
5. เมื่อพฤติกรรมเปลี่ยน ให้เพิ่มหรือปรับ tests ใน `tests/**/*.test.{ts,tsx}` โดยครอบคลุมกรณีสำเร็จ ขอบเขตสำคัญ validation/error และยืนยันว่า state ไม่เปลี่ยนเมื่อคำสั่งล้มเหลว หากพฤติกรรมนั้นเกี่ยวข้อง
6. ตรวจ diff หลังแก้ไขเพื่อหาไฟล์นอกขอบเขต secret debug code การเปลี่ยน contract โดยไม่ตั้งใจ และงานของผู้อื่นที่ถูกทับ
7. รัน quality gates ทั้งหมดและรายงานผลจริงก่อนส่งมอบ

## การทดสอบและ Quality Gates

ทุกงานที่แก้โค้ดต้องผ่านคำสั่งต่อไปนี้จาก root ของ repository:

```bash
npm run lint
npx --no-install tsc --noEmit
npm run test
npm run build
```

- รัน test เฉพาะไฟล์ระหว่างพัฒนาได้ แต่ไม่ใช้แทน full test suite ก่อนส่งมอบ
- ห้ามกล่าวว่า lint, typecheck, test หรือ build ผ่าน หากไม่ได้รันคำสั่งนั้นจริงในสถานะโค้ดล่าสุด
- หาก gate ใดรันไม่ได้หรือล้มเหลว ให้รายงานคำสั่ง สาเหตุ และระบุว่าเป็นผลจากการเปลี่ยนแปลงครั้งนี้หรือเป็นปัญหาเดิม ห้ามปิดบังหรือข้ามโดยไม่แจ้ง
- งานที่แก้ UI ต้องตรวจ flow ที่ได้รับผลกระทบใน Chrome ที่ความกว้าง 360px และ 1280px รวมการใช้งานด้วย keyboard และสถานะ loading, empty และ error บันทึกสิ่งที่ตรวจจริงและข้อจำกัด
- ก่อนรวม `main` ต้องผ่านกรณีหลักตาม acceptance criteria ที่เกี่ยวข้อง ส่วนก่อนนำเสนอต้องตรวจ SCN-01–07 และอีเมลจริงตามเอกสารเมื่อขอบเขตงานรองรับแล้ว

## การส่งมอบ

สรุปทุกครั้งว่าแก้ไฟล์ใด พฤติกรรมใดเปลี่ยน tests ใดถูกเพิ่มหรือแก้ และผลของแต่ละ quality gate หากมีสิ่งที่ยังไม่ได้ตรวจ ความเสี่ยง การตัดสินใจที่รอเจ้าของโมดูล หรือส่วน database จริงที่ยังเป็นเพียงโครงเตรียมไว้ ต้องระบุอย่างชัดเจน
