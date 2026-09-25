'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CalendarDays,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { signOut, signUp } from '@/services/authService';
import { useLocale } from '@/context/LocaleContext';

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

const birthMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

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
    errors.title = 'เลือกคำนำหน้า';
  }

  if (!personNamePattern.test(values.firstName.trim())) {
    errors.firstName =
      'ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น';
  }

  if (!personNamePattern.test(values.lastName.trim())) {
    errors.lastName =
      'ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น';
  }

  if (
    !values.dateOfBirth ||
    values.dateOfBirth >
      new Date().toISOString().slice(0, 10)
  ) {
    errors.dateOfBirth =
      'ระบุวันเกิดให้ถูกต้อง';
  }

  if (!values.gender) {
    errors.gender = 'เลือกเพศ';
  }

  if (!['student', 'employee'].includes(values.patientType)) {
    errors.patientType = 'เลือกประเภทผู้ป่วย';
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
      'กรอกเบอร์มือถือไทย 10 หลัก โดยขึ้นต้นด้วย 06, 08 หรือ 09';
  }

  if (!values.allergyStatus) {
    errors.allergyStatus =
      'เลือกสถานะการแพ้ยา';
  }

  if (
    values.allergyStatus === 'yes' &&
    !values.allergies.trim()
  ) {
    errors.allergies =
      'ระบุรายละเอียดการแพ้ยา';
  }

  if (!values.chronicDiseaseStatus) {
    errors.chronicDiseaseStatus =
      'เลือกสถานะโรคประจำตัว';
  }

  if (
    values.chronicDiseaseStatus === 'yes' &&
    !values.chronicDiseases.trim()
  ) {
    errors.chronicDiseases =
      'ระบุรายละเอียดโรคประจำตัว';
  }

  if (!values.emergencyContactTitle) {
    errors.emergencyContactTitle =
      'เลือกคำนำหน้าผู้ติดต่อฉุกเฉิน';
  }

  if (
    !personNamePattern.test(
      values.emergencyContactFirstName.trim(),
    )
  ) {
    errors.emergencyContactFirstName =
      'ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น';
  }

  if (
    !personNamePattern.test(
      values.emergencyContactLastName.trim(),
    )
  ) {
    errors.emergencyContactLastName =
      'ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น';
  }

  const patientFullName = `${values.firstName.trim()} ${values.lastName.trim()}`.toLocaleLowerCase();
  const emergencyFullName = `${values.emergencyContactFirstName.trim()} ${values.emergencyContactLastName.trim()}`.toLocaleLowerCase();
  if (patientFullName === emergencyFullName) {
    errors.emergencyContactFirstName = 'ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย';
  }

  if (!values.emergencyContactRelationship.trim()) {
    errors.emergencyContactRelationship =
      'ระบุความสัมพันธ์กับผู้ป่วย';
  }

  if (!/^0[689]\d{8}$/.test(values.emergencyPhone)) {
    errors.emergencyPhone =
      'กรอกเบอร์มือถือไทย 10 หลัก โดยขึ้นต้นด้วย 06, 08 หรือ 09';
  } else if (values.emergencyPhone === values.phone) {
    errors.emergencyPhone = 'เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก';
  }

  if (
    !/^[^\s@]+@mail\.wu\.ac\.th$/i.test(
      values.email.trim(),
    )
  ) {
    errors.email =
      'ใช้อีเมล @mail.wu.ac.th เท่านั้น';
  }

  if (!/^(?=\S{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(values.password)) {
    errors.password =
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword =
      'รหัสผ่านไม่ตรงกัน';
  }

  return errors;
}

interface RegisterPageProps {
  mode?: 'self-service' | 'staff-walk-in' | 'patient' | string;
  embedded?: boolean;
}

export default function RegisterPage({ mode = 'self-service', embedded = false }: RegisterPageProps = {}) {
  const router = useRouter();
  const { text } = useLocale();

  const [form, setForm] =
    useState<RegistrationForm>(initialForm);

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
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
    setSuccess(null);

    const englishErrors: Record<string, string> = {
      'เลือกคำนำหน้า': 'Select a title.', 'ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น': 'Use Thai or English letters only.',
      'ระบุวันเกิดให้ถูกต้อง': 'Enter a valid date of birth.', 'เลือกเพศ': 'Select a gender.', 'เลือกประเภทผู้ป่วย': 'Select a patient type.',
      'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก': 'Student ID must contain 8 digits.', 'รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก': 'Staff ID must contain 8 digits.',
      'กรอกเบอร์มือถือไทย 10 หลัก โดยขึ้นต้นด้วย 06, 08 หรือ 09': 'Enter a 10-digit Thai mobile number beginning with 06, 08, or 09.',
      'เลือกสถานะการแพ้ยา': 'Select an allergy status.', 'ระบุรายละเอียดการแพ้ยา': 'Describe the medication allergy.',
      'เลือกสถานะโรคประจำตัว': 'Select a chronic condition status.', 'ระบุรายละเอียดโรคประจำตัว': 'Describe the chronic condition.',
      'เลือกคำนำหน้าผู้ติดต่อฉุกเฉิน': 'Select a title for the emergency contact.', 'ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย': 'The emergency contact must be a different person from the patient.',
      'ระบุความสัมพันธ์กับผู้ป่วย': 'Enter the emergency contact’s relationship to the patient.', 'เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก': 'The emergency number must differ from the patient’s phone number.',
      'ใช้อีเมล @mail.wu.ac.th เท่านั้น': 'Use an @mail.wu.ac.th email address.',
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข': 'Use at least 8 characters, including uppercase and lowercase letters and a number.',
      'รหัสผ่านไม่ตรงกัน': 'Passwords do not match.',
    };
    const validationErrors = validateRegistration(form);
    const errors = Object.fromEntries(Object.entries(validationErrors).map(([field, message]) => [field, text(message, englishErrors[message] ?? message)])) as FieldErrors;
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
        if (!response.ok) throw new Error(result.error || 'เพิ่มบัญชีผู้ป่วยไม่สำเร็จ ลองใหม่');
        router.push('/staff/accounts?created=true');
      } else {
        await signUp(form.email.trim().toLowerCase(), form.password, details);
        await signOut();
        setSuccess(text('สมัครสมาชิกสำเร็จแล้ว กำลังไปหน้าเข้าสู่ระบบ', 'Registration complete. Redirecting to sign in…'));
        setIsSubmitting(false);
        await new Promise((resolve) => setTimeout(resolve, 700));
        router.replace('/login?registered=true');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'staff-walk-in'
            ? 'เพิ่มบัญชีผู้ป่วยไม่สำเร็จ ลองใหม่'
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
    <main className={embedded ? 'w-full' : 'relative left-1/2 w-screen -translate-x-1/2 bg-slate-50/70 py-8 sm:py-12'}>
      {(isSubmitting || success) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="assertive">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            {success ? <CheckCircle2 className="mx-auto size-16 text-emerald-500" aria-hidden="true" /> : <Loader2 className="mx-auto size-14 animate-spin text-teal-600" aria-hidden="true" />}
            <h2 className="mt-5 text-xl font-bold text-slate-900">{success || (mode === 'staff-walk-in' ? text('กำลังสร้างบัญชีผู้ป่วย…', 'Creating patient account…') : text('กำลังสมัครสมาชิก…', 'Creating your account…'))}</h2>
            <p className="mt-2 text-sm text-slate-500">{success ? text('ระบบบันทึกข้อมูลเรียบร้อยแล้ว', 'Your information has been saved.') : text('กรุณารอสักครู่และอย่าปิดหน้านี้', 'Please wait and keep this page open.')}</p>
            {success && mode === 'staff-walk-in' && <button type="button" onClick={() => setSuccess(null)} className="mt-6 w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700">{text('ตกลง', 'OK')}</button>}
          </div>
        </div>
      )}
      <div className={embedded ? 'w-full' : 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'}>
        {!embedded && <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <UserPlus
                className="size-6"
                aria-hidden="true"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {mode === 'staff-walk-in' ? text('เพิ่มบัญชีผู้ป่วย', 'Add patient account') : text('สมัครสมาชิกผู้ป่วย', 'Patient registration')}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {mode === 'staff-walk-in'
                  ? text('เพิ่มบัญชีผู้ป่วยสำหรับนักศึกษาหรือบุคลากรที่เข้ารับบริการ', 'Create an account for a student or staff member receiving care.')
                  : text('สร้างบัญชีเพื่อใช้งาน WU Clinic', 'Create an account to use WU Clinic.')}
              </p>
            </div>
          </div>

          {mode === 'self-service' && <p className="text-sm text-slate-500">
            {text('มีบัญชีแล้ว?', 'Already have an account?')}{' '}
            <Link
              href="/login"
              className="font-semibold text-teal-700 hover:underline"
            >
              {text('เข้าสู่ระบบ', 'Sign in')}
            </Link>
          </p>}
        </header>}

        <form
          onSubmit={handleSubmit}
          noValidate
          className={embedded ? 'overflow-hidden bg-white' : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'}
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
            title={text('ข้อมูลส่วนตัว', 'Personal information')}
            description={text('ใช้ยืนยันตัวตนและบันทึกข้อมูลผู้ป่วย', 'Used to verify your identity and create your patient record.')}
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                id="title"
                label={text('คำนำหน้า', 'Title')}
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
                  <option value="">{text('เลือก', 'Select')}</option>
                  <option value="นาย">{text('นาย', 'Mr.')}</option>
                  <option value="นาง">{text('นาง', 'Mrs.')}</option>
                  <option value="นางสาว">{text('นางสาว', 'Ms.')}</option>
                  <option value="อื่น ๆ">{text('อื่น ๆ', 'Other')}</option>
                </select>
              </Field>

              <Field
                id="first-name"
                label={text('ชื่อ', 'First name')}
                error={fieldErrors.firstName}
                help={text('ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น', 'Use Thai or English letters only.')}
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
                  placeholder={text('เช่น สมชาย', 'e.g., Somchai')}
                  disabled={isSubmitting}
                  className={inputClass('firstName')}
                />
              </Field>

              <Field
                id="last-name"
                label={text('นามสกุล', 'Last name')}
                error={fieldErrors.lastName}
                help={text('ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น', 'Use Thai or English letters only.')}
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
                  placeholder={text('เช่น ใจดี', 'e.g., Jaidee')}
                  disabled={isSubmitting}
                  className={inputClass('lastName')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field
                id="date-of-birth"
                label={text('วันเดือนปีเกิด', 'Date of birth')}
                error={fieldErrors.dateOfBirth}
              >
                <EasyDatePicker
                  id="date-of-birth"
                  value={form.dateOfBirth}
                  onChange={(value) => updateField('dateOfBirth', value)}
                  disabled={isSubmitting}
                  hasError={Boolean(fieldErrors.dateOfBirth)}
                />
              </Field>

              <Field id="age" label={text('อายุ', 'Age')} help={text('คำนวณจากวันเกิดอัตโนมัติ', 'Calculated automatically from your date of birth.') }>
                <input
                  id="age"
                  type="text"
                  value={age === null ? '' : `${age} ${text('ปี', 'years')}`}
                  placeholder={text('เลือกวันเกิดเพื่อคำนวณอายุ', 'Select your date of birth to calculate your age.')}
                  readOnly
                  aria-readonly="true"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </Field>

              <Field
                id="gender"
                label={text('เพศ', 'Gender')}
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
                  <option value="">{text('เลือกเพศ', 'Select gender')}</option>
                  <option value="male">{text('ชาย', 'Male')}</option>
                  <option value="female">{text('หญิง', 'Female')}</option>
                  <option value="unspecified">{text('ไม่ระบุ', 'Prefer not to say')}</option>
                </select>
              </Field>

              <Field
                id="patient-type"
                label={text('ประเภทผู้ป่วย', 'Patient type')}
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
                  <option value="student">{text('นักศึกษา', 'Student')}</option>
                  <option value="employee">{text('บุคลากร', 'Staff')}</option>
                </select>
              </Field>

              <Field
                id="patient-id"
                label={form.patientType === 'student' ? text('รหัสนักศึกษา', 'Student ID') : text('รหัสบุคลากร', 'Staff ID')}
                error={form.patientType === 'student' ? fieldErrors.studentId : fieldErrors.employeeId}
                help={`${form.patientType === 'student' ? form.studentId.length : form.employeeId.length}/8 ${text('หลัก', 'digits')}`}
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
                label={text('เบอร์โทรศัพท์', 'Phone number')}
                error={fieldErrors.phone}
                help={text('กรอกตัวเลข 10 หลัก ไม่ต้องใส่ขีด', 'Enter 10 digits without hyphens.')}
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
            title={text('ข้อมูลสุขภาพ', 'Health information')}
            description={text('ข้อมูลเบื้องต้นสำหรับการรักษา', 'Basic information to support your care.')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="allergy-status"
                label={text('ประวัติแพ้ยา', 'Medication allergies')}
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
                    {text('เลือกสถานะ', 'Select status')}
                  </option>
                  <option value="no">{text('ไม่มี', 'No')}</option>
                  <option value="yes">
                    {text('มีประวัติแพ้ยา', 'I have medication allergies')}
                  </option>
                  <option value="unknown">
                    {text('ไม่ทราบ', 'Unknown')}
                  </option>
                </select>
              </Field>

              <Field
                id="chronic-disease-status"
                label={text('โรคประจำตัว', 'Chronic conditions')}
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
                    {text('เลือกสถานะ', 'Select status')}
                  </option>
                  <option value="no">{text('ไม่มี', 'No')}</option>
                  <option value="yes">
                    {text('มีโรคประจำตัว', 'I have a chronic condition')}
                  </option>
                  <option value="unknown">
                    {text('ไม่ทราบ', 'Unknown')}
                  </option>
                </select>
              </Field>

              {form.allergyStatus === 'yes' && (
                <Field
                  id="allergies"
                  label={text('รายละเอียดการแพ้ยา', 'Allergy details')}
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
                    placeholder={text('เช่น แพ้ยา Penicillin มีอาการผื่นขึ้น', 'e.g., Penicillin allergy causing a rash')}
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
                  label={text('รายละเอียดโรคประจำตัว', 'Condition details')}
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
                    placeholder={text('เช่น หอบหืด ความดันโลหิตสูง', 'e.g., Asthma or high blood pressure')}
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
            title={text('ผู้ติดต่อฉุกเฉิน', 'Emergency contact')}
            description={text('บุคคลที่ติดต่อได้เมื่อเกิดเหตุฉุกเฉิน', 'Someone we can contact in an emergency.')}
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                id="emergency-contact-title"
                label={text('คำนำหน้า', 'Title')}
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
                  <option value="">{text('เลือก', 'Select')}</option>
                  <option value="นาย">{text('นาย', 'Mr.')}</option>
                  <option value="นาง">{text('นาง', 'Mrs.')}</option>
                  <option value="นางสาว">{text('นางสาว', 'Ms.')}</option>
                  <option value="อื่น ๆ">{text('อื่น ๆ', 'Other')}</option>
                </select>
              </Field>

              <Field
                id="emergency-contact-first-name"
                label={text('ชื่อ', 'First name')}
                error={
                  fieldErrors.emergencyContactFirstName
                }
                help={text('ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น', 'Use Thai or English letters only.')}
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
                  placeholder={text('เช่น สมหมาย', 'e.g., Sommai')}
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactFirstName',
                  )}
                />
              </Field>

              <Field
                id="emergency-contact-last-name"
                label={text('นามสกุล', 'Last name')}
                error={
                  fieldErrors.emergencyContactLastName
                }
                help={text('ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น', 'Use Thai or English letters only.')}
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
                  placeholder={text('เช่น ใจดี', 'e.g., Jaidee')}
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
                label={text('ความสัมพันธ์', 'Relationship')}
                error={
                  fieldErrors.emergencyContactRelationship
                }
                help={text('ระบุความสัมพันธ์กับผู้ป่วย', 'How are they related to you?')}
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
                  placeholder={text('เช่น บิดา มารดา ญาติ เพื่อน', 'e.g., Parent, relative, or friend')}
                  disabled={isSubmitting}
                  className={inputClass(
                    'emergencyContactRelationship',
                  )}
                />
              </Field>

              <Field
                id="emergency-phone"
                label={text('เบอร์โทรฉุกเฉิน', 'Emergency phone number')}
                error={fieldErrors.emergencyPhone}
                help={text('กรอกตัวเลข 10 หลัก ไม่ต้องใส่ขีด', 'Enter 10 digits without hyphens.')}
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
            title={text('ข้อมูลเข้าสู่ระบบ', 'Sign-in details')}
            description={text('ใช้เข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย', 'Use your university email address to sign in.')}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Field
                id="register-email"
                label={text('อีเมลมหาวิทยาลัย', 'University email')}
                error={fieldErrors.email}
                help={text('ใช้เฉพาะ @mail.wu.ac.th', 'Use an @mail.wu.ac.th address.')}
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
                label={text('รหัสผ่าน', 'Password')}
                error={fieldErrors.password}
                help={text('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters.')}
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
                    placeholder={text('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters')}
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
                        ? text('ซ่อนรหัสผ่าน', 'Hide password')
                        : text('แสดงรหัสผ่าน', 'Show password')
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
                label={text('ยืนยันรหัสผ่าน', 'Confirm password')}
                error={fieldErrors.confirmPassword}
                help={text('กรอกรหัสผ่านเดิมอีกครั้ง', 'Enter your password again.')}
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
                  placeholder={text('กรอกรหัสผ่านอีกครั้ง', 'Enter your password again')}
                  disabled={isSubmitting}
                  className={inputClass(
                    'confirmPassword',
                  )}
                />
                {form.confirmPassword && !fieldErrors.confirmPassword && (
                  <p role="status" className={`mt-2 text-xs font-medium ${form.confirmPassword === form.password ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {form.confirmPassword === form.password ? text('รหัสผ่านตรงกัน', 'Passwords match') : text('รหัสผ่านไม่ตรงกัน', 'Passwords do not match')}
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
              {text('บัญชีนี้จะได้รับบทบาทผู้ป่วย และผู้ใช้จะเปลี่ยนบทบาทเองไม่ได้', 'This account will have the patient role. Users cannot change their own role.')}
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
                ? mode === 'staff-walk-in' ? text('กำลังสร้างบัญชี…', 'Creating account…') : text('กำลังสมัครสมาชิก…', 'Registering…')
                : mode === 'staff-walk-in' ? text('สร้างบัญชีผู้ป่วย', 'Create patient account') : text('สมัครสมาชิก', 'Register')}
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
  const { text } = useLocale();
  return (
    <section className="border-b border-slate-200 px-5 py-7 last:border-b-0 sm:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold text-teal-700">
          {text('ส่วนที่', 'SECTION')} {number}
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

function EasyDatePicker({
  id, value, onChange, disabled, hasError,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const { locale, text } = useLocale();
  const today = new Date();
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [year, setYear] = useState(selected?.getFullYear() ?? today.getFullYear() - 20);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const formattedValue = selected
    ? selected.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  function chooseDay(day: number) {
    const picked = new Date(year, month, day);
    if (picked > today) return;
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        aria-label={text('วันเดือนปีเกิด', 'Date of birth')}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm outline-none transition focus:ring-2 focus:ring-teal-500/20 ${
          hasError ? 'border-red-400' : 'border-slate-200 focus:border-teal-600'
        }`}
      >
        <span className={formattedValue ? 'text-slate-900' : 'text-slate-400'}>
          {formattedValue || text('เลือกวันเกิด', 'Choose date of birth')}
        </span>
        <CalendarDays className="h-5 w-5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="mb-4 grid grid-cols-[1.4fr_1fr] gap-2">
            <select
              aria-label={text('เลือกเดือนเกิด', 'Select birth month')}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
            >
              {(locale === 'th' ? birthMonths : Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2020, index, 1)))).map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
            <input
              aria-label={text('กรอกปีเกิด ค.ศ.', 'Enter birth year (AD)')}
              type="number"
              min={1900}
              max={today.getFullYear()}
              value={year}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                if (nextYear >= 1900 && nextYear <= today.getFullYear()) setYear(nextYear);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600"
            />
          </div>
          <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-slate-500">
            {(locale === 'th' ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
              const date = new Date(year, month, day);
              const isFuture = date > today;
              const isSelected = selected?.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  aria-label={`${text('เลือกวันที่', 'Select date')} ${day}`}
                  disabled={isFuture}
                  onClick={() => chooseDay(day)}
                  className={`aspect-square rounded-lg text-sm transition ${
                    isSelected ? 'bg-teal-600 font-semibold text-white' :
                    isFuture ? 'cursor-not-allowed text-slate-300' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >{day}</button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">{locale === 'th' ? `พ.ศ. ${year + 543} (ค.ศ. ${year})` : `Year ${year} AD`}</p>
        </div>
      )}
    </div>
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
