'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export interface DatePickerProps {
  mode?: 'single' | 'range';
  value?: string; // YYYY-MM-DD
  onChange?: (date: string) => void;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  onRangeChange?: (startDate: string, endDate: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  displayCustomText?: string;
  slotDates?: string[];
  triggerClassName?: string;
  align?: 'left' | 'right';
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const WEEKDAY_NAMES = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatThaiDisplayDate(dateStr: string, isShort = false): string {
  if (!dateStr) return '';
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = Number(yStr);
  const m = Number(mStr) - 1;
  const d = Number(dStr);
  if (!y || isNaN(m) || !d) return dateStr;
  const monthName = isShort ? THAI_MONTHS_SHORT[m] : THAI_MONTHS[m];
  return `${d} ${monthName} ${y + 543}`;
}

export default function DatePicker({
  mode = 'single',
  value = '',
  onChange,
  startDate = '',
  endDate = '',
  onRangeChange,
  minDate,
  maxDate,
  placeholder,
  label,
  disabled = false,
  error,
  className = '',
  id: customId,
  ariaLabel,
  displayCustomText,
  slotDates,
  triggerClassName,
  align = 'left',
}: DatePickerProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [rangeSelectingStart, setRangeSelectingStart] = useState<string | null>(null);

  // Initialize displayed month/year
  const initialDateStr = mode === 'range' ? (startDate || getTodayString()) : (value || getTodayString());
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = initialDateStr.split('-').map(Number);
    return new Date(y || new Date().getFullYear(), (m ? m - 1 : new Date().getMonth()), 1);
  });

  const todayStr = getTodayString();

  const handleToggleOpen = () => {
    if (!isOpen) {
      const target = mode === 'range' ? (startDate || getTodayString()) : (value || getTodayString());
      if (target && target.length === 10) {
        const [y, m] = target.split('-').map(Number);
        if (y && m) {
          setViewDate(new Date(y, m - 1, 1));
        }
      }
    }
    setIsOpen((prev) => !prev);
  };

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setRangeSelectingStart(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setRangeSelectingStart(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const changeMonth = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    if (mode === 'single') {
      onChange?.(todayStr);
      setIsOpen(false);
    }
  };

  // Build grid days for the month (Monday-start)
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const firstDayWeekIndex = new Date(year, month, 1).getDay();
  // Adjust so Monday = 0, Sunday = 6
  const startOffset = (firstDayWeekIndex + 6) % 7;

  const days: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(dateStr);
  }

  const handleDayClick = (dateStr: string) => {
    if (disabled) return;

    if (mode === 'single') {
      onChange?.(dateStr);
      setIsOpen(false);
    } else {
      // Range mode
      if (!rangeSelectingStart) {
        // First click of range
        setRangeSelectingStart(dateStr);
      } else {
        // Second click of range
        let start = rangeSelectingStart;
        let end = dateStr;
        if (start > end) {
          [start, end] = [end, start];
        }
        onRangeChange?.(start, end);
        setRangeSelectingStart(null);
        setIsOpen(false);
      }
    }
  };

  // Label text on trigger button
  let displayLabel = '';
  if (displayCustomText) {
    displayLabel = displayCustomText;
  } else if (mode === 'single') {
    displayLabel = value ? formatThaiDisplayDate(value, true) : (placeholder || 'เลือกวันที่');
  } else {
    if (startDate && endDate) {
      displayLabel = `${formatThaiDisplayDate(startDate, true)} – ${formatThaiDisplayDate(endDate, true)}`;
    } else if (startDate) {
      displayLabel = `${formatThaiDisplayDate(startDate, true)} – ...`;
    } else {
      displayLabel = placeholder || 'เลือกช่วงวันที่';
    }
  }

  const activeStart = rangeSelectingStart || startDate;
  const activeEnd = rangeSelectingStart ? (hoverDate || rangeSelectingStart) : endDate;
  const effectiveMin = activeStart && activeEnd && activeStart > activeEnd ? activeEnd : activeStart;
  const effectiveMax = activeStart && activeEnd && activeStart > activeEnd ? activeStart : activeEnd;

  return (
    <div ref={containerRef} className={`relative inline-block ${triggerClassName ? '' : 'w-full'} ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-body">
          {label}
        </label>
      )}

      <input
        id={id}
        type="date"
        aria-label={ariaLabel || label || (mode === 'range' ? 'ช่วงวันที่' : 'เลือกวันที่')}
        min={minDate}
        max={maxDate}
        value={mode === 'range' ? (startDate || '') : (value || '')}
        onChange={(e) => {
          if (mode === 'single') {
            onChange?.(e.target.value);
          } else {
            onRangeChange?.(e.target.value, endDate || e.target.value);
          }
        }}
        tabIndex={-1}
        className="sr-only"
      />

      <button
        type="button"
        id={`${id}-btn`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (label ? `${label}: ${displayLabel}` : displayLabel)}
        onClick={handleToggleOpen}
        className={
          triggerClassName
            ? `${triggerClassName} flex items-center justify-between gap-2 transition ${isOpen ? 'ring-2 ring-brand-strong/20' : ''}`
            : `flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm transition shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${
                error
                  ? 'border-status-critical text-status-critical focus-visible:outline-status-critical'
                  : isOpen
                  ? 'border-brand-strong ring-2 ring-brand/15 text-brand-ink'
                  : 'border-brand-border-soft text-brand-ink hover:border-brand-border-strong'
              } ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60' : 'cursor-pointer'}`
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
          <span className={`truncate ${!value && !startDate && !displayCustomText ? 'text-slate-400' : 'font-medium'}`}>
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-brand-body transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {error && <p className="mt-1 text-xs text-status-critical" role="alert">{error}</p>}

      {isOpen && (
        <div
          role="dialog"
          aria-label={label || 'ปฏิทินเลือกวันที่'}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 z-50 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-brand-border-soft bg-white p-3.5 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Controls */}
          <div className="mb-3 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-body hover:bg-brand-soft hover:text-brand-ink transition"
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="text-sm font-bold text-brand-ink" aria-live="polite">
              {THAI_MONTHS[month]} {year + 543}
            </span>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-body hover:bg-brand-soft hover:text-brand-ink transition"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-brand-strong mb-1">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
            {days.map((dateStr, index) => {
              if (!dateStr) {
                return <span key={`empty-${index}`} className="h-8 w-full" aria-hidden="true" />;
              }

              const dayNum = Number(dateStr.slice(-2));
              const isToday = dateStr === todayStr;
              const isPastMin = minDate ? dateStr < minDate : false;
              const isPastMax = maxDate ? dateStr > maxDate : false;
              const isDayDisabled = isPastMin || isPastMax;

              let isSelected = false;
              let isRangeStart = false;
              let isRangeEnd = false;
              let isInRange = false;

              if (mode === 'single') {
                isSelected = dateStr === value;
              } else {
                isRangeStart = dateStr === effectiveMin;
                isRangeEnd = dateStr === effectiveMax;
                isInRange = Boolean(effectiveMin && effectiveMax && dateStr > effectiveMin && dateStr < effectiveMax);
              }

              const hasSlot = Boolean(slotDates && slotDates.includes(dateStr));

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDayDisabled}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => mode === 'range' && rangeSelectingStart && setHoverDate(dateStr)}
                  className={`relative flex h-8 w-full items-center justify-center text-xs transition ${
                    isDayDisabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isSelected || (mode === 'range' && (isRangeStart || isRangeEnd))
                      ? 'bg-brand-strong font-bold text-white shadow-xs z-10'
                      : isInRange
                      ? 'bg-brand-soft font-semibold text-brand-strong rounded-none'
                      : isToday
                      ? 'font-bold text-brand-strong ring-1.5 ring-brand-strong/40 rounded-xl hover:bg-brand-soft'
                      : 'text-brand-ink hover:bg-brand-soft/70 hover:text-brand-strong rounded-xl'
                  } ${
                    mode === 'range'
                      ? isRangeStart && isRangeEnd
                        ? 'rounded-xl'
                        : isRangeStart
                        ? 'rounded-l-xl'
                        : isRangeEnd
                        ? 'rounded-r-xl'
                        : ''
                      : 'rounded-xl'
                  }`}
                  aria-label={`วันที่ ${formatThaiDisplayDate(dateStr)}${hasSlot ? ' (มีรอบตรวจ)' : ''}`}
                  aria-pressed={isSelected || isRangeStart || isRangeEnd}
                >
                  <span>{dayNum}</span>
                  {hasSlot && (
                    <span
                      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                        isSelected || (mode === 'range' && (isRangeStart || isRangeEnd)) ? 'bg-white' : 'bg-status-success'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-3 flex items-center justify-between border-t border-brand-border-soft pt-2 text-xs">
            <button
              type="button"
              onClick={jumpToToday}
              className="inline-flex items-center gap-1 font-semibold text-brand-strong hover:underline"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              วันนี้
            </button>

            {mode === 'range' && rangeSelectingStart && (
              <span className="text-[11px] text-brand-muted animate-pulse">
                เลือกวันสิ้นสุด
              </span>
            )}

            {(value || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  if (mode === 'single') {
                    onChange?.('');
                  } else {
                    onRangeChange?.('', '');
                    setRangeSelectingStart(null);
                  }
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-rose-600 transition"
              >
                ล้างค่า
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
