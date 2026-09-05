import { describe, expect, it } from 'vitest';
import { MockShopRepository } from '@/features/shop/data/mockRepository';

describe('MockShopRepository', () => {
  it('soft deletes referenced departments and hard deletes new ones', () => {
    const repository = new MockShopRepository();
    const referenced = repository.toggleDepartment('dept-general');
    expect(referenced).toEqual({ ok: true, value: 'disabled' });
    expect(repository.snapshot().departments.find((item) => item.id === 'dept-general')?.isActive).toBe(false);

    const created = repository.saveDepartment({
      name: 'คลินิกทดสอบ',
      code: 'TST',
      description: 'ข้อมูลจำลอง',
      room: 'ห้อง 1',
      tone: 'sky',
      hasHistory: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(repository.toggleDepartment(created.value.id)).toEqual({ ok: true, value: 'deleted' });
    expect(repository.snapshot().departments.some((item) => item.id === created.value.id)).toBe(false);
  });

  it('does not mutate state when slot validation fails', () => {
    const repository = new MockShopRepository();
    const before = repository.snapshot();
    const result = repository.saveSlot({
      doctorId: 'doctor-strange',
      slotDate: '2026-08-31',
      startTime: '09:15',
      endTime: '09:45',
      maxCapacity: 1,
    });
    expect(result.ok).toBe(false);
    expect(repository.snapshot()).toEqual(before);
  });
});
