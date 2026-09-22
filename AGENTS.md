<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# การเรียกใช้ Skill อัตโนมัติตามประเภทงาน (Skill Routing & Enforcement)

Agent ต้องเลือกเปิดใช้งานและปฏิบัติตาม Skill ที่สอดคล้องกับประเภทงานดังต่อไปนี้:

1. **โหมดการสื่อสาร (Terse Communication)**:
   - เรียกใช้ `caveman` ตลอดเวลา: สื่อสารกระชับ ตรงประเด็น ตัดคำฟุ่มเฟือย คงเนื้อหาทางเทคนิคและภาษาของผู้ใช้ครบถ้วน ประหยัด token
2. **การวางแผนและออกแบบ (Feature Planning & Design)**:
   - เรียกใช้ `brainstorming` เสมอเมื่อเริ่มคิดฟีเจอร์ใหม่, ออกแบบ logic/workflow, หรือปรับเปลี่ยนพฤติกรรมระบบ ห้ามเขียนโค้ดก่อนได้รับความเห็นชอบจากผู้ใช้ (Hard Gate)
3. **การพัฒนาหน้าบ้านและส่วนติดต่อผู้ใช้ (Frontend & UI Development)**:
   - เรียกใช้ `frontend-design` เมื่อสร้างหรือปรับปรุง UI Components, Pages, Layouts ให้ได้มาตรฐาน สวยงาม ไม่ generic รองรับ responsive และตรงตามระบบ WU Clinic
4. **การสืบสวนและแก้ไขข้อผิดพลาด (Debugging & Troubleshooting)**:
   - เรียกใช้ `debug-mantra` เมื่อพบข้อผิดพลาด, test fail, บั๊ก หรือ stack trace โดยยึดหลัก 4 ขั้นตอน (Reproduce, Trace fail path, Falsify hypothesis, Cross-reference) ก่อนเสนอวิธีแก้
5. **การจัดการ Git และ Branch (Git Workflow)**:
   - เรียกใช้ `sync-develop` ก่อนเริ่มงานบน branch ทุกครั้ง เพื่อ fetch และ sync การเปลี่ยนแปลงล่าสุดจาก `origin/develop` เข้า branch ตนเองอย่างปลอดภัย
6. **การตรวจทานโค้ด (Code Review & Audit)**:
   - เรียกใช้ `scrutinize` หรือ `caveman-review` เมื่อต้องตรวจสอบ diff, ตรวจ PR หรือ sanity check โค้ดก่อนส่งมอบ
7. **การบันทึกสรุปปัญหาหลังแก้ไข (Incident & Bug Resolution)**:
   - เรียกใช้ `post-mortem` เพื่อบันทึก Root Cause Analysis (RCA) หลังแก้ปัญหาสำคัญเสร็จสิ้น

# มาตรฐานการทำงานของ Agent

กฎส่วนนี้ใช้กับ Agent และสมาชิกทุกคนที่แก้ไข repository นี้ ให้อ่านเอกสารที่เกี่ยวข้องก่อนเริ่มงาน โดยยึดลำดับข้อมูลจาก `docs/00_reading_guide.md`: ข้อสรุปล่าสุดใน `docs/10_team_decisions.md` เป็นหลัก ตามด้วยเกณฑ์ตรวจรับใน `docs/08_system_rules_and_acceptance.md` และแผนใน `docs/09_implementation_plan.md` ห้ามถือว่าเอกสารข้อกำหนดเป็นหลักฐานว่าโค้ดหรือฐานข้อมูลพัฒนาเสร็จหรือผ่านการทดสอบแล้ว

## ขอบเขตและเจ้าของงาน

