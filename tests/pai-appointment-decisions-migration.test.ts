import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/31_allow_medical_appointment_decisions.sql'), 'utf8');

describe('PAI appointment decision migration', () => {
  it('keeps staff_admin decisions and scopes medical decisions to the owning doctor', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.pai_transition_appointment');
    expect(migration).toContain("v_role='staff_admin' OR (v_role='medical' AND v_doctor=auth.uid())");
    expect(migration).toContain("v_apt.status='pending'");
    expect(migration).toContain("IF v_role='medical' AND v_doctor<>auth.uid()");
  });

  it('does not grant privileged database access', () => {
    expect(migration).not.toMatch(/service_role|\.env\.local/i);
  });
});
