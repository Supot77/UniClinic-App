# 08. กติการะบบและเกณฑ์ตรวจรับฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: เกณฑ์เสนอสำหรับระบบย่อ ทุกข้อยังไม่ทดสอบและไม่แทน AC/SCN ของระบบหลัก

## 1. กฎสิทธิ์

| บทบาท | ทำได้ | ทำไม่ได้ |
| --- | --- | --- |
| Patient | จัด profile ตน จอง/ยกเลิกนัด ดูผลปิดแล้ว ดูยาตน ตั้งเตือนและกดกินแล้ว | จัดตาราง ยืนยันนัด เขียนผล จ่ายยา หรืออ่านข้อมูลคนอื่น |
| Doctor | ดูตาราง/นัดของตน เขียนผลและสั่งยาในนัดตน | จัด stock จ่ายยา แก้นัด Doctor อื่น หรือตั้งเตือนแทน Patient |
| Staff | จัดบัญชีภายใน ตาราง นัด Catalog stock และจ่ายยา | เขียน diagnosis แทน Doctor หรือตั้งเตือนแทน Patient |

- Patient สมัครเองผ่าน Supabase Auth ได้เฉพาะ `mail.wu.ac.th`
- Patient ต้องยืนยันอีเมลก่อนเข้าใช้ข้อมูลแอป
- ผู้ดูแลโครงการสร้าง Doctor/Staff และกำหนด role ผ่าน Supabase Dashboard ไม่มีหน้าจอจัดการบัญชีในแอป
- บัญชี `is_active=false` เข้าใช้ข้อมูลแอปไม่ได้; หาก Auth ยังออก session แอปต้อง sign out หลังอ่าน profile
- การซ่อนเมนูไม่ถือเป็นการตรวจสิทธิ์ Service และ RLS ต้องตรวจ role/ownership

## 2. กฎตารางตรวจ

- สร้างรอบได้เฉพาะ Staff
- Doctor ต้องเป็น profile ที่ active และ role `doctor`
- วันและเวลาต้องถูกต้อง `start_time < end_time`
- capacity เป็นจำนวนเต็มมากกว่า 0
- Doctor คนเดียวกันมีรอบเวลาทับกันไม่ได้
- รอบ `closed` หรือผ่านมาแล้วจองไม่ได้
- รอบที่มีนัดอยู่แก้ Doctor, วัน, เวลา หรือ capacity ต่ำกว่าจำนวนจองไม่ได้ แต่ปิดรับนัดใหม่ได้

## 3. กฎนัดหมาย

- Patient จองรอบอนาคตที่ `open` และยังไม่เต็ม
- นัดใหม่เริ่ม `pending` และนับความจุทันที
- Patient เดิมจองรอบเดียวกันซ้ำไม่ได้
- Staff เปลี่ยน `pending → confirmed` หรือ `pending/confirmed → cancelled`
- Patient เปลี่ยนนัดของตน `pending/confirmed → cancelled`
- Doctor ปิดตรวจแล้วนัดเปลี่ยน `confirmed → completed`
- cancelled และ completed ไม่เปลี่ยนกลับด้วย flow ปกติ
- เมื่อคำสั่งจองล้มเหลว ต้องไม่สร้างนัดและจำนวนที่ใช้ต้องไม่เพิ่ม

## 4. กฎผลตรวจและใบสั่ง

- Doctor ทำงานเฉพาะ appointment ที่ `confirmed` และ schedule เป็นของตน
- หนึ่ง appointment มี medical record ได้หนึ่งรายการ
- ขณะที่ appointment เป็น `confirmed` Doctor แก้ diagnosis, treatment และ prescriptions ได้
- Prescription ต้องอ้างยาที่ active จำนวนเป็นจำนวนเต็มบวก และมีคำสั่งใช้
- การปิดผลตรวจต้องมี diagnosis และ treatment; prescription จะไม่มีเลยก็ได้
- เมื่อปิด เปลี่ยน appointment เป็น `completed`; สถานะนี้ใช้เป็นหลักฐานว่าผลตรวจปิดแล้ว
- Record ของ appointment ที่ completed แก้ไม่ได้ในระบบฉบับย่อ
- Patient เห็น record ของตนเมื่อ appointment เป็น completed เท่านั้น

## 5. กฎยาและการจ่าย

- Staff เพิ่มยา แก้ชื่อ/หน่วย ปรับ stock และปิดใช้ยาได้
- stock เป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป
- จ่ายได้เมื่อ appointment ต้นทางเป็น `completed` และทุก prescription ยัง `pending`
- ต้องตรวจ stock ของทุกรายการก่อนเปลี่ยนข้อมูล
- ถ้ายารายการใดไม่พอ ปฏิเสธทั้งชุด: stock และสถานะทุกรายการคงเดิม
- ถ้าพอ ลด stock ตาม quantity และเปลี่ยน prescription ทุกตัวเป็น `dispensed`
- จ่าย prescription ที่ dispensed แล้วซ้ำไม่ได้
- การจ่ายเรียก PostgreSQL RPC เดียว; browser ห้ามแก้ stock หรือสถานะจ่ายโดยตรง
- ไม่มีการแบ่งจ่าย คืนยา ยาค้าง หรือปรับประวัติย้อนหลัง