- ทำงานเฉพาะโมดูลที่ได้รับมอบหมายตามตารางเจ้าของงานใน `README.md` และ `docs/05_folder_and_git_workflow.md` เว้นแต่ผู้ใช้หรือเจ้าของโครงการสั่งเปลี่ยนขอบเขตอย่างชัดเจน
- ตรวจ `git status` และ diff ก่อนแก้ไข รักษาการเปลี่ยนแปลงเดิมของผู้อื่น และห้ามเขียนทับ ย้อนกลับ หรือลบงานที่ไม่ได้อยู่ในขอบเขต
- ก่อนเริ่มงานใหม่ทุกครั้งบน branch ของตนเอง ต้องตรวจว่า working tree อยู่ในสภาพที่ sync ได้ แล้วดึง `develop` ล่าสุดด้วย `git fetch origin develop` และรวม `origin/develop` เข้า branch ที่กำลังทำงานก่อนเริ่มแก้โค้ด หากมีงานค้างหรือเกิด conflict ให้หยุดรักษางานเดิมและประสานเจ้าของก่อน
- หากงานจำเป็นต้องแก้โมดูล สัญญาข้อมูล หรือไฟล์ที่ผู้อื่นเป็นเจ้าของ ให้ประสานเจ้าของโมดูลและคู่ตรวจก่อน รวมทั้งระบุผลกระทบไว้ในการส่งมอบหรือ PR
- เมื่อการเปลี่ยนแปลงของหลายโมดูลขัดกัน ให้ข้อกำหนดและการเปลี่ยนแปลงที่เจ้าของโมดูลนั้นอนุมัติเป็นหลัก ห้ามแก้ conflict ด้วยการเลือกงานของตนเองทับงานเจ้าของส่วนดังกล่าวโดยพลการ
- ไฟล์กลาง เช่น types, repository interfaces, mock data, shared components, layout, Supabase client และ migration ไม่มีเจ้าของคนเดียว การแก้ไขต้องรักษาความเข้ากันได้กับทุกโมดูลที่ใช้งาน และต้องแจ้งเจ้าของโมดูลที่ได้รับผลกระทบพร้อมคู่ตรวจ
- จำกัดการ refactor ให้อยู่ในสิ่งที่จำเป็นต่อเป้าหมาย ห้ามเปลี่ยน branch, merge, commit หรือ push เว้นแต่ได้รับคำสั่ง หรือเป็นการ sync `origin/develop` เข้า branch ตนเองตามกติกาข้อนี้
- หลังทำงานเสร็จ ต้องบันทึกการเปลี่ยนแปลงไว้บน branch ของตนเองเป็นลำดับ (ตรวจ diff, commit และ push branch ของตนเองเมื่อได้รับอนุญาต) ห้ามส่งงานตรงเข้า `develop` หรือ `main`

## แนวทางข้อมูลและ Backend แบบ Database-first

- Runtime ของแอปใช้ Supabase จริงผ่าน database repository/adapter เป็น implementation หลัก ส่วน mock repository ใช้สำหรับ automated tests, Story/demo แบบ offline หรือกรณีที่ test ระบุ dependency ชัดเจนเท่านั้น
- แยก UI และ business/domain logic ออกจากแหล่งข้อมูล โดยเรียกผ่าน repository หรือ service contract ที่ชัดเจน ห้ามให้ component เขียน Supabase query หรือ import mock fixture โดยตรง
- Backend ต้องมี database repository และ mock repository ภายใต้ contract เดียวกัน พฤติกรรม ชนิดผลลัพธ์ validation และ error สำคัญต้องสอดคล้องกัน เพื่อให้ tests สลับเป็น mock ได้โดยไม่แก้ UI หรือ domain logic
- ใช้ Supabase client ตาม execution context: browser client สำหรับคำสั่งของผู้ใช้, server client สำหรับ Server Component/Server Action/Route Handler และใช้ session ของผู้ใช้ร่วมกับ RLS ห้ามใช้ `service_role` ใน browser หรือส่ง secret ไปยัง client bundle
- อนุญาตให้แก้ schema, migration, seed, RLS, RPC และ `src/types/database.ts` เมื่ออยู่ในขอบเขตงาน แต่ต้องอ่านเอกสารล่าสุด ตรวจ dependency ทุกโมดูล ใช้ migration ที่ review ได้ และระบุฐานเป้าหมายก่อนรัน
- อนุญาตให้รัน migration/seed กับฐาน development หรือ staging ที่ทีมกำหนด หลังตรวจ project/target, สำรองข้อมูลเมื่อมีข้อมูลเดิม และได้รับอนุญาตสำหรับคำสั่งที่มีผลต่อ remote database ห้ามรัน destructive reset กับ production
- ห้ามอ่าน แสดง commit หรือเผยแพร่ `.env.local`, `service_role` และ secret ใด ๆ ใช้เฉพาะชื่อ environment variable หรือ placeholder ในเอกสารและ test
- Automated tests ปกติต้อง deterministic ด้วย mock/fake และไม่พึ่ง network หรือฐานจริง ส่วน database integration test ต้องแยกคำสั่ง/ชุดทดสอบ ใช้ฐานทดสอบที่ระบุชัด และไม่รันรวมกับ unit test โดยอัตโนมัติ

## หน้าและส่วนประกอบตามบทบาท

