import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProcurementRepository } from './procurementRepository';
import { validateProcurementDraft, validateReceipt } from './procurementRepository';

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function createDatabaseProcurementRepository(client: SupabaseClient): ProcurementRepository {
  return {
    async correct(id, expectedUpdatedAt, quantity, reason, details) {
      const { error } = await client.rpc('correct_medication_procurement', {
        p_id: id, p_expected_updated_at: expectedUpdatedAt, p_quantity: quantity,
        p_reason: reason, p_details: details, p_cancel: false,
      });
      check(error);
    },
    async cancelReceipt(id, expectedUpdatedAt, reason) {
      const { error } = await client.rpc('correct_medication_procurement', {
        p_id: id, p_expected_updated_at: expectedUpdatedAt, p_quantity: 0,
        p_reason: reason, p_details: {}, p_cancel: true,
      });
      check(error);
    },
    async list() {
      const { data, error } = await client.from('medication_procurements').select('*').order('ordered_at', { ascending: false });
      check(error);
      return data ?? [];
    },
    async create(order) {
      validateProcurementDraft(order);
      // Actor, status and timestamps are assigned by the database.
      const { error } = await client.from('medication_procurements').insert(order);
      check(error);
    },
    async update(id, order) {
      validateProcurementDraft(order);
      const { data, error } = await client.from('medication_procurements').update(order)
        .eq('id', id).eq('status', 'pending').select('id');
      check(error);
      if (!data?.length) throw new Error('รายการนี้ถูกนำเข้าหรือลบแล้ว กรุณาโหลดใหม่');
    },
    async remove(id) {
      const { data, error } = await client.from('medication_procurements').delete()
        .eq('id', id).eq('status', 'pending').select('id');
      check(error);
      if (!data?.length) throw new Error('รายการนี้ถูกนำเข้าหรือลบแล้ว กรุณาโหลดใหม่');
    },
    async receive(input) {
      validateReceipt(input);
      const { error } = await client.rpc('receive_medication_procurement', {
        p_procurement_id: input.procurementId,
        p_medication_id: input.medicationId,
        p_quantity: input.quantity,
        p_lot_number: input.lotNumber,
        p_expiry_date: input.expiryDate,
        p_mfg_date: input.mfgDate,
        p_notes: input.notes,
        p_new_medication: input.newMedication,
      });
      check(error);
    },
  };
}
