import PersonnelRegistrationForm from '@/components/staff/PersonnelRegistrationForm';
import { requireRole } from '@/lib/requireRole';
import { createClient } from '@/utils/supabase/server';

export default async function NewPersonnelPage() {
  await requireRole(['staff_admin']);
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  return <PersonnelRegistrationForm departments={departments ?? []} />;
}
