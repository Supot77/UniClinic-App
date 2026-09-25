import type {
  AppointmentStatus,
  Notification,
  NotificationType,
  ProfileGender,
  UserRole,
} from '@/types/database';

export type DashboardRange = 'today' | '7d' | '30d';

export type DepartmentDensityStatus = 'normal' | 'near_full' | 'full';
export type ClinicDoctorStatus = 'in_progress' | 'available' | 'away' | 'completed';
export type DashboardPatientGender = ProfileGender;
export type DashboardPatientDoseStatus = 'taken' | 'pending';

export interface DashboardGenderCount {
  gender: DashboardPatientGender;
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  description: string;
  href: string;
  tone: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
}

export interface DashboardView {
  role: UserRole;
  actor: { id: string; fullName: string } | null;
  date: string;
  startDate: string;
  range: DashboardRange;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  patientGenderCounts?: DashboardGenderCount[];
  doctorGenderCounts?: DashboardGenderCount[];
  appointmentStatuses: Array<{
    status: AppointmentStatus;
    label: string;
    count: number;
  }>;
  appointmentQueue: Array<{
    id: string;
    queueNumber: number | null;
    date: string;
    startTime: string;
    status: AppointmentStatus;
    cancelRequestedAt?: string | null;
    patientName: string;
    doctorName: string;
    departmentName: string;
    serviceName?: string;
  }>;
  nextAppointment?: DashboardView['appointmentQueue'][number] | null;
  upcomingAppointments?: DashboardView['appointmentQueue'];
  patientProfile?: {
    phone: string | null;
    patientType: string | null;
    patientId: string | null;
    allergyStatus: string | null;
    allergyDetail: string | null;
    chronicDiseaseStatus: string | null;
    chronicDiseaseDetail: string | null;
  } | null;
  patientMedications?: Array<{
    id: string;
    name: string;
    dosage: string;
    instruction: string;
    reminderTimes: string[];
    nextDoseTime: string | null;
    endDate: string | null;
    takenDoses?: number;
    totalDoses?: number;
    todayDoses?: Array<{
      scheduledAt: string;
      time: string;
      status: DashboardPatientDoseStatus;
    }>;
  }>;
  patientTreatmentHistory?: Array<{
    id: string;
    date: string;
    doctorName: string;
    departmentName: string;
    symptom?: string;
    summary: string;
    advice?: string;
    medicationNames?: string[];
    medicationCount: number;
  }>;
  patientOverview?: {
    appointments: {
      total: number;
      completed: number;
      remaining: number;
      cancelled: number;
    };
    medication: {
      totalDoses: number;
      takenDoses: number;
      pendingDoses: number;
      missedDoses: number;
      activeMedicationCount: number;
    };
  };
  departmentLoads: Array<{
    departmentId: string;
    departmentName: string;
    appointmentCount: number;
    capacity: number;
    patientCount?: number;
    doctorCount?: number;
    activeDoctorCount?: number;
    densityPercent?: number;
    densityStatus?: DepartmentDensityStatus;
  }>;
  doctorStatuses?: Array<{
    doctorId: string;
    doctorName: string;
    departmentId: string;
    departmentName: string;
    status: ClinicDoctorStatus;
    currentPatientName?: string | null;
    currentQueueNumber?: number | null;
    nextAppointmentTime?: string | null;
  }>;
  servedAppointmentCount?: number;
  medicationAlerts: Array<{
    id: string;
    name: string;
    stock: number;
    minimumStock: number;
    expiryDate: string | null;
    lowStock: boolean;
    expired: boolean;
  }>;
  pendingPrescriptions?: Array<{
    id: string;
    patientName: string;
    doctorName: string;
    departmentName: string;
    date: string;
    diagnosis: string;
    medicationCount: number;
    dispensedCount: number;
  }>;
  recentNotifications: Notification[];
  unreadNotificationCount?: number;
  roleCounts: Array<{ role: UserRole; count: number }>;
}

export interface SendBroadcastInput {
  actorId: string;
  actorRole: UserRole;
  title: string;
  message: string;
  requestKey: string;
  notificationType: NotificationType;
  audience: {
    all: boolean;
    roles: UserRole[];
  };
}

export interface BroadcastHistoryItem {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  recipientCount: number;
  readCount?: number;
  roleReadCounts?: Partial<Record<UserRole, { read: number; total: number }>>;
}

export const roleLabels: Record<UserRole, string> = {
  patient: 'ผู้ป่วย',
  staff_admin: 'เจ้าหน้าที่',
  medical: 'แพทย์',
};

export const dashboardRangeLabels: Record<DashboardRange, string> = {
  today: 'วันนี้',
  '7d': 'ย้อนหลัง 7 วัน',
  '30d': 'ย้อนหลัง 30 วัน',
};

export const broadcastTypeLabels: Record<NotificationType, string> = {
  broadcast: 'ประกาศทั่วไป',
  system: 'ระบบและการให้บริการ',
  appointment: 'เรื่องนัดหมาย',
  reminder: 'เรื่องการเตือนยา',
};
