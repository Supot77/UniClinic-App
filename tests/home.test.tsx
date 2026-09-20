import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { LandingActions, LandingServices } from "@/components/landing/LandingContent";
const state = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false, role: null as string | null }));
const fetchServices = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state }));
vi.mock("@/services/landingService", () => ({ fetchLandingServices: fetchServices }));

beforeEach(() => {
  Object.assign(state, { isAuthenticated: false, isLoading: false, role: null });
  fetchServices.mockReset().mockResolvedValue([]);
});
describe("Landing", () => {
  it("preserves the guest booking destination and shows confirmed contact copy", async () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "จองนัดหมาย" })).toHaveAttribute("href", "/login?redirect=%2Fappointments");
    expect(screen.getByRole("link", { name: "075-479999" })).toHaveAttribute("href", "tel:075479999");
    expect(screen.getByText("คำขอนัดหมายต้องได้รับการยืนยันจากเจ้าหน้าที่")).toBeInTheDocument();
    expect(screen.getByText(/เวลาจำลองสำหรับการสาธิต/)).toBeInTheDocument();
    expect(screen.queryByText("พร้อมให้บริการ")).not.toBeInTheDocument();
    await screen.findByText(/ยังไม่มีรายการบริการที่แสดงได้/);
  });
  it("sends patients directly to appointments", () => {
    Object.assign(state, { isAuthenticated: true, role: "patient" });
    render(<LandingActions />);
    expect(screen.getByRole("link", { name: "จองนัดหมาย" })).toHaveAttribute("href", "/appointments");
    expect(screen.getByRole("link", { name: "นัดหมายของฉัน" })).toHaveAttribute("href", "/appointments");
  });
  it.each(["medical", "staff_admin"])("offers the %s dashboard", (role) => {
    Object.assign(state, { isAuthenticated: true, role });
    render(<LandingActions />);
    expect(screen.getByRole("link", { name: "ไป Dashboard" })).toHaveAttribute("href", `/dashboard/${role}`);
    expect(screen.queryByRole("link", { name: "จองนัดหมาย" })).not.toBeInTheDocument();
  });
  it("does not offer guest actions while session is loading", () => {
    state.isLoading = true;
    render(<LandingActions />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("shows only active services", async () => {
    fetchServices.mockResolvedValue([{ id: "a", name: "บริการจริง", description: "รายละเอียด", isActive: true }, { id: "b", name: "บริการปิด", isActive: false }]);
    render(<LandingServices />);
    expect(screen.getByRole("status")).toHaveTextContent("กำลังโหลดบริการ");
    await screen.findByText("บริการจริง");
    expect(screen.queryByText("บริการปิด")).not.toBeInTheDocument();
  });
  it("recovers from a catalog error on retry", async () => {
    fetchServices.mockRejectedValueOnce(new Error("offline"));
    render(<LandingServices />);
    await screen.findByText(/โหลดรายการบริการไม่สำเร็จ/);
    fetchServices.mockResolvedValueOnce([{ id: "a", name: "บริการจริง", isActive: true }]);
    fireEvent.click(screen.getByRole("button", { name: "ลองโหลดบริการอีกครั้ง" }));
    await screen.findByText("บริการจริง");
  });
});
