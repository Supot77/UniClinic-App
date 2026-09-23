# 15. แผนเป้าหมายในอนาคต: การแปลง Data Access Layer เป็น HTTP Route Handlers (REST API)

> **สถานะเอกสาร**: `[PROPOSED / FUTURE TARGET]` (แผนเป้าหมายระยะยาว — รอเริ่มหลังทุกคนส่งมอบงานเสร็จสิ้น)  
> **วันที่บันทึก**: 21 กันยายน 2569 (2026-09-21)  
> **เงื่อนไขสำคัญก่อนเริ่ม (Hard Gate)**: **ห้ามเริ่มทำเด็ดขาด** จนกว่าสมาชิกทุกคนในทีมจะพัฒนาฟีเจอร์หลักเสร็จ ตรวจรับผ่านเกณฑ์ SCN-01 ถึง SCN-07 และรวมเข้า branch `main` เรียบร้อยแล้ว เพื่อป้องกันปัญหา Merge Conflict ขนาดใหญ่และไม่ให้ Test Suite พังระหว่างการส่งมอบ

---

## 1. วัตถุประสงค์และเหตุผล (Motivation & Goals)

ปัจจุบันระบบ WU Clinic Booking ดึงข้อมูลผ่าน Supabase SDK โดยตรงผ่าน Service functions (`src/services/`) และ Repository classes (`src/features/.../data/`) ตามสถาปัตยกรรม Database-first 

เมื่อถึงเวลาที่ต้องการขยายระบบ (เช่น รองรับ Mobile App ภายนอก, ปิดกั้นการต่อตรงเข้าฐานข้อมูลจาก Browser หรือจัดระเบียบ Endpoint ให้อยู่รวมกันที่เดียว) แผนนี้จะเป็น **พิมพ์เขียวทางเทคนิค (Blueprint)** ในการย้ายการเชื่อมต่อฐานข้อมูลทั้งหมดไปอยู่หลัง **Next.js App Router Route Handlers (`src/app/api/...`)**

---

## 2. โครงสร้างและผัง Endpoint ทั้งหมด (`src/app/api/`)

```text
src/app/api/
├── auth/
│   ├── me/route.ts                     # GET: ข้อมูลโปรไฟล์และ Role ของผู้ใช้ปัจจุบัน
│   └── register/route.ts               # POST: ลงทะเบียนบัญชีผู้ป่วยใหม่
├── staff/
│   └── accounts/route.ts               # POST: สร้างบัญชีเจ้าหน้าที่/แพทย์ (มีอยู่แล้ว - ใช้ service_role)
├── departments/
│   ├── route.ts                        # GET: รายชื่อแผนก, POST: เพิ่มแผนกใหม่
│   └── [id]/route.ts                   # GET, PATCH, DELETE: แผนกรายตัว
├── doctors/
│   ├── route.ts                        # GET: รายชื่อแพทย์พร้อมประวัติและแผนก
│   └── leaves/
│       ├── route.ts                    # GET: รายการวันลา, POST: ขอลางาน
│       └── [id]/route.ts               # DELETE: ยกเลิกวันลา
├── schedules/
│   └── slots/
│       ├── route.ts                    # GET: สล็อตตรวจตามแพทย์/วัน, POST: สร้างสล็อตแบบชุด (Batch)
│       └── [id]/route.ts               # PATCH: ปรับสถานะสล็อต, DELETE: ลบสล็อต
├── appointments/
│   ├── route.ts                        # GET: รายการนัดหมายของผู้ใช้, POST: จองคิวตรวจ
│   └── [id]/
│       ├── route.ts                    # GET: รายละเอียดใบนัดหมาย
│       └── status/route.ts             # PATCH: เปลี่ยนสถานะ (confirm, in_progress, completed, cancelled, rejected)
├── medical-records/
│   ├── route.ts                        # GET: ประวัติการตรวจรักษา, POST: บันทึกผลตรวจ การตรวจร่างกายเบื้องต้น และยา
│   └── [id]/route.ts                   # GET: รายละเอียดเวชระเบียนรายครั้ง
├── medications/
│   ├── route.ts                        # GET: รายการยาในคลัง, POST: เพิ่มรายการยา
│   └── [id]/route.ts                   # PATCH: แก้ไขสต็อก/ข้อมูลยา, DELETE: ปิดการใช้งานยา
├── reminders/
│   ├── route.ts                        # GET: รายการแจ้งเตือนยาของผู้ป่วย, POST: เพิ่มการแจ้งเตือน
│   └── [id]/route.ts                   # PATCH: ทำเครื่องหมายทานยาแล้ว / แก้ไขเวลา, DELETE: ลบเตือน
└── dashboard/
    └── stats/route.ts                  # GET: ดึงสถิติตาม Role (Patient/Medical/Staff)
```

