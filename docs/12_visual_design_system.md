# ธีมกลาง WU Clinic

ชุดสีที่เจ้าของโครงการกำหนด วันที่ 9 กันยายน 2569 ใช้ร่วมกันทุกโมดูล
ค่ากลางอยู่ใน `src/app/globals.css` ใช้ Tailwind utilities ด้านล่างแทนการเพิ่มสี hex ใน component

สถานะ 21 กันยายน 2569: `globals.css` รองรับ light/dark ผ่าน `html[data-theme]` แล้ว โดยคง `data-theme` และ localStorage contract เดิมของหน้า Settings; Scheduling และ Herb dashboard ยังมีรายการ UI polish ตาม owner views

| หน้าที่ | Utility suffix | ค่า |
| --- | --- | --- |
| สีหลัก / ลิงก์และปุ่มที่มีข้อความขาว | brand / brand-strong | #1FA39A / #087F78 |
| ข้อความหลัก / Header / Footer | brand-ink | #102F3D |
| Hover เข้ม | brand-hover | #174858 |
| พื้น Hero / พื้นรอง / พื้นหน้า | brand-page / brand-soft / brand-surface | #EAF5F2 / #E2F5F1 / #F5FAF8 |
| การ์ด | white | #FFFFFF |
| ข้อความรอง / เนื้อหา | brand-muted / brand-body | #7B9093 / #49636B |
| สีเน้นบนพื้นเข้ม | brand-accent | #83D6C6 |
| ข้อความ Footer / ข้อมูลท้าย Footer | brand-footer-text / brand-footer-muted | #B6CED0 / #88A7AA |
| เส้นขอบ / เส้นแบ่ง / ปุ่มรอง | brand-border / brand-border-soft / brand-border-strong | #9BCFC5 / #E8EFED / #A9C9C4 |
| สถานะเร่งด่วน/ผิดพลาด | status-critical / status-critical-bg | #B42318 / #FFF1F0 |
| สถานะรอดำเนินการ/เตือน | status-warning / status-warning-bg | #A16207 / #FFF7D6 |
| สถานะสำเร็จ | status-success / status-success-bg | #15803D / #DCFCE7 |
| สถานะข้อมูล/กำลังทำงาน | status-info / status-info-bg | #087F78 / #E2F5F1 |
| สถานะยกเลิก/ไม่ทราบ | status-neutral / status-neutral-bg | #49636B / #F1F5F4 |

## Dark mode

เมื่อ `html[data-theme="dark"]` ถูกตั้งค่า ระบบจะใช้พื้นหลัง `#0E2026`, ข้อความหลัก `#EDF7F4`, surface การ์ด `#152F35` และเส้นขอบ `#2A474D` พร้อม accent teal ที่สว่างขึ้นสำหรับ focus และข้อมูลสำคัญ

- `slate-*`, `zinc-*` และ `gray-*` ถูก remap เป็น neutral scale สำหรับพื้นมืด ดังนั้น class เดิม เช่น `bg-white`, `text-zinc-900` และ `border-zinc-200` ยังใช้งานได้โดยไม่สร้างพื้นขาวหรือข้อความมืดใน dark mode
- `bg-white/40`, `/60`, `/65`, `/70` และ `/95` ที่ใช้กับ card, empty state และ control มี dark override; translucent overlay ของ header/footer เช่น `/10`, `/15` และ `/20` คงความหมายเดิม
- Global header/footer คง shell palette เดิมของ light mode; dark token เปลี่ยนเฉพาะเนื้อหาและ surface ภายในหน้า
- Landing steps scrim ใช้ `brand-surface` แทน white และ contact band มี dark surface override เฉพาะ landing เพื่อไม่ให้ข้อความขาวอยู่บนพื้นสว่าง
- Auth layout ใช้ `brand-surface` เป็นปลาย gradient; profile drawer ใช้ black translucent backdrop และ blur ที่เห็นได้จริง เพื่อไม่ให้ neutral remap กลายเป็น overlay สีขาวใน dark mode
- `input`, `select` และ `textarea` ใช้ dark surface, foreground, border และ placeholder ที่อ่านได้ พร้อม `color-scheme: dark`
- `status-critical`, `status-warning`, `status-success`, `status-info` และ `status-neutral` มีคู่สี dark ที่แยกจาก neutral tokens เพื่อคงความหมายของสถานะ
- หน้าผลตรวจและรายการยา และหน้านัดหมายใช้กรอบ `w-screen` พร้อม gutter ตาม breakpoint และไม่ถูกจำกัดด้วย `max-w-7xl`; workspace อื่นยังใช้ layout เดิม
- ปุ่ม action เพิ่ม/ลด/แก้ไข/ลบใน records, pharmacy และ medication detail ใช้ `brand-*` หรือ `status-*` สำหรับพื้นหลังและ hover เพื่อไม่ให้สี light hard-coded กลับมาใน dark mode

ตัวอย่าง: `bg-brand-page text-brand-ink`, `bg-brand-strong text-white`,
`border border-brand-border rounded-brand-card`, `focus-visible:outline-brand-strong`

## สัดส่วนต้นแบบ

