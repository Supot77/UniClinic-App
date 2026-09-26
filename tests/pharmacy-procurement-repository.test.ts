import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDatabaseProcurementRepository } from '@/features/pharmacy/databaseProcurementRepository';
import { createMockProcurementRepository } from '@/features/pharmacy/mockProcurementRepository';
import type { ReceiveProcurement } from '@/features/pharmacy/procurementRepository';
import type { Medication, MedicationProcurement, UserRole } from '@/types/database';

const receipt: ReceiveProcurement = { procurementId: 'po', medicationId: 'med', quantity: 15,
  lotNumber: 'lot', expiryDate: '2028-01-01', mfgDate: '2026-01-01', notes: null, newMedication: null };
function fixture(role: UserRole = 'medical') {
  const medications: Medication[] = [{ id: 'med', name: 'Medicine', type: 'tablet', category: 'general', unit: 'tablet', stock: 100,
    min_stock: 0, is_active: true, expiry_date: '2027-01-01', description: null, ingredients: null, created_at: '', updated_at: '' }];
  const orders: MedicationProcurement[] = [{ id: 'po', medication_id: 'med', medication_name: 'Medicine', unit: 'tablet', total_units: 20,
    status: 'pending', package_breakdown: null, order_number: null, supplier: null, ordered_at: '2026-09-26', created_at: '', updated_at: '' }];
  const repo = createMockProcurementRepository({ orders, medications, actor: { id: 'actor', role, active: true },
    now: () => '2026-09-26T00:00:00Z', newId: () => 'new-med' });
  return { repo, orders, medications };
}

describe('procurement receipt contract', () => {
  it('records actual quantity, preserves older stock expiry and refuses duplicate receipts', async () => {
    const { repo, orders, medications } = fixture();
    const results = await Promise.allSettled([repo.receive(receipt), repo.receive(receipt)]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(medications[0].stock).toBe(115);
    expect(medications[0].expiry_date).toBe('2027-01-01');
    expect(orders[0]).toMatchObject({ total_units: 20, received_units: 15, imported_by: 'actor', status: 'imported' });
    expect(repo.inventoryLogs).toHaveLength(1);
    await expect(repo.remove('po')).rejects.toThrow();
  });
  it.each(['patient', 'staff_admin'] as const)('refuses %s writes without changing stock', async (role) => {
    const { repo, medications, orders } = fixture(role);
    await expect(repo.receive(receipt)).rejects.toThrow();
    expect(medications[0].stock).toBe(100);
    expect(orders[0].status).toBe('pending');
    expect(repo.inventoryLogs).toEqual([]);
  });
  it('rejects mismatched units without partial changes', async () => {
    const { repo, medications, orders } = fixture();
    orders[0].unit = 'bottle';
    await expect(repo.receive(receipt)).rejects.toThrow('หน่วย');
    expect(medications[0].stock).toBe(100);
    expect(repo.inventoryLogs).toEqual([]);
  });
  it('uses the earlier expiry when a received batch expires before existing stock', async () => {
    const { repo, medications } = fixture();
    await repo.receive({ ...receipt, expiryDate: '2026-12-01' });
    expect(medications[0].expiry_date).toBe('2026-12-01');
  });
  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])('rejects invalid quantity %s before RPC', async (quantity) => {
    const rpc = vi.fn();
    const repo = createDatabaseProcurementRepository({ rpc } as unknown as SupabaseClient);
    await expect(repo.receive({ ...receipt, quantity })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('propagates a database failure and never falls back to separate writes', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'transaction rolled back' } });
    const from = vi.fn();
    const repo = createDatabaseProcurementRepository({ rpc, from } as unknown as SupabaseClient);
    await expect(repo.receive(receipt)).rejects.toThrow('transaction rolled back');
    expect(from).not.toHaveBeenCalled();
  });
  it('reports concurrent edit/delete instead of falsely reporting success', async () => {
    const query = { eq: vi.fn(), select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    query.eq.mockReturnValue(query);
    const repo = createDatabaseProcurementRepository({ from: () => ({ delete: () => query }) } as unknown as SupabaseClient);
    await expect(repo.remove('po')).rejects.toThrow('โหลดใหม่');
  });
});
