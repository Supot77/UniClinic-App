# Milestone 3 (R3) Analysis & Architecture Blueprint: Medication Inventory & Low-Stock Alerts

## 1. Executive Summary

Milestone 3 (**Medication Inventory & Low-Stock Alerts - R3**) implements a medical-grade medication master catalog and inventory control subsystem for the WU Clinic Booking & Medication System.

The subsystem enables:
1. **Full CRUD Master Data Management**: Create, Read, Update, and Delete/Deactivate medications with clinical attributes (Drug code, Brand name, Generic name, Dosage, Pharmaceutical form, Category, Expiry date, Min stock threshold, Unit, Storage location, and Usage description).
2. **Deterministic Stock Health Engine**: Real-time evaluation of inventory balance against `min_stock_level` into exact categories:
   - **Adequate** (`มีเพียงพอ`): $\text{stock} > \text{min\_stock\_level}$ (Emerald)
   - **Reorder / Low Stock** (`ต้องสั่งเพิ่ม`): $0.5 \times \text{min\_stock\_level} < \text{stock} \le \text{min\_stock\_level}$ (Amber)
   - **Critical / Out of Stock** (`วิกฤตใกล้หมด`): $\text{stock} \le 0.5 \times \text{min\_stock\_level}$ or $\text{stock} = 0$ (Rose)
   - **Expiring Soon** (`ใกล้หมดอายุ`): $\text{expiry\_date} \le \text{today} + 90\text{ days}$ (Warning Amber/Purple)
3. **Low-Stock Alert Banner**: High-priority alert ribbon at the top of the inventory page with counts of items needing immediate reorder, 1-click filter button (`ดูเฉพาะรายการวิกฤต`), and quick restock trigger.
4. **Debounced Search & Multi-Tab Filter Bar**: 300ms debounced search over Brand name, Generic name, Code, and Category, integrated with tab filters (All, Adequate, Low Stock, Critical, Expiring Soon), category dropdown, and sorting options.
5. **Transactional Stock Adjustment Engine**: Atomic stock operations (`import` +, `dispense` -, `adjustment` $\pm$, `disposed` -, `return` +) with before/after balance calculation, negative-stock prevention, audit note logging, and automatic staff notification triggering when stock falls to $\le \text{min\_stock\_level}$.
6. **Transaction History Ledger**: Audit ledger displaying historical transactions, quantity changes, actor credentials, reference IDs, and timestamps.
7. **Dual-Mode Data Layer**: Seamless execution on both Supabase PostgreSQL RPC (`adjust_medication_stock`) + Tables (`medications`, `inventory_transactions`) and resilient `fallbackStorage` for demo/offline modes.

---

## 2. Interface Contracts & Database Schema Alignment

### 2.1 Database Tables & Interfaces (`src/types/database.ts`)

```typescript
export type TransactionType = 'import' | 'dispense' | 'adjustment' | 'disposed' | 'return';
export type StockStatus = 'sufficient' | 'low_stock' | 'critical' | 'out_of_stock';

export interface Medication {
  id: string;
  code: string;
  name: string;
  generic_name: string;
  dosage: string;
  form: string; // 'tablet' | 'capsule' | 'syrup' | 'powder' | 'injection' | 'ointment' | 'drops'
  category: string;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  expiry_date: string; // 'YYYY-MM-DD'
  storage_location: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  medication_id: string;
  transaction_type: TransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface StockHealthResult {
  status: 'adequate' | 'low' | 'critical';
  labelTh: 'มีเพียงพอ' | 'ต้องสั่งเพิ่ม' | 'วิกฤตใกล้หมด';
  percentage: number; // current_stock / min_stock_level * 100
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
}
```

### 2.2 PostgreSQL Stored Procedure (RPC) Contract (`supabase/migrations/03_rpc.sql`)

```sql
adjust_medication_stock(
    p_medication_id UUID,
    p_delta_quantity INT,
    p_transaction_type VARCHAR(30),
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
) -> Returns JSONB:
{
    "success": true,
    "previous_stock": 200,
    "new_stock": 250,
    "message": "ปรับปรุงยอดสต็อกสำเร็จ"
}
```

---

## 3. Stock Health & Expiry Calculation Algorithms

The pure business logic is deterministic, matching both Vitest test requirements (`tests/tier1_features/r3_medication_inventory.test.ts` and `tests/tier2_boundaries/stock_boundaries.test.ts`) and real-world clinical requirements:

