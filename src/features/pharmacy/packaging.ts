import type { PackageBreakdown } from '@/types/database';

export function supportsStrips(unit: string): boolean {
  return ['เม็ด', 'แคปซูล'].includes(unit.trim());
}

export function packagingTotal(value: PackageBreakdown, unit: string): number {
  const boxes = (value.crates ?? 0) * (value.boxes_per_crate ?? 1) + (value.boxes ?? 0);
  const useStrips = supportsStrips(unit) && value.units_per_box === undefined;
  return useStrips
    ? (boxes * (value.strips_per_box ?? 1) + (value.strips ?? 0)) * (value.units_per_strip ?? 1) + (value.units ?? 0)
    : boxes * (value.units_per_box ?? value.strips_per_box ?? 1) + (value.units ?? 0);
}

export function packagingSummary(value: PackageBreakdown, unit: string): string {
  const boxes = (value.crates ?? 0) * (value.boxes_per_crate ?? 1) + (value.boxes ?? 0);
  const useStrips = supportsStrips(unit) && value.units_per_box === undefined;
  return useStrips
    ? `(${boxes} กล่อง × ${value.strips_per_box ?? 1} แผง + ${value.strips ?? 0} แผง) × ${value.units_per_strip ?? 1} ${unit} + ${value.units ?? 0} ${unit}`
    : `${boxes} กล่อง × ${value.units_per_box ?? value.strips_per_box ?? 1} ${unit} + ${value.units ?? 0} ${unit}`;
}