## 6. กฎเตือนในเว็บ

- Patient สร้าง reminder ได้จาก prescription ของตนที่ `dispensed`
- หนึ่ง prescription มี reminder ได้หนึ่งรายการ
- reminder time ใช้ `HH:mm` และ timezone `Asia/Bangkok`
- Patient แก้เวลา เปิด หรือปิด reminder ของตนได้
- เมื่อเว็บเปิดและเวลาปัจจุบันผ่านเวลาเตือนของวันนั้น UI แสดงรายการถึงเวลา
- การกดกินแล้วบันทึกเวลาปัจจุบันใน `last_taken_at`
- กดใหม่ได้และค่าใหม่แทนค่าล่าสุด ไม่มีประวัติรายมื้อ
- ระบบไม่ส่ง email และไม่แจ้งเมื่อ browser ปิด

## 7. กฎ Supabase และข้อมูล

- `auth.users` เก็บบัญชี, password hash, email verification และ session
- ตาราง `profiles`, `schedules`, `appointments`, `medical_records`, `medications`, `prescriptions`, `reminders` เก็บข้อมูลแอปทั้งหมด
- ทุกตารางเปิด RLS; anon ที่ยังไม่ login อ่านข้อมูลธุรกิจไม่ได้
- Browser ใช้ publishable key เท่านั้น; ห้ามใช้หรือเปิดเผย secret/legacy `service_role` key
- Runtime ใช้ Supabase repository ไม่มี fallback ไป localStorage หรือ mock เมื่อ Supabase ล้มเหลว
- Mock repository ใช้เฉพาะ automated tests และต้องคืน contract เดียวกับ runtime
- Network/RLS error ต้องแสดง error ชัดและไม่ทำเป็นว่าอ่านข้อมูลว่างสำเร็จ
- Migration/seed ต้องทดสอบใน local/test ก่อนรัน project จริง และ seed ใช้ข้อมูลสังเคราะห์เท่านั้น

## 8. Acceptance Criteria

ทุกข้อมีสถานะเริ่มต้น “ยังไม่ทดสอบ”

