import { MockShopRepository } from './mockRepository';
import type { ShopRepository } from '../domain/repository';

/**
 * Single composition point for the shop data source.
 *
 * INTEGRATION: return a database-backed repository here only after the
 * database contract, RLS, migrations, and runtime configuration are approved.
 * The current application intentionally remains mock-only.
 */
export function createShopRepository(): ShopRepository {
  return new MockShopRepository();
}
