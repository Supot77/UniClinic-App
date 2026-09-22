import { apiClient } from '@/lib/api-client';
import type { ScheduleService } from '@/types/schedule';

/** Public catalog only; database policies determine visibility for each session. */
export function fetchLandingServices(): Promise<ScheduleService[]> {
  return apiClient<ScheduleService[]>('/api/services');
}
