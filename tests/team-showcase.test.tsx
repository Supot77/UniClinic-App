import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeamShowcase from "@/components/team/TeamShowcase";
import { THEME_PREFERENCE_EVENT } from "@/lib/appearance";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

vi.mock("@/context/LocaleContext", () => ({
  useLocale: () => ({ text: (thai: string) => thai }),
}));

describe("TeamShowcase", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "dark";
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

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

  it("switches between Greek statue and suit portraits with the resolved theme", () => {
    document.documentElement.dataset.theme = "light";
    render(<TeamShowcase />);

    const section = screen.getByRole("region", { name: "ทีมพัฒนาและอาจารย์ที่ปรึกษา WU Clinic" });
    expect(section).toHaveAttribute("data-visual-theme", "light");
    const expectedMemberOrder = ["feem", "herb", "klong", "mallika", "kun", "pai", "shop"];
    const displayedMemberOrder = () =>
      Array.from(section.querySelectorAll<HTMLButtonElement>("button[data-member-id]"), (button) => button.dataset.memberId);
    expect(displayedMemberOrder()).toEqual(expectedMemberOrder);

    const portraits = [
      ["ธัญยพร ทุ่มทอง", "/images/feem-รูปปั้นกรีก.png"],
      ["ธนกฤต ทิพยฤกษ์", "/images/เฮิร์บ-รูปปั้นกรีก.png"],
      ["วรวิริยะ นวลนก", "/images/กลอง-รูปปั้นกรีก.png"],
      ["ณัฐสิทธิ ทินวงค์", "/images/สกรีนช็อต-รูปปั้นกรีก.png"],
      ["ปวริศร์ จันทวรรณ์", "/images/ปาย-รูปปั้นกรีก.png"],
      ["สุพจน์ บำรุง", "/images/ช้อปp-รูปปั้นกรีก.png"],
      ["อาจารย์มัลลิกา", "/images/จารย์เน็ก-รูปปั้นกรีก.png"],
    ] as const;

    for (const [name, src] of portraits) {
      expect(screen.getByRole("img", { name: `ภาพสมาชิกทีม ${name}` })).toHaveAttribute("data-src", src);
    }

    const selectedMember = screen.getByRole("button", { name: /เลือก วรวิริยะ นวลนก/ });
    fireEvent.click(selectedMember);

    act(() => {
      document.documentElement.dataset.theme = "dark";
      window.dispatchEvent(new CustomEvent(THEME_PREFERENCE_EVENT, {
        detail: { preference: "dark", resolvedTheme: "dark" },
      }));
    });

    expect(section).toHaveAttribute("data-visual-theme", "dark");
    expect(displayedMemberOrder()).toEqual(expectedMemberOrder);
    expect(selectedMember).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "ภาพสมาชิกทีม วรวิริยะ นวลนก" })).toHaveAttribute(
      "data-src",
      "/images/klongsuit.png",
    );
  });
});
