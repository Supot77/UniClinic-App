import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/39_staff_admin_read_medical_records.sql'), 'utf8');
const cancellationMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/40_staff_admin_cancellation_rules.sql'), 'utf8');

describe('staff_admin medical-record read migration', () => {
  it('allows staff_admin to read records through both the workspace RPC and RLS', () => {
    expect(migration).toContain("WHEN 'staff_admin' THEN true");
    expect(migration).toContain('CREATE POLICY "Staff admin can view all medical records"');
    expect(migration).toContain("USING (public.get_user_role() = 'staff_admin')");
    expect(migration).toContain('GRANT SELECT ON public.medical_records TO authenticated');
  });

  it('does not grant staff_admin write access', () => {
    expect(migration).not.toContain('GRANT INSERT');
    expect(migration).not.toContain('GRANT UPDATE');
    expect(migration).not.toContain('GRANT DELETE');
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
