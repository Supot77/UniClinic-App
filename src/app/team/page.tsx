import type { Metadata } from "next";
import TeamShowcase from "@/components/team/TeamShowcase";

export const metadata: Metadata = {
  title: "ทีมพัฒนาและอาจารย์ที่ปรึกษา | WU Clinic",
  description: "รู้จักทีมพัฒนา WU Clinic และอาจารย์ที่ปรึกษา รวมเจ็ดคนและงานที่รับผิดชอบ",
};

export default function TeamPage() {
  return <TeamShowcase />;
}
