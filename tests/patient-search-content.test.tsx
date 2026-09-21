import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PatientSearchContent from "@/components/patients/PatientSearchContent";
import type { Profile } from "@/types/database";

const mockSearchProfilesByGroup = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("@/services/authService", () => ({
  searchProfilesByGroup: mockSearchProfilesByGroup,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const patient: Profile = {
  id: "patient-1",
  student_id: "66123456",
  full_name: "สมชาย ใจดี",
  phone: "0812345678",
  emergency_phone: "0899999999",
  address: null,
  allergy_status: "yes",
  allergies: "Penicillin",
  chronic_disease_status: "no",
  chronic_diseases: null,
  role: "patient",
  avatar_url: null,
  patient_type: "student",
  is_active: true,
  created_at: "2026-09-21T00:00:00.000Z",
  updated_at: "2026-09-21T00:00:00.000Z",
};

describe("PatientSearchContent", () => {
  beforeEach(() => {
    mockSearchProfilesByGroup.mockReset();
    mockUseAuth.mockReturnValue({ role: "medical" });
  });

  it("starts with an explicit search prompt instead of loading every patient", () => {
    render(<PatientSearchContent />);

    expect(screen.getByText("เริ่มค้นหาผู้ป่วย")).toBeInTheDocument();
    expect(mockSearchProfilesByGroup).not.toHaveBeenCalled();
  });

  it("searches patients and shows health details to medical users", async () => {
    mockSearchProfilesByGroup.mockResolvedValueOnce({
      profiles: [patient],
      hasMore: false,
      totalCount: 1,
    });

    render(<PatientSearchContent />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "สมชาย" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "ค้นหาผู้ป่วย" }));

    await waitFor(() => {
      expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    });

    expect(mockSearchProfilesByGroup).toHaveBeenCalledWith(
      "patient",
      "สมชาย",
      0,
      10,
    );
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
    expect(screen.getByText("ไม่มีโรคประจำตัว")).toBeInTheDocument();
  });

  it("hides health details and keeps the edit action for staff admins", async () => {
    mockUseAuth.mockReturnValue({ role: "staff_admin" });
    mockSearchProfilesByGroup.mockResolvedValueOnce({
      profiles: [patient],
      hasMore: false,
      totalCount: 1,
    });

    render(<PatientSearchContent />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "66123456" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "ค้นหาผู้ป่วย" }));

    await waitFor(() => {
      expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    });

    expect(screen.queryByText("Penicillin")).not.toBeInTheDocument();
    expect(screen.queryByText("ประวัติแพ้ยา")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /แก้ไขข้อมูล/ })).toHaveAttribute(
      "href",
      "/patients/patient-1/edit",
    );
  });

  it("requires a meaningful search term", () => {
    render(<PatientSearchContent />);
    fireEvent.submit(screen.getByRole("form", { name: "ค้นหาผู้ป่วย" }));

    expect(
      screen.getByRole("alert", {
        name: "",
      }),
    ).toHaveTextContent("กรุณากรอกคำค้นหาอย่างน้อย 2 ตัวอักษรหรือตัวเลข");
    expect(mockSearchProfilesByGroup).not.toHaveBeenCalled();
  });
});
