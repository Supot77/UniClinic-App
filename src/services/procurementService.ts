import { createClient } from '@/utils/supabase/client';
import { createDatabaseProcurementRepository } from '@/features/pharmacy/databaseProcurementRepository';

export const procurementRepository = createDatabaseProcurementRepository(createClient());
