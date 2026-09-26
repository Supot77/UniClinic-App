import { MedicalRecordsPage, PatientRecordsPage } from '@/features/medical-records';
import { requireRole } from '@/lib/requireRole';

export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ appointment?: string }> }) {
  const { role } = await requireRole(['patient', 'medical']);
  const { appointment } = await searchParams;
  if (role === 'medical') return <MedicalRecordsPage selectedId={appointment} />;
  return <PatientRecordsPage selectedId={appointment} />;
}
