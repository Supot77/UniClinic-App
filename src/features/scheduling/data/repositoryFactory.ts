import { MockSchedulingRepository } from './mockRepository';
import type { SchedulingRepository } from '../domain/repository';

/**
 * Single composition point for the scheduling data source.
 *
 * INTEGRATION: return a database-backed repository here only after the
 * database contract, RLS, migrations, and runtime configuration are approved.
 * The current application intentionally remains mock-only.
 */
export function createSchedulingRepository(): SchedulingRepository {
  return new MockSchedulingRepository();
}
