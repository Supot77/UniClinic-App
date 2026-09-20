import { requireRole } from "@/lib/requireRole";
import SettingsContent from "@/components/settings/SettingsContent";

export default async function SettingsPage() {
  await requireRole(["patient", "staff_admin", "medical"]);

  return (
    <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2">
      <SettingsContent />
    </div>
  );
}