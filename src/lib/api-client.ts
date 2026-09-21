const DEFAULT_API_ERROR_MESSAGE = 'เกิดข้อผิดพลาดในการดึงข้อมูล';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }

  const error = body.error;
  return typeof error === 'string' && error.trim() ? error : undefined;
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = DEFAULT_API_ERROR_MESSAGE;

    try {
      message = readErrorMessage(await response.json()) ?? message;
    } catch {
      // Keep the stable fallback when the response has no JSON error body.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