```typescript
export function calculateStockHealth(currentStock: number, minStockLevel: number): {
  status: 'adequate' | 'low' | 'critical';
  labelTh: 'มีเพียงพอ' | 'ต้องสั่งเพิ่ม' | 'วิกฤตใกล้หมด';
} {
  if (currentStock < 0) {
    throw new Error('Stock cannot be negative');
  }
  if (minStockLevel < 0) {
    throw new Error('Min stock level cannot be negative');
  }

  if (currentStock <= minStockLevel * 0.5) {
    return { status: 'critical', labelTh: 'วิกฤตใกล้หมด' };
  } else if (currentStock <= minStockLevel) {
    return { status: 'low', labelTh: 'ต้องสั่งเพิ่ม' };
  } else {
    return { status: 'adequate', labelTh: 'มีเพียงพอ' };
  }
}

export function checkExpiryStatus(expiryDateStr: string): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiryDateStr);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysRemaining <= 0,
    isExpiringSoon: daysRemaining > 0 && daysRemaining <= 90, // Within 3 months
    daysRemaining,
  };
}
```

---

## 4. Subsystem Components & File Architecture

```
src/
├── services/
│   └── inventoryService.ts          # Core service layer (Supabase RPC + fallbackStorage)
├── hooks/
│   └── useInventory.ts              # Custom hook with debounced search, filters, realtime sync
├── components/
│   └── inventory/
│       ├── StockHealthBadge.tsx     # Status pill (Adequate, Reorder, Critical, Expiring)
│       ├── LowStockAlertBanner.tsx  # Warning banner highlighting critical items & quick restock
│       ├── InventoryFilterBar.tsx   # Search, health tabs, category dropdown, sort options
│       ├── InventoryStatsCards.tsx  # KPI summary cards (Total, Adequate, Low, Critical)
│       ├── MedicationCard.tsx       # Grid card for medication with progress bar & actions
│       ├── MedicationTableRow.tsx   # Responsive table row view for desktop & tablet
│       ├── StockAdjustmentModal.tsx # Transactional adjustment modal (Import/Dispense/Audit)
│       ├── InventoryLedgerModal.tsx # Audit ledger modal showing transaction history
│       ├── MedicationFormModal.tsx  # Add / Edit medication master data modal
│       ├── MedicationDetailModal.tsx# Comprehensive drug information modal
│       └── DeleteMedicationModal.tsx# Confirmation modal for medication removal
├── lib/
│   ├── fallbackStorage.ts           # Enhanced with inventory transactions & medication CRUD
│   └── mockMasterData.ts            # Master data & initial MOCK_INVENTORY_TRANSACTIONS
└── app/
    └── gun-inventory/
        └── page.tsx                 # Full-featured inventory management page (Staff/Student modes)
```

---

## 5. Step-by-Step Implementation Specifications

### Step 1: Enhance `src/lib/mockMasterData.ts` & `src/lib/fallbackStorage.ts`
1. Add `MOCK_INVENTORY_TRANSACTIONS: InventoryTransaction[]` to `mockMasterData.ts`.
2. Add `STORAGE_KEYS.INVENTORY_TRANSACTIONS` to `fallbackStorage.ts`.
3. Add Medication CRUD methods in `fallbackStorage`:
   - `addMedication(med)`
   - `updateMedication(id, updates)`
   - `deleteMedication(id)`
   - `getMedicationById(id)`
4. Add Transaction methods in `fallbackStorage`:
   - `getTransactions(medicationId?)`
   - `saveTransactions(transactions)`
   - `addTransaction(transaction)`
5. Upgrade `fallbackStorage.adjustMedicationStock()` to create and append `InventoryTransaction` records with previous/new stock values and trigger staff notifications on low stock.

### Step 2: Implement `src/services/inventoryService.ts`
1. Define typed parameters: `CreateMedicationInput`, `UpdateMedicationInput`, `AdjustStockParams`, `AdjustStockResponse`, `InventoryFilter`, `InventorySummary`.
2. Implement dual-mode functions:
   - `getMedications(filters)`: Queries Supabase `medications` or `fallbackStorage.getMedications()`.
   - `getMedicationById(id)`
   - `createMedication(input)`: Validates unique drug code and inserts to database / fallback.
   - `updateMedication(id, updates)`
   - `deleteMedication(id)`
   - `adjustStock(params)`: Executes RPC `adjust_medication_stock` on Supabase or `fallbackStorage.adjustMedicationStock()`.
   - `getTransactions(medicationId?, limit?)`: Retrieves audit records ordered by `created_at DESC`.
   - `getInventorySummary()`: Calculates total items, adequate count, low stock count, critical stock count, expiring count, and total stock volume.
   - Export pure helper functions: `calculateStockHealth` and `checkExpiryStatus`.

