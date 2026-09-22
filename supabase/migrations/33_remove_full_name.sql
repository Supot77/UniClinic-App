-- Replace the denormalized profile name with structured identity fields.
-- This migration is intentionally fail-safe: it will not guess how to split
-- existing full names into first and last names.
BEGIN;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE nullif(btrim(first_name), '') IS NULL
       OR nullif(btrim(last_name), '') IS NULL
  ) THEN
    RAISE EXCEPTION
      'profiles contains users without first_name and last_name; migrate those rows explicitly before removing full_name';
  END IF;
END
$migration$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_first_name_check,
  DROP CONSTRAINT IF EXISTS profiles_last_name_check,
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- The old function signature accepted a single denormalized name.
DROP FUNCTION IF EXISTS public.staff_admin_update_profile(uuid, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.staff_admin_update_profile(
  p_profile_id uuid,
  p_title text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_role text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_role text;
  v_actor_active boolean;
BEGIN
  SELECT role, is_active
    INTO v_actor_role, v_actor_active
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_actor_role IS DISTINCT FROM 'staff_admin'
     OR v_actor_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'เฉพาะสตาฟแอดมินที่เปิดใช้งานเท่านั้นที่แก้ไขบัญชีได้';
  END IF;

  IF p_profile_id = auth.uid()
     AND (p_role IS DISTINCT FROM 'staff_admin' OR p_is_active IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'ไม่สามารถเปลี่ยน Role หรือปิดบัญชีของตนเองได้';
  END IF;

  IF nullif(btrim(p_first_name), '') IS NULL
     OR nullif(btrim(p_last_name), '') IS NULL THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อและนามสกุล';
  END IF;

  IF p_title IS NOT NULL AND p_title NOT IN ('นาย', 'นาง', 'นางสาว', 'อื่น ๆ') THEN
    RAISE EXCEPTION 'คำนำหน้าชื่อไม่ถูกต้อง';
  END IF;

  IF p_role NOT IN ('patient', 'medical', 'staff_admin') THEN
    RAISE EXCEPTION 'Role ไม่ถูกต้อง';
  END IF;

  UPDATE public.profiles
  SET title = nullif(btrim(p_title), ''),
      first_name = btrim(p_first_name),
      last_name = btrim(p_last_name),
      phone = nullif(btrim(p_phone), ''),
      role = p_role,
      is_active = p_is_active,
      permission_version = permission_version + 1,
      updated_at = now()
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้งาน';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.staff_admin_update_profile(uuid, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_admin_update_profile(uuid, text, text, text, text, text, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.get_staff_profile_directory();

CREATE FUNCTION public.get_staff_profile_directory()
RETURNS TABLE(
  id uuid,
  display_name text,
  title text,
  first_name text,
  last_name text,
  email text,
  phone text,
  role text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'staff_admin'
      AND actor.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Only staff_admin users can view the account directory'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    profile.id::uuid,
    concat_ws(' ', nullif(btrim(profile.title), ''), btrim(profile.first_name), btrim(profile.last_name))::text,
    profile.title::text,
    profile.first_name::text,
    profile.last_name::text,
    account.email::text,
    profile.phone::text,
    profile.role::text,
    profile.is_active::boolean,
    profile.created_at
  FROM public.profiles AS profile
  JOIN auth.users AS account ON account.id = profile.id
  ORDER BY profile.role, profile.first_name, profile.last_name;
END
$function$;

REVOKE ALL ON FUNCTION public.get_staff_profile_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_profile_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_notification_senders(p_notification_ids uuid[])
RETURNS TABLE(
  notification_id uuid,
  sender_name text,
  sender_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    notification.id,
    concat_ws(' ', nullif(btrim(profile.title), ''), btrim(profile.first_name), btrim(profile.last_name)),
    profile.role::text
  FROM public.notifications AS notification
  JOIN public.broadcasts AS broadcast ON broadcast.id = notification.broadcast_id
  JOIN public.profiles AS profile ON profile.id = broadcast.sent_by
  WHERE auth.uid() IS NOT NULL
    AND notification.user_id = auth.uid()
    AND notification.type = 'broadcast'
    AND notification.deleted_at IS NULL
    AND notification.id = ANY(COALESCE(p_notification_ids, ARRAY[]::uuid[]));
$function$;

REVOKE ALL ON FUNCTION public.get_notification_senders(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_senders(uuid[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_unread_notification_recipients(integer);
DROP FUNCTION IF EXISTS public.get_unread_notification_recipients(integer, timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_unread_notification_recipients(p_limit integer DEFAULT 100)
RETURNS TABLE(
  notification_id uuid,
  user_id uuid,
  display_name text,
  role text,
  title text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    notification.id,
    notification.user_id,
    concat_ws(' ', nullif(btrim(profile.title), ''), btrim(profile.first_name), btrim(profile.last_name)),
    profile.role::text,
    notification.title,
    notification.created_at
  FROM public.notifications AS notification
  JOIN public.profiles AS profile ON profile.id = notification.user_id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles AS actor
      WHERE actor.id = auth.uid()
        AND actor.role = 'staff_admin'
        AND actor.is_active IS DISTINCT FROM false
    )
    AND notification.type = 'broadcast'
    AND notification.read_at IS NULL
    AND notification.deleted_at IS NULL
  ORDER BY notification.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$function$;

CREATE FUNCTION public.get_unread_notification_recipients(
  p_limit integer,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone
)
RETURNS TABLE(
  notification_id uuid,
  user_id uuid,
  display_name text,
  role text,
  title text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT
    notification.id,
    notification.user_id,
    concat_ws(' ', nullif(btrim(profile.title), ''), btrim(profile.first_name), btrim(profile.last_name)),
    profile.role::text,
    notification.title,
    notification.created_at
  FROM public.notifications AS notification
  JOIN public.profiles AS profile ON profile.id = notification.user_id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles AS actor
      WHERE actor.id = auth.uid()
        AND actor.role = 'staff_admin'
        AND actor.is_active IS DISTINCT FROM false
    )
    AND notification.type = 'broadcast'
    AND notification.read_at IS NULL
    AND notification.deleted_at IS NULL
    AND (p_start_at IS NULL OR notification.created_at >= p_start_at)
    AND (p_end_at IS NULL OR notification.created_at <= p_end_at)
  ORDER BY notification.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$function$;

REVOKE ALL ON FUNCTION public.get_unread_notification_recipients(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_recipients(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_unread_notification_recipients(integer, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_recipients(integer, timestamp with time zone, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.pai_workspace() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_role text := public.pai_actor_role();
  v_appointments jsonb;
  v_slots jsonb;
  v_records jsonb;
  v_medications jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'user_id', a.patient_id,
    'patient', concat_ws(' ', nullif(btrim(p.title), ''), btrim(p.first_name), btrim(p.last_name)),
    'slot_id', a.slot_id,
    'queue_number', a.queue_number,
    'reason', a.reason,
    'status', a.status,
    'cancel_requested_at', a.cancel_requested_at,
    'rejection_reason', a.rejection_reason,
    'has_record', EXISTS(SELECT 1 FROM public.medical_records r WHERE r.appointment_id = a.id)
  ) ORDER BY s.slot_date, s.start_time, a.queue_number), '[]') INTO v_appointments
  FROM public.appointments a
  JOIN public.appointment_slots s ON s.id = a.slot_id
  JOIN public.profiles p ON p.id = a.patient_id
  WHERE public.pai_can_read_appointment(a.patient_id, a.slot_id);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'doctor_id', s.doctor_id,
    'doctor', concat_ws(' ', nullif(btrim(p.title), ''), btrim(p.first_name), btrim(p.last_name)),
    'department', coalesce(dep.name, 'ไม่ระบุแผนก'),
    'slot_date', s.slot_date,
    'start_time', s.start_time,
    'end_time', s.end_time,
    'max_capacity', s.max_capacity,
    'booked_count', greatest(s.booked_count, 0) + (
      SELECT count(*) FROM public.appointments a
      WHERE a.slot_id = s.id AND a.status NOT IN ('cancelled', 'rejected', 'no_show')
    ),
    'status', s.status,
    'bookable', coalesce(
      s.status = 'available' AND p.is_active AND p.role = 'medical' AND dep.is_active AND
      (s.slot_date + s.start_time) AT TIME ZONE 'Asia/Bangkok' > now(),
      false
    )
  ) ORDER BY s.slot_date, s.start_time), '[]') INTO v_slots
  FROM public.appointment_slots s
  JOIN public.doctors d ON d.id = s.doctor_id
  JOIN public.profiles p ON p.id = d.id
  LEFT JOIN public.departments dep ON dep.id = d.department_id
  WHERE (v_role = 'patient' AND s.slot_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date)
     OR (v_role = 'medical' AND s.doctor_id = auth.uid())
     OR v_role = 'staff_admin'
     OR EXISTS(SELECT 1 FROM public.appointments a WHERE a.slot_id = s.id AND a.patient_id = auth.uid());

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'appointment_id', r.appointment_id,
    'patient_id', r.patient_id,
    'doctor_id', r.doctor_id,
    'patient', concat_ws(' ', nullif(btrim(p.title), ''), btrim(p.first_name), btrim(p.last_name)),
    'doctor', concat_ws(' ', nullif(btrim(d.title), ''), btrim(d.first_name), btrim(d.last_name)),
    'diagnosis', r.diagnosis,
    'treatment_notes', r.treatment_notes,
    'prescribed_medications', r.prescribed_medications,
    'height_cm', r.height_cm,
    'weight_kg', r.weight_kg,
    'blood_pressure', r.blood_pressure,
    'pulse_bpm', r.pulse_bpm,
    'created_at', r.created_at,
    'completed', a.status = 'completed'
  ) ORDER BY r.created_at DESC), '[]') INTO v_records
  FROM public.medical_records r
  JOIN public.profiles p ON p.id = r.patient_id
  JOIN public.profiles d ON d.id = r.doctor_id
  JOIN public.appointments a ON a.id = r.appointment_id
  WHERE public.pai_can_read_record(r.patient_id, r.doctor_id, r.appointment_id);

  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'type', type) ORDER BY name), '[]') INTO v_medications
  FROM public.medications
  WHERE is_active = true AND v_role = 'medical';

  RETURN jsonb_build_object(
    'actor', jsonb_build_object('id', auth.uid(), 'role', v_role),
    'slots', v_slots,
    'appointments', v_appointments,
    'records', v_records,
    'medications', v_medications
  );
END;
$$;

ALTER TABLE public.profiles
  DROP COLUMN full_name;

NOTIFY pgrst, 'reload schema';
COMMIT;
