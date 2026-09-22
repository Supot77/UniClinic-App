import RegisterPage from '@/app/(auth)/register/page';
import { requireRole } from '@/lib/requireRole';

export default async function NewWalkInPatientPage() {
  await requireRole(['staff_admin']);
  return <RegisterPage />;
}
