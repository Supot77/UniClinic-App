# Pharmacy procurement corrections — 2026-09-26

## Summary

Branch: `feature/pharmacy-mockup`, based on `de66180`. Owner: กัญจน์; reviewer: กลอง.
Continues the existing uncommitted procurement work. No commit, push, remote migration or seed was performed.
The procurement UI now submits one authenticated receipt RPC instead of writing stock, history and order status separately.
Database behavior is implemented in migration 36 but is **not deployed or integration-verified**.

## Root cause

- `MedicationProcurementsTab` calculated stock from the medications prop and sent independent writes. A stale screen could overwrite newer stock; failure after the stock write left the order pending. Log errors were ignored. Old tests verified individual writes, not transaction boundaries.
- The proposed permanent-delete API used a service-role client to delete inventory logs and reminders before deleting the medication. A later foreign-key failure could leave the medication with missing history.
- `PackageBreakdown` omitted loose units. Reopening an order with packaged and loose units reconstructed only the packaged portion.
- The untracked procurement migration was empty and reused version 35, which main now uses for medical-record editing.

## Fix

- `src/features/pharmacy/procurementRepository.ts`: shared contract and validation.
- `databaseProcurementRepository.ts`, `mockProcurementRepository.ts`: database adapter and explicit test-only adapter; no production fallback.
- `src/services/procurementService.ts`: connects the UI to the database adapter using the browser user's session.
- `MedicationProcurementsTab.tsx`: repository calls, error propagation, initial loading, saved/restored loose units, actual received quantity display, read-only imported orders, no fabricated manufacture/expiry dates.
- `src/types/database.ts`: additive `units` and `received_units` fields; no existing module contract removed.
- `36_medication_procurements.sql`: table, constraints, RLS, column privileges and authenticated RPCs. Receipt locks order and medication, increments current stock, writes the log and marks receipt in one transaction. Duplicate receipt is rejected; actor and time come from the database. Aggregate inventory keeps the earliest known expiry; this does not implement per-lot dispensing.
- `src/app/api/medications/[id]/route.ts`: permanent deletion calls an authenticated medical-only RPC. It retains dependent history and refuses referenced medications. Default soft deletion remains available.
- `PharmacyContent.tsx`: deletion text explains the reference restriction.
- `seed_10_medications.sql`: explicitly labelled development/test only and non-idempotent. Not executed.

## Validation

- The new UI RPC regressions failed against the old code (zero RPC calls, 2 failures) and passed after replacement.
- Final focused suite: **26/26 passed** across `pharmacy-procurements`, `pharmacy-procurement-repository`, and `pharmacy-medication-delete` tests. Covers both receipt modes, surfaced errors, loose-unit round trip, invalid quantities, mock duplicate receipts/permissions/unit mismatch/expiry, stale deletes and API access.
- Final focused ESLint, `npx.cmd --no-install tsc --noEmit`, `npm.cmd run build`, and tracked `git diff --check`: passed.
- Full suite before the final additional expiry regression/shared validation: 428 passed / 14 failed. Same failures as immediately after syncing main: department mock lacks `services` (12), dashboard metric expectation (1), clinic time-block expectation (1).
- Full lint: 2 errors / 12 warnings, unchanged from main baseline; errors in patient reminders at lines 174 and 268. No pharmacy lint failures.
- Initial sandbox build failed fetching Google Fonts; approved network-capable retry passed, and final build passed again.

## Remaining validation and scope

- No local PostgreSQL/Docker executable or browser automation tool was available. SQL compilation, real rollback/concurrency, RLS with patient/medical/staff_admin sessions, and Chrome 360px/1280px keyboard/loading/error checks remain unverified. Mock tests do not prove database atomicity.
- Before deployment, identify/authorize the team's development target and inspect for any manually created procurement table. Migration intentionally fails if the table already exists rather than silently accepting an incompatible schema. Apply migration 36 before releasing the dependent UI/API.
- Database acceptance: receive the same order concurrently; receive different orders for the same medication; force inventory-log failure; verify complete rollback; deny patient/staff writes; deny direct status/actor edits; reject deletion of referenced medication without removing history.
- Existing pharmacy flows outside procurement, including initial stock creation from the inventory editor, were not migrated to this new receipt transaction. Existing unrelated main failures remain outside this change.
- Shared types and migration need review by the pharmacy reviewer and affected medication/reminder owners before deployment. No messages were sent on the user's behalf.
