import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/41_restrict_staff_admin_medical_records.sql'), 'utf8');
const cancellationMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/40_staff_admin_cancellation_rules.sql'), 'utf8');

describe('staff_admin medical-record restriction migration', () => {
  it('removes staff_admin read policies and denies workspace record reads', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Staff admin can view all medical records"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Medical and staff admin can manage medical records"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Medical and staff admin can view medical records"');
    expect(migration).toContain("WHEN 'medical' THEN p_doctor = auth.uid()");
    expect(migration).toContain('ELSE false');
    expect(migration).not.toContain("WHEN 'staff_admin' THEN true");
    expect(migration).not.toContain("public.get_user_role() = 'staff_admin'");
  });

  it('keeps direct medical-record privileges and RLS limited to medical users', () => {
    expect(migration).toContain('REVOKE ALL ON public.medical_records FROM authenticated');
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE ON public.medical_records TO authenticated');
    expect(migration).toContain('CREATE POLICY "Medical can manage medical records"');
    expect(migration).toContain("USING (public.get_user_role() = 'medical')");
    expect(migration).toContain("WITH CHECK (public.get_user_role() = 'medical')");
  });
});

describe('staff_admin cancellation migration', () => {
  it('allows staff_admin to cancel confirmed appointments or pending cancellation requests only', () => {
    expect(cancellationMigration).toContain("p_action = 'cancelled' AND v_role = 'staff_admin'");
    expect(cancellationMigration).toContain("v_apt.status = 'confirmed'");
    expect(cancellationMigration).toContain("v_apt.status = 'pending' AND v_apt.cancel_requested_at IS NOT NULL");
  });

  it('does not grant cancellation to medical users', () => {
    expect(cancellationMigration).toContain("p_action = 'cancelled' AND v_role = 'staff_admin'");
    expect(cancellationMigration).not.toContain("p_action = 'cancelled' AND v_role = 'medical'");
  });
});
