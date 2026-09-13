-- Create concrete appointment slots for selected weekdays and time blocks.
-- This is a user-triggered batch action; it does not create a recurring schedule
-- or run automatically in the background.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_appointment_slot_batch(
  p_doctor_id uuid,
  p_service_id uuid,
  p_dates date[],
  p_time_blocks jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_date date;
  v_block jsonb;
  v_start time;
  v_end time;
  v_capacity integer;
  v_offering_id uuid;
  v_created integer := 0;
  v_has_slot boolean;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('medical', 'staff_admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์สร้างรอบตรวจ';
  END IF;
  IF v_role = 'medical' AND p_doctor_id <> auth.uid() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.doctors d
    JOIN public.profiles p ON p.id = d.id
    WHERE d.id = p_doctor_id
      AND p.role = 'medical'
      AND p.is_active
  ) THEN
    RAISE EXCEPTION 'แพทย์ต้องเปิดใช้งานก่อนสร้างรอบ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND is_active) THEN
    RAISE EXCEPTION 'เลือกบริการที่เปิดใช้งาน';
  END IF;
  IF p_dates IS NULL OR cardinality(p_dates) = 0 THEN
    RAISE EXCEPTION 'ต้องเลือกวันที่ต้องการสร้างรอบตรวจ';
  END IF;
  IF p_time_blocks IS NULL OR jsonb_typeof(p_time_blocks) <> 'array' OR jsonb_array_length(p_time_blocks) = 0 THEN
    RAISE EXCEPTION 'ต้องเลือกช่วงเวลาที่ต้องการสร้างรอบตรวจ';
  END IF;

  -- Validate every block before creating an offering or slot.
  FOR v_block IN SELECT value FROM jsonb_array_elements(p_time_blocks) LOOP
    IF coalesce(v_block->>'start_time', '') !~ '^[0-9]{2}:[0-9]{2}$'
      OR coalesce(v_block->>'end_time', '') !~ '^[0-9]{2}:[0-9]{2}$'
      OR coalesce(v_block->>'max_capacity', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'ข้อมูลช่วงเวลาไม่ถูกต้อง';
    END IF;
    BEGIN
      v_start := (v_block->>'start_time')::time;
      v_end := (v_block->>'end_time')::time;
      v_capacity := (v_block->>'max_capacity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'ข้อมูลช่วงเวลาไม่ถูกต้อง';
    END;
    IF v_start >= v_end THEN
      RAISE EXCEPTION 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด';
    END IF;
    IF v_start < time '08:30' OR v_end > time '16:30' THEN
      RAISE EXCEPTION 'รอบตรวจต้องอยู่ระหว่าง 08:30–16:30 น.';
    END IF;
    IF v_start < time '13:00' AND v_end > time '12:00' THEN
      RAISE EXCEPTION 'ไม่สามารถสร้างรอบทับช่วงพัก 12:00–13:00 น.';
    END IF;
    IF v_capacity < 1 THEN
      RAISE EXCEPTION 'ความจุต้องเป็นจำนวนเต็มมากกว่า 0';
    END IF;
  END LOOP;

  IF EXISTS (
    WITH blocks AS (
      SELECT value, ordinality
      FROM jsonb_array_elements(p_time_blocks) WITH ORDINALITY
    )
    SELECT 1
    FROM blocks first_block
    JOIN blocks second_block ON first_block.ordinality < second_block.ordinality
    WHERE (first_block.value->>'start_time')::time < (second_block.value->>'end_time')::time
      AND (second_block.value->>'start_time')::time < (first_block.value->>'end_time')::time
  ) THEN
    RAISE EXCEPTION 'ช่วงเวลาที่เลือกทับซ้อนกัน';
  END IF;

  FOR v_date IN
    SELECT DISTINCT date_value
    FROM unnest(p_dates) AS selected_dates(date_value)
    ORDER BY date_value
  LOOP
    IF v_date < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
      RAISE EXCEPTION 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้';
    END IF;
    IF extract(isodow FROM v_date) > 5 THEN
      RAISE EXCEPTION 'คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์';
    END IF;

    -- Leave dates are intentionally skipped; existing leave/slot records stay unchanged.
    IF EXISTS (
      SELECT 1
      FROM public.doctor_leaves
      WHERE doctor_id = p_doctor_id
        AND v_date BETWEEN start_date AND end_date
    ) THEN
      CONTINUE;
    END IF;

    -- Serialize batches for one doctor/day, then re-check conflicts before insert.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || ':' || v_date::text, 0));
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_time_blocks) block
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.appointment_slots existing_slot
        WHERE existing_slot.doctor_id = p_doctor_id
          AND existing_slot.slot_date = v_date
          AND (block.value->>'start_time')::time < existing_slot.end_time
          AND (block.value->>'end_time')::time > existing_slot.start_time
      )
    ) INTO v_has_slot;
    IF NOT v_has_slot THEN
      CONTINUE;
    END IF;

    INSERT INTO public.daily_service_offerings (service_id, doctor_id, offering_date, is_active, created_by)
    VALUES (p_service_id, p_doctor_id, v_date, true, auth.uid())
    ON CONFLICT (service_id, doctor_id, offering_date)
    DO UPDATE SET is_active = true, updated_at = now()
    RETURNING id INTO v_offering_id;

    FOR v_block IN SELECT value FROM jsonb_array_elements(p_time_blocks) LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.appointment_slots existing_slot
        WHERE existing_slot.doctor_id = p_doctor_id
          AND existing_slot.slot_date = v_date
          AND (v_block->>'start_time')::time < existing_slot.end_time
          AND (v_block->>'end_time')::time > existing_slot.start_time
      ) THEN
        INSERT INTO public.appointment_slots (
          doctor_id,
          daily_service_offering_id,
          slot_date,
          start_time,
          end_time,
          max_capacity,
          booked_count,
          status
        ) VALUES (
          p_doctor_id,
          v_offering_id,
          v_date,
          (v_block->>'start_time')::time,
          (v_block->>'end_time')::time,
          (v_block->>'max_capacity')::integer,
          0,
          'available'
        );
        v_created := v_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.create_appointment_slot_batch(uuid, uuid, date[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_appointment_slot_batch(uuid, uuid, date[], jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
