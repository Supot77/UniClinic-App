import type {
  DoctorAccountOption,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleSlot,
} from '@/types/schedule';

/**
 * UI-only demo dataset approved in docs/superpowers/specs/
 * 2026-09-04-clinic-demo-data-design.md.
 *
 * INTEGRATION (Shop + team): Replace these constants with mapped results from
 * scheduleService after D01/D03/D08/D10/D12/D18 and the shared DB contract are
 * locked. Never send this module to Supabase as seed data.
 */

export const MOCK_WEEK_START = '2026-08-31';

export const MOCK_DEPARTMENTS: ScheduleDepartment[] = [
  {
    id: 'dept-general',
    code: 'GEN',
    name: 'เวชปฏิบัติทั่วไป',
    description: 'ตรวจอาการทั่วไปและบริการใบรับรองแพทย์',
    room: 'อาคารสุขภาพ · ห้อง 101',
    isActive: true,
    tone: 'sky',
  },
  {
    id: 'dept-mental',
    code: 'MHC',
    name: 'สุขภาพจิตและให้คำปรึกษา',
    description: 'นัดตรวจและให้คำปรึกษารายบุคคล',
    room: 'อาคารสุขภาพ · ห้อง 204',
    isActive: true,
    tone: 'violet',
  },
  {
    id: 'dept-vaccine',
    code: 'VAC',
    name: 'วัคซีนและสร้างเสริมภูมิคุ้มกัน',
    description: 'บริการวัคซีนแบบหนึ่งรอบรับได้หลายคน',
    room: 'อาคารสุขภาพ · ห้อง 112',
    isActive: true,
    tone: 'amber',
  },
  {
    id: 'dept-physio',
    code: 'PT',
    name: 'กายภาพบำบัด',
    description: 'ประเมินและติดตามการฟื้นฟูร่างกาย',
    room: 'อาคารกีฬา · ห้อง PT-2',
    isActive: true,
    tone: 'teal',
  },
];

export const MOCK_DOCTORS: ScheduleDoctor[] = [
  {
    id: 'doctor-strange',
    profileId: 'profile-stephen-strange',
    fullName: 'นพ. Stephen Strange',
    initials: 'SS',
    email: 'stephen.strange.doctor@clinic-demo.test',
    specialty: 'เวชศาสตร์ทั่วไป',
    departmentId: 'dept-general',
    availability: 'active',
  },
  {
    id: 'doctor-grey',
    profileId: 'profile-meredith-grey',
    fullName: 'พญ. Meredith Grey',
    initials: 'MG',
    email: 'meredith.grey.doctor@clinic-demo.test',
    specialty: 'เวชศาสตร์ครอบครัว',
    departmentId: 'dept-general',
    availability: 'active',
  },
  {
    id: 'doctor-xavier',
    profileId: 'profile-charles-xavier',
    fullName: 'นพ. Charles Xavier',
    initials: 'CX',
    email: 'charles.xavier.doctor@clinic-demo.test',
    specialty: 'สุขภาพจิตและการให้คำปรึกษา',
    departmentId: 'dept-mental',
    availability: 'active',
  },
  {
    id: 'doctor-mccoy',
    profileId: 'profile-leonard-mccoy',
    fullName: 'นพ. Leonard McCoy',
    initials: 'LM',
    email: 'leonard.mccoy.doctor@clinic-demo.test',
    specialty: 'วัคซีนและภูมิคุ้มกัน',
    departmentId: 'dept-vaccine',
    availability: 'active',
  },
  {
    id: 'doctor-banner',
    profileId: 'profile-bruce-banner',
    fullName: 'นพ. Bruce Banner',
    initials: 'BB',
    email: 'bruce.banner.doctor@clinic-demo.test',
    specialty: 'เวชศาสตร์ฟื้นฟู',
    departmentId: 'dept-physio',
    availability: 'active',
  },
  {
    id: 'doctor-shuri',
    profileId: 'profile-shuri-udaku',
    fullName: 'พญ. Shuri Udaku',
    initials: 'SU',
    email: 'shuri.udaku.doctor@clinic-demo.test',
    specialty: 'กายภาพและการเคลื่อนไหว',
    departmentId: 'dept-physio',
    availability: 'on_leave',
  },
];

// INTEGRATION (Feem): options must come from profiles where role = 'doctor'
// and which do not already have a row in doctors. Shop only assigns clinic data.
export const MOCK_DOCTOR_ACCOUNT_OPTIONS: DoctorAccountOption[] = [
  {
    profileId: 'profile-gregory-house',
    fullName: 'นพ. Gregory House',
    email: 'gregory.house.doctor@clinic-demo.test',
    initials: 'GH',
  },
  {
    profileId: 'profile-akiko-yamada',
    fullName: 'พญ. Akiko Yamada',
    email: 'akiko.yamada.doctor@clinic-demo.test',
    initials: 'AY',
  },
];

export const MOCK_SLOTS: ScheduleSlot[] = [
  { id: 'slot-001', doctorId: 'doctor-strange', slotDate: '2026-08-31', startTime: '08:30', endTime: '09:00', maxCapacity: 1, bookedCount: 1, status: 'full' },
  { id: 'slot-002', doctorId: 'doctor-strange', slotDate: '2026-08-31', startTime: '09:00', endTime: '09:30', maxCapacity: 1, bookedCount: 0, status: 'available' },
  { id: 'slot-003', doctorId: 'doctor-xavier', slotDate: '2026-08-31', startTime: '13:00', endTime: '14:00', maxCapacity: 1, bookedCount: 1, status: 'full' },
  { id: 'slot-004', doctorId: 'doctor-mccoy', slotDate: '2026-09-01', startTime: '09:00', endTime: '09:30', maxCapacity: 4, bookedCount: 3, status: 'available' },
  { id: 'slot-005', doctorId: 'doctor-shuri', slotDate: '2026-09-01', startTime: '10:00', endTime: '11:00', maxCapacity: 1, bookedCount: 0, status: 'closed' },
  { id: 'slot-006', doctorId: 'doctor-grey', slotDate: '2026-09-01', startTime: '13:00', endTime: '13:30', maxCapacity: 1, bookedCount: 0, status: 'available' },
  { id: 'slot-007', doctorId: 'doctor-strange', slotDate: '2026-09-02', startTime: '08:30', endTime: '09:00', maxCapacity: 1, bookedCount: 0, status: 'available' },
  { id: 'slot-008', doctorId: 'doctor-xavier', slotDate: '2026-09-02', startTime: '13:00', endTime: '14:00', maxCapacity: 1, bookedCount: 0, status: 'available' },
  { id: 'slot-009', doctorId: 'doctor-mccoy', slotDate: '2026-09-03', startTime: '09:00', endTime: '09:30', maxCapacity: 4, bookedCount: 4, status: 'full' },
  { id: 'slot-010', doctorId: 'doctor-grey', slotDate: '2026-09-03', startTime: '13:00', endTime: '13:30', maxCapacity: 1, bookedCount: 1, status: 'full' },
  { id: 'slot-011', doctorId: 'doctor-strange', slotDate: '2026-09-04', startTime: '08:30', endTime: '09:00', maxCapacity: 1, bookedCount: 0, status: 'available' },
  { id: 'slot-012', doctorId: 'doctor-banner', slotDate: '2026-09-04', startTime: '13:00', endTime: '14:00', maxCapacity: 1, bookedCount: 0, status: 'available' },
];
