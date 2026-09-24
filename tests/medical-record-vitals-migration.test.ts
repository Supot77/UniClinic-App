import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/28_medical_record_vitals.sql'), 'utf8');
const editWindowMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/35_medical_record_edit_window.sql'), 'utf8');

describe('medical record physical-exam migration', () => {
  it('adds the four physical-exam columns to the canonical medical_records table', () => {
    expect(migration).toContain('ALTER TABLE public.medical_records');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS height_cm numeric(5,2)');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2)');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS blood_pressure text');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS pulse_bpm integer');
    expect(migration).not.toContain('ALTER TABLE public.pai_medical_records');
  });

  it('validates measurements in SQL and passes them through the active RPC workspace', () => {
    expect(migration).toContain('p_height_cm numeric DEFAULT NULL');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.pai_save_record(');
    expect(migration).toContain('p_weight_kg numeric DEFAULT NULL');
    expect(migration).toContain('p_blood_pressure text DEFAULT NULL');
    expect(migration).toContain('p_pulse_bpm integer DEFAULT NULL');
    expect(migration).toContain("height_cm',r.height_cm");
    expect(migration).toContain("weight_kg',r.weight_kg");
    expect(migration).toContain("blood_pressure',r.blood_pressure");
    expect(migration).toContain("pulse_bpm',r.pulse_bpm");
    expect(migration).toContain('INSERT INTO public.medical_records(');
    expect(migration).toContain('FROM public.appointments a');
    expect(migration).toContain('FROM public.medical_records r');
    expect(migration).not.toContain('INSERT INTO public.pai_medical_records(');
    expect(migration).not.toMatch(/DROP\s+TABLE|TRUNCATE\s+/i);
  });
});

describe('medical record edit-window migration', () => {
  it('uses the existing created_at inserted by the save RPC without adding a timestamp column', () => {
    expect(editWindowMigration).toContain('CREATE OR REPLACE FUNCTION public.update_medical_record(');
    expect(editWindowMigration).toContain("now() >= v_record.created_at + interval '15 minutes'");
    expect(editWindowMigration).toContain("created_at > now() - interval '15 minutes'");
    expect(editWindowMigration).toContain('CREATE TRIGGER medical_records_edit_window');
    expect(editWindowMigration).not.toMatch(/ALTER TABLE\s+public\.medical_records/i);
    expect(editWindowMigration).not.toContain('pai_update_record');
  });

  it('enforces the owning medical user in both policy and trigger/RPC paths', () => {
    expect(editWindowMigration).toContain('DROP POLICY IF EXISTS "Medical can view and create medical records"');
    expect(editWindowMigration).toContain("doctor_id = auth.uid()");
    expect(editWindowMigration).toContain("v_record.doctor_id <> auth.uid()");
    expect(editWindowMigration).toContain("v_role <> 'medical'");
    expect(editWindowMigration).toContain("GRANT EXECUTE ON FUNCTION public.update_medical_record");
  });
});
