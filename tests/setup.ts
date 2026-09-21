import '@testing-library/jest-dom/vitest';

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
