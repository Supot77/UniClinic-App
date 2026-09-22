import DepartmentWorkspace from '@/components/schedules/DepartmentWorkspace';
import { requireRole } from '@/lib/requireRole';
import { redirect } from 'next/navigation';

export default async function DepartmentsPage() {
  const { role } = await requireRole(['staff_admin']);
  if (role !== 'staff_admin') redirect('/dashboard');
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <DepartmentWorkspace />
    </div>
  );
}
