-- Add physical-exam measurements to the canonical record path used by the
-- current PAI RPCs. The /records route reads and writes public.medical_records
-- and public.appointments.
BEGIN;

ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS blood_pressure text,
  ADD COLUMN IF NOT EXISTS pulse_bpm integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_height_cm_check') THEN
    ALTER TABLE public.medical_records
      ADD CONSTRAINT medical_records_height_cm_check CHECK (height_cm IS NULL OR height_cm BETWEEN 30 AND 250);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_weight_kg_check') THEN
    ALTER TABLE public.medical_records
      ADD CONSTRAINT medical_records_weight_kg_check CHECK (weight_kg IS NULL OR weight_kg BETWEEN 1 AND 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_blood_pressure_check') THEN
    ALTER TABLE public.medical_records
      ADD CONSTRAINT medical_records_blood_pressure_check CHECK (blood_pressure IS NULL OR blood_pressure ~ '^[0-9]{2,3}/[0-9]{2,3}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_pulse_bpm_check') THEN
    ALTER TABLE public.medical_records
      ADD CONSTRAINT medical_records_pulse_bpm_check CHECK (pulse_bpm IS NULL OR pulse_bpm BETWEEN 20 AND 250);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pai_save_record(
  p_appointment_id uuid,
  p_diagnosis text,
  p_advice text,
  p_prescriptions jsonb,
  p_height_cm numeric DEFAULT NULL,
  p_weight_kg numeric DEFAULT NULL,
  p_blood_pressure text DEFAULT NULL,
  p_pulse_bpm integer DEFAULT NULL,
  p_complete boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_apt public.appointments%ROWTYPE; v_doctor uuid; v_item jsonb; v_med public.medications%ROWTYPE;
  v_meds jsonb:='[]'::jsonb; v_ids uuid[]:='{}'; v_id uuid;
BEGIN
  IF public.pai_actor_role()<>'medical' THEN RAISE EXCEPTION 'เฉพาะแพทย์เจ้าของนัดบันทึกผลตรวจได้'; END IF;
  SELECT * INTO v_apt FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบนัด'; END IF;
  SELECT doctor_id INTO v_doctor FROM public.appointment_slots WHERE id=v_apt.slot_id;
  IF v_doctor<>auth.uid() OR v_apt.status<>'in_progress' THEN RAISE EXCEPTION 'ต้องเป็นนัดของตนที่กำลังตรวจ'; END IF;
  IF EXISTS (SELECT 1 FROM public.medical_records WHERE appointment_id=p_appointment_id) THEN RAISE EXCEPTION 'บันทึกผลตรวจแล้ว ไม่สามารถแก้ใบสั่งหลังบันทึก'; END IF;
  IF p_diagnosis IS NULL OR length(btrim(p_diagnosis)) NOT BETWEEN 1 AND 5000 OR length(coalesce(p_advice,''))>5000 THEN RAISE EXCEPTION 'กรุณากรอกผลตรวจและคำแนะนำไม่เกิน 5000 ตัวอักษร'; END IF;
  IF p_height_cm IS NOT NULL AND p_height_cm NOT BETWEEN 30 AND 250 THEN RAISE EXCEPTION 'ส่วนสูงต้องอยู่ระหว่าง 30–250 ซม.'; END IF;
  IF p_weight_kg IS NOT NULL AND p_weight_kg NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'น้ำหนักต้องอยู่ระหว่าง 1–300 กก.'; END IF;
  IF p_blood_pressure IS NOT NULL AND btrim(p_blood_pressure) !~ '^[0-9]{2,3}/[0-9]{2,3}$' THEN RAISE EXCEPTION 'ความดันโลหิตต้องอยู่ในรูปแบบ systolic/diastolic เช่น 120/80'; END IF;
  IF p_pulse_bpm IS NOT NULL AND p_pulse_bpm NOT BETWEEN 20 AND 250 THEN RAISE EXCEPTION 'ชีพจรต้องอยู่ระหว่าง 20–250 ครั้ง/นาที'; END IF;
  IF p_prescriptions IS NULL OR jsonb_typeof(p_prescriptions)<>'array' OR jsonb_array_length(p_prescriptions)>50 THEN RAISE EXCEPTION 'รูปแบบรายการยาไม่ถูกต้อง'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_prescriptions) LOOP
    IF jsonb_typeof(v_item)<>'object' OR coalesce(v_item->>'quantity','')!~'^[1-9][0-9]{0,5}$' OR
      coalesce(v_item->>'duration_days','')!~'^[1-9][0-9]{0,2}$' OR coalesce(length(btrim(v_item->>'dosage')),0) NOT BETWEEN 1 AND 500 OR
      coalesce(length(btrim(v_item->>'frequency')),0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'กรุณากรอกรายการยา จำนวน และวิธีใช้ให้ครบ'; END IF;
    IF (v_item->>'quantity')::integer>100000 OR (v_item->>'duration_days')::integer>365 THEN RAISE EXCEPTION 'จำนวนยาหรือระยะเวลาไม่ถูกต้อง'; END IF;
    SELECT * INTO v_med FROM public.medications WHERE id=(v_item->>'medication_id')::uuid AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบยาหรือยาถูกปิดใช้งาน'; END IF;
    IF v_med.id=ANY(v_ids) THEN RAISE EXCEPTION 'รายการยาซ้ำ'; END IF;
    v_ids:=array_append(v_ids,v_med.id);
    v_meds:=v_meds||jsonb_build_array(jsonb_build_object('medication_id',v_med.id,'name',v_med.name,
      'quantity',(v_item->>'quantity')::integer,'dosage',btrim(v_item->>'dosage'),
      'frequency',btrim(v_item->>'frequency'),'duration_days',(v_item->>'duration_days')::integer));
  END LOOP;
  INSERT INTO public.medical_records(appointment_id,patient_id,doctor_id,diagnosis,treatment_notes,prescribed_medications,height_cm,weight_kg,blood_pressure,pulse_bpm)
    VALUES(v_apt.id,v_apt.patient_id,auth.uid(),btrim(p_diagnosis),btrim(coalesce(p_advice,'')),v_meds,p_height_cm,p_weight_kg,NULLIF(btrim(p_blood_pressure),''),p_pulse_bpm) RETURNING id INTO v_id;
  IF p_complete THEN UPDATE public.appointments SET status='completed',updated_at=now() WHERE id=v_apt.id; END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pai_workspace() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_role text:=public.pai_actor_role(); v_appointments jsonb; v_slots jsonb; v_records jsonb; v_medications jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'user_id',a.patient_id,'patient',concat_ws(' ', nullif(btrim(p.title), ''), nullif(btrim(p.first_name), ''), nullif(btrim(p.last_name), '')),'slot_id',a.slot_id,
    'queue_number',a.queue_number,'reason',a.reason,'status',a.status,'cancel_requested_at',a.cancel_requested_at,'rejection_reason',a.rejection_reason,
    'has_record',EXISTS(SELECT 1 FROM public.medical_records r WHERE r.appointment_id=a.id)) ORDER BY s.slot_date,s.start_time,a.queue_number),'[]') INTO v_appointments
  FROM public.appointments a JOIN public.appointment_slots s ON s.id=a.slot_id JOIN public.profiles p ON p.id=a.patient_id
  WHERE public.pai_can_read_appointment(a.patient_id,a.slot_id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'doctor_id',s.doctor_id,'doctor',concat_ws(' ', nullif(btrim(p.title), ''), nullif(btrim(p.first_name), ''), nullif(btrim(p.last_name), '')),'department',coalesce(dep.name,'ไม่ระบุแผนก'),
    'slot_date',s.slot_date,'start_time',s.start_time,'end_time',s.end_time,'max_capacity',s.max_capacity,
    'booked_count',greatest(s.booked_count,0)+(SELECT count(*) FROM public.appointments a WHERE a.slot_id=s.id AND a.status NOT IN ('cancelled','rejected','no_show')),
    'status',s.status,'bookable',coalesce(s.status='available' AND p.is_active AND p.role='medical' AND dep.is_active AND
      (s.slot_date+s.start_time) AT TIME ZONE 'Asia/Bangkok'>now(),false)) ORDER BY s.slot_date,s.start_time),'[]') INTO v_slots
  FROM public.appointment_slots s JOIN public.doctors d ON d.id=s.doctor_id JOIN public.profiles p ON p.id=d.id LEFT JOIN public.departments dep ON dep.id=d.department_id
  WHERE (v_role='patient' AND s.slot_date>=(now() AT TIME ZONE 'Asia/Bangkok')::date) OR (v_role='medical' AND s.doctor_id=auth.uid()) OR v_role='staff_admin'
    OR EXISTS(SELECT 1 FROM public.appointments a WHERE a.slot_id=s.id AND a.patient_id=auth.uid());
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'appointment_id',r.appointment_id,'patient_id',r.patient_id,'doctor_id',r.doctor_id,
    'patient',concat_ws(' ', nullif(btrim(p.title), ''), nullif(btrim(p.first_name), ''), nullif(btrim(p.last_name), '')),'doctor',concat_ws(' ', nullif(btrim(d.title), ''), nullif(btrim(d.first_name), ''), nullif(btrim(d.last_name), '')),'diagnosis',r.diagnosis,'treatment_notes',r.treatment_notes,'prescribed_medications',r.prescribed_medications,
    'height_cm',r.height_cm,'weight_kg',r.weight_kg,'blood_pressure',r.blood_pressure,'pulse_bpm',r.pulse_bpm,
    'created_at',r.created_at,'completed',a.status='completed') ORDER BY r.created_at DESC),'[]') INTO v_records
  FROM public.medical_records r JOIN public.profiles p ON p.id=r.patient_id JOIN public.profiles d ON d.id=r.doctor_id JOIN public.appointments a ON a.id=r.appointment_id
  WHERE public.pai_can_read_record(r.patient_id,r.doctor_id,r.appointment_id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'type',type) ORDER BY name),'[]') INTO v_medications
  FROM public.medications WHERE is_active=true AND v_role='medical';
  RETURN jsonb_build_object('actor',jsonb_build_object('id',auth.uid(),'role',v_role),'slots',v_slots,'appointments',v_appointments,'records',v_records,'medications',v_medications);
END;
$$;

REVOKE ALL ON FUNCTION public.pai_save_record(uuid,text,text,jsonb,numeric,numeric,text,integer,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pai_save_record(uuid,text,text,jsonb,numeric,numeric,text,integer,boolean),public.pai_workspace() TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
