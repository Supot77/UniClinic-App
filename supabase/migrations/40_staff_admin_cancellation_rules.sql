-- Restrict final cancellation to staff_admin and require an approved appointment
-- or an explicit cancellation request for pending appointments.
BEGIN;

CREATE OR REPLACE FUNCTION public.pai_transition_appointment(p_appointment_id uuid, p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_role text := public.pai_actor_role();
  v_apt public.appointments%ROWTYPE;
  v_doctor uuid;
BEGIN
  SELECT * INTO v_apt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนัดหรือไม่มีสิทธิ์'; END IF;

  SELECT doctor_id INTO v_doctor FROM public.appointment_slots WHERE id = v_apt.slot_id;

  IF v_role = 'patient' THEN
    IF v_apt.patient_id <> auth.uid() OR p_action <> 'request_cancel' THEN
      RAISE EXCEPTION 'ไม่มีสิทธิ์ทำรายการนี้';
    END IF;
    IF v_apt.status NOT IN ('pending', 'confirmed') OR v_apt.cancel_requested_at IS NOT NULL THEN
      RAISE EXCEPTION 'ไม่สามารถส่งคำขอยกเลิกในสถานะนี้';
    END IF;
    UPDATE public.appointments SET cancel_requested_at = now(), updated_at = now() WHERE id = p_appointment_id;
    RETURN;
  END IF;

  IF v_role = 'medical' AND v_doctor <> auth.uid() THEN
    RAISE EXCEPTION 'แพทย์ทำรายการได้เฉพาะนัดของตน';
  END IF;

  IF p_action IS NULL OR NOT (
    (p_action IN ('confirmed', 'rejected') AND v_apt.status = 'pending' AND
      (v_role = 'staff_admin' OR (v_role = 'medical' AND v_doctor = auth.uid()))) OR
    (p_action = 'cancelled' AND v_role = 'staff_admin' AND
      (v_apt.status = 'confirmed' OR (v_apt.status = 'pending' AND v_apt.cancel_requested_at IS NOT NULL))) OR
    (p_action = 'in_progress' AND v_apt.status = 'confirmed') OR
    (p_action = 'completed' AND v_apt.status = 'in_progress')
  ) THEN
    RAISE EXCEPTION 'สถานะนัดหมายเปลี่ยนแล้วหรือไม่อนุญาตคำสั่งนี้';
  END IF;

  IF p_action = 'completed' AND NOT EXISTS (
    SELECT 1 FROM public.medical_records WHERE appointment_id = p_appointment_id
  ) THEN
    RAISE EXCEPTION 'ต้องบันทึกผลตรวจก่อนจบตรวจ';
  END IF;

  UPDATE public.appointments SET status = p_action, updated_at = now() WHERE id = p_appointment_id;
END;
$$;

COMMIT;
