import { MedicalRecordsPage, PatientRecordsPage, StaffAdminRecordsPage } from '@/features/medical-records';
import { requireRole } from '@/lib/requireRole';

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const { role } = await requireRole(['patient', 'medical', 'staff_admin']);
  const { appointment } = await searchParams;
  if (role === 'medical') return <MedicalRecordsPage selectedId={appointment} />;
  if (role === 'staff_admin') return <StaffAdminRecordsPage selectedId={appointment} />;
  return <PatientRecordsPage selectedId={appointment} />;
}
