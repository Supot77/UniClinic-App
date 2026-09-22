import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import RegisterPage, {
  calculateAge,
  validateRegistration,
} from '@/app/(auth)/register/page';
import * as authService from '@/services/authService';

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/services/authService', () => ({
  signUp: vi.fn(),
}));

const validForm = {
  title: 'นาย',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  dateOfBirth: '2004-01-15',
  gender: 'male',
  patientType: 'student',
  studentId: '67116004',
  employeeId: '',
  phone: '0812345678',

  allergyStatus: 'no',
  allergies: '',
  chronicDiseaseStatus: 'no',
  chronicDiseases: '',

  emergencyContactTitle: 'นาง',
  emergencyContactFirstName: 'สมหญิง',
  emergencyContactLastName: 'ใจดี',
  emergencyContactRelationship: 'มารดา',
  emergencyPhone: '0891234567',

  email: 'student@mail.wu.ac.th',
  password: 'password123',
  confirmPassword: 'password123',
};

describe('registration validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid registration information', () => {
    const errors = validateRegistration({
      title: '',
      firstName: 'สมชาย123',
      lastName: 'ใจดี456',
      dateOfBirth: '',
      gender: '',
      patientType: '',
      studentId: '1234ABCD',
      employeeId: '',
      phone: '08123',

      allergyStatus: '',
      allergies: '',
      chronicDiseaseStatus: '',
      chronicDiseases: '',

      emergencyContactTitle: '',
      emergencyContactFirstName: 'มารดา123',
      emergencyContactLastName: 'ใจดี456',
      emergencyContactRelationship: '',
      emergencyPhone: '08912',

      email: 'student@wu.ac.th',
      password: '1234567',
      confirmPassword: 'different',
    });

    expect(errors).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        dateOfBirth: expect.any(String),
        gender: expect.any(String),
        patientType: expect.any(String),
        phone: expect.any(String),

        allergyStatus: expect.any(String),
        chronicDiseaseStatus: expect.any(String),

        emergencyContactTitle:
          expect.any(String),
        emergencyContactFirstName:
          expect.any(String),
        emergencyContactLastName:
          expect.any(String),
        emergencyContactRelationship:
          expect.any(String),
        emergencyPhone: expect.any(String),

        email: expect.any(String),
        password: expect.any(String),
        confirmPassword: expect.any(String),
      }),
    );
  });

  it('requires details when allergy or chronic disease is selected', () => {
    const errors = validateRegistration({
      ...validForm,
      allergyStatus: 'yes',
      allergies: '',
      chronicDiseaseStatus: 'yes',
      chronicDiseases: '',
    });

    expect(errors).toEqual(
      expect.objectContaining({
        allergies:
          'ระบุรายละเอียดการแพ้ยา',
        chronicDiseases:
          'ระบุรายละเอียดโรคประจำตัว',
      }),
    );
  });

  it('keeps IDs and phone numbers numeric with required lengths', () => {
    render(<RegisterPage />);

    fireEvent.change(
      screen.getByLabelText(/รหัสนักศึกษา/),
      {
        target: {
          value: '67A11600499',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^เบอร์โทรศัพท์/),
      {
        target: {
          value: '08X123456789',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^เบอร์โทรฉุกเฉิน/),
      {
        target: {
          value: '08X912345678',
        },
      },
    );

    expect(
      screen.getByLabelText(/รหัสนักศึกษา/),
    ).toHaveValue('67116004');

    expect(
      screen.getByLabelText(/^เบอร์โทรศัพท์/),
    ).toHaveValue('0812345678');

    expect(
      screen.getByLabelText(/^เบอร์โทรฉุกเฉิน/),
    ).toHaveValue('0891234567');
  });

  it('prevents numbers in patient and emergency contact names', () => {
    render(<RegisterPage />);

    const firstNameInputs =
      screen.getAllByLabelText(/^ชื่อ /);

    const lastNameInputs =
      screen.getAllByLabelText(/^นามสกุล /);

    fireEvent.change(firstNameInputs[0], {
      target: {
        value: 'สมชาย123',
      },
    });

    fireEvent.change(lastNameInputs[0], {
      target: {
        value: 'ใจดี456',
      },
    });

    fireEvent.change(firstNameInputs[1], {
      target: {
        value: 'สมหญิง789',
      },
    });

    fireEvent.change(lastNameInputs[1], {
      target: {
        value: 'สุขดี012',
      },
    });

    expect(firstNameInputs[0]).toHaveValue(
      'สมชาย',
    );

    expect(lastNameInputs[0]).toHaveValue(
      'ใจดี',
    );

    expect(firstNameInputs[1]).toHaveValue(
      'สมหญิง',
    );

    expect(lastNameInputs[1]).toHaveValue(
      'สุขดี',
    );
  });

  it('shows field errors and does not submit invalid information', async () => {
    render(<RegisterPage />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'สมัครสมาชิก',
      }),
    );

    expect(
      await screen.findByText(
        'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'ใช้อีเมล @mail.wu.ac.th เท่านั้น',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'ระบุความสัมพันธ์กับผู้ป่วย',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(
        'กรอกเบอร์มือถือไทย 10 หลัก โดยขึ้นต้นด้วย 06, 08 หรือ 09',
      ),
    ).toHaveLength(2);

    expect(
      authService.signUp,
    ).not.toHaveBeenCalled();
  });

  it('submits normalized valid information', async () => {
    vi.mocked(
      authService.signUp,
    ).mockResolvedValue({} as never);

    render(<RegisterPage />);

    const titleInputs =
      screen.getAllByLabelText(/^คำนำหน้า /);

    const firstNameInputs =
      screen.getAllByLabelText(/^ชื่อ /);

    const lastNameInputs =
      screen.getAllByLabelText(/^นามสกุล /);

    fireEvent.change(titleInputs[0], {
      target: {
        value: 'นาย',
      },
    });

    fireEvent.change(firstNameInputs[0], {
      target: {
        value: 'สมชาย123',
      },
    });

    fireEvent.change(lastNameInputs[0], {
      target: {
        value: 'ใจดี456',
      },
    });

    fireEvent.change(
      screen.getByLabelText(/วันเดือนปีเกิด/),
      {
        target: {
          value: '2004-01-15',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^เพศ /),
      {
        target: {
          value: 'male',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/รหัสนักศึกษา/),
      {
        target: {
          value: '67116004',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^เบอร์โทรศัพท์/),
      {
        target: {
          value: '0812345678',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/ประวัติแพ้ยา/),
      {
        target: {
          value: 'no',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^โรคประจำตัว/),
      {
        target: {
          value: 'no',
        },
      },
    );

    fireEvent.change(titleInputs[1], {
      target: {
        value: 'นาง',
      },
    });

    fireEvent.change(firstNameInputs[1], {
      target: {
        value: 'สมหญิง789',
      },
    });

    fireEvent.change(lastNameInputs[1], {
      target: {
        value: 'ใจดี456',
      },
    });

    fireEvent.change(
      screen.getByLabelText(/ความสัมพันธ์/),
      {
        target: {
          value: 'มารดา',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^เบอร์โทรฉุกเฉิน/),
      {
        target: {
          value: '0891234567',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/อีเมลมหาวิทยาลัย/),
      {
        target: {
          value: 'STUDENT@mail.wu.ac.th',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/^รหัสผ่าน /),
      {
        target: {
          value: 'password123',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText(/ยืนยันรหัสผ่าน/),
      {
        target: {
          value: 'password123',
        },
      },
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'สมัครสมาชิก',
      }),
    );

    await waitFor(() => {
      expect(
        authService.signUp,
      ).toHaveBeenCalledWith(
        'student@mail.wu.ac.th',
        'password123',
        {
          title: 'นาย',
          firstName: 'สมชาย',
          lastName: 'ใจดี',
          dateOfBirth: '2004-01-15',
          gender: 'male',
          patientType: 'student',
          studentId: '67116004',
          employeeId: undefined,
          phone: '0812345678',

          allergyStatus: 'no',
          allergies: null,
          chronicDiseaseStatus: 'no',
          chronicDiseases: null,

          emergencyContactTitle: 'นาง',
          emergencyContactFirstName:
            'สมหญิง',
          emergencyContactLastName:
            'ใจดี',
          emergencyContactRelationship:
            'มารดา',
          emergencyPhone: '0891234567',
        },
      );

      expect(router.push).toHaveBeenCalledWith(
        '/login?registered=true',
      );
    });
  });

  it('uses an 8-digit employee ID while keeping the patient role', () => {
    const errors = validateRegistration({
      ...validForm,
      patientType: 'employee',
      studentId: '',
      employeeId: '12345678',
    });

    expect(errors.studentId).toBeUndefined();
    expect(errors.employeeId).toBeUndefined();
  });

  it('accepts Thai mobile prefixes and rejects duplicate emergency phones', () => {
    expect(validateRegistration({ ...validForm, phone: '0612345678' }).phone).toBeUndefined();
    expect(validateRegistration({ ...validForm, phone: '0712345678' }).phone).toContain('06, 08 หรือ 09');
    expect(validateRegistration({ ...validForm, emergencyPhone: validForm.phone }).emergencyPhone)
      .toBe('เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก');
  });

  it('calculates age from date of birth', () => {
    expect(calculateAge('2004-09-20', new Date(2026, 8, 20))).toBe(22);
    expect(calculateAge('2004-09-21', new Date(2026, 8, 20))).toBe(21);
    expect(calculateAge('', new Date(2026, 8, 20))).toBeNull();
  });

  it('rejects an emergency contact with the same full name as the patient', () => {
    const errors = validateRegistration({
      ...validForm,
      emergencyContactFirstName: validForm.firstName,
      emergencyContactLastName: validForm.lastName,
    });
    expect(errors.emergencyContactFirstName)
      .toBe('ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย');
  });

  it('shows password confirmation feedback in real time', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/^รหัสผ่าน /), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่าน/), { target: { value: 'different123' } });
    expect(screen.getByText('รหัสผ่านไม่ตรงกัน')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่าน/), { target: { value: 'password123' } });
    expect(screen.getByText('รหัสผ่านตรงกัน')).toBeInTheDocument();
  });
});
