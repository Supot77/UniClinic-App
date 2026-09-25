import { createClient } from '@/utils/supabase/client';
import type { PrescribedMedItem } from '@/components/pharmacy/PrescriptionsTab';

export async function changePharmacyPrescription(input: {
  recordId: string; expected: PrescribedMedItem[]; items?: PrescribedMedItem[];
  reason: string; action: 'edit' | 'dispense'; skipStock?: boolean;
}): Promise<PrescribedMedItem[]> {
  if (!input.reason.trim()) throw new Error('กรุณาระบุเหตุผล');
  const { data, error } = await createClient().rpc('change_pharmacy_prescription', {
    p_record_id: input.recordId, p_expected: input.expected, p_items: input.items ?? null,
    p_reason: input.reason.trim(), p_action: input.action, p_skip_stock: input.skipStock ?? false,
  });
  if (error) throw new Error(error.message);
  return data as PrescribedMedItem[];
}
