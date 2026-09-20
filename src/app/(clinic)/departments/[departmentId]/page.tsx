import DepartmentDetailWorkspace from '@/components/schedules/DepartmentDetailWorkspace';
import { requireRole } from '@/lib/requireRole';

interface DepartmentDetailPageProps {
  params: Promise<{
    departmentId: string;
  }>;
}

export default async function DepartmentDetailPage({ params }: DepartmentDetailPageProps) {
  await requireRole(['patient', 'medical', 'staff_admin']);
  const { departmentId } = await params;

  return <DepartmentDetailWorkspace departmentId={departmentId} />;
}
