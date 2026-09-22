export type Medication = {
  id: string;
  name: string;
  type: string;
  category: string;
  stock: number;
  min_stock: number;
  expiry_date: string | null;
  is_deleted?: boolean;
};

export const MOCK_DB = {
  MOCK_MEDICATIONS: [
    { id: "1", name: "Paracetamol 500mg", type: "ยาเม็ด (Tablet)", category: "ยาลดไข้/ปวด", stock: 500, min_stock: 100, expiry_date: "2025-12-31" },
    { id: "2", name: "Amoxicillin 250mg", type: "แคปซูล (Capsule)", category: "ยาปฏิชีวนะ", stock: 50, min_stock: 100, expiry_date: "2024-10-15" },
    { id: "3", name: "Ibuprofen 400mg", type: "ยาเม็ด (Tablet)", category: "ยาลดไข้/ปวด", stock: 10, min_stock: 50, expiry_date: "2024-05-01" },
    { id: "4", name: "Cetirizine 10mg", type: "ยาเม็ด (Tablet)", category: "ยาแก้แพ้", stock: 200, min_stock: 50, expiry_date: "2026-06-30" },
    { id: "5", name: "Vitamin C 1000mg", type: "ยาเม็ด (Tablet)", category: "วิตามิน", stock: 80, min_stock: 100, expiry_date: "2024-12-01" },
    { id: "6", name: "Omeprazole 20mg", type: "แคปซูล (Capsule)", category: "ยาโรคกระเพาะ", stock: 150, min_stock: 50, expiry_date: "2026-03-15" },
    { id: "7", name: "Simvastatin 10mg", type: "ยาเม็ด (Tablet)", category: "ยาลดไขมัน", stock: 300, min_stock: 150, expiry_date: "2027-01-20" },
    { id: "8", name: "Metformin 500mg", type: "ยาเม็ด (Tablet)", category: "ยารักษาเบาหวาน", stock: 400, min_stock: 200, expiry_date: "2025-08-10" },
    { id: "9", name: "Amlodipine 5mg", type: "ยาเม็ด (Tablet)", category: "ยาลดความดัน", stock: 250, min_stock: 100, expiry_date: "2026-11-05" },
    { id: "10", name: "Loratadine 10mg", type: "ยาเม็ด (Tablet)", category: "ยาแก้แพ้", stock: 45, min_stock: 50, expiry_date: "2025-02-28" },
    { id: "11", name: "Diclofenac 1%", type: "ครีม/ขี้ผึ้ง (Ointment)", category: "ยาทาภายนอก", stock: 5, min_stock: 20, expiry_date: "2024-09-30" },
    { id: "12", name: "Salbutamol Inhaler", type: "น้ำ (Solution)", category: "ยาขยายหลอดลม", stock: 30, min_stock: 50, expiry_date: "2025-05-15" },
    { id: "13", name: "Mylanta", type: "ยาน้ำ (Syrup)", category: "ยาโรคกระเพาะ", stock: 120, min_stock: 50, expiry_date: "2026-07-22" },
    { id: "14", name: "Chlorpheniramine 4mg", type: "ยาเม็ด (Tablet)", category: "ยาแก้แพ้", stock: 1000, min_stock: 300, expiry_date: "2027-12-31" },
    { id: "15", name: "ORS (ผงเกลือแร่)", type: "ผง (Powder)", category: "เกลือแร่", stock: 15, min_stock: 100, expiry_date: "2025-04-10" },
  ] as Medication[]
};