### Step 3: Implement `src/hooks/useInventory.ts`
1. Manage states:
   - `medications: Medication[]`
   - `transactions: InventoryTransaction[]`
   - `loading: boolean`
   - `error: string | null`
   - `searchTerm: string` and `debouncedSearchTerm: string` (300ms debounce)
   - `selectedCategory: string` ('all' | category string)
   - `selectedHealthStatus: string` ('all' | 'adequate' | 'low' | 'critical' | 'expiring')
   - `sortBy: string` ('name_asc' | 'stock_asc' | 'stock_desc' | 'expiry_asc' | 'code_asc')
2. Calculate memoized `summary` and `filteredMedications`.
3. Provide mutation handlers with optimistic UI updates:
   - `refreshInventory()`
   - `addMedication(input)`
   - `editMedication(id, updates)`
   - `removeMedication(id)`
   - `adjustStock(params)`
   - `fetchTransactionsForMedication(medicationId)`
4. Setup Supabase Realtime subscriptions on `medications` and `inventory_transactions` tables.

### Step 4: Build Modular UI Components in `src/components/inventory/`
1. `StockHealthBadge.tsx`: Clean pill badge with corresponding status color, icon, and label.
2. `LowStockAlertBanner.tsx`: Warning ribbon with count of urgent items, pill tags of critical drugs, and 1-click filter button.
3. `InventoryStatsCards.tsx`: 4 KPI metric cards (Total Master Items, Adequate Stock, Reorder Required, Critical / Out of Stock).
4. `InventoryFilterBar.tsx`:
   - Apple-style search input with icon and clear button.
   - Health status tabs with numeric badge badges.
   - Category selector and sorting options.
   - View mode toggle (Table view vs Grid cards).
5. `MedicationTableRow.tsx` & `MedicationCard.tsx`:
   - Displays Drug Code, Brand Name, Generic Name, Dosage, Category, Stock Level vs Min Stock bar gauge, Expiry date badge, and Storage location.
   - Quick action buttons: `ปรับสต็อก` (Adjust), `ประวัติ` (Ledger), `แก้ไข` (Edit), `ลบ` (Delete).
6. `StockAdjustmentModal.tsx`:
   - Interactive transaction modal with tabs:
     - 📥 **นำเข้าเวชภัณฑ์ (Import / Restock +)**
     - 📤 **จ่ายยา (Dispense -)**
     - ⚙️ **ปรับยอดตรวจนับ (Audit Adjustment $\pm$)**
     - 🗑️ **ตัดทิ้ง ยาชำรุด/หมดอายุ (Disposal -)**
     - 🔄 **รับคืนยา (Return +)**
   - Real-time balance preview calculation: Current $\to$ Delta $\to$ Resulting Stock, with immediate health badge preview.
   - Notes / Reason field and Reference ID field.
   - Validation preventing negative stock.
7. `InventoryLedgerModal.tsx`:
   - Comprehensive audit ledger table showing history of all stock modifications, delta quantities, actor role/name, notes, reference IDs, and timestamps.
8. `MedicationFormModal.tsx`:
   - Modal for adding or editing medication with form validation (Code, Name, Generic Name, Dosage, Form, Category, Stock, Min Stock, Unit, Expiry Date, Storage Location, Description).
9. `MedicationDetailModal.tsx`:
   - Full clinical details view with storage room, administration instructions, expiry countdown, and instant action trigger.
10. `DeleteMedicationModal.tsx`:
    - Safe deletion confirmation dialog.

### Step 5: Implement `src/app/gun-inventory/page.tsx`
1. Replace prototype mockup with full-featured interactive inventory page.
2. Connect with `useInventory()`, `useAuthContext()`, and `DemoRoleSwitcher`.
3. Implement RBAC view modes:
   - **Staff / Admin Mode**: Full CRUD, stock adjustment actions, ledger inspection, and add medication button.
   - **Student / Patient Mode**: Read-only public catalog view (checks clinic availability without operational actions).
4. Include loading skeletons, empty state, error banner, and developer attribution footer.

---

## 6. Verification & Test Plan

1. **Unit & Boundary Tests**:
   - `npm test tests/tier1_features/r3_medication_inventory.test.ts`
   - `npm test tests/tier2_boundaries/stock_boundaries.test.ts`
   - `npm test tests/tier3_interactions/low_stock_alert_flow.test.ts`
   - `npm test tests/tier4_scenarios/pharmacist_inventory_journey.test.ts`
2. **Full Test Suite Run**:
   - `npx vitest run` (Confirm all 111+ tests pass with zero regressions).
3. **Manual Interactive Verification**:
   - Verify adding a new medication updates the catalog and counters.
   - Verify stock adjustments (Restock and Dispense) correctly update balance, status badges, and transaction ledger.
   - Verify low-stock alert banner appears when stock $\le$ min stock and triggers staff notification.
   - Verify search debounce and category/health tab filters.
   - Verify RBAC behavior between Student and Staff roles.
