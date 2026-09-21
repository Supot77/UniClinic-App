'use client';

import type { ReactNode } from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
}

export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
}: {
  value: T;
  options: Array<SegmentedControlOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return <div className={`inline-flex max-w-full shrink-0 items-center gap-0.5 overflow-hidden rounded-xl bg-brand-page p-1 ${className}`} role="group" aria-label={ariaLabel}>
    {options.map((option) => {
      const isSelected = value === option.value;
      return <button
        key={option.value}
        type="button"
        aria-pressed={isSelected}
        onClick={() => onChange(option.value)}
        className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${isSelected ? 'bg-brand-strong text-white shadow-2xs' : 'text-brand-body hover:bg-brand-surface hover:text-brand-ink'}`}
      >
        {option.label}
      </button>;
    })}
  </div>;
}
