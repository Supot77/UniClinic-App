'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { signUp } from '@/services/authService';

type FieldName =
  | 'title'
  | 'firstName'
  | 'lastName'
  | 'dateOfBirth'
  | 'gender'
  | 'patientType'
  | 'studentId'
  | 'employeeId'
  | 'phone'
  | 'allergyStatus'
  | 'allergies'
  | 'chronicDiseaseStatus'
  | 'chronicDiseases'
  | 'emergencyContactTitle'
  | 'emergencyContactFirstName'
  | 'emergencyContactLastName'
  | 'emergencyContactRelationship'
  | 'emergencyPhone'
  | 'email'
  | 'password'
  | 'confirmPassword';

type RegistrationForm = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const personNamePattern =
  /^[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+(?:[ '-][A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+)*$/;

const initialForm: RegistrationForm = {
  title: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  patientType: 'student',
  studentId: '',
  employeeId: '',
  phone: '',

  allergyStatus: '',
  allergies: '',
  chronicDiseaseStatus: '',
  chronicDiseases: '',

  emergencyContactTitle: '',
  emergencyContactFirstName: '',
  emergencyContactLastName: '',
  emergencyContactRelationship: '',
  emergencyPhone: '',

  email: '',
  password: '',
  confirmPassword: '',
};

function sanitizePersonName(value: string): string {
  return value.replace(
    /[^A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E '-]/g,
    '',
  );
}

export function calculateAge(dateOfBirth: string, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return null;

  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? age : null;
}

export function validateRegistration(
  values: RegistrationForm,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.title) {
    errors.title = 'กรุณาเลือกคำนำหน้า';
  }

  if (!personNamePattern.test(values.firstName.trim())) {
    errors.firstName =
      'ชื่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ';
  }

  if (!personNamePattern.test(values.lastName.trim())) {
    errors.lastName =
      'นามสกุลใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ';
  }

  if (
    !values.dateOfBirth ||
    values.dateOfBirth >
      new Date().toISOString().slice(0, 10)
  ) {
    errors.dateOfBirth =
      'กรุณาระบุวันเกิดที่ถูกต้อง';
  }

  if (!values.gender) {
    errors.gender = 'กรุณาเลือกเพศ';
  }

  if (!['student', 'employee'].includes(values.patientType)) {
    errors.patientType = 'กรุณาเลือกประเภทผู้ป่วย';
  }

  if (values.patientType === 'student' && !/^\d{8}$/.test(values.studentId)) {
    errors.studentId =
      'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก';
  }

  if (values.patientType === 'employee' && !/^\d{8}$/.test(values.employeeId)) {
    errors.employeeId = 'รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก';
  }

  if (!/^0[689]\d{8}$/.test(values.phone)) {
    errors.phone =
      'กรุณากรอกเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
  }

  if (!values.allergyStatus) {
    errors.allergyStatus =
      'กรุณาเลือกข้อมูลประวัติแพ้ยา';
  }

  if (
    values.allergyStatus === 'yes' &&
    !values.allergies.trim()
  ) {
    errors.allergies =
      'กรุณาระบุรายละเอียดการแพ้ยา';
  }

  if (!values.chronicDiseaseStatus) {
    errors.chronicDiseaseStatus =
      'กรุณาเลือกข้อมูลโรคประจำตัว';
  }

  if (
    values.chronicDiseaseStatus === 'yes' &&
    !values.chronicDiseases.trim()
  ) {
    errors.chronicDiseases =
      'กรุณาระบุรายละเอียดโรคประจำตัว';
  }

  if (!values.emergencyContactTitle) {
    errors.emergencyContactTitle =
      'กรุณาเลือกคำนำหน้าผู้ติดต่อฉุกเฉิน';
  }

  if (
    !personNamePattern.test(
      values.emergencyContactFirstName.trim(),
    )
  ) {
    errors.emergencyContactFirstName =
      'ชื่อผู้ติดต่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ';
  }

  if (
    !personNamePattern.test(
      values.emergencyContactLastName.trim(),
    )
  ) {
    errors.emergencyContactLastName =
      'นามสกุลผู้ติดต่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ';
  }

  const patientFullName = `${values.firstName.trim()} ${values.lastName.trim()}`.toLocaleLowerCase();
  const emergencyFullName = `${values.emergencyContactFirstName.trim()} ${values.emergencyContactLastName.trim()}`.toLocaleLowerCase();
  if (patientFullName === emergencyFullName) {
    errors.emergencyContactFirstName = 'ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย';
  }

  if (!values.emergencyContactRelationship.trim()) {
    errors.emergencyContactRelationship =
      'กรุณาระบุความสัมพันธ์';
  }

  if (!/^0[689]\d{8}$/.test(values.emergencyPhone)) {
    errors.emergencyPhone =
      'กรุณากรอกเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
  } else if (values.emergencyPhone === values.phone) {
    errors.emergencyPhone = 'เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก';
  }

  if (
    !/^[^\s@]+@mail\.wu\.ac\.th$/i.test(
      values.email.trim(),
    )
  ) {
    errors.email =
      'กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น';
  }

  if (values.password.length < 8) {
    errors.password =
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword =
      'ยืนยันรหัสผ่านไม่ตรงกัน';
  }

  return errors;
}

interface RegisterPageProps {
  mode?: 'self-service' | 'staff-walk-in' | 'patient' | string;
}

export default function RegisterPage({ mode = 'self-service' }: RegisterPageProps = {}) {
  const router = useRouter();

  const [form, setForm] =
    useState<RegistrationForm>(initialForm);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [error, setError] =
    useState<string | null>(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const age = calculateAge(form.dateOfBirth);

  function updateField(
    field: FieldName,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function updateNumericField(
    field: FieldName,
    value: string,
    maxLength: number,
  ) {
    updateField(
      field,
      value.replace(/\D/g, '').slice(0, maxLength),
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    const errors = validateRegistration(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const details = {
          title: form.title as
            | 'นาย'
            | 'นาง'
            | 'นางสาว'
            | 'อื่น ๆ',

          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          dateOfBirth: form.dateOfBirth,

          gender: form.gender as
            | 'male'
            | 'female'
            | 'unspecified',

          patientType: form.patientType as 'student' | 'employee',
          studentId: form.patientType === 'student' ? form.studentId : undefined,
          employeeId: form.patientType === 'employee' ? form.employeeId : undefined,
          phone: form.phone,

          allergyStatus:
            form.allergyStatus as
              | 'yes'
              | 'no'
              | 'unknown',

          allergies:
            form.allergyStatus === 'yes'
              ? form.allergies.trim()
              : null,

          chronicDiseaseStatus:
            form.chronicDiseaseStatus as
              | 'yes'
              | 'no'
              | 'unknown',

          chronicDiseases:
            form.chronicDiseaseStatus === 'yes'
              ? form.chronicDiseases.trim()
              : null,

          emergencyContactTitle:
            form.emergencyContactTitle as
              | 'นาย'
              | 'นาง'
              | 'นางสาว'
              | 'อื่น ๆ',

          emergencyContactFirstName:
            form.emergencyContactFirstName.trim(),

          emergencyContactLastName:
            form.emergencyContactLastName.trim(),

          emergencyContactRelationship:
            form.emergencyContactRelationship.trim(),

          emergencyPhone: form.emergencyPhone,
      };

      if (mode === 'staff-walk-in') {
        const response = await fetch('/api/staff/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim().toLowerCase(),
            password: form.password,
            details,
          }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || 'สร้างบัญชีผู้ป่วยไม่สำเร็จ');
        router.push('/staff/accounts?created=true');
      } else {
        await signUp(form.email.trim().toLowerCase(), form.password, details);
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (field: FieldName) => {
    const stateClass = fieldErrors[field]
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-50'
      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-50';

    return [
      'w-full min-w-0 rounded-xl border bg-white',
      'px-4 py-3 text-sm text-slate-800',
      'outline-none transition',
      'placeholder:text-slate-400',
      'focus:ring-4',
      'disabled:cursor-not-allowed',
      'disabled:bg-slate-50',
      stateClass,
    ].join(' ');
  };

  return (
    <main className="relative left-1/2 w-screen -translate-x-1/2 bg-slate-50/70 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <UserPlus
                className="size-6"
                aria-hidden="true"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {mode === 'staff-walk-in' ? 'เพิ่มบัญชีผู้ป่วย' : 'สมัครสมาชิกผู้ป่วย'}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {mode === 'staff-walk-in'
                  ? 'สร้างบัญชีให้นักศึกษาหรือบุคลากรที่เข้ารับบริการ'
                  : 'สร้างบัญชีสำหรับเข้าใช้งาน WU Clinic'}
              </p>
            </div>
          </div>

          {mode === 'self-service' && <p className="text-sm text-slate-500">
            มีบัญชีแล้ว?{' '}
            <Link
              href="/login"
              className="font-semibold text-teal-700 hover:underline"
            >
              เข้าสู่ระบบ
            </Link>
          </p>}
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {error && (
            <p
              role="alert"
              className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          {/* ข้อมูลส่วนตัว */}
          <FormSection
            number="1"
            title="ข้อมูลส่วนตัว"
            description="ใช้สำหรับยืนยันตัวตนและข้อมูลผู้ป่วย"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                id="title"
                label="คำนำหน้า"
                error={fieldErrors.title}
              >
                <select
                  id="title"
                  required
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      'title',
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClass('title')}
                >
                  <option value="">เลือก</option>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">
                    นางสาว
                  </option>
                  <option value="อื่น ๆ">
                    อื่น ๆ
                  </option>
                </select>
              </Field>

              <Field
                id="first-name"
                label="ชื่อ"
                error={fieldErrors.firstName}
                help="ใช้เฉพาะตัวอักษรไทยหรืออังกฤษ"
              >
                <input
                  id="first-name"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) =>
                    updateField(
                      'firstName',
                      sanitizePersonName(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="เช่น สมชาย"
                  disabled={isSubmitting}
                  className={inputClass('firstName')}
                />
              </Field>

              <Field
                id="last-name"
                label="นามสกุล"
                error={fieldErrors.lastName}
                help="ใช้เฉพาะตัวอักษรไทยหรืออังกฤษ"
              >
                <input
                  id="last-name"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) =>
                    updateField(
                      'lastName',
                      sanitizePersonName(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="เช่น ใจดี"
                  disabled={isSubmitting}
                  className={inputClass('lastName')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field
                id="date-of-birth"
                label="วันเดือนปีเกิด"
                error={fieldErrors.dateOfBirth}
              >
                <input
                  id="date-of-birth"
                  type="date"
                  required
                  max={new Date()
                    .toISOString()
                    .slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    updateField(
                      'dateOfBirth',
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClass(
                    'dateOfBirth',
                  )}
                />
              </Field>

              <Field id="age" label="อายุ" help="คำนวณอัตโนมัติจากวันเกิด">
                <input
                  id="age"
                  type="text"
                  value={age === null ? '' : `${age} ปี`}
                  placeholder="เลือกวันเกิดก่อน"
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </Field>

              <Field
                id="gender"
                label="เพศ"
                error={fieldErrors.gender}
              >
                <select
                  id="gender"
                  required
                  value={form.gender}
                  onChange={(event) =>
                    updateField(
                      'gender',
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClass('gender')}
                >
                  <option value="">เลือกเพศ</option>
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                  <option value="unspecified">
                    ไม่ระบุ
                  </option>
                </select>
              </Field>

              <Field
                id="patient-type"
                label="ประเภทผู้ป่วย"
                error={fieldErrors.patientType}
              >
                <select
                  id="patient-type"
                  required
                  value={form.patientType}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateField('patientType', value);
                    updateField('studentId', '');
                    updateField('employeeId', '');
                  }}
                  disabled={isSubmitting}
                  className={inputClass('patientType')}
                >
                  <option value="student">นักศึกษา</option>
                  <option value="employee">บุคลากร</option>
                </select>
              </Field>

              <Field
                id="patient-id"
                label={form.patientType === 'student' ? 'รหัสนักศึกษา' : 'รหัสบุคลากร'}
                error={form.patientType === 'student' ? fieldErrors.studentId : fieldErrors.employeeId}
                help={`${form.patientType === 'student' ? form.studentId.length : form.employeeId.length}/8 หลัก`}
              >
                <input
                  id="patient-id"
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={8}
                  value={form.patientType === 'student' ? form.studentId : form.employeeId}
                  onChange={(event) =>
                    updateNumericField(
                      form.patientType === 'student' ? 'studentId' : 'employeeId',
                      event.target.value,
                      8,
                    )
                  }
                  placeholder={form.patientType === 'student' ? '67116004' : '12345678'}
                  disabled={isSubmitting}
                  className={inputClass(form.patientType === 'student' ? 'studentId' : 'employeeId')}
                />
              </Field>

              <Field
                id="phone"
                label="เบอร์โทรศัพท์"
                error={fieldErrors.phone}
                help="ตัวเลข 10 หลัก ไม่ต้องใส่ขีด"
              >
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) =>
                    updateNumericField(
                      'phone',
                      event.target.value,
                      10,
                    )
                  }
                  placeholder="0812345678"
                  disabled={isSubmitting}
                  className={inputClass('phone')}
                />
              </Field>
            </div>

          </FormSection>

          {/* ข้อมูลสุขภาพ */}
          <FormSection
            number="2"
            title="ข้อมูลสุขภาพ"
            description="ข้อมูลเบื้องต้นสำหรับการดูแลรักษา"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="allergy-status"
                label="ประวัติแพ้ยา"
                error={fieldErrors.allergyStatus}
              >
                <select
                  id="allergy-status"
                  required
                  value={form.allergyStatus}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    updateField(
                      'allergyStatus',
                      value,
                    );

                    if (value !== 'yes') {
                      updateField('allergies', '');
                    }
                  }}
                  disabled={isSubmitting}
                  className={inputClass(
                    'allergyStatus',
                  )}
                >
                  <option value="">
                    เลือกข้อมูล
                  </option>
                  <option value="no">ไม่มี</option>
                  <option value="yes">
                    มีประวัติแพ้ยา
                  </option>
                  <option value="unknown">
                    ไม่ทราบ
                  </option>
                </select>
              </Field>

              <Field
                id="chronic-disease-status"
                label="โรคประจำตัว"
                error={
                  fieldErrors.chronicDiseaseStatus
                }
              >
                <select
                  id="chronic-disease-status"
                  required
                  value={form.chronicDiseaseStatus}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    updateField(
                      'chronicDiseaseStatus',
                      value,
                    );

                    if (value !== 'yes') {
                      updateField(
                        'chronicDiseases',
                        '',
                      );
                    }
                  }}
                  disabled={isSubmitting}
                  className={inputClass(
                    'chronicDiseaseStatus',
                  )}
                >
                  <option value="">
                    เลือกข้อมูล
                  </option>
                  <option value="no">ไม่มี</option>
                  <option value="yes">
                    มีโรคประจำตัว
                  </option>
                  <option value="unknown">
                    ไม่ทราบ
                  </option>
                </select>
              </Field>

              {form.allergyStatus === 'yes' && (
                <Field
                  id="allergies"
                  label="รายละเอียดการแพ้ยา"
                  error={fieldErrors.allergies}
                >
                  <textarea
                    id="allergies"
                    required
                    rows={3}
                    value={form.allergies}
                    onChange={(event) =>
                      updateField(
                        'allergies',
                        event.target.value,
                      )
                    }
                    placeholder="เช่น แพ้ยา Penicillin มีอาการผื่นขึ้น"
                    disabled={isSubmitting}
                    className={inputClass(
                      'allergies',
                    )}
                  />
                </Field>
              )}

              {form.chronicDiseaseStatus ===
                'yes' && (
                <Field
                  id="chronic-diseases"
                  label="รายละเอียดโรคประจำตัว"
                  error={
                    fieldErrors.chronicDiseases
                  }
                >
                  <textarea
                    id="chronic-diseases"
                    required
                    rows={3}
                    value={form.chronicDiseases}
                    onChange={(event) =>
                      updateField(
                        'chronicDiseases',
                        event.target.value,
                      )
                    }
                    placeholder="เช่น หอบหืด ความดันโลหิตสูง"
                    disabled={isSubmitting}
                    className={inputClass(
                      'chronicDiseases',
                    )}
                  />
                </Field>
              )}
            </div>
          </FormSection>

          {/* ผู้ติดต่อฉุกเฉิน */}
          <FormSection
            number="3"
            title="ผู้ติดต่อฉุกเฉิน"
            description="บุคคลที่สามารถติดต่อได้ในกรณีฉุกเฉิน"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                id="emergency-contact-title"
                label="คำนำหน้า"
                error={
                  fieldErrors.emergencyContactTitle
                }
              >
                <select
                  id="emergency-contact-title"
                  required
                  value={
                    form.emergencyContactTitle
                  }
                  onChange={(event) =>
                    updateField(
                      'emergencyContactTitle',
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactTitle',
                  )}
                >
                  <option value="">เลือก</option>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">
                    นางสาว
                  </option>
                  <option value="อื่น ๆ">
                    อื่น ๆ
                  </option>
                </select>
              </Field>

              <Field
                id="emergency-contact-first-name"
                label="ชื่อ"
                error={
                  fieldErrors.emergencyContactFirstName
                }
                help="ใช้เฉพาะตัวอักษรไทยหรืออังกฤษ"
              >
                <input
                  id="emergency-contact-first-name"
                  type="text"
                  required
                  value={
                    form.emergencyContactFirstName
                  }
                  onChange={(event) =>
                    updateField(
                      'emergencyContactFirstName',
                      sanitizePersonName(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="เช่น สมหมาย"
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactFirstName',
                  )}
                />
              </Field>

              <Field
                id="emergency-contact-last-name"
                label="นามสกุล"
                error={
                  fieldErrors.emergencyContactLastName
                }
                help="ใช้เฉพาะตัวอักษรไทยหรืออังกฤษ"
              >
                <input
                  id="emergency-contact-last-name"
                  type="text"
                  required
                  value={
                    form.emergencyContactLastName
                  }
                  onChange={(event) =>
                    updateField(
                      'emergencyContactLastName',
                      sanitizePersonName(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="เช่น ใจดี"
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactLastName',
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="emergency-relationship"
                label="ความสัมพันธ์"
                error={
                  fieldErrors.emergencyContactRelationship
                }
                help="เช่น บิดา มารดา ญาติ หรือเพื่อน"
              >
                <input
                  id="emergency-relationship"
                  type="text"
                  required
                  value={
                    form.emergencyContactRelationship
                  }
                  onChange={(event) =>
                    updateField(
                      'emergencyContactRelationship',
                      event.target.value,
                    )
                  }
                  placeholder="เช่น บิดา มารดา ญาติ เพื่อน"
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactRelationship',
                  )}
                />
              </Field>

              <Field
                id="emergency-phone"
                label="เบอร์โทรฉุกเฉิน"
                error={fieldErrors.emergencyPhone}
                help="ตัวเลข 10 หลัก ไม่ต้องใส่ขีด"
              >
                <input
                  id="emergency-phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={form.emergencyPhone}
                  onChange={(event) =>
                    updateNumericField(
                      'emergencyPhone',
                      event.target.value,
                      10,
                    )
                  }
                  placeholder="0891234567"
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyPhone',
                  )}
                />
              </Field>
            </div>
          </FormSection>

          {/* ข้อมูลเข้าสู่ระบบ */}
          <FormSection
            number="4"
            title="ข้อมูลเข้าสู่ระบบ"
            description="ใช้อีเมลมหาวิทยาลัยในการเข้าสู่ระบบ"
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Field
                id="register-email"
                label="อีเมลมหาวิทยาลัย"
                error={fieldErrors.email}
                help="รองรับเฉพาะ @mail.wu.ac.th"
              >
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      'email',
                      event.target.value.replace(
                        /\s/g,
                        '',
                      ),
                    )
                  }
                  placeholder="example@mail.wu.ac.th"
                  disabled={isSubmitting}
                  className={inputClass('email')}
                />
              </Field>

              <Field
                id="register-password"
                label="รหัสผ่าน"
                error={fieldErrors.password}
                help="อย่างน้อย 8 ตัวอักษร"
              >
                <div className="relative">
                  <input
                    id="register-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        'password',
                        event.target.value,
                      )
                    }
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    disabled={isSubmitting}
                    className={`${inputClass(
                      'password',
                    )} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? 'ซ่อนรหัสผ่าน'
                        : 'แสดงรหัสผ่าน'
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-teal-600"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </Field>

              <Field
                id="confirm-password"
                label="ยืนยันรหัสผ่าน"
                error={fieldErrors.confirmPassword}
                help="ต้องตรงกับรหัสผ่าน"
              >
                <input
                  id="confirm-password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField(
                      'confirmPassword',
                      event.target.value,
                    )
                  }
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  disabled={isSubmitting}
                  className={inputClass(
                    'confirmPassword',
                  )}
                />
                {form.confirmPassword && !fieldErrors.confirmPassword && (
                  <p role="status" className={`mt-2 text-xs font-medium ${form.confirmPassword === form.password ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {form.confirmPassword === form.password ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน'}
                  </p>
                )}
              </Field>
            </div>
          </FormSection>

          <footer className="flex flex-col gap-4 bg-slate-50 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs leading-5 text-slate-500">
              <CheckCircle2
                className="mr-2 inline size-4 text-teal-600"
                aria-hidden="true"
              />
              บัญชีที่สมัครจะได้รับสิทธิ์ผู้ป่วย
              และไม่สามารถเปลี่ยนบทบาทเองได้
            </p>

            <button
              type="submit"
              disabled={isSubmitting || (form.confirmPassword.length > 0 && form.confirmPassword !== form.password)}
              className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/15 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}

              {isSubmitting
                ? mode === 'staff-walk-in' ? 'กำลังสร้างบัญชี...' : 'กำลังสมัครสมาชิก...'
                : mode === 'staff-walk-in' ? 'สร้างบัญชีผู้ป่วย' : 'สมัครสมาชิก'}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 px-5 py-7 last:border-b-0 sm:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold text-teal-700">
          ส่วนที่ {number}
        </p>

        <h2 className="mt-1 text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </header>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}{' '}
        <span className="text-rose-500">*</span>
      </label>

      {children}

      <p
        className={`mt-1.5 min-h-4 text-xs ${
          error
            ? 'text-rose-600'
            : 'text-slate-400'
        }`}
      >
        {error || help || '\u00a0'}
      </p>
    </div>
  );
}
