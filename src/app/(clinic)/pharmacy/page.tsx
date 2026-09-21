import { requireRole } from '@/lib/requireRole';
import PharmacyContent from '@/components/pharmacy/PharmacyContent';

interface PharmacyPageProps {
  searchParams?: Promise<{ tab?: string; status?: string; sort?: string }>;
}

export default async function PharmacyPage({ searchParams }: PharmacyPageProps = {}) {
  // อนุญาตเฉพาะ medical (แพทย์/เภสัชกร) และ staff_admin / admin (เจ้าหน้าที่/ผู้ดูแลระบบ)
  // บุคคลที่ยังไม่ล็อกอินจะถูก redirect ไป /login และผู้ป่วย (patient) จะถูก redirect ไป /dashboard
  const { user, role, rawRole } = await requireRole(['medical', 'staff_admin', 'admin']);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab = resolvedSearchParams?.tab === 'prescriptions' ? 'prescriptions' : 'inventory';
  const validStatuses = ['all', 'pending', 'dispensed', 'insufficient'] as const;
  const initialStatus = validStatuses.includes(resolvedSearchParams?.status as (typeof validStatuses)[number])
    ? (resolvedSearchParams!.status as (typeof validStatuses)[number])
    : 'all';
  const initialSort = resolvedSearchParams?.sort === 'oldest' ? 'oldest' : 'newest';

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <PharmacyContent
        initialTab={initialTab}
        initialStatus={initialStatus}
        initialSort={initialSort}
        currentRole={rawRole || role}
        userEmail={user.email}
        userName={user.user_metadata?.full_name}
        userId={user.id}
      />
    </div>
  );
}
