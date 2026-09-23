import { apiClient } from '@/lib/api-client';
import type { ScheduleService } from '@/types/schedule';

type Apiservice = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

/** Public catalog only; database policies determine visibility for each session. */
export async function fetchLandingServices(): Promise<ScheduleService[]> {
  const rows = await apiClient<Apiservice[]>('/api/services');

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    hasHistory: true, // always true for landing page; history is not relevant for public catalog
  }));
}
