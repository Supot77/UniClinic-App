import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '@/lib/api-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('returns JSON and preserves request options while adding a default JSON header', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'department-1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await expect(
      apiClient<{ id: string }>('/api/departments', {
        method: 'POST',
        headers: { 'X-Request-ID': 'request-1' },
        body: JSON.stringify({ name: 'อายุรกรรม' }),
      }),
    ).resolves.toEqual({ id: 'department-1' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchSpy.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit?,
    ];
    const headers = new Headers(requestInit?.headers);

    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.body).toBe(JSON.stringify({ name: 'อายุรกรรม' }));
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Request-ID')).toBe('request-1');
  });

  it('preserves a caller-provided content type', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await apiClient('/api/upload', {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const [, requestInit] = fetchSpy.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit?,
    ];
    expect(new Headers(requestInit?.headers).get('Content-Type')).toBe(
      'multipart/form-data',
    );
  });

  it('throws ApiError with the API message and status for a JSON error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'ไม่มีสิทธิ์ใช้งาน' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request = apiClient('/api/departments');

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      status: 403,
      message: 'ไม่มีสิทธิ์ใช้งาน',
      name: 'ApiError',
    });
  });

  it('uses a stable fallback for a non-JSON error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('gateway failure', { status: 502 }),
    );

    await expect(apiClient('/api/departments')).rejects.toMatchObject({
      status: 502,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
    });
  });

  it('returns undefined for a successful 204 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(apiClient('/api/departments/department-1')).resolves.toBeUndefined();
  });

  it('turns an unconfigured API request into a test-visible 501 error', async () => {
    await expect(apiClient('/api/unconfigured')).rejects.toMatchObject({
      status: 501,
      message: 'No mock handler registered for /api/unconfigured',
    });
  });
});
