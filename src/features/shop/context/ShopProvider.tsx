'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { MockShopRepository, type ShopSnapshot } from '../data/mockRepository';
import type { ScheduleDepartment, ScheduleDoctor } from '@/types/schedule';
import type { ShopResult, SlotInput } from '../domain/rules';

interface ShopContextValue extends ShopSnapshot {
  saveDepartment(input: Omit<ScheduleDepartment, 'id' | 'isActive'>, id?: string): ShopResult<ScheduleDepartment>;
  toggleDepartment(id: string): ShopResult<'deleted' | 'disabled' | 'enabled'>;
  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): ShopResult<ScheduleDoctor>;
  toggleDoctor(id: string): ShopResult<ScheduleDoctor>;
  saveSlot(input: SlotInput, id?: string): ReturnType<MockShopRepository['saveSlot']>;
  toggleSlot(id: string): ReturnType<MockShopRepository['toggleSlot']>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(() => new MockShopRepository());
  const [snapshot, setSnapshot] = useState<ShopSnapshot>(() => repository.snapshot());
  const run = useCallback(<T,>(command: () => ShopResult<T>) => {
    const result = command();
    if (result.ok) setSnapshot(repository.snapshot());
    return result;
  }, [repository]);

  const value: ShopContextValue = {
    ...snapshot,
    saveDepartment: (input, id) => run(() => repository.saveDepartment(input, id)),
    toggleDepartment: (id) => run(() => repository.toggleDepartment(id)),
    saveDoctor: (input, id) => run(() => repository.saveDoctor(input, id)),
    toggleDoctor: (id) => run(() => repository.toggleDoctor(id)),
    saveSlot: (input, id) => run(() => repository.saveSlot(input, id)),
    toggleSlot: (id) => run(() => repository.toggleSlot(id)),
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error('useShop must be used inside ShopProvider');
  return value;
}
