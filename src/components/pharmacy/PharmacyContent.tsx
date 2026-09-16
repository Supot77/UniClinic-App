'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Package,
  Pencil,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import type { Medication, MedicationCoverageType } from '@/types/database';
import PrescriptionsTab, {
  type PrescribedMedItem,
  type PrescriptionOrder,
} from './PrescriptionsTab';

const supabase = createClient();

type StockStatus = 'sufficient' | 'reorder' | 'critical' | 'expired' | 'inactive';

interface MedicationDraft {
  name: string;
  dosage: string;
  brand_name: string;
  type: string;
  unit: string;
  pack_unit: string;
  pack_size: number | '';
  category: string;
  coverage_type: MedicationCoverageType;
  manufacturer: string;
  mfg_date: string;
  stock: number;
  min_stock: number;
  expiry_date: string;
  description: string;
  ingredients: string;
  is_active: boolean;
}

const DEFAULT_DRAFT: MedicationDraft = {
  name: '',
  dosage: '',
  brand_name: '',
  type: 'เม็ด',
  unit: 'เม็ด',
  pack_unit: '',
  pack_size: '',
  category: 'ยาแก้ปวดลดไข้',
  coverage_type: 'covered',
  manufacturer: '',
  mfg_date: '',
  stock: 100,
  min_stock: 30,
  expiry_date: '',
  description: '',
  ingredients: '',
  is_active: true,
};

const COMMON_UNITS = [
  'เม็ด',
  'แคปซูล',
  'ขวด',
  'หลอด',
  'ไวอัล (Vial)',
  'แอมพูล (Ampoule)',
  'ซอง',
  'แผง',
  'ชิ้น',
  'มิลลิลิตร (ml)',
];

const DEFAULT_UNIT_BY_TYPE: Record<string, string> = {
  'เม็ด': 'เม็ด',
  'แคปซูล': 'แคปซูล',
  'ยาน้ำ': 'ขวด',
  'ผง': 'ซอง',
  'น้ำ': 'ขวด',
  'ครีม/เจล': 'หลอด',
  'ขี้ผึ้ง': 'หลอด',
  'เม็ดอม': 'เม็ด',
  'ยาฉีด': 'ไวอัล (Vial)',
  'เวชภัณฑ์ทั่วไป': 'ชิ้น',
};

const TYPE_OPTIONS = [
  'เม็ด',
  'แคปซูล',
  'ยาน้ำ',
  'ผง',
  'น้ำ',
  'ครีม/เจล',
  'ขี้ผึ้ง',
  'เม็ดอม',
  'ยาฉีด',
  'เวชภัณฑ์ทั่วไป',
];

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
];

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59`;
  const expiryDate = new Date(normalized);
  if (Number.isNaN(expiryDate.getTime())) return false;
  return expiryDate.getTime() < Date.now();
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr || isExpired(dateStr)) return false;
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59`;
  const expiryDate = new Date(normalized);
  if (Number.isNaN(expiryDate.getTime())) return false;
  const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays <= 90 && diffDays >= 0;
}

function getStockStatus(item: Medication): StockStatus {
  if (!item.is_active) return 'inactive';
  if (isExpired(item.expiry_date)) return 'expired';
  if (item.stock === 0) return 'critical';
  if (item.min_stock > 0 && item.stock < item.min_stock * 0.5) return 'critical';
  if (item.min_stock > 0 && item.stock <= item.min_stock) return 'reorder';
  return 'sufficient';
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

interface PharmacyContentProps {
  currentRole?: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
}

export default function PharmacyContent({
  currentRole,
  userEmail,
  userName,
  userId,
}: PharmacyContentProps) {
  const { role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && authRole === 'patient') {
      router.replace('/dashboard');
    }
  }, [authLoading, authRole, router]);

  const effectiveRole = currentRole || authRole || 'medical';
  const isAdminOrStaff = effectiveRole === 'admin' || effectiveRole === 'staff_admin' || effectiveRole === 'staff';
  const canManage = !isAdminOrStaff;

  const [activeTab, setActiveTab] = useState<'inventory' | 'prescriptions'>('inventory');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCoverage, setSelectedCoverage] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'expiry'>('name');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Medication | null>(null);
  const [viewingItem, setViewingItem] = useState<Medication | null>(null);
  const [draft, setDraft] = useState<MedicationDraft>(DEFAULT_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Packaging Calculator state
  const [showPackCalculator, setShowPackCalculator] = useState(false);
  const [calcMode, setCalcMode] = useState<'standard' | 'carton'>('standard');
  const [calcPackCount, setCalcPackCount] = useState<number | ''>('');
  const [calcPackUnit, setCalcPackUnit] = useState<string>('กล่อง');
  const [calcItemsPerPack, setCalcItemsPerPack] = useState<number | ''>('');
  const [calcCartonCount, setCalcCartonCount] = useState<number | ''>('');
  const [calcBoxesPerCarton, setCalcBoxesPerCarton] = useState<number | ''>('');
  const [calcItemsPerBox, setCalcItemsPerBox] = useState<number | ''>('');

  const calculatedStockTotal = useMemo(() => {
    if (calcMode === 'standard') {
      const pCount = typeof calcPackCount === 'number' ? calcPackCount : 0;
      const iCount = typeof calcItemsPerPack === 'number' ? calcItemsPerPack : 0;
      return pCount * iCount;
    } else {
      const cCount = typeof calcCartonCount === 'number' ? calcCartonCount : 0;
      const bCount = typeof calcBoxesPerCarton === 'number' ? calcBoxesPerCarton : 0;
      const iCount = typeof calcItemsPerBox === 'number' ? calcItemsPerBox : 0;
      return cCount * bCount * iCount;
    }
  }, [calcMode, calcPackCount, calcItemsPerPack, calcCartonCount, calcBoxesPerCarton, calcItemsPerBox]);

  const handleApplyCalculatedStock = (mode: 'replace' | 'add') => {
    if (calculatedStockTotal <= 0) return;
    setDraft((prev) => ({
      ...prev,
      stock: mode === 'add' ? prev.stock + calculatedStockTotal : calculatedStockTotal,
      pack_unit: calcMode === 'standard' ? calcPackUnit : 'ลัง',
      pack_size:
        calcMode === 'standard'
          ? (typeof calcItemsPerPack === 'number' ? calcItemsPerPack : '')
          : (typeof calcBoxesPerCarton === 'number' && typeof calcItemsPerBox === 'number'
            ? calcBoxesPerCarton * calcItemsPerBox
            : ''),
    }));
  };

  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 3500);
    return () => clearTimeout(timer);
  }, [successToast]);

  useEffect(() => {
    if (!viewingItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingItem]);

interface RawMedicalRecord {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string | null;
  treatment_notes: string | null;
  prescribed_medications: PrescribedMedItem[] | null;
  created_at: string;
}

interface RawProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  student_id: string | null;
}

