'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertOctagon,
  ArrowDownToLine,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Hash,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type { Medication, MedicationProcurement, PackageBreakdown } from '@/types/database';
import PackagingEditor from './PackagingEditor';
import ReceiptCorrectionFields from './ReceiptCorrectionFields';
import { packagingTotal, packagingSummary } from '@/features/pharmacy/packaging';
import { procurementRepository } from '@/services/procurementService';

function ViewportPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function formatDisplayDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function isValidUUID(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const COMMON_CATEGORIES = [
  'ยาแก้ปวดลดไข้',
  'ยาปฏิชีวนะ',
  'ยาระบบทางเดินอาหาร',
  'ยาแก้แพ้',
  'ยาแก้ปวดภายนอก',
  'ยาระบบทางเดินหายใจ',
  'ยาหยอดตา/หู',
  'วิตามิน/เกลือแร่',
  'เวชภัณฑ์ทำแผล',
  'ยาและเวชภัณฑ์ทั่วไป',
];

const TYPE_OPTIONS = [
  'เม็ด',
  'แคปซูล',
  'ยาน้ำ',
  'ยาฉีด',
  'ผง',
  'น้ำ',
  'ครีม/เจล',
  'ขี้ผึ้ง',
  'เม็ดอม',
  'ยาหยอดตา/หู',
  'ยาพ่นสูด',
  'แผ่นแปะ',
  'เวชภัณฑ์ทั่วไป',
];

const DEFAULT_UNIT_BY_TYPE: Record<string, string> = {
  'เม็ด': 'เม็ด',
  'แคปซูล': 'แคปซูล',
  'ยาน้ำ': 'ขวด',
  'ผง': 'ซอง',
  'ยาผง': 'ซอง',
  'น้ำ': 'ขวด',
  'ครีม/เจล': 'หลอด',
  'ขี้ผึ้ง': 'หลอด',
  'เม็ดอม': 'เม็ด',
  'ยาฉีด': 'แอมพูล (Ampoule)',
  'ยาหยอดตา/หู': 'ขวด',
  'ยาพ่นสูด': 'ขวด',
  'แผ่นแปะ': 'แผ่น',
  'เวชภัณฑ์ทั่วไป': 'ชิ้น',
};

export type ProcurementSortOption =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'units_desc'
  | 'units_asc';

export interface MedicationProcurementsTabProps {
  medications: Medication[];
  canManage: boolean;
  isAdminOrStaff: boolean;
  userId?: string;
  userName?: string;
  onRefresh: () => Promise<void>;
  onStockUpdated: () => Promise<void>;
  onShowToast: (message: string) => void;
  isAddModalOpen?: boolean;
  onOpenAddModal?: () => void;
  onCloseAddModal?: () => void;
  refreshKey?: number;
}

export default function MedicationProcurementsTab({
  medications,
  canManage,
  onRefresh,
  onStockUpdated,
  onShowToast,
  isAddModalOpen: isAddModalOpenProp,
  onOpenAddModal,
  onCloseAddModal,
  refreshKey,
}: MedicationProcurementsTabProps) {
  const [procurements, setProcurements] = useState<MedicationProcurement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'imported'>('all');
  const [sortBy, setSortBy] = useState<ProcurementSortOption>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('clinic_procurement_sort_by');
        if (
          saved &&
          ['newest', 'oldest', 'name_asc', 'name_desc', 'units_desc', 'units_asc'].includes(saved)
        ) {
          return saved as ProcurementSortOption;
        }
      } catch {
        // ignore
      }
    }
    return 'newest';
  });

  const handleSortChange = (newSort: ProcurementSortOption) => {
    setSortBy(newSort);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('clinic_procurement_sort_by', newSort);
      } catch {
        // ignore
      }
    }
  };

  // Modal 1: Create Procurement Order (สั่งยาเพิ่ม)
  const [internalAddModalOpen, setInternalAddModalOpen] = useState<boolean>(false);
  const isAddModalControlled = typeof isAddModalOpenProp === 'boolean';
  const isAddModalOpen = isAddModalControlled ? isAddModalOpenProp : internalAddModalOpen;
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [customMedName, setCustomMedName] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>(() => {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `PO-${dateStr}-${rand}`;
  });
  const [supplier, setSupplier] = useState<string>('');
  const [orderedDate, setOrderedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [orderNotes, setOrderNotes] = useState<string>('');

  const [addPackaging, setAddPackaging] = useState<PackageBreakdown>({ units: 0 });
  const [editPackaging, setEditPackaging] = useState<PackageBreakdown>({ units: 0 });
  const [correctionQuantity, setCorrectionQuantity] = useState(0);
  const [correctionReason, setCorrectionReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [targetUnit, setTargetUnit] = useState<string>('เม็ด');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Modal 2: Import / Receive Stock (นำเข้าคลังยา)
  const [importTarget, setImportTarget] = useState<MedicationProcurement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'new_item'>('merge');
  const [importSelectedMedId, setImportSelectedMedId] = useState<string>('');
  // New item fields
  const [importNewName, setImportNewName] = useState<string>('');
  const [importNewDosage, setImportNewDosage] = useState<string>('');
  const [importNewBrand, setImportNewBrand] = useState<string>('');
  const [importNewType, setImportNewType] = useState<string>('เม็ด');
  const [importNewUnit, setImportNewUnit] = useState<string>('เม็ด');
  const [importNewCategory, setImportNewCategory] = useState<string>('ยาและเวชภัณฑ์ทั่วไป');
  const [importNewCoverage, setImportNewCoverage] = useState<'covered' | 'non_covered'>('covered');
  const [importNewManufacturer, setImportNewManufacturer] = useState<string>('');
  const [importNewMinStock, setImportNewMinStock] = useState<number | ''>(30);
  // Receiving fields
  const [importLotNumber, setImportLotNumber] = useState<string>('');
  const [importExpiryDate, setImportExpiryDate] = useState<string>('');
  const [importMfgDate, setImportMfgDate] = useState<string>('');
  const [importActualUnits, setImportActualUnits] = useState<number>(0);
  const [importNotes, setImportNotes] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Modal 3: Delete Procurement Order (ลบประวัติสั่งซื้อ)
  const [deleteTarget, setDeleteTarget] = useState<MedicationProcurement | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  // Modal 4: Edit Procurement Order (แก้ไขคำสั่งซื้อ)
  const [editTarget, setEditTarget] = useState<MedicationProcurement | null>(null);
  const [editMedicationId, setEditMedicationId] = useState<string>('');
  const [editMedicationName, setEditMedicationName] = useState<string>('');
  const [editOrderNumber, setEditOrderNumber] = useState<string>('');
  const [editSupplier, setEditSupplier] = useState<string>('');
  const [editOrderedDate, setEditOrderedDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editTargetUnit, setEditTargetUnit] = useState<string>('เม็ด');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleCloseAddModal = useCallback(() => {
    if (onCloseAddModal) onCloseAddModal();
    setInternalAddModalOpen(false);
  }, [onCloseAddModal]);

  const handleGeneratePONumber = useCallback(() => {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    setOrderNumber(`PO-${dateStr}-${rand}`);
  }, []);

  const resetAddOrderForm = useCallback(() => {
    setSelectedMedicationId('');
    setCustomMedName('');
    handleGeneratePONumber();
    setSupplier('');
    setOrderedDate(new Date().toISOString().slice(0, 10));
    setOrderNotes('');
    setAddPackaging({ units: 0 });
    setTargetUnit('เม็ด');
  }, [handleGeneratePONumber]);

  const handleOpenAddModal = useCallback(() => {
    resetAddOrderForm();
    if (onOpenAddModal) {
      onOpenAddModal();
    } else {
      setInternalAddModalOpen(true);
    }
  }, [onOpenAddModal, resetAddOrderForm]);

  // Load from Supabase (Pure DB runtime, no mock)
  const loadProcurements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await procurementRepository.list();

      setProcurements(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลประวัติการสั่งซื้อได้';
      setErrorMessage(msg);
      setProcurements([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await procurementRepository.list();

        if (!ignore) {
          setProcurements(data || []);
          setErrorMessage(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลประวัติการสั่งซื้อได้';
          setErrorMessage(msg);
          setProcurements([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const calculatedTotalUnits = packagingTotal(addPackaging, targetUnit);
  const packageTypeSummary = packagingSummary(addPackaging, targetUnit);
  const editCalculatedUnits = packagingTotal(editPackaging, editTargetUnit);
  const editPackageSummary = packagingSummary(editPackaging, editTargetUnit);

  // Submit Add Procurement Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    let medName = customMedName.trim();
    let medId: string | null = null;
    if (selectedMedicationId && selectedMedicationId !== '__custom__') {
      const found = medications.find((m) => m.id === selectedMedicationId);
      if (found) {
        medName = found.name;
        medId = found.id;
      }
    }

    if (!medName) {
      alert('กรุณาเลือกรายการยาหรือระบุชื่อยาใหม่');
      return;
    }

    if (!Number.isInteger(calculatedTotalUnits) || calculatedTotalUnits <= 0) {
      alert('จำนวนรวมของยาต้องมากกว่า 0');
      return;
    }

    setIsSubmittingOrder(true);

    const breakdown: PackageBreakdown = { ...addPackaging, package_type_note: packageTypeSummary };

    const generatedId = generateUUID();
    const validMedId = isValidUUID(medId) ? medId : null;

    const newOrder = {
      id: generatedId,
      medication_id: validMedId,
      medication_name: medName,
      order_number: orderNumber.trim() || null,
      supplier: supplier.trim() || null,
      package_breakdown: breakdown,
      total_units: calculatedTotalUnits,
      unit: targetUnit,
      ordered_at: orderedDate || new Date().toISOString().slice(0, 10),
      notes: orderNotes.trim() || null,
    };

    try {
      await procurementRepository.create(newOrder);

      await loadProcurements();
      onShowToast(`บันทึกคำสั่งซื้อ "${medName}" (${calculatedTotalUnits.toLocaleString()} ${targetUnit}) สำเร็จ`);
      handleCloseAddModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกคำสั่งซื้อได้';
      alert(`ดำเนินการไม่สำเร็จ: ${msg}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MedicationProcurement) => {
    setEditTarget(item);
    setEditError(null);
    setEditMedicationId(item.medication_id || '__custom__');
    setEditMedicationName(item.medication_name || '');
    setEditOrderNumber(item.order_number || '');
    setEditSupplier(item.supplier || '');
    setEditOrderedDate(item.ordered_at ? item.ordered_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditNotes(item.notes || '');
    setEditTargetUnit(item.unit || 'เม็ด');

    const bk = item.package_breakdown ?? {};
    const loose = bk.units ?? Math.max(0, item.total_units - packagingTotal({ ...bk, units: 0 }, item.unit));
    setEditPackaging({ ...bk, units: loose });
    setCorrectionQuantity(item.received_units ?? item.total_units);
    setCorrectionReason('');
  };

  // Submit Edit Order
  const handleSubmitEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !canManage) return;

    if (!editMedicationName.trim()) {
      setEditError('กรุณากรอกชื่อยา');
      return;
    }
    if (editTarget.status !== 'imported' && (!Number.isInteger(editCalculatedUnits) || editCalculatedUnits <= 0)) {
      setEditError('จำนวนรวมต้องมากกว่า 0');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    const breakdown: PackageBreakdown = { ...editPackaging, package_type_note: editPackageSummary };

    const validMedId = isValidUUID(editMedicationId) ? editMedicationId : null;

    const updatedPayload = {
      medication_id: validMedId,
      medication_name: editMedicationName.trim(),
      order_number: editOrderNumber.trim() || null,
      supplier: editSupplier.trim() || null,
      ordered_at: editOrderedDate || editTarget.ordered_at,
      total_units: editCalculatedUnits,
      unit: editTargetUnit.trim() || 'เม็ด',
      package_breakdown: breakdown,
      notes: editNotes.trim() || null,
    };

    try {
      if (editTarget.status === 'imported') {
        await procurementRepository.correct(editTarget.id, editTarget.updated_at, correctionQuantity, correctionReason, {
          order_number: updatedPayload.order_number, supplier: updatedPayload.supplier,
          ordered_at: updatedPayload.ordered_at, notes: updatedPayload.notes,
        });
        await onStockUpdated();
      } else {
        await procurementRepository.update(editTarget.id, updatedPayload);
      }

      onShowToast(`อัปเดตคำสั่งซื้อ "${editMedicationName}" เรียบร้อยแล้ว`);
      setEditTarget(null);
      await loadProcurements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถแก้ไขข้อมูลคำสั่งซื้อได้';
      setEditError(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Delete Order
  const handleConfirmDeleteOrder = async () => {
    if (!deleteTarget || !canManage) return;
    setIsDeletingOrder(true);
    try {
      if (deleteTarget.status === 'imported') {
        await procurementRepository.cancelReceipt(deleteTarget.id, deleteTarget.updated_at, deleteReason);
        await onStockUpdated();
      } else {
        await procurementRepository.remove(deleteTarget.id);
      }

      onShowToast(`${deleteTarget.status === 'imported' ? 'ยกเลิกการรับเข้า' : 'ลบคำสั่งซื้อ'} "${deleteTarget.medication_name}" สำเร็จ`);
      setDeleteTarget(null);
      await loadProcurements();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบประวัติคำสั่งซื้อได้';
      setDeleteError(msg);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Open Import Modal
  const handleOpenImportModal = (item: MedicationProcurement) => {
    setImportTarget(item);
    setImportLotNumber(item.lot_number || `LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
    setImportExpiryDate(item.expiry_date || '');
    setImportMfgDate(item.mfg_date || '');
    setImportActualUnits(item.total_units);
    setImportNotes('');
    setImportError(null);

    let matched: Medication | undefined;
    if (item.medication_id) {
      matched = medications.find((m) => m.id === item.medication_id);
    }
    if (!matched) {
      matched = medications.find(
        (m) => m.name.trim().toLowerCase() === item.medication_name.trim().toLowerCase()
      );
    }

    if (matched) {
      setImportMode('merge');
      setImportSelectedMedId(matched.id);
    } else {
      setImportMode(medications.length > 0 ? 'merge' : 'new_item');
      setImportSelectedMedId(medications[0]?.id || '');
    }

    setImportNewName(item.medication_name || '');
    setImportNewDosage(matched?.dosage || '');
    setImportNewBrand(matched?.brand_name || '');
    setImportNewType(matched?.type || (TYPE_OPTIONS.includes(item.unit) ? item.unit : 'เม็ด'));
    setImportNewUnit(item.unit || matched?.unit || 'เม็ด');
    setImportNewCategory(matched?.category || 'ยาแก้ปวดลดไข้');
    setImportNewCoverage((matched?.coverage_type as 'covered' | 'non_covered') || 'covered');
    setImportNewManufacturer(item.supplier || matched?.manufacturer || '');
    setImportNewMinStock(typeof matched?.min_stock === 'number' ? matched.min_stock : 30);
  };

  // Confirm Import into Stock
  const handleConfirmImport = async () => {
    if (!importTarget || !canManage) return;

    if (!Number.isInteger(importActualUnits) || importActualUnits <= 0) {
      setImportError('จำนวนยาที่ตรวจรับต้องมากกว่า 0');
      return;
    }

    if (importMode === 'merge') {
      if (!importSelectedMedId) {
        setImportError('กรุณาเลือกรายการยาในคลังที่จะนำเข้ารวมสต็อก');
        return;
      }
    } else {
      if (!importNewName.trim()) {
        setImportError('กรุณาระบุชื่อยาสำหรับรายการยาใหม่');
        return;
      }
      if (!importNewUnit.trim()) {
        setImportError('กรุณาระบุหน่วยจ่ายย่อยของรายการยาใหม่');
        return;
      }
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const finalMedName = importMode === 'merge'
        ? medications.find((m) => m.id === importSelectedMedId)?.name ?? importTarget.medication_name
        : importNewName.trim();
      await procurementRepository.receive({
        procurementId: importTarget.id,
        medicationId: importMode === 'merge' ? importSelectedMedId : null,
        quantity: importActualUnits,
        lotNumber: importLotNumber.trim() || null,
        expiryDate: importExpiryDate || null,
        mfgDate: importMfgDate || null,
        notes: importNotes.trim() || null,
        newMedication: importMode === 'new_item' ? {
          name: importNewName.trim(), dosage: importNewDosage.trim() || null,
          brand_name: importNewBrand.trim() || null, type: importNewType,
          unit: importNewUnit.trim(), category: importNewCategory,
          coverage_type: importNewCoverage, manufacturer: importNewManufacturer.trim() || null,
          min_stock: typeof importNewMinStock === 'number' ? importNewMinStock : 30,
        } : null,
      });

      const actionText = importMode === 'merge' ? 'ตรวจรับเข้ารวมสต็อกเดิม' : 'สร้างรายการยาใหม่และนำเข้าคลัง';
      onShowToast(`${actionText} "${finalMedName}" เรียบร้อย (+${importActualUnits.toLocaleString()} ${importMode === 'new_item' ? importNewUnit : importTarget.unit})`);
      setImportTarget(null);
      await loadProcurements();
      await onStockUpdated();
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการนำเข้าคลังยา';
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered procurements
  const filteredProcurements = useMemo(() => {
    let result = [...procurements];

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.medication_name || '').toLowerCase().includes(q) ||
          (p.order_number && p.order_number.toLowerCase().includes(q)) ||
          (p.supplier && p.supplier.toLowerCase().includes(q)) ||
          (p.lot_number && p.lot_number.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    const getTime = (val?: string | null) => {
      if (!val) return 0;
      const t = new Date(val.includes('T') ? val : `${val}T12:00:00`).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = getTime(a.ordered_at);
        const timeB = getTime(b.ordered_at);
        let diff = timeB - timeA;
        if (diff === 0) {
          // Fallback to created_at if ordered on the same date
          const createdA = getTime(a.created_at);
          const createdB = getTime(b.created_at);
          diff = createdB - createdA;
        }
        if (diff === 0) {
          diff = (b.order_number || b.id || '').localeCompare(a.order_number || a.id || '');
        }
        return diff;
      }

      if (sortBy === 'oldest') {
        const timeA = getTime(a.ordered_at);
        const timeB = getTime(b.ordered_at);
        let diff = timeA - timeB;
        if (diff === 0) {
          // Fallback to created_at if ordered on the same date
          const createdA = getTime(a.created_at);
          const createdB = getTime(b.created_at);
          diff = createdA - createdB;
        }
        if (diff === 0) {
          diff = (a.order_number || a.id || '').localeCompare(b.order_number || b.id || '');
        }
        return diff;
      }

      if (sortBy === 'name_asc') {
        const diff = (a.medication_name || '').localeCompare(b.medication_name || '', 'th');
        if (diff !== 0) return diff;
        return getTime(b.created_at) - getTime(a.created_at);
      }

      if (sortBy === 'name_desc') {
        const diff = (b.medication_name || '').localeCompare(a.medication_name || '', 'th');
        if (diff !== 0) return diff;
        return getTime(b.created_at) - getTime(a.created_at);
      }

      if (sortBy === 'units_desc') {
        const diff = (b.total_units || 0) - (a.total_units || 0);
        if (diff !== 0) return diff;
        return getTime(b.created_at) - getTime(a.created_at);
      }

      if (sortBy === 'units_asc') {
        const diff = (a.total_units || 0) - (b.total_units || 0);
        if (diff !== 0) return diff;
        return getTime(b.created_at) - getTime(a.created_at);
      }

      return 0;
    });

    return result;
  }, [procurements, statusFilter, searchQuery, sortBy]);

  // Statistics
  const pendingCount = useMemo(() => procurements.filter((p) => p.status === 'pending').length, [procurements]);
  const importedCount = useMemo(() => procurements.filter((p) => p.status === 'imported').length, [procurements]);

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards - Styled identically to Medication Inventory page */}
      <section
        className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4 sm:gap-x-8 border-b border-slate-200 pb-2"
        aria-label="สรุปสถานะการสั่งซื้อยา"
      >
        {[
          {
            key: 'all' as const,
            label: 'รายการสั่งซื้อทั้งหมด',
            value: procurements.length,
            sub: 'ประวัติการสั่งซื้อทั้งหมด',
            icon: Package,
            iconColorActive: 'text-brand-strong',
          },
          {
            key: 'pending' as const,
            label: 'รอนำเข้าคลัง',
            value: pendingCount,
            sub: 'ยังไม่ได้ตรวจรับเข้าสต็อก',
            icon: Clock,
            iconColorActive: 'text-amber-600',
          },
          {
            key: 'imported' as const,
            label: 'นำเข้าคลังแล้ว',
            value: importedCount,
            sub: 'ตรวจรับเข้าสต็อกแล้ว',
            icon: CheckCircle2,
            iconColorActive: 'text-emerald-600',
          },
        ].map((item) => {
          const isSelected = statusFilter === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              aria-pressed={isSelected}
              className={`border-b-2 px-1 py-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong cursor-pointer ${
                isSelected
                  ? 'border-brand-strong text-brand-strong opacity-100 font-semibold'
                  : 'border-transparent text-slate-700 opacity-40 hover:opacity-80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-xs sm:text-sm ${
                      isSelected ? 'font-bold text-brand-ink' : 'font-medium text-slate-600'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                    {item.sub}
                  </p>
                </div>
                <Icon
                  className={`size-5 shrink-0 transition-colors ${
                    isSelected ? item.iconColorActive : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <p
                className={`mt-3 text-2xl sm:text-3xl font-bold ${
                  isSelected ? 'text-slate-950' : 'text-slate-700'
                }`}
              >
                {item.value}
              </p>
            </button>
          );
        })}
      </section>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
            <p className="mt-0.5 text-rose-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Table Card with Integrated Search & Filter Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Table Card Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between bg-white">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">ประวัติการสั่งซื้อและนำเข้ายา</h2>
            <p className="mt-1 text-sm text-slate-500">
              แสดง {filteredProcurements.length} จาก {procurements.length} รายการ
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อยา, เลขที่ PO, ผู้จัดจำหน่าย..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as ProcurementSortOption)}
              className="h-11 w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft cursor-pointer"
            >
              <option value="newest">ใหม่ไปเก่า</option>
              <option value="oldest">เก่าไปใหม่</option>
              <option value="name_asc">ชื่อยา ก-ฮ</option>
              <option value="name_desc">ชื่อยา ฮ-ก</option>
              <option value="units_desc">ยอดหน่วยย่อย มากไปน้อย</option>
              <option value="units_asc">ยอดหน่วยย่อย น้อยไปมาก</option>
            </select>
          </div>
        </div>

        <div className="p-4 sm:p-5">

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดรายการสั่งซื้อยา...</p>
        </div>
      ) : filteredProcurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">ไม่พบรายการสั่งซื้อยา</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา ลองตรวจสอบคำค้นหาอีกครั้ง'
              : 'ยังไม่มีประวัติการสั่งซื้อยาเข้าคลัง กดปุ่ม "สั่งยาเพิ่ม" ด้านบนเพื่อบันทึกคำสั่งซื้อใหม่'}
          </p>
          {canManage && !searchQuery && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-strong px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>สั่งยาเพิ่มเดี๋ยวนี้</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredProcurements.map((item) => {
            const isPending = item.status === 'pending';
            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border bg-white p-4 sm:p-5 transition hover:shadow-md ${
                  isPending ? 'border-amber-200/80 shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-slate-900 truncate">
                        {item.medication_name}
                      </span>
                      {item.order_number && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          <Hash className="h-3 w-3 text-slate-400" />
                          {item.order_number}
                        </span>
                      )}
                      {item.status === 'cancelled' ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">ยกเลิกการรับเข้าแล้ว</span> : isPending ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          <Clock className="h-3 w-3" />
                          รอนำเข้าคลัง
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <CheckCircle2 className="h-3 w-3" />
                          นำเข้าแล้ว
                        </span>
                      )}
                    </div>

                    {/* Breakdown pill */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                      <Boxes className="h-3.5 w-3.5 text-brand-strong shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {item.package_breakdown?.package_type_note ||
                          `${item.total_units.toLocaleString()} ${item.unit}`}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        วันที่สั่ง: {formatDisplayDate(item.ordered_at)}
                      </span>
                      {item.supplier && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          ผู้จัดจำหน่าย: <strong className="text-slate-700 font-medium">{item.supplier}</strong>
                        </span>
                      )}
                      {item.imported_at && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <FileCheck className="h-3 w-3" />
                          นำเข้าเมื่อ: {formatDisplayDateTime(item.imported_at)}
                        </span>
                      )}
                      {item.lot_number && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          Lot: <span className="font-mono">{item.lot_number}</span>
                        </span>
                      )}
                      {item.expiry_date && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          Exp: {formatDisplayDate(item.expiry_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Units & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 block">ยอดหน่วยย่อย</span>
                      <span className="text-xl font-bold text-slate-900">
                        {(item.received_units ?? item.total_units).toLocaleString()}
                      </span>{' '}
                      <span className="text-xs font-semibold text-slate-600">{item.unit}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {item.status === 'cancelled' ? <span className="text-xs text-brand-muted">ย้อนยอดสต็อกแล้ว</span> : isPending ? (
                        canManage ? (
                          <button
                            type="button"
                            onClick={() => handleOpenImportModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                            title="ตรวจรับและนำเข้าคลังยา"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            <span>นำเข้าคลังยา</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">รอดำเนินการ</span>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-inset ring-emerald-600/20">
                          <Check className="h-3.5 w-3.5" />
                          <span>นำเข้าแล้ว</span>
                        </div>
                      )}

                      {canManage && item.status !== 'cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition"
                            title="แก้ไขประวัติคำสั่งซื้อ"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget(item); setDeleteReason(''); setDeleteError(null); }}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 active:scale-95 transition"
                            title="ลบคำสั่งซื้อนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            <span>ลบ</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Modal 1: Create Procurement Order (สั่งยาเพิ่ม) */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <ViewportPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">สั่งยาเพิ่ม / บันทึกการสั่งซื้อ</h3>
                    <p className="text-xs text-slate-500">บันทึกประวัติการสั่งยาและระบุบรรจุภัณฑ์ก่อนตรวจรับเข้าคลัง</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  disabled={isSubmittingOrder}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitOrder} className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                {/* 1. Medication Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลือกรายการยาในคลัง <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMedicationId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedMedicationId(newId);
                      const found = medications.find((m) => m.id === newId);
                      if (found?.unit) setTargetUnit(found.unit);
                      if (newId !== '__custom__') {
                        setCustomMedName('');
                      }
                    }}
                    className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- เลือกยาจากคลัง ({medications.length} รายการ) --</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.dosage ? `(${m.dosage})` : ''} - คงเหลือ {m.stock} {m.unit}
                      </option>
                    ))}
                    <option value="__custom__">+ ยาใหม่ที่ยังไม่มีในคลัง</option>
                  </select>
                </div>

                {/* Custom Medication Name */}
                {(!selectedMedicationId || selectedMedicationId === '__custom__') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อยา / เวชภัณฑ์ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customMedName}
                      onChange={(e) => setCustomMedName(e.target.value)}
                      placeholder="เช่น Paracetamol 500mg, Amoxicillin 500mg"
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* 2. Order Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">เลขที่ใบสั่งซื้อ (PO)</label>
                      <button
                        type="button"
                        onClick={handleGeneratePONumber}
                        className="text-xs text-brand-strong hover:underline inline-flex items-center gap-0.5 font-medium"
                      >
                        <Sparkles className="h-3 w-3" />
                        สุ่มเลขใหม่
                      </button>
                    </div>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="PO-YYMMDD-XXX"
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-mono text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่สั่งซื้อ</label>
                    <input
                      type="date"
                      value={orderedDate}
                      onChange={(e) => setOrderedDate(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้จัดจำหน่าย / บริษัทคู่ค้า</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="เช่น องค์การเภสัชกรรม (GPO), Zuellig Pharma"
                    className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                  />
                </div>

                </div><div className="space-y-4">
                <PackagingEditor value={addPackaging} unit={targetUnit} onChange={setAddPackaging} onUnitChange={setTargetUnit} unitLocked={Boolean(selectedMedicationId && selectedMedicationId !== '__custom__')} />
                {/* 4. Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="เช่น ยาแถม 1 กล่อง, ต้องจัดเก็บที่อุณหภูมิ 2-8 °C..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                  />
                </div>

                {/* Modal Footer */}
                </div>
                <div className="sticky bottom-0 col-span-full flex items-center justify-end gap-2 border-t border-slate-100 bg-white py-3">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    disabled={isSubmittingOrder}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-brand-hover active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>บันทึกคำสั่งซื้อ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* ======================================================== */}
      {/* Modal 2: Import Stock (นำเข้าคลังยา) */}
      {/* ======================================================== */}
      {importTarget && (
        <ViewportPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <ArrowDownToLine className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">ตรวจรับและนำเข้าคลังยา</h3>
                    <p className="text-xs text-slate-500">อัปเดตยอดสต็อกจริงของรายการยา</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImportTarget(null)}
                  disabled={isImporting}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Order Info Summary */}
              {(() => {
                const matchedMed = importTarget.medication_id
                  ? medications.find((m) => m.id === importTarget.medication_id)
                  : medications.find((m) => m.name.trim().toLowerCase() === importTarget.medication_name.trim().toLowerCase());
                return (
                  <div className="rounded-2xl border border-brand-border-soft bg-brand-surface p-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{importTarget.medication_name}</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong ring-1 ring-inset ring-brand-border/30">
                        Auto-filled
                      </span>
                    </div>
                    {matchedMed?.category && (
                      <div className="text-xs text-slate-600">
                        <span>หมวดหมู่ยา: </span>
                        <strong className="text-slate-800 font-semibold">{matchedMed.category}</strong>
                      </div>
                    )}
                    <div className="text-xs text-slate-600">
                      <span>ยอดสั่งซื้อตามบรรจุภัณฑ์: </span>
                      <strong className="text-slate-800 font-semibold">{importTarget.package_breakdown?.package_type_note || '-'}</strong>
                    </div>
                    {matchedMed && (
                      <div className="text-xs text-slate-600">
                        <span>สต็อกคงเหลือปัจจุบัน: </span>
                        <strong className="text-slate-800 font-semibold">{matchedMed.stock} {matchedMed.unit}</strong>
                      </div>
                    )}
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>ยอดคำนวณสุทธิ:</span>
                      <span className="text-base font-bold text-brand-ink">
                        {importTarget.total_units.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-brand-strong">{importTarget.unit}</span>
                    </div>
                  </div>
                );
              })()}

              {importError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                {/* 1. Import Mode Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    รูปแบบการนำเข้าคลังยา <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition ${
                        importMode === 'merge'
                          ? 'bg-white text-brand-strong shadow-xs border border-brand-border-strong'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Boxes className="h-4 w-4 shrink-0 text-brand-strong" />
                      <span>นำเข้ารวมกับยาเดิม</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('new_item')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition ${
                        importMode === 'new_item'
                          ? 'bg-white text-brand-strong shadow-xs border border-brand-border-strong'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Plus className="h-4 w-4 shrink-0 text-brand-strong" />
                      <span>แยกเป็นรายการยาใหม่</span>
                    </button>
                  </div>
                </div>

                {/* 2. Mode-specific content */}
                {importMode === 'merge' ? (
                  <div className="space-y-3 rounded-2xl border border-brand-border-soft bg-brand-surface p-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เลือกรายการยาในคลังที่จะรวมสต็อก <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={importSelectedMedId}
                        onChange={(e) => setImportSelectedMedId(e.target.value)}
                        className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                      >
                        <option value="">-- เลือกรายการยาเดิมในคลัง --</option>
                        {medications.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.dosage ? `(${m.dosage})` : ''} - สต็อกปัจจุบัน {m.stock} {m.unit || 'หน่วย'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(() => {
                      const selectedMed = medications.find((m) => m.id === importSelectedMedId);
                      if (!selectedMed) return null;
                      return (
                        <div className="rounded-xl border border-brand-border-soft bg-white p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>สต็อกคงเหลือเดิม:</span>
                            <span className="font-semibold text-slate-800">
                              {Number(selectedMed.stock || 0).toLocaleString()} {selectedMed.unit || importTarget.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-700">
                            <span>ยอดที่ตรวจรับเพิ่ม:</span>
                            <span className="font-semibold">
                              +{Number(importActualUnits || 0).toLocaleString()} {selectedMed.unit || importTarget.unit}
                            </span>
                          </div>
                          <div className="border-t border-slate-100 pt-1.5 flex items-center justify-between font-semibold text-slate-900">
                            <span>ยอดรวมใหม่หลังนำเข้า:</span>
                            <span className="text-sm font-bold text-brand-strong">
                              {(Number(selectedMed.stock || 0) + Number(importActualUnits || 0)).toLocaleString()} {selectedMed.unit || importTarget.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-brand-border-soft bg-brand-surface p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand-ink border-b border-brand-border-soft pb-2">
                      <Sparkles className="h-4 w-4 text-brand-strong" />
                      <span>ข้อมูลลงทะเบียนรายการยาใหม่ในคลัง</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          ชื่อยา (Generic / Trade Name) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={importNewName}
                          onChange={(e) => setImportNewName(e.target.value)}
                          placeholder="เช่น Paracetamol 500mg"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ขนาดยา (Dosage)</label>
                        <input
                          type="text"
                          value={importNewDosage}
                          onChange={(e) => setImportNewDosage(e.target.value)}
                          placeholder="เช่น 500mg, 10ml"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ยี่ห้อ / ชื่อการค้า (Brand)</label>
                        <input
                          type="text"
                          value={importNewBrand}
                          onChange={(e) => setImportNewBrand(e.target.value)}
                          placeholder="เช่น Sara, Tylenol"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          รูปแบบยา (Type) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={importNewType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setImportNewType(nextType);
                            if (DEFAULT_UNIT_BY_TYPE[nextType]) {
                              setImportNewUnit(DEFAULT_UNIT_BY_TYPE[nextType]);
                            }
                          }}
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          หน่วยจ่ายย่อยสุด (Unit) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={importNewUnit}
                          onChange={(e) => setImportNewUnit(e.target.value)}
                          placeholder="เช่น เม็ด, แคปซูล, ขวด"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          หมวดหมู่ยา (Category) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={importNewCategory}
                          onChange={(e) => setImportNewCategory(e.target.value)}
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                        >
                          {COMMON_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">สิทธิ์การรักษา</label>
                        <select
                          value={importNewCoverage}
                          onChange={(e) => setImportNewCoverage(e.target.value as 'covered' | 'non_covered')}
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                        >
                          <option value="covered">ในสิทธิ์ (เบิกได้)</option>
                          <option value="non_covered">นอกสิทธิ์ (จ่ายเงินเอง)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้ผลิต / ผู้จัดจำหน่าย</label>
                        <input
                          type="text"
                          value={importNewManufacturer}
                          onChange={(e) => setImportNewManufacturer(e.target.value)}
                          placeholder="เช่น องค์การเภสัชกรรม (GPO)"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">จุดเตือนสต็อกขั้นต่ำ</label>
                        <input
                          type="number"
                          min="0"
                          value={importNewMinStock}
                          onChange={(e) => setImportNewMinStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="เช่น 30"
                          className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Common Receiving Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมายเลข Lot / Batch No. <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={importLotNumber}
                      onChange={(e) => setImportLotNumber(e.target.value)}
                      placeholder="เช่น LOT-2026-09A"
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-mono text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      จำนวนที่ตรวจรับจริง ({importMode === 'new_item' ? (importNewUnit || 'หน่วย') : (importTarget.unit || 'หน่วย')}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={importActualUnits}
                      onChange={(e) => setImportActualUnits(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันหมดอายุ (Expiry Date)</label>
                    <input
                      type="date"
                      value={importExpiryDate}
                      onChange={(e) => setImportExpiryDate(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ผลิต (Mfg Date)</label>
                    <input
                      type="date"
                      value={importMfgDate}
                      onChange={(e) => setImportMfgDate(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุการตรวจรับ</label>
                  <input
                    type="text"
                    value={importNotes}
                    onChange={(e) => setImportNotes(e.target.value)}
                    placeholder="เช่น กล่องอยู่ในสภาพสมบูรณ์ ไม่มีความเสียหาย"
                    className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setImportTarget(null)}
                  disabled={isImporting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังนำเข้า...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        {importMode === 'merge'
                          ? 'ยืนยันนำเข้าคลังยา (รวมของเดิม)'
                          : 'ยืนยันนำเข้าคลังยา (แยกของใหม่)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* ======================================================== */}
      {/* Modal 3: Delete Procurement Order (ลบประวัติคำสั่งซื้อ) */}
      {/* ======================================================== */}
      {deleteTarget && (
        <ViewportPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">ยืนยันการลบคำสั่งซื้อ</h3>
                  <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-1.5 text-xs text-rose-900">
                <p>
                  คุณกำลังจะลบคำสั่งซื้อยา: <strong>&ldquo;{deleteTarget.medication_name}&rdquo;</strong>
                </p>
                {deleteTarget.order_number && (
                  <p className="font-mono text-slate-600">เลขที่ PO: {deleteTarget.order_number}</p>
                )}
                <p className="text-slate-600">
                  ยอดรวม: {deleteTarget.total_units.toLocaleString()} {deleteTarget.unit}
                </p>
                {deleteTarget.status === 'imported' && (
                  <p className="mt-2 text-rose-700 font-semibold">
                    จะหักสต็อกออก {(deleteTarget.received_units ?? deleteTarget.total_units).toLocaleString()} {deleteTarget.unit} และเก็บประวัติเป็น “ยกเลิกการรับเข้า” หากสต็อกไม่พอ ระบบจะไม่ดำเนินการ
                  </p>
                )}
              </div>

              {deleteTarget.status === 'imported' && <label className="block text-sm text-brand-body">เหตุผลการยกเลิกรับเข้า
                <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-brand-border-soft p-3" />
              </label>}
              {deleteError && <p role="alert" className="text-sm text-rose-700">{deleteError}</p>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeletingOrder}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteOrder}
                  disabled={isDeletingOrder}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isDeletingOrder ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังลบ...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>ลบคำสั่งซื้อ</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* ======================================================== */}
      {/* Modal 4: Edit Procurement Order (แก้ไขคำสั่งซื้อ) */}
      {/* ======================================================== */}
      {editTarget && (
        <ViewportPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">แก้ไขข้อมูลคำสั่งซื้อยา</h3>
                    <p className="text-xs text-slate-500">ปรับปรุงรายละเอียดบรรจุภัณฑ์หรือข้อมูลการสั่งซื้อ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  disabled={isSubmittingEdit}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitEditOrder} className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อยา / เวชภัณฑ์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={editTarget.status === 'imported'} value={editMedicationName}
                    onChange={(e) => setEditMedicationName(e.target.value)}
                    required
                    className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่ใบสั่งซื้อ (PO)</label>
                    <input
                      type="text"
                      value={editOrderNumber}
                      onChange={(e) => setEditOrderNumber(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-mono text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่สั่งซื้อ</label>
                    <input
                      type="date"
                      value={editOrderedDate}
                      onChange={(e) => setEditOrderedDate(e.target.value)}
                      className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ผู้จัดจำหน่าย / บริษัทคู่ค้า</label>
                  <input
                    type="text"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                  />
                </div>

                </div><div className="space-y-4">
                {editTarget.status === 'imported' ? <ReceiptCorrectionFields quantity={correctionQuantity} onQuantity={setCorrectionQuantity} reason={correctionReason} onReason={setCorrectionReason} order={editTarget} medications={medications} /> : <PackagingEditor value={editPackaging} unit={editTargetUnit} onChange={setEditPackaging} onUnitChange={setEditTargetUnit} />}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft placeholder:text-slate-400"
                  />
                </div>

                </div>
                <div className="sticky bottom-0 col-span-full flex items-center justify-end gap-2 border-t border-slate-100 bg-white py-3">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    disabled={isSubmittingEdit}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-strong px-4 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-hover active:scale-95 transition disabled:opacity-50"
                  >
                    {isSubmittingEdit ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>บันทึกการแก้ไข</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ViewportPortal>
      )}
    </div>
  );
}