- ระบบมี 3 role canonical: `patient`, `medical`, `staff_admin` แต่ละ role ต้องมี entry page หรือ dashboard ของตนเอง และต้องผ่าน route/layout guard ก่อน render ข้อมูล
- เมื่อ role ต่างกันด้านสิทธิ์ ข้อมูลที่เห็น หรือคำสั่งที่ทำได้ ให้แยก role-specific page/container/component ห้ามใช้ตัวเลือกสลับ role ใน production UI เพื่อจำลองสิทธิ์
- ส่วน presentational component ที่ไม่มีข้อมูลอ่อนไหวและมีพฤติกรรมเหมือนกันใช้ร่วมกันได้ ห้ามคัดลอก UI ทั้งหน้าเมื่อแยกเฉพาะ data loader, action หรือ permission boundary ก็เพียงพอ
- UI guard ใช้เพื่อประสบการณ์ผู้ใช้เท่านั้น การอนุญาตจริงต้องตรวจซ้ำใน service/repository และ Supabase RLS/RPC ทุกคำสั่งที่อ่านหรือเขียนข้อมูล

## ขั้นตอนการทำงาน

1. อ่าน `AGENTS.md`, เอกสารข้อกำหนดที่เกี่ยวข้อง และไฟล์ใน flow เดิมก่อนเสนอหรือแก้ไขงาน
2. ก่อนเขียนโค้ด Next.js ให้อ่านคู่มือหัวข้อที่เกี่ยวข้องใน `node_modules/next/dist/docs/` ตามกฎด้านบน และทำตาม API/convention ของเวอร์ชันที่ติดตั้งจริง
3. ตรวจสถานะ Git, ระบุเจ้าของโมดูล ไฟล์ที่ต้องแก้ ขอบเขตผลกระทบ และ acceptance criteria ที่เกี่ยวข้อง
4. sync `origin/develop` เข้า branch ของตนเองตามกติกา Git ก่อนเริ่มเขียนโค้ด
5. ทำการเปลี่ยนแปลงที่เล็กและตรงขอบเขต ตามรูปแบบที่มีอยู่ แยก domain logic ให้ทดสอบได้ และรักษา contract ระหว่างโมดูล
6. เมื่อพฤติกรรมหรือ business rule เปลี่ยน ให้พิจารณาเพิ่มหรือปรับ tests ใน `tests/**/*.test.{ts,tsx}` ตามความเสี่ยงและขอบเขตของงาน โดยงานเล็กมาก งาน copy/docs หรือการปรับ UI ที่ไม่เปลี่ยน logic สามารถข้าม test ได้ แต่ต้องระบุเหตุผลและสิ่งที่ตรวจแทน หากงานกระทบ validation, permission, state หรือ data contract ให้เพิ่ม regression test เฉพาะส่วนที่เกี่ยวข้อง
7. ตรวจ diff หลังแก้ไขเพื่อหาไฟล์นอกขอบเขต secret debug code การเปลี่ยน contract โดยไม่ตั้งใจ และงานของผู้อื่นที่ถูกทับ
8. เลือกและรัน quality gates ที่เหมาะกับความเสี่ยงของงาน ไม่ต้องรันครบทุกส่วนเป็นค่าเริ่มต้น และรายงานผลจริงก่อนส่งมอบ จากนั้น commit งานไว้บน branch ของตนเองตามสิทธิ์ที่ได้รับ

## การทดสอบและ Quality Gates

ปรับระดับการตรวจรับตามขนาดและความเสี่ยงของการเปลี่ยนแปลง (Risk-Based Quality Gates) โดยให้ความเร็วช่วงโค้งสุดท้ายมีน้ำหนักร่วมกับความปลอดภัยของงาน:

### 1. งานเล็กมากหรือไม่มีผลต่อพฤติกรรม (Trivial / Docs / Copy / Cosmetic)
- ตัวอย่างเช่น แก้เอกสาร, copy, comment, formatting, สี หรือ spacing ที่ไม่เปลี่ยน logic, contract, permission หรือ data flow
- ไม่บังคับรัน automated test, typecheck หรือ build หากไม่มีเหตุผลว่าการเปลี่ยนแปลงนั้นกระทบการ compile หรือ runtime
- ตรวจ `git diff --check` และ review diff เฉพาะจุดก็เพียงพอ พร้อมระบุว่าไม่ได้รัน test เพราะเป็นการเปลี่ยนแปลงที่ไม่มีผลต่อพฤติกรรม