- Hero: อ้างอิง 1521 × 657px; desktop padding 85px 51px; ความสูงขั้นต่ำ 657px เพื่อให้ข้อความขยายได้
- Footer: อ้างอิง 1521 × 413px; desktop padding 60px 51px; ความสูงขั้นต่ำ 413px
- Mobile: ความกว้างเต็มจอ padding แนวนอน 20px; ความสูงตามเนื้อหา
- Font: Noto Sans Thai จาก root layout; ใช้ family เดียวกันทั้งอักษรไทยและ Latin
- Hero: 13, 15, 75, 19, 21, 11px; หัวเรื่องย่อขนาดบนมือถือ
- Header/Footer: 13, 15, 19px; Header คงความสูง 64px ตามพื้นที่ชดเชยของ main
- Radius: `rounded-full`, `rounded-brand-sm` (9px), `rounded-brand-button` (13px), `rounded-brand-card` (17px), `rounded-brand-hero` (34px)
- Shadow: `shadow-brand-button` = 0 12px 28px rgba(16,47,61,0.18); `shadow-brand-hero` = 0 24px 70px rgba(28,74,75,0.16)
- วงตกแต่ง Hero: border 18px solid lab(84.8225 12.5111 15.0679 / 0.7)

## การใช้งานร่วมกัน

สี `sky-*`, `blue-*`, `teal-*`, `indigo-*` และ `violet-*` เดิมเปลี่ยนผ่าน theme กลางเป็นชุดเขียวเพื่อรองรับโมดูลเดิม
งานใหม่ใช้ `brand-*` โดยตรง สีสถานะ error/warning/success ยังแยกตามความหมาย
สีที่ hardcode เฉพาะโมดูลนอกหน้าแรก/Header/Footer ยังไม่ได้แทนทั้งหมด แต่ white surfaces, form controls และ opacity surfaces ที่เป็นจุดร่วมมี override กลางใน dark mode
ใช้ `brand-body` สำหรับเนื้อหาที่ต้องอ่านต่อเนื่อง; `brand-muted` เป็นค่าต้นแบบที่ต้องตรวจ contrast ตามพื้นและขนาดข้อความก่อนใช้

สถานะต้องจับคู่สีและข้อความ/ไอคอนเสมอ: `status-critical` ใช้กับอาการเร่งด่วน ความผิดพลาด การแพ้ยา และรายการปฏิเสธ; `status-warning` ใช้กับรออนุมัติ ใกล้หมด หรือข้อมูลที่ต้องตรวจ; `status-success` ใช้กับบันทึกสำเร็จ ตรวจเสร็จ และมีเพียงพอ; `status-info` ใช้กับข้อมูลยืนยันและกำลังดำเนินการ; `status-neutral` ใช้กับยกเลิก ไม่ทราบ หรือไม่มีข้อมูล

ไฟล์กลางมีผลต่อทุกทีมและคู่ตรวจ: ฟีม↔เฮิร์บ, ช้อป↔ปาย, กัญจน์↔กลอง
เจ้าของโครงการอนุมัติขอบเขตธีมกลางแล้ว การแจ้งสมาชิกผ่านช่องทางทีมและการตรวจรับรายโมดูลยังต้องดำเนินการโดยทีม

## การตรวจรับ

ตรวจ lint, typecheck, full tests และ build พร้อมตรวจ Chrome 360px/1280px,
keyboard และ loading/empty/error ตาม AGENTS.md ก่อนถือว่าผ่าน visual QA
ขนาดที่ระบุเป็นค่าจากโค้ด ยังไม่ใช่หลักฐานว่า screenshot ตรงต้นแบบทุกพิกเซล

ผลตรวจครั้งนี้ (21 กันยายน 2569):

- `npx.cmd --no-install tsc --noEmit` ผ่าน
- `npm.cmd run lint` ผ่าน
- targeted landing/auth/profile tests ผ่าน 4 files / 37 tests; full suite ล่าสุดผ่าน 40/41 files และ 351/352 tests โดยเหลือ failure เดิมใน `tests/dashboard-service.test.ts` ที่ fixture ใช้ `2026-09-08` แต่ runtime ปัจจุบันเป็น `2026-09-22`
- `npm.cmd run build` ผ่าน
- settings regression ผ่าน 2/2: โหลด light ที่บันทึกไว้, สลับ light/dark/system, และ reapply หลัง remount โดยคง localStorage
- Browser/CUA ไม่พร้อมใช้งาน (`browsers: []`, `Browser is not available: iab`); ยังไม่ได้ยืนยันหน้า settings และหน้าหลักที่ 360px/1280px, keyboard, loading/empty/error และ system preference จาก browser จริง

ผลตรวจเดิม (9 กันยายน 2569):

- `npx.cmd --no-install tsc --noEmit` ผ่าน
- `npm.cmd run build` ผ่าน
- `npm.cmd run lint` ผ่านด้วย warnings 10 รายการเดิม (unused variables และ `<img>` ใน pharmacy/profile/services)
- ESLint เฉพาะ page, layout, Header, Footer ที่แก้ ผ่าน
- `npm.cmd run test` ผ่าน 19 files / 155 tests; test slot กำหนด `todayDate` ชัดเจนเพื่อไม่ drift ตามวันที่รัน
- Header tests ผ่าน 7/7; ไม่มีการเพิ่มหรือแก้ tests เพราะเปลี่ยนเฉพาะรูปแบบแสดงผล
- Chrome ผ่านเครื่องมือไม่พร้อมใช้งาน (`Browser is not available: chrome`); ยังไม่ตรวจ 360px/1280px, keyboard และ loading/empty/error ใน browser
- In-app browser ก็ไม่พร้อมใช้งาน (`Browser is not available: iab`); visual QA ต้องตรวจในเครื่องทีมก่อนนำเสนอ
- Git index เดิมว่าง 0 ไบต์ สำรองแล้วสร้างจาก HEAD; working tree สะอาดก่อนเริ่มแก้ธีม และ sync origin/develop แล้ว
