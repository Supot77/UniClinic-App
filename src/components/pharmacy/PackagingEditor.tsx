'use client';

import { useId, useState } from 'react';
import type { PackageBreakdown } from '@/types/database';
import { packagingSummary, packagingTotal, supportsStrips } from '@/features/pharmacy/packaging';

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-brand-border-soft bg-white px-3 text-sm text-brand-ink outline-none focus:border-brand-strong focus:ring-2 focus:ring-brand-soft disabled:bg-brand-surface';

export default function PackagingEditor({ value, unit, onChange, onUnitChange, unitLocked = false }: {
  value: PackageBreakdown; unit: string; onChange: (value: PackageBreakdown) => void;
  onUnitChange: (unit: string) => void; unitLocked?: boolean;
}) {
  const id = useId();
  const [mode, setMode] = useState<'direct' | 'packages'>(() => value.crates || value.boxes || value.strips ? 'packages' : 'direct');
  const strips = supportsStrips(unit) && value.units_per_box === undefined;
  const total = packagingTotal(value, unit);
  const field = (key: keyof PackageBreakdown, label: string, min = 0) => (
    <label className="block text-xs font-medium text-brand-body" htmlFor={`${id}-${key}`}>
      {label}
      <input id={`${id}-${key}`} type="number" min={min} step="1" value={value[key] ?? ''}
        placeholder="0" className={inputClass} onChange={(event) => onChange({ ...value, [key]: event.target.value === '' ? undefined : Number(event.target.value) })} />
    </label>
  );
  return <section className="rounded-2xl border border-brand-border-soft bg-brand-surface p-4 sm:p-5">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><h4 className="font-semibold text-brand-ink">จำนวนที่สั่งซื้อ</h4><p className="mt-1 text-xs leading-5 text-brand-muted">ระบุจำนวนตรง หรือคำนวณจากขนาดบรรจุจริง</p></div>
      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">{unit}</span>
    </div>
    <label className="block text-xs font-medium text-brand-body">หน่วยยา
      <select aria-label="หน่วยยา" value={unit} disabled={unitLocked} className={inputClass} onChange={(event) => {
        const nextUnit = event.target.value;
        onUnitChange(nextUnit);
        // A unit change invalidates the previous conversion; require new quantities.
        onChange({ units: 0, units_per_box: supportsStrips(nextUnit) ? undefined : 1 });
        setMode('direct');
      }}>
        {Array.from(new Set([unit, 'เม็ด', 'แคปซูล', 'ขวด', 'หลอด', 'ซอง', 'แอมพูล', 'ชิ้น', 'แผ่น'])).map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
    <div className="my-4 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-brand-border-soft">
      {(['direct', 'packages'] as const).map((item) => <button type="button" key={item} aria-pressed={mode === item}
        onClick={() => { setMode(item); onChange({ units: total, units_per_box: supportsStrips(unit) ? undefined : 1 }); }}
        className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition ${mode === item ? 'bg-brand-strong text-white' : 'text-brand-body hover:bg-brand-soft'}`}>
        {item === 'direct' ? 'จำนวนตรง' : 'ตามบรรจุภัณฑ์'}
      </button>)}
    </div>
    <div className="space-y-4">
      {mode === 'packages' && <>
        <div className="grid grid-cols-2 gap-3">
          {field('boxes', 'จำนวนกล่อง')}
          {strips ? field('strips_per_box', 'แผงต่อกล่อง', 1) : field('units_per_box', `${unit}ต่อกล่อง`, 1)}
        </div>
        {supportsStrips(unit) && <label className="flex items-center gap-2 text-xs text-brand-body">
          <input type="checkbox" checked={strips} onChange={(e) => onChange({ ...value, strips: 0,
            units_per_box: e.target.checked ? undefined : 1, strips_per_box: 1, units_per_strip: 1 })} />มีชั้นบรรจุแบบแผง
        </label>}
        {strips && <div className="grid grid-cols-2 gap-3">{field('units_per_strip', `${unit}ต่อแผง`, 1)}{field('strips', 'แผงแยก')}</div>}
        <details open={Boolean(value.crates)} className="rounded-xl border border-brand-border-soft bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-brand-strong">รับมาเป็นลัง</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">{field('crates', 'จำนวนลัง')}{field('boxes_per_crate', 'กล่องต่อลัง', 1)}</div>
        </details>
      </>}
      {field('units', mode === 'direct' ? `จำนวน (${unit})` : `${unit}แยก`)}
    </div>
    <div aria-live="polite" className="mt-5 rounded-xl border border-brand-border-soft bg-white p-4">
      <p className="text-xs text-brand-muted">ยอดรวมที่สั่งซื้อ</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-brand-ink">{total.toLocaleString()} <span className="text-sm font-medium">{unit}</span></p>
      {mode === 'packages' && <p className="mt-2 text-xs leading-5 text-brand-muted">{packagingSummary(value, unit)}</p>}
    </div>
  </section>;
}
