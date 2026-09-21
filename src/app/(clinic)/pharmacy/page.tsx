import { requireRole } from '@/lib/requireRole';
import PharmacyContent from '@/components/pharmacy/PharmacyContent';

export default async function PharmacyPage() {
  // อนุญาตเฉพาะ medical (แพทย์/เภสัชกร) และ staff_admin / admin (เจ้าหน้าที่/ผู้ดูแลระบบ)
  // บุคคลที่ยังไม่ล็อกอินจะถูก redirect ไป /login และผู้ป่วย (patient) จะถูก redirect ไป /dashboard
  const { user, role, rawRole } = await requireRole(['medical', 'staff_admin', 'admin']);

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <PharmacyContent
        currentRole={rawRole || role}
        userEmail={user.email}
        userName={user.user_metadata?.full_name}
        userId={user.id}
      />
    </div>
  );
}
