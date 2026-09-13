-- Manual doctor leave records.
-- This migration stores leave periods only; it does not cancel appointments,
-- close slots, or run any background automation.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.doctor_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_leaves_date_order CHECK (start_date <= end_date),
  CONSTRAINT doctor_leaves_no_overlap
    EXCLUDE USING gist (
      doctor_id WITH =,
      daterange(start_date, end_date, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS doctor_leaves_doctor_date_idx
  ON public.doctor_leaves (doctor_id, start_date, end_date);

ALTER TABLE public.doctor_leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff admin can manage all doctor leaves" ON public.doctor_leaves;
CREATE POLICY "Staff admin can manage all doctor leaves"
  ON public.doctor_leaves FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'staff_admin')
  WITH CHECK (public.get_user_role() = 'staff_admin');

DROP POLICY IF EXISTS "Medical can manage own doctor leave" ON public.doctor_leaves;
CREATE POLICY "Medical can manage own doctor leave"
  ON public.doctor_leaves FOR ALL
  TO authenticated
  USING (
    public.get_user_role() = 'medical'
    AND doctor_id = auth.uid()
  )
  WITH CHECK (
    public.get_user_role() = 'medical'
    AND doctor_id = auth.uid()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_leaves TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
