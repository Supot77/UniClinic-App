import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TeamShowcase from "@/components/team/TeamShowcase";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ text: (thai: string) => thai }),
}));

describe("TeamShowcase", () => {
  it("shows all seven members and their work, then brings the selected member forward", () => {
    render(<TeamShowcase />);

    const portraits = screen.getAllByRole("button", { name: /^เลือก / });
    expect(portraits).toHaveLength(7);
    expect(screen.getByText("ธัญยพร ทุ่มทอง")).toBeInTheDocument();
    expect(screen.getByText("คลังยา / จ่ายยา")).toBeInTheDocument();
    expect(screen.getByText("อาจารย์มัลลิกา")).toBeInTheDocument();
    expect(screen.getByText("อาจารย์ที่ปรึกษา")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "ภาพสมาชิกทีม อาจารย์มัลลิกา" })).toHaveAttribute(
      "data-src",
      "/images/mallikasuit.png",
    );

    const kun = screen.getByRole("button", { name: /เลือก ณัฐสิทธิ ทินวงค์/ });
    fireEvent.click(kun);
    expect(kun).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("คลังยาและการจ่ายยา")).toBeInTheDocument();
    expect(portraits.filter((portrait) => portrait.getAttribute("aria-pressed") === "true")).toHaveLength(1);

    fireEvent.click(kun);
    expect(kun).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("เลือกสมาชิกหนึ่งคน")).toBeInTheDocument();

    const advisor = screen.getByRole("button", { name: /เลือก อาจารย์มัลลิกา/ });
    fireEvent.click(advisor);
    expect(advisor).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("อาจารย์ที่ปรึกษาโครงการ WU Clinic")).toBeInTheDocument();
  });
});
