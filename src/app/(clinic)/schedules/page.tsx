import ScheduleWorkspace from '@/components/schedules/ScheduleWorkspace';
import { getCurrentUserAndRole } from '@/lib/requireRole';

export default async function SchedulesPage() {
  const { role, user } = await getCurrentUserAndRole();
  const actorId = user?.id ?? 'guest';
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <ScheduleWorkspace role={role} actorId={actorId} />
    </div>
  );
}
