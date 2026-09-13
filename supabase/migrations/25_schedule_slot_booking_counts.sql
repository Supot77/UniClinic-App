-- Read schedule slots with the effective booking count.
-- appointment_slots.booked_count is a legacy/base count; PAI appointments are
-- counted here so Schedule and PAI show the same availability without changing
-- the booking owner's counter semantics.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_schedule_slots()
RETURNS TABLE (
  id uuid,
  doctor_id uuid,
  daily_service_offering_id uuid,
  service_id uuid,
  slot_date date,
  start_time time,
  end_time time,
  max_capacity integer,
  booked_count integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    slot.id,
    slot.doctor_id,
    slot.daily_service_offering_id,
    offering.service_id,
    slot.slot_date,
    slot.start_time,
    slot.end_time,
    slot.max_capacity,
    greatest(
      coalesce(slot.booked_count, 0) + count(appointment.id)::integer,
      0
    )::integer AS booked_count,
    slot.status,
    slot.created_at,
    slot.updated_at
  FROM public.appointment_slots slot
  JOIN public.daily_service_offerings offering
    ON offering.id = slot.daily_service_offering_id
   AND offering.doctor_id = slot.doctor_id
   AND offering.offering_date = slot.slot_date
  LEFT JOIN public.appointments appointment
    ON appointment.slot_id = slot.id
   AND appointment.status NOT IN ('cancelled', 'rejected', 'no_show')
  WHERE (
    (
      auth.uid() IS NULL
      OR public.get_user_role() = 'patient'
    )
    AND offering.is_active
    AND EXISTS (
      SELECT 1
      FROM public.services service
      WHERE service.id = offering.service_id
        AND service.is_active
    )
  )
  OR (
    public.get_user_role() = 'medical'
    AND slot.doctor_id = auth.uid()
  )
  OR public.get_user_role() = 'staff_admin'
  GROUP BY
    slot.id,
    slot.doctor_id,
    slot.daily_service_offering_id,
    offering.service_id,
    slot.slot_date,
    slot.start_time,
    slot.end_time,
    slot.max_capacity,
    slot.booked_count,
    slot.status,
    slot.created_at,
    slot.updated_at
  ORDER BY slot.slot_date, slot.start_time;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_slots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schedule_slots() TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
COMMIT;
