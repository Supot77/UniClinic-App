import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Footer from "@/components/layout/Footer";

const authState = vi.hoisted(() => ({
  user: null as null | { displayName: string },
  isAuthenticated: false,
  isLoading: false,
  role: null as string | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

describe("Footer", () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.role = null;
  });

  it("renders clinic info and general services for guest users and hides staff menus", () => {
    render(<Footer />);

    expect(screen.getByText("WU Clinic")).toBeInTheDocument();
    expect(screen.getByText("สำหรับผู้ใช้ทั่วไป")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ตารางตรวจแพทย์" })).toHaveAttribute("href", "/schedules");
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "สมัครสมาชิก" })).toHaveAttribute("href", "/register");

    // Staff menus should NOT be visible to guests
    expect(screen.queryByText("สำหรับบุคลากร")).not.toBeInTheDocument();
    expect(screen.queryByText("สำหรับบุคลากรทางการแพทย์")).not.toBeInTheDocument();
    expect(screen.queryByText("สำหรับเจ้าหน้าที่")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ภาพรวม" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "คลังยา" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ค้นหาผู้ป่วย" })).not.toBeInTheDocument();
  });

  it("renders patient links for authenticated patient role and hides staff menus", () => {
    authState.isAuthenticated = true;
    authState.role = "patient";
    authState.user = { displayName: "สมหญิง ผู้ป่วย" };

    render(<Footer />);

    expect(screen.getByText("สำหรับผู้ป่วย")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "นัดหมายของฉัน" })).toHaveAttribute("href", "/appointments");
    expect(screen.getByRole("link", { name: "ตารางตรวจแพทย์" })).toHaveAttribute("href", "/schedules");
    expect(screen.getByRole("link", { name: "ประวัติการรักษา" })).toHaveAttribute("href", "/records");
    expect(screen.getByRole("link", { name: "แจ้งเตือนยา" })).toHaveAttribute("href", "/reminders");
    expect(screen.getByRole("link", { name: "โปรไฟล์" })).toHaveAttribute("href", "/profile");

    // Staff menus should NOT be visible to patients
    expect(screen.queryByText("สำหรับบุคลากร")).not.toBeInTheDocument();
    expect(screen.queryByText("สำหรับบุคลากรทางการแพทย์")).not.toBeInTheDocument();
    expect(screen.queryByText("สำหรับเจ้าหน้าที่")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "คลังยา" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ค้นหาผู้ป่วย" })).not.toBeInTheDocument();
  });

  it("renders medical staff links for authenticated medical role", () => {
    authState.isAuthenticated = true;
    authState.role = "medical";
    authState.user = { displayName: "นพ. สมชาย ใจดี" };

    render(<Footer />);

    expect(screen.getByText("สำหรับบุคลากรทางการแพทย์")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ภาพรวม" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "ตารางตรวจแพทย์" })).toHaveAttribute("href", "/schedules");
    expect(screen.getByRole("link", { name: "ค้นหาผู้ป่วย" })).toHaveAttribute("href", "/patients/search");
    expect(screen.getByRole("link", { name: "คลังยา" })).toHaveAttribute("href", "/pharmacy");
    expect(screen.getByRole("link", { name: "นัดหมายผู้ป่วย" })).toHaveAttribute("href", "/appointments");

    // Should NOT show admin-only accounts or general register
    expect(screen.queryByText("สำหรับเจ้าหน้าที่")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "จัดการผู้ใช้งาน" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "สมัครสมาชิก" })).not.toBeInTheDocument();
  });

  it("renders staff admin links for authenticated staff_admin role", () => {
    authState.isAuthenticated = true;
    authState.role = "staff_admin";
    authState.user = { displayName: "แอดมิน สมบัติ" };

    render(<Footer />);

    expect(screen.getByText("สำหรับเจ้าหน้าที่")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ภาพรวม" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "จัดการผู้ใช้งาน" })).toHaveAttribute("href", "/staff/accounts");
    expect(screen.getByRole("link", { name: "จัดการแผนก" })).toHaveAttribute("href", "/departments");
    expect(screen.getByRole("link", { name: "คลังยา" })).toHaveAttribute("href", "/pharmacy");
    expect(screen.getByRole("link", { name: "ตารางตรวจแพทย์" })).toHaveAttribute("href", "/schedules");

    // Should NOT show medical-only or guest register
    expect(screen.queryByText("สำหรับบุคลากรทางการแพทย์")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "สมัครสมาชิก" })).not.toBeInTheDocument();
  });

  it("navigates logo to dashboard when authenticated and to home when guest", () => {
    const { unmount } = render(<Footer />);
    expect(screen.getByRole("link", { name: /WU Clinic/ })).toHaveAttribute("href", "/");
    unmount();

    authState.isAuthenticated = true;
    authState.role = "patient";
    authState.user = { displayName: "สมหญิง ผู้ป่วย" };

    render(<Footer />);
    expect(screen.getByRole("link", { name: /WU Clinic/ })).toHaveAttribute("href", "/dashboard");
  });
});
