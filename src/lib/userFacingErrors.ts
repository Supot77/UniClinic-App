type ErrorDetails = {
  code: string;
  message: string;
};

function readErrorDetails(error: unknown): ErrorDetails {
  if (typeof error === 'string') {
    return { code: '', message: error.toLowerCase() };
  }

  if (error instanceof Error) {
    return { code: '', message: error.message.toLowerCase() };
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>;
    return {
      code: typeof value.code === 'string' ? value.code.toLowerCase() : '',
      message: typeof value.message === 'string' ? value.message.toLowerCase() : '',
    };
  }

  return { code: '', message: '' };
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function isNetworkError(details: ErrorDetails): boolean {
  return includesAny(`${details.code} ${details.message}`, [
    'failed to fetch',
    'network',
    'offline',
    'load failed',
    'timeout',
  ]);
}

export function toLoginErrorMessage(error: unknown): string {
  const details = readErrorDetails(error);
  const text = `${details.code} ${details.message}`;

  if (includesAny(text, ['email not confirmed', 'email_not_confirmed'])) {
    return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
  }

  if (includesAny(text, [
    'invalid login credentials',
    'invalid_credentials',
    'invalid credentials',
  ])) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }

  if (includesAny(text, ['too many requests', 'rate limit', '429'])) {
    return 'ลองเข้าสู่ระบบอีกครั้งภายหลัง';
  }

  if (isNetworkError(details)) {
    return 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  }

  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
}

export function toNotificationErrorMessage(error: unknown, fallback: string): string {
  const details = readErrorDetails(error);
  const text = `${details.code} ${details.message}`;

  if (details.code === '42501' || includesAny(text, ['permission denied', 'not authorized', 'unauthorized'])) {
    return 'คุณไม่มีสิทธิ์ดำเนินการนี้';
  }

  if (isNetworkError(details)) {
    return 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  }

  return fallback;
}