---

## 3. สเปก Endpoint และสิทธิ์การเข้าถึง (API Contracts & Security)

ทุก Route Handler ต้องผ่านการตรวจสอบสิทธิ์ผ่าน Supabase Server Client ก่อนทำรายการ:

| Endpoint | Method | บทบาทที่อนุญาต | หน้าที่ |
| :--- | :---: | :---: | :--- |
| `/api/auth/me` | `GET` | ทุก Role | ดึง Profile และ Role ปัจจุบัน |
| `/api/departments` | `GET` | Public / ทุก Role | ดึงรายการแผนกที่เปิดทำการ |
| `/api/departments` | `POST` | `staff_admin` | เพิ่มแผนกใหม่ |
| `/api/departments/[id]` | `PATCH`, `DELETE` | `staff_admin` | แก้ไขหรือลบแผนก |
| `/api/doctors` | `GET` | ทุก Role | รายชื่อแพทย์และสังกัด |
| `/api/doctors/leaves` | `GET` | `medical`, `staff_admin` | ดึงวันลาของแพทย์ |
| `/api/doctors/leaves` | `POST` | `medical`, `staff_admin` | บันทึกการลา |
| `/api/schedules/slots` | `GET` | ทุก Role | ค้นหาสล็อตเวลาที่เปิดให้จอง |
| `/api/schedules/slots` | `POST` | `medical`, `staff_admin` | สร้างสล็อตเวลาตรวจ (Batch Input) |
| `/api/appointments` | `GET` | ทุก Role | ดึงนัดหมาย (กรองตามเจ้าของนัดอัตโนมัติ) |
| `/api/appointments` | `POST` | `patient` | ส่งคำขอจองคิวตรวจ |
| `/api/appointments/[id]/status` | `PATCH` | `medical`, `staff_admin`, `patient` | อัปเดตสถานะนัดหมาย (มี Guard ตาม Role) |
| `/api/medical-records` | `GET` | `patient`, `medical` | ผู้ป่วยดูของตน / แพทย์ดูคนไข้ที่ดูแล |
| `/api/medical-records` | `POST` | `medical` | แพทย์บันทึกผลวินิจฉัยและใบสั่งยา |
| `/api/medications` | `GET` | `medical`, `staff_admin` | ดูรายการยาในคลัง |
| `/api/reminders` | `GET`, `POST`, `PATCH` | `patient` | จัดการตารางเตือนทานยา |
| `/api/dashboard/stats` | `GET` | ทุก Role | ตัวเลขสรุปสถิติประจำวัน |

---

## 4. มาตรฐานการเขียน Route Handler (Template & Best Practices)

ทุกไฟล์ `route.ts` ต้องเขียนตามมาตรฐานนี้เพื่อความปลอดภัย:

```typescript
// src/app/api/<feature>/route.ts ตัวอย่างมาตรฐาน
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. ตรวจสอบ Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });
    }

    // 2. ตรวจสอบสิทธิ์ (RBAC) จากตาราง profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      return NextResponse.json({ error: 'บัญชีถูกระงับการใช้งาน' }, { status: 403 });
    }

    // 3. Query ฐานข้อมูล (จะถูกครอบด้วย RLS ของ Supabase อัตโนมัติ)
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
```

---

## 5. การปรับแต่งฝั่งหน้าบ้าน: สร้าง API Client SDK Wrapper

เพื่อหลีกเลี่ยงการเขียน `fetch()` และจัดการ Header / Error ซ้ำซ้อนในทุก Component ให้สร้าง Utility กลาง:

```typescript
// src/lib/api-client.ts (สร้างขึ้นใหม่)
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = 'เกิดข้อผิดพลาดในการดึงข้อมูล';
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {}
    throw new ApiError(res.status, errorMsg);
  }

  return res.json();
}
```

