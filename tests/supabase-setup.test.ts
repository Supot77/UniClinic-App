import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("Supabase Next.js setup", () => {
  it("exposes browser and server helpers with publishable-key fallback", () => {
    const browser = read("src/utils/supabase/client.ts");
    const server = read("src/utils/supabase/server.ts");

    expect(browser).toContain("createBrowserClient");
    expect(server).toContain("createServerClient");
    expect(browser).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(server).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("uses Next 16 proxy convention to refresh auth cookies", () => {
    const proxy = read("src/proxy.ts");
    const session = read("src/utils/supabase/middleware.ts");

    expect(proxy).toContain("export async function proxy");
    expect(proxy).toContain("updateSession");
    expect(session).toContain("supabase.auth.getUser()");
    expect(session).toContain("response.cookies.set");
  });

  it("documents both current and legacy environment variable names", () => {
    const example = read(".env.example");
    expect(example).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(example).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("defines a role-aware schedule RPC with effective active booking counts", () => {
    const migration = read("supabase/migrations/25_schedule_slot_booking_counts.sql");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_schedule_slots()");
    expect(migration).toContain("count(appointment.id)::integer");
    expect(migration).toContain("appointment.status NOT IN ('cancelled', 'rejected', 'no_show')");
    expect(migration).toContain("auth.uid() IS NULL");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_schedule_slots() TO authenticated, anon");
    expect(migration).not.toMatch(/service_role|\.env\.local/i);
  });
});
