import { requireRole } from '@/lib/requireRole';
import MedicationDetailContent from '@/components/pharmacy/MedicationDetailContent';

interface MedicationDetailPageProps {
  params: Promise<{
    medicationId: string;
  }>;
}

export default async function MedicationDetailPage({ params }: MedicationDetailPageProps) {
  const { user, role, rawRole } = await requireRole(['medical', 'staff_admin', 'admin']);
  const metadata = user.user_metadata as { title?: string; first_name?: string; last_name?: string };
  const userName = [metadata.title, metadata.first_name, metadata.last_name].filter(Boolean).join(' ') || undefined;
  const { medicationId } = await params;

  return (
    <MedicationDetailContent
      medicationId={medicationId}
      currentRole={rawRole || role}
      userEmail={user.email}
      userName={userName}
      userId={user.id}
    />
  );
}

