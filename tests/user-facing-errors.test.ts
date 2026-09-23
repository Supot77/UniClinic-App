import { describe, expect, it } from 'vitest';
import { toLoginErrorMessage, toNotificationErrorMessage } from '@/lib/userFacingErrors';

describe('user-facing error messages', () => {
  it.each([
    ['Invalid login credentials', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],
    ['Email not confirmed', 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'],
    ['Too many requests', 'ลองเข้าสู่ระบบอีกครั้งภายหลัง'],
    ['Failed to fetch', 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'],
    ['unexpected provider error', 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'],
  ])('maps login error %s to %s', (providerMessage, expected) => {
    expect(toLoginErrorMessage(new Error(providerMessage))).toBe(expected);
  });

  it('maps a permission error without exposing provider details', () => {
    expect(toNotificationErrorMessage({ code: '42501', message: 'permission denied for table notifications' }, 'fallback'))
      .toBe('คุณไม่มีสิทธิ์ดำเนินการนี้');
  });

  it('maps a notification network error without exposing provider details', () => {
    expect(toNotificationErrorMessage(new Error('Failed to fetch'), 'fallback'))
      .toBe('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  });

  it('uses the operation-specific fallback for unknown notification errors', () => {
    expect(toNotificationErrorMessage(new Error('unexpected provider error'), 'โหลดประวัติประกาศไม่สำเร็จ กรุณาลองใหม่'))
      .toBe('โหลดประวัติประกาศไม่สำเร็จ กรุณาลองใหม่');
  });
});