| รหัส | สถานการณ์ | ผลที่ต้องได้ | เจ้าของเสนอ |
| --- | --- | --- | --- |
| LITE-AC01 | Patient สมัครและยืนยันอีเมลมหาวิทยาลัยด้วยข้อมูลครบ | Supabase Auth สร้าง user และ profile role patient; หลังยืนยันจึง login อ่าน profile ได้ | ฟีม |
| LITE-AC02 | สมัครด้วยโดเมนอื่นหรือข้อมูลบังคับว่าง | แสดง field error และไม่สร้าง profile | ฟีม |
| LITE-AC03 | บัญชี role หนึ่งเปิดหน้าหรือคำสั่งของอีก role | ถูกปฏิเสธและไม่มีข้อมูลรั่ว | ฟีม/ทุกคน |
| LITE-AC04 | ผู้ดูแลสร้าง Doctor/Staff ผ่าน Supabase Dashboard | profile มี role ถูกต้อง; ไม่มีหน้าจอยกระดับ role ในแอป | ฟีม |
| LITE-AC05 | Staff สร้างรอบถูกต้อง | รอบ open แสดงแก่ Patient และ Doctor เจ้าของ | ช้อป |
| LITE-AC06 | สร้างรอบเวลาไม่ถูกต้อง ทับกัน หรือ capacity ไม่บวก | แสดงเหตุผลและไม่สร้างรอบ | ช้อป |
| LITE-AC07 | ปิดรอบหรือเปิดรอบที่ผ่านมา | Patient จองไม่ได้ | ช้อป/ปาย |
| LITE-AC08 | Patient จองรอบว่าง | สร้าง pending และจำนวนใช้เพิ่มหนึ่ง | ปาย |
| LITE-AC09 | จองซ้ำ รอบเต็ม หรือข้อมูลไม่ครบ | ปฏิเสธและ state ไม่เปลี่ยน | ปาย |
| LITE-AC10 | Staff ยืนยัน pending | นัดเป็น confirmed และ Doctor เห็นในงานตน | ปาย |
| LITE-AC11 | Patient/Staff ยกเลิกนัด | นัดเป็น cancelled และที่ว่างกลับมา | ปาย |
| LITE-AC12 | Doctor เปิดนัดของ Doctor อื่น | ถูกปฏิเสธ | ปาย/ฟีม |
| LITE-AC13 | Doctor บันทึกผลและ prescription ในนัด confirmed | บันทึกได้และยังแก้ก่อนปิดได้ | ปาย |
| LITE-AC14 | ปิดผลตรวจโดย diagnosis/treatment ไม่ครบ | แสดง field error; record และนัดไม่เปลี่ยน | ปาย |
| LITE-AC15 | Doctor ปิดผลตรวจครบ | นัดเป็น completed, record ถูกล็อก และ Patient อ่านได้ | ปาย |
| LITE-AC16 | Staff เพิ่ม/ปรับยาและ stock | ค่าใหม่ถูกต้องและ stock ไม่ติดลบ | กัญจน์ |
| LITE-AC17 | จ่ายเมื่อยาทุกรายการพอ | RPC ลด stock ถูกต้องและทุก prescription เป็น dispensed ใน transaction เดียว | กัญจน์ |
| LITE-AC18 | อย่างน้อยหนึ่งรายการ stock ไม่พอ | RPC rollback; ไม่มี stock หรือ prescription ใดเปลี่ยน | กัญจน์ |
| LITE-AC19 | กดจ่ายชุดเดิมซ้ำ | ถูกปฏิเสธและ stock ไม่ลดซ้ำ | กัญจน์ |
| LITE-AC20 | Patient สร้าง reminder จากยาที่จ่ายแล้ว | สร้างหนึ่งรายการ เวลาและเจ้าของถูกต้อง | กลอง |
| LITE-AC21 | สร้าง reminder จากยา pending หรือของคนอื่น | ถูกปฏิเสธและไม่สร้างข้อมูล | กลอง/ฟีม |
| LITE-AC22 | ถึงเวลาเตือนขณะเว็บเปิดและกดกินแล้ว | เห็นรายการถึงเวลาและ `last_taken_at` เปลี่ยน | กลอง |
| LITE-AC23 | ปิด reminder | ไม่แสดงเป็นรายการถึงเวลา แต่ข้อมูลยังอยู่ | กลอง |
| LITE-AC24 | Repository อ่าน/เขียนล้มเหลว | แสดง error ชัด ไม่แสดงข้อมูลสำเร็จปลอม | ทุกคน |
| LITE-AC25 | ตรวจ UI | Flow หลักใช้ keyboard ได้ที่ Chrome 360px/1280px | เฮิร์บ/ทุกคน |
| LITE-AC26 | รัน quality gates | lint, typecheck, test และ build ผ่านในโค้ดล่าสุด | ทุกคน |
| LITE-AC27 | ผู้ใช้ข้าม UI แล้วอ่าน/แก้ row ของผู้อื่น | RLS ปฏิเสธและข้อมูลไม่เปลี่ยน | ฟีม/ทุกคน |
| LITE-AC28 | ตรวจแหล่งข้อมูล runtime | ข้อมูลทุก feature อ่าน/เขียน Supabase; ไม่มี localStorage/mock fallback | ทุกคน |
| LITE-AC29 | RPC จ่ายยาล้มเหลวกลางคำสั่ง | transaction rollback ทั้ง stock และ prescriptions | กัญจน์ |

## 9. Scenario รวม

| รหัส | ขั้นตอน | ผลคาดหวัง |
| --- | --- | --- |
| LITE-SCN-01 | Supabase login → Staff สร้างรอบ → Patient จอง → Staff ยืนยัน → Doctor ปิดผล → Staff จ่าย → Patient ตั้งเตือน | Flow หลักเชื่อมครบ 7 ตารางและข้อมูลคงอยู่หลัง reload |
| LITE-SCN-02 | รอบ capacity 1 มี Patient คนแรกจอง แล้วคนที่สองจอง | คนแรกสำเร็จ คนที่สองเห็นรอบเต็ม ไม่มีนัดเกิน capacity |
| LITE-SCN-03 | Doctor พยายามเปิดนัดของ Doctor อื่น | ไม่เห็นหรือแก้ข้อมูล |
| LITE-SCN-04 | ใบสั่งมี 2 ยา แต่ยาหนึ่งไม่พอ แล้ว Staff กดจ่าย | ทั้งสองรายการยัง pending และ stock ทั้งหมดคงเดิม |
| LITE-SCN-05 | Staff เติม stock แล้วกดจ่ายอีกครั้ง | จ่ายครบ ลด stock ครั้งเดียว และ Patient สร้างเตือนได้ |
| LITE-SCN-06 | Patient พยายามสร้างเตือนจาก prescription ของคนอื่น | ถูกปฏิเสธและ state ไม่เปลี่ยน |
| LITE-SCN-07 | เรียก Supabase ตรงด้วยบัญชีผิด role เพื่ออ่าน/แก้ข้อมูล | RLS ปฏิเสธทุกตารางที่ไม่อนุญาต |

## 10. แบบบันทึกตรวจรับ

| AC/SCN | Fixture/บทบาท | ผลจริง | สถานะ | ผู้ตรวจ/วันที่ |
| --- | --- | --- | --- | --- |
| ระบุรหัส | ระบุข้อมูลสังเคราะห์ ไม่ใส่รหัสผ่าน | ยังไม่มีผล | ยังไม่ทดสอบ | เติมเมื่อทดสอบจริง |

การมีเอกสารหรือ test file ไม่เท่ากับผ่าน ต้องรันกับสถานะโค้ดล่าสุดและบันทึกผลจริง
