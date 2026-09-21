import { requireRole } from '@/lib/requireRole';
import MedicationDetailContent from '@/components/pharmacy/MedicationDetailContent';

interface MedicationDetailPageProps {
  params: Promise<{
    medicationId: string;
  }>;
}

export default async function MedicationDetailPage({ params }: MedicationDetailPageProps) {
  const { user, role, rawRole } = await requireRole(['medical', 'staff_admin', 'admin']);
  const { medicationId } = await params;

  return (
    <MedicationDetailContent
      medicationId={medicationId}
      currentRole={rawRole || role}
      userEmail={user.email}
      userName={user.user_metadata?.full_name}
      userId={user.id}
    />
  );
}

