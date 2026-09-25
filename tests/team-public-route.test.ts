import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";

vi.mock("@/utils/supabase/middleware", () => ({
  updateSession: vi.fn(async () => ({ response: NextResponse.next(), user: null })),
}));

describe("team route access", () => {
  it("lets guests open the team page while private pages still redirect to login", async () => {
    const teamResponse = await proxy(new NextRequest("http://localhost:3000/team"));
    expect(teamResponse.status).toBe(200);

    const privateResponse = await proxy(new NextRequest("http://localhost:3000/profile"));
    expect(privateResponse.status).toBe(307);
    expect(privateResponse.headers.get("location")).toBe("http://localhost:3000/login?redirect=%2Fprofile");
  });
});
