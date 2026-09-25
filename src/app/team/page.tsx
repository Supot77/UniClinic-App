import type { Metadata } from "next";
import TeamShowcase from "@/components/team/TeamShowcase";

export const metadata: Metadata = {
  title: "ทีมผู้พัฒนา | WU Clinic",
  description: "รู้จักทีมผู้พัฒนาระบบ WU Clinic ทั้งหกคนและงานที่แต่ละคนรับผิดชอบ",
};

export default function TeamPage() {
  return <TeamShowcase />;
}
