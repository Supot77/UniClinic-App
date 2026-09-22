'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmationModalTone = 'danger' | 'primary';

export interface ConfirmationModalRequest {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: ConfirmationModalTone;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmationModalProps {
  request: ConfirmationModalRequest | null;
  onCancel: () => void;
  isBusy?: boolean;
}

const focusableSelector = [
  'button:not(:disabled)',
  '[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function ConfirmationModal({ request, onCancel, isBusy = false }: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const isOpen = Boolean(request);
  const pending = isBusy || isConfirming;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmButtonRef.current?.focus();

    return () => {
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pending) return;
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, pending]);

  if (!request || typeof document === 'undefined') return null;

  const tone = request.tone ?? 'danger';
  const confirmClass = tone === 'danger'
    ? 'bg-status-critical text-white hover:bg-status-critical/90 focus-visible:outline-status-critical'
    : 'bg-brand-strong text-white hover:bg-brand-hover focus-visible:outline-brand-strong';

  const handleConfirm = async () => {
    if (pending) return;
    setIsConfirming(true);
    try {
      await request.onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="presentation"
      onClick={(event) => {
        if (!pending && event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-status-critical-bg text-status-critical" aria-hidden="true">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-7 text-brand-ink">{request.title}</h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-brand-body">{request.message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-border-soft bg-white px-4 text-sm font-semibold text-brand-body transition hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={handleConfirm}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {pending ? 'กำลังดำเนินการ…' : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