interface RawInventoryLog {
  id: string;
  medication_id: string;
  quantity: number;
  reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  pharmacist?: { full_name?: string | null } | null;
}

  const loadMedications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }
      setMedications((data as Medication[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Supabase';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPrescriptions = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingPrescriptions(true);
    setPrescriptionError(null);
    try {
      const { data: recordsData, error: recordsError } = await supabase
        .from('medical_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      const rawRecords = (recordsData || []) as RawMedicalRecord[];
      const recordsWithMeds = rawRecords.filter((r) => {
        const meds = r.prescribed_medications;
        return Array.isArray(meds) && meds.length > 0;
      });

      const patientIds = recordsWithMeds.map((r) => r.patient_id).filter(Boolean);
      const doctorIds = recordsWithMeds.map((r) => r.doctor_id).filter(Boolean);
      const userIds = Array.from(new Set([...patientIds, ...doctorIds]));

      const profilesMap = new Map<string, RawProfile>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, phone, student_id')
          .in('id', userIds);

        if (profilesData) {
          (profilesData as RawProfile[]).forEach((p) => {
            profilesMap.set(p.id, p);
          });
        }
      }

      const { data: logsData } = await supabase
        .from('inventory_logs')
        .select('id, medication_id, quantity, reason, idempotency_key, created_at, pharmacist:profiles(full_name)')
        .eq('action', 'dispense');

      const dispenseLogs = (logsData || []) as RawInventoryLog[];

      const orders: PrescriptionOrder[] = recordsWithMeds.map((r) => {
        const patientProfile = profilesMap.get(r.patient_id);
        const doctorProfile = profilesMap.get(r.doctor_id);
        const meds: PrescribedMedItem[] = (r.prescribed_medications || []) as PrescribedMedItem[];

        let dispensedCount = 0;
        let lastDispensedAt: string | null = null;
        let pharmacistName: string | null = null;

        meds.forEach((m) => {
          const key = `dispense:${r.id}:${m.medication_id}`;
          const match = dispenseLogs.find(
            (log) =>
              (log.idempotency_key === key) ||
              (log.reason && log.reason.includes(r.id) && (log.medication_id === m.medication_id || log.reason.includes(m.name)))
          );

          const isItemDispensed = Boolean(m.dispensed || match);

          if (isItemDispensed) {
            dispensedCount++;
            if (m.dispensed_at) {
              if (!lastDispensedAt || new Date(m.dispensed_at) > new Date(lastDispensedAt)) {
                lastDispensedAt = m.dispensed_at;
                const dispUser = m.dispensed_by ? profilesMap.get(m.dispensed_by) : null;
                pharmacistName =
                  dispUser?.full_name || match?.pharmacist?.full_name || pharmacistName;
              }
            } else if (match) {
              if (!lastDispensedAt || new Date(match.created_at) > new Date(lastDispensedAt)) {
                lastDispensedAt = match.created_at;
                pharmacistName = match.pharmacist?.full_name || pharmacistName;
              }
            }
          }
        });

        const isFullyDispensed = meds.length > 0 && dispensedCount >= meds.length;

        return {
          id: r.id,
          appointment_id: r.appointment_id,
          patient_id: r.patient_id,
          doctor_id: r.doctor_id,
          patient_name: patientProfile?.full_name || 'ผู้ป่วยไม่ระบุนาม',
          patient_phone: patientProfile?.phone || null,
          patient_student_id: patientProfile?.student_id || null,
          doctor_name: doctorProfile?.full_name || 'แพทย์ไม่ระบุนาม',
          diagnosis: r.diagnosis || 'ไม่ได้ระบุ',
          treatment_notes: r.treatment_notes || '',
          prescribed_medications: meds,
          created_at: r.created_at,
          dispensed_items_count: dispensedCount,
          is_fully_dispensed: isFullyDispensed,
          dispensed_at: lastDispensedAt,
          pharmacist_name: pharmacistName,
        };
      });

      setPrescriptions(orders);
    } catch (err: unknown) {
      console.error('Error loading prescriptions:', err);
      setPrescriptionError(
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรายการสั่งยา'
      );
    } finally {
      setIsLoadingPrescriptions(false);
    }
  }, []);

  const pendingPrescriptionsCount = useMemo(() => {
    return prescriptions.filter((p) => !p.is_fully_dispensed).length;
  }, [prescriptions]);

  const handleReloadAll = useCallback(async () => {
    await Promise.all([loadMedications(), loadPrescriptions()]);
  }, [loadMedications, loadPrescriptions]);

  const handlePrescriptionDispensed = useCallback(
    (orderId: string, updatedMeds: PrescribedMedItem[]) => {
      setPrescriptions((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const count = updatedMeds.filter((m) => m.dispensed).length;
          const isFull = count >= updatedMeds.length;
          return {
            ...order,
            prescribed_medications: updatedMeds,
            dispensed_items_count: count,
            is_fully_dispensed: isFull,
            dispensed_at: new Date().toISOString(),
            pharmacist_name: userName || 'แพทย์ผู้ตรวจ',
          };
        })
      );
    },
    [userName]
  );

  useEffect(() => {
    let ignore = false;
    async function start() {
      await Promise.all([loadMedications(false), loadPrescriptions(false)]);
      if (ignore) return;
    }
    void start();
    return () => {
      ignore = true;
    };
  }, [loadMedications, loadPrescriptions]);

  const categoriesInDb = useMemo(() => {
    const set = new Set<string>();
    medications.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim());
    });
    return Array.from(set);
  }, [medications]);

  const stats = useMemo(() => {
    let sufficient = 0;
    let reorder = 0;
    let critical = 0;
    let expiringSoon = 0;
    let expiredOrInactive = 0;

    medications.forEach((m) => {
      const status = getStockStatus(m);
      if (status === 'sufficient') sufficient++;
      if (status === 'reorder') reorder++;
      if (status === 'critical') critical++;
      if (isExpiringSoon(m.expiry_date)) expiringSoon++;
      if (status === 'expired' || status === 'inactive') expiredOrInactive++;
    });

    return {
      total: medications.length,
      sufficient,
      reorder,
      critical,
      expiringSoon,
      expiredOrInactive,
    };
  }, [medications]);

  const filteredMedications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return medications
      .filter((item) => {
        if (q) {
          const matchName = item.name.toLowerCase().includes(q);
          const matchDosage = item.dosage?.toLowerCase().includes(q) ?? false;
          const matchBrand = item.brand_name?.toLowerCase().includes(q) ?? false;
          const matchManufacturer = item.manufacturer?.toLowerCase().includes(q) ?? false;
          const matchCategory = item.category?.toLowerCase().includes(q) ?? false;
          const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
          const matchIngr = item.ingredients?.toLowerCase().includes(q) ?? false;
          if (
            !matchName &&
            !matchDosage &&
            !matchBrand &&
            !matchManufacturer &&
            !matchCategory &&
            !matchDesc &&
            !matchIngr
          ) {
            return false;
          }
        }

        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        if (selectedType !== 'all' && item.type !== selectedType) {
          return false;
        }

        if (selectedCoverage !== 'all') {
          const itemCoverage = item.coverage_type || 'covered';
          if (itemCoverage !== selectedCoverage) return false;
        }

        if (statusFilter !== 'all') {
          const status = getStockStatus(item);
          if (statusFilter === 'sufficient' && status !== 'sufficient') return false;
          if (statusFilter === 'reorder' && status !== 'reorder') return false;
          if (statusFilter === 'critical' && status !== 'critical') return false;
          if (statusFilter === 'expiring_soon' && !isExpiringSoon(item.expiry_date)) return false;
          if (statusFilter === 'expired' && status !== 'expired' && status !== 'inactive') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        if (sortBy === 'expiry') {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        }
        return 0;
      });
  }, [medications, searchQuery, selectedCategory, selectedType, selectedCoverage, statusFilter, sortBy]);

  const handleOpenAddModal = () => {
    if (!canManage) return;
    setEditingItem(null);
    setDraft(DEFAULT_DRAFT);
    setShowPackCalculator(false);
    setCalcPackCount('');
    setCalcItemsPerPack('');
    setCalcCartonCount('');
    setCalcBoxesPerCarton('');
    setCalcItemsPerBox('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Medication) => {
    if (!canManage) return;
    setEditingItem(item);
    setDraft({
      name: item.name,
      dosage: item.dosage || '',
      brand_name: item.brand_name || '',
      type: item.type || 'เม็ด',
      unit: item.unit || DEFAULT_UNIT_BY_TYPE[item.type] || 'เม็ด',
      pack_unit: item.pack_unit || '',
      pack_size: item.pack_size ?? '',
      category: item.category || '',
      coverage_type: item.coverage_type || 'covered',
      manufacturer: item.manufacturer || '',
      mfg_date: item.mfg_date || '',
      stock: item.stock ?? 0,
      min_stock: item.min_stock ?? 0,
      expiry_date: item.expiry_date || '',
      description: item.description || '',
      ingredients: item.ingredients || '',
      is_active: item.is_active ?? true,
    });
    setShowPackCalculator(false);
    setCalcPackCount('');
    setCalcItemsPerPack('');
    setCalcCartonCount('');
    setCalcBoxesPerCarton('');
    setCalcItemsPerBox('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setFormError('เฉพาะแพทย์และเภสัชกรเท่านั้นที่มีสิทธิ์เพิ่มหรือแก้ไขเวชภัณฑ์');
      return;
    }
    setFormError(null);

    if (!draft.name.trim()) {
      setFormError('กรุณากรอกชื่อเวชภัณฑ์');
      return;
    }

    if (!draft.category.trim()) {
      setFormError('กรุณาระบุหมวดหมู่ยา');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: draft.name.trim(),
        dosage: draft.dosage?.trim() || null,
        brand_name: draft.brand_name?.trim() || null,
        type: draft.type.trim(),
        unit: draft.unit?.trim() || 'เม็ด',
        pack_unit: draft.pack_unit?.trim() || null,
        pack_size: draft.pack_size ? Number(draft.pack_size) : null,
        category: draft.category.trim(),
        coverage_type: draft.coverage_type,
        manufacturer: draft.manufacturer?.trim() || null,
        mfg_date: draft.mfg_date || null,
        stock: Number(draft.stock) || 0,
        min_stock: Number(draft.min_stock) || 0,
        expiry_date: draft.expiry_date || null,
        description: draft.description?.trim() || null,
        ingredients: draft.ingredients?.trim() || null,
        is_active: draft.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('medications')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccessToast(`อัปเดตข้อมูล "${draft.name}" สำเร็จ`);
      } else {
        const { error } = await supabase
          .from('medications')
          .insert([payload]);

        if (error) throw error;
        setSuccessToast(`เพิ่มเวชภัณฑ์ "${draft.name}" เข้าสู่คลังยาสำเร็จ`);
      }

      setIsModalOpen(false);
      await loadMedications();
    } catch (err: unknown) {
      const errObj = err as { message?: string; details?: string; hint?: string };
      const msg = errObj?.message || (err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
      console.error('Failed to save medication:', err);
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (item: Medication) => {
    if (!canManage) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('medications')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;
      setSuccessToast(`พักการใช้งานเวชภัณฑ์ "${item.name}" แล้ว (สามารถกู้คืนได้ทุกเมื่อ)`);
      setDeleteTarget(null);
      await loadMedications();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj?.message || (err instanceof Error ? err.message : 'ไม่สามารถพักการใช้งานได้');
      alert(`เกิดข้อผิดพลาด: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreMedication = async (item: Medication) => {
    if (!canManage) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('medications')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;
      setSuccessToast(`กู้คืนและเปิดใช้งาน "${item.name}" ในระบบแล้ว`);
      setDeleteTarget(null);
      await loadMedications();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj?.message || (err instanceof Error ? err.message : 'ไม่สามารถกู้คืนได้');
      alert(`เกิดข้อผิดพลาด: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHardDelete = async (item: Medication) => {
    if (!canManage) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      setSuccessToast(`ลบรายการ "${item.name}" ออกจากคลังยาถาวรแล้ว`);
      setDeleteTarget(null);
      await loadMedications();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj?.message || (err instanceof Error ? err.message : 'ไม่สามารถลบถาวรได้');
      alert(`เกิดข้อผิดพลาด: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800 shadow-xl transition-all animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="ml-2 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-bold tracking-wider text-sky-600 uppercase">
                WU CLINIC / PHARMACY
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Supabase Live
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                currentRole === 'admin'
                  ? 'bg-purple-50 text-purple-700 ring-purple-600/20'
                  : (currentRole === 'staff_admin' || currentRole === 'staff' || authRole === 'staff_admin')
                  ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
                  : 'bg-blue-50 text-blue-700 ring-blue-600/20'
              }`}>
                {currentRole === 'admin'
                  ? '🔒 สิทธิ์: ผู้ดูแลระบบ (Admin - ดูอย่างเดียว)'
                  : (currentRole === 'staff_admin' || currentRole === 'staff' || authRole === 'staff_admin')
                  ? '🔒 สิทธิ์: เจ้าหน้าที่คลินิก (Staff - ดูอย่างเดียว)'
                  : '🩺 สิทธิ์: บุคลากรทางการแพทย์ (Medical - จัดการยาได้)'}
              </span>
              {(userName || userEmail) && (
                <span className="text-[11px] text-slate-500">
                  ({userName ? `${userName}${userEmail ? ` · ${userEmail}` : ''}` : userEmail})
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              คลังยาและเวชภัณฑ์ (Medication Inventory)
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ควบคุมสต็อกเวชภัณฑ์ เฝ้าระวังยาใกล้หมดอายุ และบันทึกข้อมูลแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleReloadAll()}
              disabled={isLoading || isLoadingPrescriptions}
              title="รีเฟรชข้อมูลทั้งหมด"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingPrescriptions ? 'animate-spin text-sky-600' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
            {activeTab === 'inventory' && (
              canManage ? (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>นำเข้าเวชภัณฑ์ใหม่</span>
                </button>
              ) : (
                <div
                  title="เฉพาะแพทย์และเภสัชกรเท่านั้นที่สามารถนำเข้าเวชภัณฑ์ได้ (Admin และ Staff ดูได้อย่างเดียว)"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400 cursor-not-allowed select-none"
                >
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>นำเข้าเวชภัณฑ์ใหม่ (ล็อค)</span>
                </div>
              )
            )}
          </div>
        </div>

        {!canManage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>โหมดดูอย่างเดียว (Read-Only):</strong> บัญชีผู้ดูแลระบบ (Admin) และเจ้าหน้าที่ (Staff) ได้รับสิทธิ์ในการตรวจสอบสต็อกและรายการสั่งยาเท่านั้น หากต้องการนำเข้า แก้ไขยา หรือตัดสต็อกจ่ายยา กรุณาใช้บัญชีแพทย์หรือเภสัชกร
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'inventory'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <Package className="h-4.5 w-4.5" />
            <span>คลังเวชภัณฑ์ (Inventory)</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                activeTab === 'inventory' ? 'bg-sky-100 text-sky-700 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {medications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescriptions')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'prescriptions'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <FileText className="h-4.5 w-4.5" />
            <span>รายการสั่งยาและตัดจ่าย (Prescriptions & Dispensing)</span>
            {pendingPrescriptionsCount > 0 ? (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                {pendingPrescriptionsCount} รอตัดจ่าย
              </span>
            ) : (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {prescriptions.length}
              </span>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Supabase</p>
              <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleReloadAll()}
              className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200 shadow-xs hover:bg-rose-100"
            >
              ลองใหม่
            </button>
          </div>
        )}
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            key: 'all',
            label: 'รายการทั้งหมด',
            value: stats.total,
            sub: 'ในระบบคลังยา',
            icon: Package,
            color: 'bg-sky-50 text-sky-600',
            activeBorder: 'ring-2 ring-sky-500',
          },
          {
            key: 'sufficient',
            label: 'มีเพียงพอ',
            value: stats.sufficient,
            sub: 'พร้อมให้บริการ',
            icon: CheckCircle2,
            color: 'bg-emerald-50 text-emerald-600',
            activeBorder: 'ring-2 ring-emerald-500',
          },
          {
            key: 'reorder',
            label: 'ต้องสั่งเพิ่ม',
            value: stats.reorder,
            sub: 'ต่ำกว่าเกณฑ์',
            icon: AlertTriangle,
            color: 'bg-amber-50 text-amber-600',
            activeBorder: 'ring-2 ring-amber-500',
          },
          {
            key: 'critical',
            label: 'วิกฤตใกล้หมด',
            value: stats.critical,
            sub: 'เร่งด่วนที่สุด',
            icon: AlertOctagon,
            color: 'bg-rose-50 text-rose-600',
            activeBorder: 'ring-2 ring-rose-500',
          },
          {
            key: 'expiring_soon',
            label: 'ใกล้หมดอายุ',
            value: stats.expiringSoon,
            sub: '≤ 90 วันข้างหน้า',
            icon: Clock,
            color: 'bg-violet-50 text-violet-600',
            activeBorder: 'ring-2 ring-violet-500',
          },
          {
            key: 'expired',
            label: 'หมดอายุ / ปิดใช้',
            value: stats.expiredOrInactive,
            sub: 'คัดแยกออกจากคลัง',
            icon: Ban,
            color: 'bg-slate-100 text-slate-600',
            activeBorder: 'ring-2 ring-slate-500',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
              className={`flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:shadow-sm hover:border-slate-300 ${
                isActive ? `${item.activeBorder} bg-slate-50/50` : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{item.label}</span>
                <span className={`rounded-xl p-2 ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{item.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อยา, หมวดหมู่, สรรพคุณ หรือตัวยาสำคัญ..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 placeholder:text-slate-400"
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">ทุกหมวดหมู่ยา</option>
            {categoriesInDb.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">ทุกรูปแบบ (Type)</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedCoverage}
            onChange={(e) => setSelectedCoverage(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">ทุกสิทธิ์การเบิกจ่าย</option>
            <option value="covered">🟢 ยาในสิทธิ์ (เบิกได้)</option>
            <option value="non_covered">🟣 ยานอกสิทธิ์ (จ่ายนอก)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="name">เรียงตาม: ชื่อ (ก-ฮ)</option>
              <option value="stock_asc">เรียงตาม: สต็อกน้อย → มาก</option>
              <option value="stock_desc">เรียงตาม: สต็อกมาก → น้อย</option>
              <option value="expiry">เรียงตาม: วันหมดอายุเร็วสุด</option>
            </select>
          </div>

          {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all' || selectedCoverage !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedType('all');
                setSelectedCoverage('all');
                setStatusFilter('all');
              }}
              className="h-11 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">ชื่อเวชภัณฑ์ / ขนาดยา</th>
                <th scope="col" className="px-4 py-4">สิทธิ์การเบิกจ่าย</th>
                <th scope="col" className="px-4 py-4">รูปแบบ</th>
                <th scope="col" className="px-4 py-4">หมวดหมู่</th>
                <th scope="col" className="px-5 py-4">ระดับสต็อกคงเหลือ</th>
                <th scope="col" className="px-4 py-4">วันผลิต / หมดอายุ</th>
                <th scope="col" className="px-4 py-4">สถานะสต็อก</th>
                <th scope="col" className="px-4 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-sky-600 mb-2" />
                    <span>กำลังโหลดข้อมูลจากฐานข้อมูล Supabase...</span>
                  </td>
                </tr>
              ) : filteredMedications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Pill className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-base font-semibold text-slate-700">ไม่พบรายการเวชภัณฑ์</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองที่เลือกไว้</p>
                  </td>
                </tr>
              ) : (
                filteredMedications.map((item) => {
                  const status = getStockStatus(item);
                  const expiring = isExpiringSoon(item.expiry_date);
                  const expired = isExpired(item.expiry_date);

                  const maxDisplay = Math.max(item.min_stock * 2, item.stock, 1);
                  const percent = Math.min(Math.round((item.stock / maxDisplay) * 100), 100);

                  let progressColor = 'bg-emerald-500';
                  if (status === 'reorder') progressColor = 'bg-amber-500';
                  if (status === 'critical') progressColor = 'bg-rose-500';

                  const isNonCovered = item.coverage_type === 'non_covered';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setViewingItem(item)}
                      className="transition-colors hover:bg-sky-50/50 cursor-pointer group"
                      title="คลิกเพื่อดูรายละเอียดเวชภัณฑ์"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl bg-sky-50 p-2 text-sky-600 shrink-0 group-hover:bg-sky-100 transition-colors">
                            <Pill className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-900 leading-snug group-hover:text-sky-600 transition-colors">
                                {item.name}
                              </span>
                              {item.dosage && (
                                <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/15">
                                  {item.dosage}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {isNonCovered ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            ยานอกสิทธิ์ (จ่ายนอก)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ยาในสิทธิ์ (เบิกได้)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {item.type || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600">{item.category || '-'}</span>
                      </td>

                      <td className="px-5 py-4 min-w-[190px]">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-base font-bold text-slate-900">
                              {item.stock}{' '}
                              <span className="text-xs font-normal text-slate-500">{item.unit || 'หน่วย'}</span>
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              ขั้นต่ำ {item.min_stock} {item.unit || 'หน่วย'}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progressColor}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        <div className="space-y-0.5">
                          {item.mfg_date && (
                            <p className="text-slate-500 text-[11px]">
                              ผลิต: {formatDisplayDate(item.mfg_date)}
                            </p>
                          )}
                          <p className={`font-medium ${expired ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            หมดอายุ: {formatDisplayDate(item.expiry_date)}
                          </p>
                          {expired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                              <Ban className="h-3 w-3" /> หมดอายุแล้ว
                            </span>
                          )}
                          {!expired && expiring && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              <Clock className="h-3 w-3" /> ใกล้หมดอายุ
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        {status === 'sufficient' && (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            มีเพียงพอ
                          </span>
                        )}
                        {status === 'reorder' && (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            ต้องสั่งเพิ่ม
                          </span>
                        )}
                        {status === 'critical' && (
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            วิกฤตใกล้หมด
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                            หมดอายุ
                          </span>
                        )}
                        {status === 'inactive' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 ring-1 ring-inset ring-slate-400/20">
                            <Ban className="h-3 w-3 text-slate-500" />
                            พักใช้งาน (Soft-deleted)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        {!canManage ? (
                          <div className="flex items-center justify-end">
                            <span
                              title="สิทธิ์ดูอย่างเดียว: เฉพาะแพทย์และเภสัชกรเท่านั้นที่สามารถแก้ไขหรือลบยาได้"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400 select-none"
                            >
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                              <span>ดูอย่างเดียว (ล็อค)</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {!item.is_active ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleRestoreMedication(item)}
                                  title="กู้คืน / เปิดใช้งานเวชภัณฑ์นี้อีกครั้ง"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>กู้คืน</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  title="แก้ไขข้อมูล"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  title="ลบเวชภัณฑ์ออกจากฐานข้อมูลถาวร"
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  title="แก้ไขข้อมูล"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  title="ลบ / พักการใช้งานเวชภัณฑ์"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <PrescriptionsTab
          prescriptions={prescriptions}
          isLoading={isLoadingPrescriptions}
          errorMessage={prescriptionError}
          medications={medications}
          canManage={canManage}
          isAdminOrStaff={isAdminOrStaff}
          userId={userId}
          onRefresh={loadPrescriptions}
          onStockUpdated={handleReloadAll}
          onPrescriptionDispensed={handlePrescriptionDispensed}
          onShowToast={(msg) => setSuccessToast(msg)}
        />
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingItem ? 'แก้ไขข้อมูลเวชภัณฑ์' : 'นำเข้าเวชภัณฑ์ใหม่'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกข้อมูลเข้าสู่ฐานข้อมูลจริงของคลินิก (Supabase)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {formError}
                </div>
              )}

              {/* Row 1: Generic Name & Dosage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อยา / ชื่อสามัญ (Generic Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="เช่น Paracetamol, Amoxicillin"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ขนาดยา (Dosage / Strength)
                  </label>
                  <input
                    type="text"
                    value={draft.dosage}
                    onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                    placeholder="เช่น 1000mg, 250mg, 500mg"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Row 2: Brand Name & Manufacturer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ยี่ห้อยา / ชื่อทางการค้า (Brand Name)
                  </label>
                  <input
                    type="text"
                    value={draft.brand_name}
                    onChange={(e) => setDraft({ ...draft, brand_name: e.target.value })}
                    placeholder="เช่น Sara, Tylenol, Panadol, Calpol"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    บริษัทที่ผลิต (Manufacturer)
                  </label>
                  <input
                    type="text"
                    value={draft.manufacturer}
                    onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}
                    placeholder="เช่น องค์การเภสัชกรรม (GPO), Berlin"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Row 3: Form & Unit (Left) and Category (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      รูปแบบยา *
                    </label>
                    <select
                      value={draft.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const suggested = DEFAULT_UNIT_BY_TYPE[newType] || draft.unit || 'เม็ด';
                        setDraft({ ...draft, type: newType, unit: suggested });
                      }}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      หน่วยนับตัดจ่าย *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        list="unit-suggestions"
                        value={draft.unit}
                        onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                        placeholder="เช่น เม็ด, แคปซูล"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                      <datalist id="unit-suggestions">
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">หมวดหมู่ยา *</label>
                  <input
                    type="text"
                    required
                    list="category-suggestions"
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    placeholder="เช่น ยาแก้ปวดลดไข้"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                  <datalist id="category-suggestions">
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Row 4: Coverage Status (สิทธิ์การเบิกจ่าย) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สิทธิ์การเบิกจ่ายเวชภัณฑ์ (Coverage Status) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      draft.coverage_type === 'covered'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coverage_type"
                      value="covered"
                      checked={draft.coverage_type === 'covered'}
                      onChange={() => setDraft({ ...draft, coverage_type: 'covered' })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ยาในสิทธิ์ (เบิกได้)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ยาตามสิทธิ์การรักษา หรืออยู่ในบัญชียาหลักแห่งชาติ
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      draft.coverage_type === 'non_covered'
                        ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="coverage_type"
                      value="non_covered"
                      checked={draft.coverage_type === 'non_covered'}
                      onChange={() => setDraft({ ...draft, coverage_type: 'non_covered' })}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        ยานอกสิทธิ์ (จ่ายนอก / จ่ายแยก)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ยานอกบัญชียาหลัก หรือยานำเข้า/ยาทางเลือกพิเศษ
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 5: Stock & Min Stock + Packaging Calculator */}
              <div className="space-y-3">
                {/* Packaging & Batch Calculator */}
                <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-sky-600 p-1.5 text-white shadow-2xs">
                        <Calculator className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          ตัวช่วยคำนวณจากบรรจุภัณฑ์ตอนรับเข้า (Packaging Calculator)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          แปลงจำนวนข้างลัง / กล่อง / กระปุก / แผง เข้าเป็นหน่วยจ่าย ({draft.unit || 'เม็ด'})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPackCalculator(!showPackCalculator)}
                      className="rounded-lg border border-sky-300 bg-white px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition shadow-2xs"
                    >
                      {showPackCalculator ? 'ซ่อนตัวช่วย' : '📦 เปิดตัวช่วยคำนวณ'}
                    </button>
                  </div>

                  {showPackCalculator && (
                    <div className="pt-2 border-t border-sky-200/60 space-y-3">
                      {/* Mode Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setCalcMode('standard')}
                          className={`rounded-xl px-3 py-2 text-center font-medium transition ${
                            calcMode === 'standard'
                              ? 'bg-sky-600 text-white shadow-2xs font-semibold'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          📦 บรรจุภัณฑ์ทั่วไป (กล่อง / กระปุก / แผง / แกลลอน)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalcMode('carton')}
                          className={`rounded-xl px-3 py-2 text-center font-medium transition ${
                            calcMode === 'carton'
                              ? 'bg-sky-600 text-white shadow-2xs font-semibold'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          🚛 สั่งเป็นลังใหญ่ (ลัง × กล่องย่อย × {draft.unit || 'เม็ด'})
                        </button>
                      </div>

                      {calcMode === 'standard' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end bg-white/70 p-3 rounded-xl border border-sky-100">
                          <div className="min-w-0">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 truncate">
                              จำนวนบรรจุภัณฑ์
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="เช่น 5"
                              value={calcPackCount}
                              onChange={(e) => setCalcPackCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>

                          <div className="min-w-0">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 truncate">
                              หน่วยบรรจุภัณฑ์
                            </label>
                            <select
                              value={calcPackUnit}
                              onChange={(e) => setCalcPackUnit(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            >
                              <option value="กล่อง">กล่อง (Box)</option>
                              <option value="กระปุก">กระปุก (Jar)</option>
                              <option value="แผง">แผง (Strip)</option>
                              <option value="แกลลอน">แกลลอน (Gallon)</option>
                              <option value="แพ็ค">แพ็ค (Pack)</option>
                              <option value="ลัง">ลัง (Carton)</option>
                            </select>
                          </div>

                          <div className="min-w-0">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 truncate">
                              ขนาดบรรจุต่อ 1 {calcPackUnit}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder="เช่น 100 หรือ 1000"
                                value={calcItemsPerPack}
                                onChange={(e) => setCalcItemsPerPack(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-12 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                                {draft.unit || 'เม็ด'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end bg-white/70 p-3 rounded-xl border border-sky-100">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              จำนวนลัง
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder="เช่น 2"
                                value={calcCartonCount}
                                onChange={(e) => setCalcCartonCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">ลัง</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              ลังละกี่กล่อง
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder="เช่น 50"
                                value={calcBoxesPerCarton}
                                onChange={(e) => setCalcBoxesPerCarton(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-12 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">กล่อง</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              กล่องละกี่{draft.unit || 'เม็ด'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder="เช่น 100"
                                value={calcItemsPerBox}
                                onChange={(e) => setCalcItemsPerBox(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-14 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">{draft.unit || 'เม็ด'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Calculation Preview & Apply Button */}
                      {calculatedStockTotal > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-100/70 p-3 border border-sky-200">
                          <div className="text-xs">
                            <span className="text-slate-600">คำนวณได้: </span>
                            <strong className="text-sm font-bold text-sky-800">
                              {calculatedStockTotal.toLocaleString()} {draft.unit || 'เม็ด'}
                            </strong>
                            <span className="text-[11px] text-slate-500 ml-1">
                              ({calcMode === 'standard' ? `${calcPackCount} ${calcPackUnit} × ${calcItemsPerPack}` : `${calcCartonCount} ลัง × ${calcBoxesPerCarton} กล่อง × ${calcItemsPerBox}`})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingItem && (
                              <button
                                type="button"
                                onClick={() => handleApplyCalculatedStock('add')}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                              >
                                + บวกเพิ่มสต็อก ({calculatedStockTotal.toLocaleString()})
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApplyCalculatedStock('replace')}
                              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition shadow-2xs"
                            >
                              ใช้เป็นยอดสต็อกปัจจุบัน
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Direct Stock and Min Stock Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      สต็อกปัจจุบัน (Stock in {draft.unit || 'หน่วย'}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={draft.stock}
                        onChange={(e) => setDraft({ ...draft, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-14 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                        {draft.unit || 'เม็ด'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      สต็อกขั้นต่ำ (Min Stock in {draft.unit || 'หน่วย'}) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={draft.min_stock}
                        onChange={(e) => setDraft({ ...draft, min_stock: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-14 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                        {draft.unit || 'เม็ด'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: MFG Date & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    วันผลิต (Manufacturing Date / MFG)
                  </label>
                  <input
                    type="date"
                    value={draft.mfg_date}
                    onChange={(e) => setDraft({ ...draft, mfg_date: e.target.value })}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    วันหมดอายุ (Expiry Date / EXP)
                  </label>
                  <input
                    type="date"
                    value={draft.expiry_date}
                    onChange={(e) => setDraft({ ...draft, expiry_date: e.target.value })}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">คำอธิบาย / ข้อบ่งใช้</label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="เช่น ยาบรรเทาอาการปวดศีรษะ เป็นไข้"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ตัวยาสำคัญ (Active Ingredients)</label>
                <input
                  type="text"
                  value={draft.ingredients}
                  onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })}
                  placeholder="เช่น Paracetamol 500 mg"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="is_active_checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  เปิดให้พร้อมจ่ายในระบบ (Active Status)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700 transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มเวชภัณฑ์'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Details Popup Modal */}
      {viewingItem && (
        <div
          data-testid="medication-details-backdrop"
          onClick={() => setViewingItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 shrink-0">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase block mb-0.5">
                    รายละเอียดเวชภัณฑ์
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {viewingItem.name}
                    </h2>
                    {viewingItem.dosage && (
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 ring-1 ring-inset ring-sky-700/20">
                        {viewingItem.dosage}
                      </span>
                    )}
                  </div>
                  {viewingItem.brand_name && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      ชื่อทางการค้า / ยี่ห้อ: <span className="font-semibold text-slate-700">{viewingItem.brand_name}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
              {/* Coverage Banner */}
              <div className={`flex items-center justify-between rounded-xl p-3.5 border ${
                viewingItem.coverage_type === 'non_covered'
                  ? 'border-purple-200 bg-purple-50/70 text-purple-900'
                  : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    viewingItem.coverage_type === 'non_covered' ? 'bg-purple-600' : 'bg-emerald-600'
                  }`} />
                  <div>
                    <span className="text-xs font-bold">
                      {viewingItem.coverage_type === 'non_covered'
                        ? 'ยานอกสิทธิ์ (จ่ายนอก / จ่ายแยก)'
                        : 'ยาในสิทธิ์ (เบิกได้)'}
                    </span>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {viewingItem.coverage_type === 'non_covered'
                        ? 'อยู่นอกบัญชียาหลักแห่งชาติ หรือเป็นยานำเข้า/ยาทางเลือกพิเศษ'
                        : 'ยาตามสิทธิ์การรักษา อยู่ในบัญชียาหลักแห่งชาติ'}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${
                  viewingItem.coverage_type === 'non_covered'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {viewingItem.coverage_type === 'non_covered' ? 'Non-covered' : 'In-formulary'}
                </span>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-400">รูปแบบยา</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {viewingItem.type || '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-400">หน่วยนับตัดจ่าย</span>
                  <p className="text-sm font-semibold text-sky-700 mt-0.5">
                    {viewingItem.unit || 'เม็ด'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-400">หมวดหมู่</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-1">
                    {viewingItem.category || '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-medium text-slate-400">สถานะในระบบ</span>
                  <div className="mt-1">
                    {viewingItem.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle2 className="h-3 w-3" /> พร้อมใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        <Ban className="h-3 w-3" /> พักการใช้งาน
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Manufacturer & Dates */}
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
                {viewingItem.manufacturer && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">บริษัทที่ผลิต (Manufacturer)</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {viewingItem.manufacturer}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">วันผลิต (MFG Date)</span>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      {formatDisplayDate(viewingItem.mfg_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">วันหมดอายุ (EXP Date)</span>
                    <p className={`text-xs font-medium mt-0.5 ${
                      isExpired(viewingItem.expiry_date) ? 'text-rose-600 font-bold' : 'text-slate-700'
                    }`}>
                      {formatDisplayDate(viewingItem.expiry_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock Status Bar */}
              <div className="rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">ระดับสต็อกคงเหลือ</span>
                  <span className="text-slate-500">
                    คงเหลือ <strong className="text-slate-900 text-sm">{viewingItem.stock} {viewingItem.unit || 'หน่วย'}</strong>{' '}
                    (ขั้นต่ำ {viewingItem.min_stock} {viewingItem.unit || 'หน่วย'})
                  </span>
                </div>
                {viewingItem.pack_unit && viewingItem.pack_size && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    📦 <strong>หน่วยบรรจุตอนซื้อ:</strong> 1 {viewingItem.pack_unit} = {viewingItem.pack_size} {viewingItem.unit || 'หน่วย'}
                  </p>
                )}
                {(() => {
                  const status = getStockStatus(viewingItem);
                  const maxDisplay = Math.max(viewingItem.min_stock * 2, viewingItem.stock, 1);
                  const percent = Math.min(Math.round((viewingItem.stock / maxDisplay) * 100), 100);
                  let progressColor = 'bg-emerald-500';
                  if (status === 'reorder') progressColor = 'bg-amber-500';
                  if (status === 'critical') progressColor = 'bg-rose-500';
                  return (
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${percent}%` }} />
                    </div>
                  );
                })()}
              </div>

              {/* Description & Ingredients */}
              {viewingItem.description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400">คำอธิบาย / ข้อบ่งใช้</span>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                    {viewingItem.description}
                  </p>
                </div>
              )}

              {viewingItem.ingredients && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <span className="text-[11px] font-medium text-slate-400">ตัวยาสำคัญ (Active Ingredients)</span>
                  <p className="text-xs text-slate-700 mt-1 font-mono leading-relaxed">
                    {viewingItem.ingredients}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 px-6 shrink-0 bg-slate-50/50 rounded-b-2xl">
              <span className="text-[11px] text-slate-400">
                รหัสเวชภัณฑ์: {viewingItem.id.slice(0, 8)}...
              </span>
              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      const item = viewingItem;
                      setViewingItem(null);
                      handleOpenEditModal(item);
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-4 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Soft-delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-xl p-2 ${deleteTarget.is_active ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {deleteTarget.is_active ? 'ตัวเลือกลบเวชภัณฑ์' : 'ยืนยันลบเวชภัณฑ์ถาวร'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    รายการ: <span className="font-semibold text-slate-700">{deleteTarget.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {deleteTarget.is_active ? (
              <div className="my-5 space-y-3">
                <p className="text-xs text-slate-600">
                  คุณสามารถเลือกรูปแบบการลบสำหรับเวชภัณฑ์นี้ได้ 2 รูปแบบ:
                </p>

                {/* Option 1: Soft Delete */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 transition hover:bg-amber-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-bold text-amber-900">
                          1. พักการใช้งาน (Soft Delete - แนะนำ)
                        </span>
                      </div>
                      <p className="text-xs text-amber-800/80 leading-relaxed">
                        ซ่อนรายการนี้ออกจากระบบจ่ายยา แต่เก็บประวัติไว้ในฐานข้อมูล และสามารถกดกู้คืน (Restore) ได้ทุกเมื่อ
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleSoftDelete(deleteTarget)}
                      className="shrink-0 inline-flex min-h-9 items-center justify-center rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 transition disabled:opacity-50"
                    >
                      {isDeleting ? 'กำลังบันทึก...' : 'พักใช้งาน'}
                    </button>
                  </div>
                </div>

                {/* Option 2: Hard Delete */}
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-4 transition hover:bg-rose-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        <span className="text-sm font-bold text-rose-900">
                          2. ลบออกจากระบบถาวร (Hard Delete)
                        </span>
                      </div>
                      <p className="text-xs text-rose-800/80 leading-relaxed">
                        ลบข้อมูลออกจาก Supabase ทันที ไม่สามารถกู้คืนข้อมูลได้ เหมาะสำหรับรายการที่สร้างผิดพลาด
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleHardDelete(deleteTarget)}
                      className="shrink-0 inline-flex min-h-9 items-center justify-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {isDeleting ? 'กำลังลบ...' : 'ลบถาวร'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-5 space-y-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 leading-relaxed">
                  ⚠️ รายการนี้ถูกพักการใช้งาน (Soft Deleted) ไว้อยู่แล้ว หากกดยืนยัน ข้อมูลจะถูกลบออกจากฐานข้อมูล Supabase ถาวรและไม่สามารถกู้คืนได้อีกต่อไป
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleRestoreMedication(deleteTarget)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    กู้คืนกลับมาใช้งาน
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setDeleteTarget(null)}
                      className="min-h-10 rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleHardDelete(deleteTarget)}
                      className="min-h-10 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบถาวร'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteTarget.is_active && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
