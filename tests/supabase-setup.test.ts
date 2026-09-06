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
});