### 2. งานย่อยและงานปรับแต่งทั่วไป (Minor Changes / Tweaks / UI / Copy)
- สำหรับงานขนาดเล็ก เช่น ปรับแก้ UI/CSS, สี, ข้อความ, assets หรือแก้บักเฉพาะจุดที่ไม่กระทบ business logic หรือ database schema
- **ไม่จำเป็นต้องรัน Full Suite ทั้ง 4 คำสั่ง** เพื่อความรวดเร็วและคล่องตัวในการพัฒนา
- ตรวจสอบเฉพาะเครื่องมือที่เกี่ยวข้องโดยตรง เช่น:
  - `npx --no-install tsc --noEmit` เพื่อยืนยัน type safety
  - และ/หรือ รัน test เฉพาะไฟล์ที่เกี่ยวข้อง เช่น `npx vitest run tests/<file>.test.tsx`
- ถ้าเป็น UI ที่ไม่เปลี่ยน logic อาจตรวจด้วย diff หรือ browser เฉพาะหน้าที่แก้ โดยไม่ต้องเพิ่ม test

### 3. งานระดับกลาง (Scoped Behavior / Module Change)
- สำหรับการแก้ business rule เฉพาะโมดูล, validation, state transition, route handler หรือ repository ที่มีผลต่อ flow แต่ไม่กระทบระบบวงกว้าง
- รัน focused tests ของโมดูลที่แก้ และเพิ่ม typecheck/lint/build เฉพาะเมื่อไฟล์หรือความเสี่ยงของงานต้องการ
- ไม่ต้องรัน full suite เว้นแต่พบผลกระทบข้ามโมดูล, เปลี่ยน shared contract หรือผู้พัฒนาร้องขอ

### 4. งานใหญ่และการส่งมอบสำคัญ (Major Changes / Pre-PR / Milestones)
- สำหรับงานเพิ่ม/แก้ business logic สำคัญ, database schema, migration, สัญญา API/Interface กลาง หรือก่อนเปิด PR เพื่อ merge เข้า `develop` หรือ `main`
- โดยปกติควรผ่าน Full Quality Gates ครบทั้ง 4 คำสั่งจาก root ของ repository:
  ```bash
  npm run lint
  npx --no-install tsc --noEmit
  npm run test
  npm run build
  ```
- หากอยู่ในช่วงเร่งส่งมอบและ full suite มีต้นทุนสูง ให้ผู้พัฒนาหรือเจ้าของงานตัดสินใจได้ว่าจะใช้ focused gates แทนหรือไม่ โดยต้องบันทึกขอบเขตที่ยังไม่ได้ตรวจและไม่อ้างว่า full acceptance ผ่าน

### ข้อปฏิบัติทั่วไป
- ห้ามกล่าวว่า lint, typecheck, test หรือ build ผ่าน หากไม่ได้รันคำสั่งนั้นจริงในสถานะโค้ดล่าสุด
- หาก gate ใดรันไม่ได้หรือล้มเหลว ให้รายงานคำสั่ง สาเหตุ และระบุว่าเป็นผลจากการเปลี่ยนแปลงครั้งนี้หรือเป็นปัญหาเดิม ห้ามปิดบังหรือข้ามโดยไม่แจ้ง
- งานที่แก้ UI ให้ตรวจ flow ที่ได้รับผลกระทบใน Chrome ที่ความกว้าง 360px และ 1280px รวมการใช้งานด้วย keyboard และสถานะ loading, empty และ error เมื่อเป็นการเปลี่ยนหน้าหรือ interaction ที่มีความเสี่ยงหรือผู้พัฒนาต้องการหลักฐาน browser; งาน cosmetic เล็กน้อยไม่บังคับตรวจครบทุกมิติ
- ก่อนรวม `main` หรือ deploy ให้ตรวจกรณีหลักตาม acceptance criteria ที่เกี่ยวข้องตามความเสี่ยงของงาน ส่วน SCN-01–07 และอีเมลจริงให้ตรวจเมื่อขอบเขตงานรองรับและเจ้าของงานร้องขอหรือเตรียมส่งมอบจริง
- หากไม่แน่ใจว่าควรตรวจระดับใด หรือการตรวจเต็มใช้เวลามาก ให้ถามผู้พัฒนาหรือเจ้าของงานก่อนว่าจะใช้ focused checks หรือ full suite; ห้ามตีความการไม่รัน full suite ว่าเป็นการผ่านการตรวจครบทุกส่วน

## การส่งมอบ

สรุปทุกครั้งว่าแก้ไฟล์ใด พฤติกรรมใดเปลี่ยน tests ใดถูกเพิ่มหรือแก้ และผลของแต่ละ quality gate หากมีสิ่งที่ยังไม่ได้ตรวจ ความเสี่ยง การตัดสินใจที่รอเจ้าของโมดูล migration ที่ยังไม่ได้ deploy หรือ flow ฐานจริงที่ยังไม่ได้ตรวจ ต้องระบุอย่างชัดเจน
