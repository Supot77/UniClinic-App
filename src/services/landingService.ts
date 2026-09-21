import { DatabaseSchedulingRepository } from "@/features/scheduling/data/databaseRepository";
import { createClient } from "@/utils/supabase/client";

/** Public catalog only; database policies determine visibility for each session. */
export function fetchLandingServices() {
  return new DatabaseSchedulingRepository(createClient()).fetchServices(true);
}
