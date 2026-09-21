import StaffProfileDirectory from '@/components/staff/StaffProfileDirectory';
import { requireRole } from '@/lib/requireRole';

export default async function StaffAccountsPage() {
  await requireRole(['staff_admin']);
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <StaffProfileDirectory canCreatePersonnel />
    </div>
  );
}
