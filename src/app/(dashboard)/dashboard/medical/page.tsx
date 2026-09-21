import DashboardScreen from '@/components/dashboard/DashboardScreen';
import { requireRole } from '@/lib/requireRole';

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] | undefined }>;
}) {
  const { user } = await requireRole(['medical']);
  const params = await searchParams;
  const preview = params.preview === 'upcoming-toast' ? 'upcoming-toast' as const : undefined;
  return <DashboardScreen role="medical" actorId={user.id} preview={preview} />;
}
