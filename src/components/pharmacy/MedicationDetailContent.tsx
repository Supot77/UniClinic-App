'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Lock,
  Package,
  Pencil,
  Pill,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';
import type {
  InventoryLog,
  Medication,
  MedicationCoverageType,
} from '@/types/database';

const supabase = createClient();

type StockStatus = 'sufficient' | 'reorder' | 'critical' | 'expired' | 'inactive';

interface MedicationEditDraft {
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
  'แผ่น',
  'มิลลิลิตร (ml)',
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

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59`;
  const expiryDate = new Date(normalized);
  if (Number.isNaN(expiryDate.getTime())) return false;
  return expiryDate.getTime() < Date.now();
}

function isExpiringSoon(dateStr: string | null | undefined): boolean {
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

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

interface MedicationDetailContentProps {
  medicationId: string;
  currentRole?: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
}

export default function MedicationDetailContent({
  medicationId,
  currentRole,
}: MedicationDetailContentProps) {
  const { role: authRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && authRole === 'patient') {
      router.replace('/dashboard');
    }
  }, [authLoading, authRole, router]);

  const effectiveRole = currentRole || authRole || 'medical';
  const isAdminOrStaff =
    effectiveRole === 'admin' || effectiveRole === 'staff_admin' || effectiveRole === 'staff';
  const canManage = !isAdminOrStaff;

  const [medication, setMedication] = useState<Medication | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MedicationEditDraft | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .eq('id', medicationId)
          .single();

        if (ignore) return;
        if (error) throw error;
        if (data) {
          setMedication(data as Medication);
        } else {
          setErrorMessage('ไม่พบข้อมูลยาในระบบ');
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'โหลดข้อมูลยาไม่สำเร็จ';
          setErrorMessage(msg);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('inventory_logs')
          .select('*')
          .eq('medication_id', medicationId)
          .order('created_at', { ascending: false });

        if (ignore || error) return;
        if (data) setLogs(data as InventoryLog[]);
      } catch {
        // ignore
      } finally {
        if (!ignore) setIsLoadingLogs(false);
      }
    }

    void fetchData();
    void fetchLogs();

    return () => {
      ignore = true;
    };
  }, [medicationId]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 3500);
    return () => clearTimeout(timer);
  }, [successToast]);

  const handleOpenEditModal = () => {
    if (!medication || !canManage) return;
    setEditDraft({
      name: medication.name,
      dosage: medication.dosage || '',
      brand_name: medication.brand_name || '',
      type: medication.type || 'เม็ด',
      unit: medication.unit || 'เม็ด',
      pack_unit: medication.pack_unit || '',
      pack_size: medication.pack_size ?? '',
      category: medication.category || '',
      coverage_type: medication.coverage_type || 'covered',
      manufacturer: medication.manufacturer || '',
      mfg_date: medication.mfg_date || '',
      stock: medication.stock ?? 0,
      min_stock: medication.min_stock ?? 0,
      expiry_date: medication.expiry_date || '',
      description: medication.description || '',
      ingredients: medication.ingredients || '',
      is_active: medication.is_active ?? true,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft || !medication || !canManage) return;

    if (!editDraft.name.trim()) {
      setFormError('กรุณากรอกชื่อยา');
      return;
    }
    if (!editDraft.category.trim()) {
      setFormError('กรุณาระบุหมวดหมู่ยา');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: Partial<Medication> = {
        name: editDraft.name.trim(),
        dosage: editDraft.dosage.trim() || null,
        brand_name: editDraft.brand_name.trim() || null,
        type: editDraft.type,
        unit: editDraft.unit || 'เม็ด',
        pack_unit: editDraft.pack_unit.trim() || null,
        pack_size: typeof editDraft.pack_size === 'number' && editDraft.pack_size > 0 ? editDraft.pack_size : null,
        category: editDraft.category.trim(),
        coverage_type: editDraft.coverage_type,
        manufacturer: editDraft.manufacturer.trim() || null,
        mfg_date: editDraft.mfg_date || null,
        stock: Number(editDraft.stock) || 0,
        min_stock: Number(editDraft.min_stock) || 0,
        expiry_date: editDraft.expiry_date || null,
        description: editDraft.description.trim() || null,
        ingredients: editDraft.ingredients.trim() || null,
        is_active: editDraft.is_active,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('medications')
        .update(payload)
        .eq('id', medication.id)
        .select()
        .single();

      if (error) throw error;

      const updated = (data as Medication) || { ...medication, ...payload };
      setMedication(updated);
      setIsEditModalOpen(false);
      setSuccessToast(`บันทึก "${updated.name}" แล้ว`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-3 sm:px-6 lg:px-8 py-8" aria-busy="true">
        <Link
          href="/pharmacy"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>กลับไปคลังยา</span>
        </Link>
        <div className="rounded-2xl border border-brand-border-soft bg-white p-8 text-center shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium text-slate-600">กำลังโหลดรายละเอียดยา…</p>
        </div>
      </main>
    );
  }

  if (errorMessage || !medication) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-3 sm:px-6 lg:px-8 py-8">
        <Link
          href="/pharmacy"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>กลับไปคลังยา</span>
        </Link>
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center space-y-3 shadow-xs"
        >
          <div className="inline-flex rounded-full bg-rose-100 p-3 text-rose-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-rose-900">ไม่พบข้อมูลยา</h1>
          <p className="text-sm text-rose-700 max-w-md mx-auto">
            {errorMessage || 'รายการยานี้อาจถูกลบหรือไม่มีอยู่ในคลังยา'}
          </p>
          <div className="pt-2">
            <Link
              href="/pharmacy"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-800 shadow-2xs hover:bg-rose-50"
            >
              กลับไปคลังยา
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const stockStatus = getStockStatus(medication);
  const expired = isExpired(medication.expiry_date);
  const expiring = isExpiringSoon(medication.expiry_date);
  const isNonCovered = medication.coverage_type === 'non_covered';

  const maxDisplay = Math.max(medication.min_stock * 2, medication.stock, 1);
  const percent = Math.min(Math.round((medication.stock / maxDisplay) * 100), 100);

  let progressColor = 'bg-emerald-500';
  if (stockStatus === 'reorder') progressColor = 'bg-amber-500';
  if (stockStatus === 'critical') progressColor = 'bg-rose-500';

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Toast Notification */}
      {successToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-lg animate-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </aside>
      )}

      {/* Navigation Breadcrumb & Back button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pharmacy"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>กลับไปคลังยา</span>
        </Link>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/pharmacy" className="hover:text-slate-600">
                คลังยา
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
              {medication.name}
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Header Card */}
      <header className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-1 rounded-2xl bg-sky-50 p-3 text-sky-600 shrink-0 ring-1 ring-sky-600/10">
              <Pill className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase block">
                รายละเอียดยาและเวชภัณฑ์ในคลัง
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                  {medication.name}
                </h1>
                {medication.dosage && (
                  <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-inset ring-sky-700/20">
                    {medication.dosage}
                  </span>
                )}
                {medication.is_active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> พร้อมใช้งาน
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-400/20">
                    <Ban className="h-3.5 w-3.5" /> พักการใช้งาน
                  </span>
                )}
              </div>
              {medication.brand_name && (
                <p className="text-sm text-slate-500">
                  ชื่อทางการค้า / ยี่ห้อ:{' '}
                  <span className="font-semibold text-slate-800">{medication.brand_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Role-based action button */}
          <div className="self-start sm:self-auto shrink-0 flex items-center gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-sky-500 active:scale-[0.98] transition"
              >
                <Pencil className="h-4 w-4" />
                <span>แก้ไขข้อมูลยา</span>
              </button>
            ) : (
              <span
                title="เฉพาะแพทย์และเภสัชกรเท่านั้นที่แก้ไขข้อมูลยาได้"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-500 select-none"
              >
                <Lock className="h-4 w-4 text-slate-400" />
                <span>ดูอย่างเดียว</span>
              </span>
            )}
          </div>
        </div>

        {/* Coverage Banner */}
        <div
          className={`mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 sm:p-4 border ${
            isNonCovered
              ? 'border-purple-200 bg-purple-50/70 text-purple-900'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${
                isNonCovered ? 'bg-purple-600' : 'bg-emerald-600'
              }`}
            />
            <div>
              <span className="text-sm font-bold">
                {isNonCovered
                  ? 'ยานอกสิทธิ์ (จ่ายนอก)'
                  : 'ยาในสิทธิ์ (เบิกได้)'}
              </span>
              <p className="text-xs opacity-85 mt-0.5">
                {isNonCovered
                  ? 'อยู่นอกบัญชียาหลักแห่งชาติ หรือเป็นยานำเข้า/ยาทางเลือกพิเศษ'
                  : 'ยาตามสิทธิ์การรักษาหรืออยู่ในบัญชียาหลักแห่งชาติ'}
              </p>
            </div>
          </div>
          <span
            className={`self-start sm:self-auto shrink-0 text-xs font-semibold rounded-full px-3 py-1 ${
              isNonCovered
                ? 'bg-purple-100 text-purple-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isNonCovered ? 'ยานอกสิทธิ์' : 'ยาในสิทธิ์'}
          </span>
        </div>
      </header>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stock & Specs (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Level Card */}
          <section
            aria-labelledby="stock-status-heading"
            className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="stock-status-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-sky-600" />
                สต็อกคงเหลือ
              </h2>
              <div>
                {stockStatus === 'sufficient' && (
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    มีเพียงพอ
                  </span>
                )}
                {stockStatus === 'reorder' && (
                  <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    ต้องสั่งเพิ่ม
                  </span>
                )}
                {stockStatus === 'critical' && (
                  <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    วิกฤตใกล้หมด
                  </span>
                )}
                {stockStatus === 'expired' && (
                  <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                    หมดอายุ
                  </span>
                )}
                {stockStatus === 'inactive' && (
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    พักใช้งาน
                  </span>
                )}
              </div>
            </div>

            {/* Big Numbers */}
            <div className="flex flex-wrap items-baseline justify-between gap-3 pt-1">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {medication.stock}
                </span>
                <span className="ml-2 text-sm font-medium text-slate-500">
                  {medication.unit || 'หน่วย'}
                </span>
              </div>
              <div className="text-right text-xs text-slate-500">
                <span>สต็อกขั้นต่ำ: </span>
                <strong className="font-bold text-slate-700">
                  {medication.min_stock} {medication.unit || 'หน่วย'}
                </strong>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0</span>
                <span>จุดสั่งซื้อ: {medication.min_stock}</span>
                <span>เป้าหมายสต็อก: {medication.min_stock * 2}+</span>
              </div>
            </div>

            {/* Packaging info notice */}
            {medication.pack_unit && medication.pack_size && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  <strong>หน่วยบรรจุตอนซื้อ:</strong> 1 {medication.pack_unit} = {medication.pack_size}{' '}
                  {medication.unit || 'หน่วย'}
                </span>
              </div>
            )}
          </section>

          {/* Quick Specifications Grid */}
          <section
            aria-labelledby="med-specs-heading"
            className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-6 shadow-xs space-y-4"
          >
            <h2 id="med-specs-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" />
              ข้อมูลยา
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[11px] font-medium text-slate-400">รูปแบบยา</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {medication.type || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[11px] font-medium text-slate-400">หน่วยนับตัดจ่าย</span>
                <p className="text-sm font-semibold text-sky-700 mt-0.5">
                  {medication.unit || 'เม็ด'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[11px] font-medium text-slate-400">หมวดหมู่ยา</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-1">
                  {medication.category || '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="text-[11px] font-medium text-slate-400">รหัสเวชภัณฑ์</span>
                <p className="text-xs font-mono font-semibold text-slate-700 mt-1 truncate" title={medication.id}>
                  {medication.id.slice(0, 10)}…
                </p>
              </div>
            </div>

            {/* Description & Indication */}
            {medication.description && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-600 block">
                  คำอธิบายหรือข้อบ่งใช้
                </span>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {medication.description}
                </p>
              </div>
            )}

            {/* Active Ingredients */}
            {medication.ingredients && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
                <span className="text-xs font-semibold text-slate-600 block">
                  ตัวยาสำคัญ
                </span>
                <p className="text-sm text-slate-700 font-mono leading-relaxed">
                  {medication.ingredients}
                </p>
              </div>
            )}
          </section>

          {/* Inventory Movement History Log */}
          <section
            aria-labelledby="inventory-history-heading"
            className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="inventory-history-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-sky-600" />
                ประวัติความเคลื่อนไหวในคลัง
              </h2>
              <span className="text-xs text-slate-400">
                {logs.length} รายการ
              </span>
            </div>

            {isLoadingLogs ? (
              <p className="text-xs text-slate-400 text-center py-4">กำลังโหลดประวัติสต็อก…</p>
            ) : logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-xs text-slate-400">ยังไม่มีประวัติรับเข้าหรือจ่ายยา</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">วันที่/เวลา</th>
                      <th className="py-2.5 px-3">ประเภทรายการ</th>
                      <th className="py-2.5 px-3 text-right">จำนวน</th>
                      <th className="py-2.5 px-3">เหตุผลหรือหมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono">{formatDateTime(log.created_at)}</td>
                        <td className="py-2.5 px-3">
                          {log.action === 'dispense' && (
                            <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                              จ่ายยา
                            </span>
                          )}
                          {log.action === 'add' && (
                            <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              รับเข้า
                            </span>
                          )}
                          {log.action === 'adjust' && (
                            <span className="inline-flex rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                              ปรับยอด
                            </span>
                          )}
                          {log.action === 'damage' && (
                            <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                              ตัดจำหน่ายหรือชำรุด
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold font-mono">
                          {log.quantity} {medication.unit || 'หน่วย'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[180px]">
                          {log.reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Manufacturing, Dates & Summary (1 col wide on desktop) */}
        <div className="space-y-6">
          {/* Manufacturing & Dates Card */}
          <section
            aria-labelledby="manufacturing-heading"
            className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-6 shadow-xs space-y-4"
          >
            <h2 id="manufacturing-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              การผลิตและวันหมดอายุ
            </h2>

            <div className="space-y-3.5 divide-y divide-slate-100">
              {medication.manufacturer && (
                <div className="pt-1">
                  <span className="text-[11px] font-medium text-slate-400">ผู้ผลิต</span>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                    {medication.manufacturer}
                  </p>
                </div>
              )}

              <div className="pt-3 space-y-1">
                <span className="text-[11px] font-medium text-slate-400">วันที่ผลิต</span>
                <p className="text-sm font-medium text-slate-700">
                  {formatDisplayDate(medication.mfg_date)}
                </p>
              </div>

              <div className="pt-3 space-y-1">
                <span className="text-[11px] font-medium text-slate-400">วันหมดอายุ</span>
                <p
                  className={`text-sm font-bold ${
                    expired ? 'text-rose-600' : expiring ? 'text-amber-600' : 'text-slate-800'
                  }`}
                >
                  {formatDisplayDate(medication.expiry_date)}
                </p>

                {expired && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>หมดอายุแล้ว จ่ายไม่ได้</span>
                  </div>
                )}
                {!expired && expiring && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>ใกล้หมดอายุภายใน 90 วัน</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Quick Actions Card */}
          <section className="rounded-2xl border border-brand-border-soft bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              การจัดการเวชภัณฑ์
            </h2>

            <div className="pt-2 space-y-2">
              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
                >
                  <Pencil className="h-4 w-4" />
                  <span>แก้ไขข้อมูล</span>
                </button>
              )}
              <Link
                href="/pharmacy"
                className="w-full inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                กลับไปคลังยา
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Medication Modal */}
      {isEditModalOpen && editDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="แก้ไขข้อมูลยา"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                  <Pencil className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">แก้ไขข้อมูลยา</h2>
              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่างแก้ไข"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {formError && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อยา / ชื่อสามัญ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ขนาดยา / ความแรง
                    </label>
                    <input
                      type="text"
                      value={editDraft.dosage}
                      onChange={(e) => setEditDraft({ ...editDraft, dosage: e.target.value })}
                      placeholder="เช่น 500mg, 10mg/5ml"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อทางการค้า / ยี่ห้อ
                    </label>
                    <input
                      type="text"
                      value={editDraft.brand_name}
                      onChange={(e) => setEditDraft({ ...editDraft, brand_name: e.target.value })}
                      placeholder="เช่น Sara, Tylenol"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รูปแบบยา
                    </label>
                    <select
                      value={editDraft.type}
                      onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
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
                      หน่วยจ่าย
                    </label>
                    <select
                      value={editDraft.unit}
                      onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      หมวดหมู่ยา <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editDraft.category}
                      onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      {COMMON_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สิทธิ์การเบิกจ่าย
                    </label>
                    <select
                      value={editDraft.coverage_type}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          coverage_type: e.target.value as MedicationCoverageType,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="covered">ยาในสิทธิ์ (เบิกได้)</option>
                      <option value="non_covered">ยานอกสิทธิ์ (จ่ายนอก)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สต็อกปัจจุบัน ({editDraft.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.stock}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      สต็อกขั้นต่ำ ({editDraft.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.min_stock}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          min_stock: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      วันหมดอายุ
                    </label>
                    <input
                      type="date"
                      value={editDraft.expiry_date}
                      onChange={(e) => setEditDraft({ ...editDraft, expiry_date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ผู้ผลิต
                    </label>
                    <input
                      type="text"
                      value={editDraft.manufacturer}
                      onChange={(e) => setEditDraft({ ...editDraft, manufacturer: e.target.value })}
                      placeholder="เช่น องค์การเภสัชกรรม"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      คำอธิบายหรือข้อบ่งใช้
                    </label>
                    <textarea
                      rows={2}
                      value={editDraft.description}
                      onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ตัวยาสำคัญ
                    </label>
                    <textarea
                      rows={2}
                      value={editDraft.ingredients}
                      onChange={(e) => setEditDraft({ ...editDraft, ingredients: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 sm:p-6 pt-3 shrink-0 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-sky-500 disabled:opacity-50 transition"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmitting ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
