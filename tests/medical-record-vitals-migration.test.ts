import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/28_medical_record_vitals.sql'), 'utf8');

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