---

## 6. กลยุทธ์การปรับปรุง Automated Test (`tests/`)

เมื่อไม่มี Service functions ตรง ๆ ให้ Vitest จำลอง mock อีกต่อไป ต้องใช้แนวทางดังนี้:

1. **ใช้ Mock Service Worker (MSW) หรือ Global Fetch Interceptor**:
   - ปรับปรุง `tests/setup.ts` ให้ดักจับ HTTP calls ไปยัง `/api/*`
   - ส่ง mock fixture จาก `src/mocks/clinicDatabase.ts` ตอบกลับไปให้หน้า UI
2. **เขียน Integration Tests แยกสำหรับ Route Handlers**:
   - ทดสอบตัว Route Handler ตรง ๆ โดยสร้าง `NextRequest` จำลองส่งเข้าไป เพื่อทดสอบ status code, validation logic, และ authorization guard

---

## 7. ลำดับขั้นตอนการย้ายระบบทีละเฟส (Phased Migration Checklist)

เมื่อถึงเวลาเริ่มทำ ให้ทำตามลำดับนี้เพื่อไม่ให้ระบบล่ม:

- [ ] **Phase 0: เตรียมเครื่องมือกลาง**
  - [ ] สร้าง `src/lib/api-client.ts`
  - [ ] ตั้งค่า Mock Fetch / MSW ใน `tests/setup.ts`
- [ ] **Phase 1: กลุ่มข้อมูลพื้นฐาน (Low Risk)**
  - [ ] แปลง `departments` และ `doctors` เป็น `/api/departments` และ `/api/doctors`
  - [ ] ปรับ UI ใน `ScheduleWorkspace.tsx` และ `DepartmentWorkspace.tsx` ให้ใช้ Client Fetcher
  - [ ] ตรวจสอบว่า Test ของหน้าแผนกยังผ่านครบ
- [ ] **Phase 2: กลุ่มตารางตรวจและคิว (Medium Risk)**
  - [ ] แปลง `slots` และ `leaves` ใน `databaseRepository.ts` เป็น `/api/schedules/slots` และ `/api/doctors/leaves`
  - [ ] ปรับ `SchedulingProvider.tsx` ให้เรียกผ่าน API
  - [ ] รัน Full Quality Gates ตรวจสอบ
- [ ] **Phase 3: กลุ่มนัดหมายและการรักษา (High Risk - Core Clinic)**
  - [ ] แปลง RPC `pai_workspace` และการบันทึกเวชระเบียนเป็น `/api/appointments` และ `/api/medical-records`
  - [ ] ปรับ `src/features/clinic-care.tsx`
  - [ ] ทดสอบ Flow จองคิว, หมอตรวจ, จ่ายยา
- [ ] **Phase 4: กลุ่มยาและการแจ้งเตือน (Final Polish)**
  - [ ] แปลง `medicationService.ts` และ `reminderService.ts` เป็น `/api/medications` และ `/api/reminders`
  - [ ] ลบฟังก์ชัน Service เก่าที่ไม่ได้ใช้งานออก
- [ ] **Phase 5: ทดสอบ Full Suite Acceptance**
  - [ ] รัน `npm run lint`
  - [ ] รัน `npx --no-install tsc --noEmit`
  - [ ] รัน `npm run test`
  - [ ] รัน `npm run build`
  - [ ] ตรวจ Manual Test SCN-01 ถึง SCN-07 ในเบราว์เซอร์

---

## 8. การประเมินความเสี่ยงและแผนฉุกเฉิน (Rollback Strategy)

- **ความเสี่ยงสูงสุด**: การหลุดของ Session Cookie เมื่อยิงข้าม Context หรือการลืมแนบ Cookie ใน Server Component
- **แผนถอยกลับ (Rollback)**:
  - ให้คง Repository / Service Interface เดิมไว้ แล้วให้ Implementation ภายในเปลี่ยนไปเรียก `fetch()` แทน (Adapter Pattern) เพื่อให้สามารถสลับกลับมาต่อตรงผ่าน Supabase SDK ได้ทันทีหากพบปัญหาเรื่อง Latency หรือ Auth Cookie

