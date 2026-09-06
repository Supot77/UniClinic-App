import { requireRole } from '@/lib/requireRole';
import PatientSearchContent from '@/components/patients/PatientSearchContent';

export default async function PatientSearchPage() {
  await requireRole(['staff']);
  return <PatientSearchContent />;
}