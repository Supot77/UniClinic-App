import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

const nativeFetch = globalThis.fetch;

function toUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') return new URL(input, 'http://localhost');
  return new URL(input.url, 'http://localhost');
}

const apiFetchMock = vi.fn(
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = toUrl(input);

    if (!url.pathname.startsWith('/api/')) {
      if (!nativeFetch) {
        return Promise.reject(new Error('Global fetch is unavailable in test environment'));
      }

      return nativeFetch(input, init);
    }

    return Promise.resolve(
      new Response(
        JSON.stringify({
          error: `No mock handler registered for ${url.pathname}`,
        }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  },
);

vi.stubGlobal('fetch', apiFetchMock);

afterEach(() => {
  apiFetchMock.mockClear();
});

const createMemoryStorage = (): Storage => {
  let values: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear() {
      values = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
    },
    key(index: number) {
      return Object.keys(values)[index] ?? null;
    },
    removeItem(key: string) {
      delete values[key];
    },
    setItem(key: string, value: string) {
      values[key] = String(value);
    },
  };
};

const memoryStorage = createMemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStorage,
});

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: memoryStorage,
});

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || function () {
    this.removeAttribute('open');
  };
}

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
