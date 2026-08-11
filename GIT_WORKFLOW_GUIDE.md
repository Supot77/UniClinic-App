# 🚀 คู่มือการใช้งาน Git & GitHub สำหรับสมาชิกในทีม (WU Clinic Project)

คู่มือนี้จัดทำขึ้นเพื่อเป็นแนวทางการทำงานร่วมกันของสมาชิกทั้ง 6 คน เพื่อให้โค้ดไม่ทับกัน และมี Log การพัฒนาบน GitHub ที่ชัดเจนสำหรับใช้เป็นหลักฐานในการประเมินคะแนนส่วนบุคคล

---

## 📌 สรุปชื่อ Branch และ Issue ของสมาชิกแต่ละคน

| สมาชิก | ฟีเจอร์ที่รับผิดชอบ | ชื่อ Branch ที่ต้องใช้ | โฟลเดอร์งาน |
| :--- | :--- | :--- | :--- |
| **ฟีม** | ฟีเจอร์ 1: ระบบสมาชิกและโปรไฟล์ผู้ใช้ | `feature/feem-auth` | `src/app/feem-auth` |
| **ช้อป** | ฟีเจอร์ 2: ระบบจัดการแผนกและตารางเวลาแพทย์ | `feature/shop-schedules` | `src/app/shop-schedules` |
| **ปาย** | ฟีเจอร์ 3: ระบบนัดหมายคลินิก | `feature/pai-appointments` | `src/app/pai-appointments` |
| **กัน** | ฟีเจอร์ 4: ระบบจัดการฐานข้อมูลยา | `feature/gun-inventory` | `src/app/gun-inventory` |
| **กลอง** | ฟีเจอร์ 5: ระบบแจ้งเตือนการกินยาส่วนบุคคล | `feature/glong-reminders` | `src/app/glong-reminders` |
| **เฮิร์บ** | ฟีเจอร์ 6: ศูนย์แจ้งเตือนและแดชบอร์ด | `feature/herb-dashboard` | `src/app/herb-dashboard` |

---

## 🛠️ ขั้นตอนที่ 1: การเชื่อมต่อกับ GitHub สำหรับทุกคน (ทำครั้งแรกครั้งเดียว)

ให้สมาชิกทุกคนเปิด **Terminal** / **Git Bash** บนเครื่องตัวเอง แล้วทำตามขั้นตอนดังนี้:

### 1.1 ตั้งค่า ชื่อ และ อีเมล ให้ตรงกับ GitHub

*สำคัญมาก: ต้องตั้งค่าเพื่อให้ระบบบันทึกชื่อของคุณใน Log การ Commit*

```bash
git config --global user.name "ชื่อของคุณบน GitHub"
git config --global user.email "อีเมลที่ใช้สมัคร GitHub"
```

### 1.2 ดึงโค้ดโปรเจกต์ลงมาที่เครื่อง (Clone Repository)

```bash
git clone https://github.com/Supot77/Mini-Project-University-Health-Clinic-Appointment-and-Medication-Reminder-System.git
cd Mini-Project-University-Health-Clinic-Appointment-and-Medication-Reminder-System
```

---

## 🔄 ขั้นตอนที่ 2: ขั้นตอนการทำงานประจำวัน (Workflow)

### Step 2.1: ดึงโค้ดล่าสุดจากกิ่งหลักเสมอ

ก่อนเริ่มเขียนโค้ดทุกครั้ง ให้สลับไปกิ่ง `develop` แล้วดึงโค้ดล่าสุดลงมาก่อนเสมอ

```bash
git checkout develop
git pull origin develop
```

### Step 2.2: สร้างและสลับไปที่ Branch ของตัวเอง

สร้างกิ่งของตัวเอง (ทำแค่ครั้งแรกของการเริ่มฟีเจอร์)

```bash
git checkout -b <ชื่อกิ่งของคุณ>
```

ตัวอย่าง (ฟีม): `git checkout -b feature/feem-auth`

(ในครั้งถัดๆ ไป ถ้ากิ่งถูกสร้างแล้ว ให้ใช้คำสั่ง `git checkout feature/feem-auth` เพื่อสลับกิ่งได้เลย)

### Step 2.3: เขียนโค้ดในโฟลเดอร์ของตัวเอง

ทำการแก้ไขหรือสร้างไฟล์ในโฟลเดอร์ `src/app/<ชื่อโฟลเดอร์ของคุณ>` เท่านั้น เพื่อป้องกันไม่ให้โค้ดไปทับกับเพื่อน

### Step 2.4: บันทึกประวัติงาน (Add & Commit)

เมื่อเขียนโค้ดเสร็จตามจุดต่างๆ ให้บันทึก Commit ในเครื่องตนเอง

```bash
# 1. ตรวจสอบไฟล์ที่มีการแก้ไข
git status

# 2. เพิ่มไฟล์ทั้งหมดเข้าสู่การเตรียมบันทึก
git add .

# 3. บันทึก Commit พร้อมพิมพ์ข้อความอธิบาย (แนะนำให้ระบุเลข Issue เช่น Closes #1)
git commit -m "feat: พัฒนาหน้า login UI (Closes #1)"
```

### Step 2.5: ผลักโค้ดขึ้น GitHub (Push)

สำหรับการ Push ครั้งแรกของกิ่งนั้นๆ ให้ใช้คำสั่ง:

```bash
git push -u origin <ชื่อกิ่งของคุณ>
```

ตัวอย่าง: `git push -u origin feature/feem-auth`

(การ Push ครั้งต่อๆ ไป สามารถพิมพ์แค่ `git push` ได้เลย)
