'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Pill,
  RefreshCw,
  RotateCcw,
  Search,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import type { Medication } from '@/types/database';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

function ViewportPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface PrescribedMedItem {
  medication_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: number;
  dispensed?: boolean;
  dispensed_at?: string | null;
  dispensed_by?: string | null;
}

export interface PrescriptionOrder {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  patient_phone?: string | null;
  patient_student_id?: string | null;
  doctor_name: string;
  diagnosis: string;
  treatment_notes?: string | null;
  prescribed_medications: PrescribedMedItem[];
  created_at: string;
  dispensed_items_count: number;
  is_fully_dispensed: boolean;
  dispensed_at?: string | null;
  pharmacist_name?: string | null;
}

interface PrescriptionsTabProps {
  prescriptions: PrescriptionOrder[];
  isLoading: boolean;
  errorMessage: string | null;
  medications: Medication[];
  canManage: boolean;
  isAdminOrStaff: boolean;
  userId?: string;
  initialStatus?: 'all' | 'pending' | 'dispensed' | 'insufficient';
  initialSort?: 'newest' | 'oldest';
  statusFilter?: 'all' | 'pending' | 'dispensed' | 'insufficient';
  onStatusFilterChange?: (status: 'all' | 'pending' | 'dispensed' | 'insufficient') => void;
  sortBy?: 'newest' | 'oldest';
  onSortByChange?: (sort: 'newest' | 'oldest') => void;
  onRefresh: () => Promise<void>;
  onStockUpdated: () => Promise<void>;
  onPrescriptionDispensed?: (orderId: string, updatedMeds: PrescribedMedItem[]) => void;
  onShowToast: (message: string) => void;
}

function formatDisplayDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default function PrescriptionsTab({
  prescriptions,
  isLoading,
  errorMessage,
  medications,
  canManage,
  userId,
  initialStatus = 'pending',
  initialSort = 'oldest',
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  sortBy: controlledSortBy,
  onSortByChange,
  onRefresh,
  onStockUpdated,
  onPrescriptionDispensed,
  onShowToast,
}: PrescriptionsTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'pending' | 'dispensed' | 'insufficient'>(initialStatus);
  const [internalSortBy, setInternalSortBy] = useState<'newest' | 'oldest'>(initialSort);

  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const sortBy = controlledSortBy ?? internalSortBy;

  const handleStatusFilterChange = (status: 'all' | 'pending' | 'dispensed' | 'insufficient') => {
    if (onStatusFilterChange) {
      onStatusFilterChange(status);
    } else {
      setInternalStatusFilter(status);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clinic_prescription_status_filter', status);
          const url = new URL(window.location.href);
          url.searchParams.set('status', status);
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }
    }
  };

  const handleSortByChange = (sort: 'newest' | 'oldest') => {
    if (onSortByChange) {
      onSortByChange(sort);
    } else {
      setInternalSortBy(sort);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clinic_prescription_sort_by', sort);
          const url = new URL(window.location.href);
          url.searchParams.set('sort', sort);
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }
    }
  };

  const [dispenseTarget, setDispenseTarget] = useState<PrescriptionOrder | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseReason, setDispenseReason] = useState('');
  const [skipStockDeduction, setSkipStockDeduction] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  const handleOpenDispenseModal = (order: PrescriptionOrder) => {
    setDispenseTarget(order);
    setDispenseError(null);
    setDispenseReason('');
    setSkipStockDeduction(false);
  };

  const handleCloseDispenseModal = useCallback(() => {
    if (isDispensing) return;
    setDispenseTarget(null);
    setDispenseError(null);
    setDispenseReason('');
    setSkipStockDeduction(false);
  }, [isDispensing]);

  // Close modal on Escape key and lock body scroll
  useEffect(() => {
    if (!dispenseTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDispenseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [dispenseTarget, handleCloseDispenseModal]);

  const [revokeTarget, setRevokeTarget] = useState<PrescriptionOrder | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [restockToInventory, setRestockToInventory] = useState(true);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleOpenRevokeModal = (order: PrescriptionOrder) => {
    setRevokeTarget(order);
    setRevokeError(null);
    setRevokeReason('');
    setRestockToInventory(true);
  };

  const handleCloseRevokeModal = useCallback(() => {
    if (isRevoking) return;
    setRevokeTarget(null);
    setRevokeError(null);
    setRevokeReason('');
    setRestockToInventory(true);
  }, [isRevoking]);

  useEffect(() => {
    if (!revokeTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseRevokeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [revokeTarget, handleCloseRevokeModal]);

  // Stats
  const stats = useMemo(() => {
    let pending = 0;
    let dispensed = 0;
    let insufficient = 0;

    prescriptions.forEach((order) => {
      if (order.is_fully_dispensed) {
        dispensed++;
      } else {
        pending++;
        const anyShort = order.prescribed_medications.some((item) => {
          const med = medications.find(
            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
          );
          return !med || med.stock < item.quantity;
        });
        if (anyShort) insufficient++;
      }
    });

    return {
      total: prescriptions.length,
      pending,
      dispensed,
      insufficient,
    };
  }, [prescriptions, medications]);

  // Filter & Search
  const filteredPrescriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return prescriptions
      .filter((order) => {
        if (statusFilter === 'pending' && order.is_fully_dispensed) return false;
        if (statusFilter === 'dispensed' && !order.is_fully_dispensed) return false;
        if (statusFilter === 'insufficient') {
          if (order.is_fully_dispensed) return false;
          const anyShort = order.prescribed_medications.some((item) => {
            const med = medications.find(
              (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
            );
            return !med || med.stock < item.quantity;
          });
          if (!anyShort) return false;
        }

        if (q) {
          const matchPatient = order.patient_name.toLowerCase().includes(q);
          const matchStudentId = order.patient_student_id?.toLowerCase().includes(q) ?? false;
          const matchDoctor = order.doctor_name.toLowerCase().includes(q);
          const matchDiag = order.diagnosis?.toLowerCase().includes(q) ?? false;
          const matchNotes = order.treatment_notes?.toLowerCase().includes(q) ?? false;
          const matchMedName = order.prescribed_medications.some((m) =>
            m.name.toLowerCase().includes(q)
          );

          if (
            !matchPatient &&
            !matchStudentId &&
            !matchDoctor &&
            !matchDiag &&
            !matchNotes &&
            !matchMedName
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [prescriptions, medications, searchQuery, statusFilter, sortBy]);

  // Handle Dispense
  const handleConfirmDispense = async () => {
    if (!dispenseTarget || !canManage) return;

    if (dispenseTarget.is_fully_dispensed) {
      setDispenseError('ใบสั่งยานี้ได้รับการตัดจ่ายสต็อกเรียบร้อยแล้ว ไม่สามารถตัดซ้ำได้');
      return;
    }

    setIsDispensing(true);
    setDispenseError(null);
    try {
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const { data: authData } = await supabase.auth.getUser();
        effectiveUserId = authData.user?.id;
      }
      if (!effectiveUserId) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      if (!skipStockDeduction) {
        for (const item of dispenseTarget.prescribed_medications) {
          // Skip medication if it has already been marked as dispensed
          if (item.dispensed) {
            continue;
          }

          const med = medications.find(
            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
          );

          const targetMedId = med ? med.id : item.medication_id;
          const currentStock = med ? med.stock : 0;
          const newStock = Math.max(0, currentStock - item.quantity);

          if (med) {
            const { error: updateError } = await supabase
              .from('medications')
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', targetMedId);

            if (updateError) {
              const updateMsg = updateError.message || JSON.stringify(updateError);
              console.error(`Failed to update stock for ${item.name}:`, updateMsg);
              throw new Error(`ไม่สามารถอัปเดตสต็อกของ ${item.name}: ${updateMsg}`);
            }

            const reasonText = dispenseReason.trim()
              ? `${dispenseReason.trim()} (จ่ายยาตามใบสั่งแพทย์: ${dispenseTarget.patient_name} บันทึก #${dispenseTarget.id.slice(0, 8)})`
              : `จ่ายยาตามใบสั่งแพทย์: ${dispenseTarget.patient_name} (บันทึก #${dispenseTarget.id.slice(0, 8)})`;

            const { error: logError } = await supabase.from('inventory_logs').insert({
              medication_id: targetMedId,
              pharmacist_id: effectiveUserId,
              action: 'dispense',
              quantity: item.quantity,
              reason: reasonText,
              idempotency_key: `dispense:${dispenseTarget.id}:${item.medication_id || targetMedId}`,
            });

            if (logError) {
              const logErrMsg =
                logError.message ||
                logError.details ||
                logError.code ||
                'RLS policy or permission limitation';
              const isDuplicate =
                logError.code === '23505' ||
                logErrMsg.includes('duplicate key') ||
                logErrMsg.includes('idx_inventory_logs_idempotency_unique');

            if (isDuplicate) {
              console.info(
                `[PrescriptionsTab] Item ${item.name} was already recorded in inventory_logs. Proceeding to update record.`
              );
            } else {
              console.error(
                `[PrescriptionsTab] Error: inventory_logs insert failed for ${item.name}:`,
                logErrMsg
              );
              throw new Error(`บันทึกประวัติการจ่ายยา ${item.name} ไม่สำเร็จ: ${logErrMsg}`);
            }
          }
        }
      }
    }

      // Mark prescribed_medications as dispensed in medical_records
      const nowIso = new Date().toISOString();
      const updatedMeds = dispenseTarget.prescribed_medications.map((item) => ({
        ...item,
        dispensed: true,
        dispensed_at: item.dispensed_at || nowIso,
        dispensed_by: item.dispensed_by || effectiveUserId,
      }));

      // Update medical_records table directly in Supabase (with fallback to RPC)
      let updateError: { message?: string } | null = null;
      const { error: recordError } = await supabase
        .from('medical_records')
        .update({
          prescribed_medications: updatedMeds,
        })
        .eq('id', dispenseTarget.id);

      if (recordError) {
        console.warn(
          '[PrescriptionsTab] Direct update failed, attempting RPC dispense_medical_record_prescriptions:',
          recordError
        );
        const { error: rpcError } = await supabase.rpc('dispense_medical_record_prescriptions', {
          p_record_id: dispenseTarget.id,
          p_prescribed_medications: updatedMeds,
        });

        if (rpcError) {
          console.error('[PrescriptionsTab] Both direct update and RPC failed:', rpcError);
          updateError = recordError;
        }
      }

      if (updateError) {
        throw new Error(
          `บันทึกสถานะการจ่ายยาไม่สำเร็จ: ${updateError.message || JSON.stringify(updateError)}`
        );
      }

      // Optimistic update to parent state
      onPrescriptionDispensed?.(dispenseTarget.id, updatedMeds);

      onShowToast(
        skipStockDeduction
          ? `บันทึกสถานะการจ่ายยาสำหรับ ${dispenseTarget.patient_name} แล้ว (ไม่ตัดสต็อกซ้ำ)`
          : `จ่ายยาสำหรับ ${dispenseTarget.patient_name} และอัปเดตสต็อกแล้ว`
      );
      setDispenseTarget(null);
      setDispenseReason('');
      setSkipStockDeduction(false);

      await onStockUpdated();
      if (typeof router?.refresh === 'function') {
        router.refresh();
      }

      // Trigger automatic page reload cleanly with preserved tab, status filter and sort
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clinic_pharmacy_active_tab', 'prescriptions');
          localStorage.setItem('clinic_pharmacy_active_tab', 'prescriptions');
          sessionStorage.setItem('clinic_prescription_status_filter', statusFilter);
          sessionStorage.setItem('clinic_prescription_sort_by', sortBy);

          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'prescriptions');
          url.searchParams.set('status', statusFilter);
          url.searchParams.set('sort', sortBy);
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        setTimeout(() => {
          try {
            if (typeof window.location?.reload === 'function') {
              window.location.reload();
            } else {
              window.location.href = window.location.href;
            }
          } catch {
            // ignore
          }
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'จ่ายยาไม่สำเร็จ';
      console.error('Dispense error:', msg);
      setDispenseError(msg);
    } finally {
      setIsDispensing(false);
    }
  };

  // Handle Revoke Dispensation & Restock
  const handleConfirmRevokeDispense = async () => {
    if (!revokeTarget || !canManage) return;

    setIsRevoking(true);
    setRevokeError(null);
    try {
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const { data: authData } = await supabase.auth.getUser();
        effectiveUserId = authData.user?.id;
      }
      if (!effectiveUserId) {
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
      }

      // 1. Restock medications if requested
      if (restockToInventory) {
        for (const item of revokeTarget.prescribed_medications) {
          const med = medications.find(
            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
          );

          if (med) {
            const targetMedId = med.id;
            const currentStock = med.stock;
            const newStock = currentStock + item.quantity;

            const { error: updateError } = await supabase
              .from('medications')
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', targetMedId);

            if (updateError) {
              const updateMsg = updateError.message || JSON.stringify(updateError);
              console.error(`Failed to restock for ${item.name}:`, updateMsg);
              throw new Error(`ไม่สามารถคืนสต็อกของ ${item.name}: ${updateMsg}`);
            }

            const reasonText = revokeReason.trim()
              ? `ยกเลิกการตัดจ่ายยา: ${revokeReason.trim()} (ผู้ป่วย: ${revokeTarget.patient_name} บันทึก #${revokeTarget.id.slice(0, 8)})`
              : `ยกเลิกการตัดจ่ายและคืนสต็อก: ${revokeTarget.patient_name} (บันทึก #${revokeTarget.id.slice(0, 8)})`;

            const { error: logError } = await supabase.from('inventory_logs').insert({
              medication_id: targetMedId,
              pharmacist_id: effectiveUserId,
              action: 'restock',
              quantity: item.quantity,
              reason: reasonText,
            });

            if (logError) {
              console.warn(
                `[PrescriptionsTab] Non-fatal: inventory_logs insert skipped for restock of ${item.name}:`,
                logError.message
              );
            }
          }
        }
      }

      // 2. Reset prescribed_medications status in medical_records
      const revertedMeds = revokeTarget.prescribed_medications.map((item) => ({
        ...item,
        dispensed: false,
        dispensed_at: null,
        dispensed_by: null,
      }));

      let updateError: { message?: string } | null = null;
      const { error: recordError } = await supabase
        .from('medical_records')
        .update({
          prescribed_medications: revertedMeds,
        })
        .eq('id', revokeTarget.id);

      if (recordError) {
        console.warn(
          '[PrescriptionsTab] Direct update failed, attempting RPC dispense_medical_record_prescriptions:',
          recordError
        );
        const { error: rpcError } = await supabase.rpc('dispense_medical_record_prescriptions', {
          p_record_id: revokeTarget.id,
          p_prescribed_medications: revertedMeds,
        });

        if (rpcError) {
          console.error('[PrescriptionsTab] Both direct update and RPC failed for revoke:', rpcError);
          updateError = recordError;
        }
      }

      if (updateError) {
        throw new Error(
          `ไม่สามารถปรับปรุงสถานะใบสั่งยาในฐานข้อมูลได้: ${updateError.message || JSON.stringify(updateError)}`
        );
      }

      // Optimistic update to parent state
      onPrescriptionDispensed?.(revokeTarget.id, revertedMeds);

      onShowToast(
        restockToInventory
          ? `ยกเลิกการตัดจ่ายและคืนสต็อกยาสำหรับ ${revokeTarget.patient_name} เรียบร้อยแล้ว`
          : `ยกเลิกสถานะจ่ายยาสำหรับ ${revokeTarget.patient_name} เรียบร้อยแล้ว (ไม่คืนสต็อก)`
      );
      setRevokeTarget(null);
      setRevokeReason('');
      setRestockToInventory(true);

      await onStockUpdated();
      if (typeof router?.refresh === 'function') {
        router.refresh();
      }

      // Save tab, status, sort before reloading cleanly
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('clinic_pharmacy_active_tab', 'prescriptions');
          localStorage.setItem('clinic_pharmacy_active_tab', 'prescriptions');
          sessionStorage.setItem('clinic_prescription_status_filter', statusFilter);
          sessionStorage.setItem('clinic_prescription_sort_by', sortBy);

          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'prescriptions');
          url.searchParams.set('status', statusFilter);
          url.searchParams.set('sort', sortBy);
          window.history.replaceState({}, '', url.toString());
        } catch {
          // ignore
        }
      }

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        setTimeout(() => {
          try {
            if (typeof window.location?.reload === 'function') {
              window.location.reload();
            } else {
              window.location.href = window.location.href;
            }
          } catch {
            // ignore
          }
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกการตัดจ่ายยา';
      console.error('Revoke dispense error:', msg);
      setRevokeError(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards - Styled identically to Medication Inventory */}
      <section
        className="mb-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-8 sm:grid-cols-4 border-b border-slate-200 pb-2"
        aria-label="สรุปสถานะรายการสั่งยา"
      >
        {[
          {
            key: 'all' as const,
            label: 'ใบสั่งยาทั้งหมด',
            value: stats.total,
            sub: 'รวมทุกสถานะ',
            icon: FileText,
            iconColorActive: 'text-brand-strong',
          },
          {
            key: 'pending' as const,
            label: 'รอตัดจ่ายยา',
            value: stats.pending,
            sub: 'ยังไม่ได้ตัดสต็อก',
            icon: Clock,
            iconColorActive: 'text-amber-600',
          },
          {
            key: 'dispensed' as const,
            label: 'ตัดจ่ายแล้ว',
            value: stats.dispensed,
            sub: 'ตัดสต็อกแล้ว',
            icon: CheckCircle2,
            iconColorActive: 'text-emerald-600',
          },
          {
            key: 'insufficient' as const,
            label: 'สต็อกยาไม่พอ',
            value: stats.insufficient,
            sub: 'ต้องเติมสต็อกก่อนจ่าย',
            icon: AlertTriangle,
            iconColorActive: 'text-rose-600',
          },
        ].map((item) => {
          const isSelected = statusFilter === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleStatusFilterChange(statusFilter === item.key ? 'all' : item.key)}
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

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อผู้ป่วย รหัสนักศึกษา ชื่อแพทย์ หรือชื่อยา"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Status buttons */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'pending'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รอตัดจ่าย ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('dispensed')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'dispensed'
                  ? 'bg-emerald-100 text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตัดจ่ายแล้ว ({stats.dispensed})
            </button>
            {stats.insufficient > 0 && (
              <button
                type="button"
                onClick={() => handleStatusFilterChange('insufficient')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'insufficient'
                    ? 'bg-rose-100 text-rose-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                สต็อกไม่พอ ({stats.insufficient})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value as 'newest' | 'oldest')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="newest">วันที่สั่ง: ใหม่ไปเก่า</option>
            <option value="oldest">วันที่สั่ง: เก่าไปใหม่</option>
          </select>

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            title="รีเฟรชรายการสั่งยา"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200 shadow-xs hover:bg-rose-100"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Prescriptions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
              <div className="h-5 w-1/3 bg-slate-200 rounded-md mb-3" />
              <div className="h-4 w-1/4 bg-slate-100 rounded-md mb-4" />
              <div className="h-16 w-full bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800">ไม่พบรายการสั่งยา</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery || statusFilter !== 'all'
              ? 'ไม่พบรายการตามคำค้นหาหรือตัวกรอง'
              : 'ยังไม่มีใบสั่งยาในระบบ'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((order) => {
            const hasShortage = order.prescribed_medications.some((item) => {
              const med = medications.find(
                (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
              );
              return !med || med.stock < item.quantity;
            });

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <User className="h-4 w-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 sm:text-base">
                        {order.patient_name}
                      </h3>
                      {order.patient_student_id && (
                        <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {order.patient_student_id}
                        </span>
                      )}
                      {order.patient_phone && (
                        <span className="text-xs text-slate-500">
                          · {order.patient_phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pl-9">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                        แพทย์: <strong>{order.doctor_name}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDisplayDateTime(order.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {order.is_fully_dispensed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle2 className="h-4 w-4" />
                        ตัดสต็อกแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                        <Clock className="h-4 w-4 text-amber-600" />
                        รอตัดจ่ายยา ({order.dispensed_items_count}/{order.prescribed_medications.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Medications Table */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        รายการยาตามใบสั่ง ({order.prescribed_medications.length} รายการ)
                      </h4>
                    </div>
                    {hasShortage && !order.is_fully_dispensed && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        สต็อกยาไม่พอสำหรับบางรายการ
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3.5 py-2.5 font-semibold">รายการยาและเวชภัณฑ์</th>
                          <th className="px-3.5 py-2.5 font-semibold">ขนาดยาและวิธีใช้</th>
                          <th className="px-3.5 py-2.5 font-semibold text-center">จำนวนที่สั่ง</th>
                          <th className="px-3.5 py-2.5 font-semibold text-center">สต็อกในคลัง</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">สถานะการจ่าย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {order.prescribed_medications.map((item, idx) => {
                          const med = medications.find(
                            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
                          );
                          const currentStock = med ? med.stock : 0;
                          const isSufficient = med ? currentStock >= item.quantity : false;

                          return (
                            <tr key={`${item.medication_id}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="px-3.5 py-2.5 font-medium text-slate-900">
                                {item.name}
                                {med?.type && (
                                  <span className="ml-1.5 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                    {med.type}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600">
                                <div>{item.dosage}</div>
                                <div className="text-[11px] text-slate-500">
                                  {item.frequency} {item.duration_days ? `· ${item.duration_days} วัน` : ''}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-bold text-slate-900">
                                {item.quantity}
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-semibold">
                                {med ? (
                                  <span className={currentStock < item.quantity ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                    {currentStock}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                {!med ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    ไม่พบยาในคลัง
                                  </span>
                                ) : isSufficient ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                    <CheckCircle2 className="h-3 w-3" />
                                    พร้อมจ่าย
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                                    <AlertTriangle className="h-3 w-3" />
                                    สต็อกขาด {item.quantity - currentStock}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      {order.is_fully_dispensed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ตัดจ่ายแล้วเมื่อ {formatDisplayDateTime(order.dispensed_at)}
                          {order.pharmacist_name ? ` (โดย ${order.pharmacist_name})` : ''}
                        </span>
                      ) : (
                        <span>
                          จ่ายแล้ว {order.dispensed_items_count} จาก {order.prescribed_medications.length} รายการ
                        </span>
                      )}
                    </div>

                    <div>
                      {order.is_fully_dispensed ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <CheckCircle2 className="h-4 w-4" />
                            จ่ายยาครบถ้วนแล้ว
                          </span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenRevokeModal(order)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 hover:border-amber-400 active:scale-95 shadow-xs"
                              title="ยกเลิกการตัดจ่ายและคืนสต็อกเข้าคลังยา"
                            >
                              <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                              <span>ยกเลิก/คืนสต็อก</span>
                            </button>
                          )}
                        </div>
                      ) : canManage ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDispenseModal(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
                        >
                          <Pill className="h-3.5 w-3.5 shrink-0" />
                          <span>จ่ายยาและตัดสต็อก</span>
                        </button>
                      ) : (
                        <div
                          title="ดูอย่างเดียว: แพทย์และเภสัชกรเท่านั้นที่จ่ายยาและตัดสต็อกได้"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-400 cursor-not-allowed select-none"
                        >
                          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>ดูอย่างเดียว</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Dispensing */}
      {dispenseTarget && (
        <ViewportPortal>
          <div
            data-testid="dispense-modal-backdrop"
            onClick={handleCloseDispenseModal}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="dispense-modal-title"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 shrink-0">
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase block mb-0.5">
                      ตัดจ่ายเวชภัณฑ์ตามใบสั่ง
                    </span>
                    <h3 id="dispense-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                      ยืนยันการจ่ายยา
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จะตัดสต็อกและบันทึกการจ่ายยา
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDispenseModal}
                  disabled={isDispensing}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Error Banner */}
                {dispenseError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-semibold block">เกิดข้อผิดพลาดในการตัดจ่ายยา:</strong>
                      <span>{dispenseError}</span>
                    </div>
                  </div>
                )}

                {/* Patient Details Card */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ผู้ป่วย:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {dispenseTarget.patient_name}{' '}
                      {dispenseTarget.patient_student_id ? (
                        <span className="text-xs font-normal text-slate-500">({dispenseTarget.patient_student_id})</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">แพทย์ผู้สั่ง:</span>
                    <span className="font-semibold text-slate-800">{dispenseTarget.doctor_name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 shrink-0">ผลวินิจฉัย:</span>
                    <span className="text-slate-800 text-right ml-4">{dispenseTarget.diagnosis || 'ไม่ระบุ'}</span>
                  </div>
                </div>

                {/* Medications Preview Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    รายการยาที่จะจ่าย
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">ยา</th>
                          <th className="px-3 py-2.5 font-semibold text-center">สั่งจ่าย</th>
                          <th className="px-3 py-2.5 font-semibold text-center">ปัจจุบัน</th>
                          <th className="px-3 py-2.5 font-semibold text-center">คงเหลือหลังจ่าย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dispenseTarget.prescribed_medications.map((item, idx) => {
                          const med = medications.find(
                            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
                          );
                          const currentStock = med ? med.stock : 0;
                          const remain = currentStock - item.quantity;
                          const isShort = remain < 0;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition">
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {item.name}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-sky-600">
                                -{item.quantity}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">
                                {med ? currentStock : 'ไม่พบ'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold">
                                <span className={isShort ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                                  {med ? Math.max(0, remain) : '-'}
                                </span>
                                {isShort && (
                                  <span className="block text-[10px] text-rose-500">
                                    (สต็อกไม่พอ)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warning if shortage */}
                {dispenseTarget.prescribed_medications.some((item) => {
                  const med = medications.find(
                    (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
                  );
                  return !med || med.stock < item.quantity;
                }) && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      <strong>คำเตือน:</strong> มียาบางรายการที่มีสต็อกคงเหลือไม่เพียงพอกับจำนวนที่สั่งจ่าย กรุณาตรวจสอบหรือประสานงานแพทย์ก่อนจ่ายยา
                    </span>
                  </div>
                )}

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    หมายเหตุการตัดจ่าย (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={dispenseReason}
                    onChange={(e) => setDispenseReason(e.target.value)}
                    placeholder="เช่น จ่ายยาครบตามใบสั่ง หรือระบุหมายเหตุเพิ่มเติม"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {/* Optional Skip Deduction */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200 transition select-none">
                  <input
                    type="checkbox"
                    checked={skipStockDeduction}
                    onChange={(e) => setSkipStockDeduction(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-medium">
                    บันทึกว่าจ่ายแล้วโดยไม่ตัดสต็อกซ้ำ
                  </span>
                </label>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 sm:p-6 pt-3 sm:pt-4 shrink-0 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCloseDispenseModal}
                  disabled={isDispensing}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDispense()}
                  disabled={isDispensing}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition disabled:opacity-50"
                >
                  {isDispensing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังจ่ายยา…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>ยืนยันการจ่ายยา</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* Confirmation Modal for Revoking Dispensation */}
      {revokeTarget && (
        <ViewportPortal>
          <div
            data-testid="revoke-modal-backdrop"
            onClick={handleCloseRevokeModal}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="revoke-modal-title"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 shrink-0">
                    <RotateCcw className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-amber-600 uppercase block mb-0.5">
                      ยกเลิกการตัดจ่ายเวชภัณฑ์
                    </span>
                    <h3 id="revoke-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                      ยืนยันยกเลิกการตัดจ่ายยา (คืนสต็อก)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ระบบจะปรับสถานะใบสั่งยากลับเป็นรอตัดจ่าย และคืนยอดคงเหลือเข้าคลังยา
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRevokeModal}
                  disabled={isRevoking}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Error Banner */}
                {revokeError && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-semibold block">เกิดข้อผิดพลาดในการยกเลิก:</strong>
                      <span>{revokeError}</span>
                    </div>
                  </div>
                )}

                {/* Patient Details Card */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">ผู้ป่วย:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {revokeTarget.patient_name}{' '}
                      {revokeTarget.patient_student_id ? (
                        <span className="text-xs font-normal text-slate-500">({revokeTarget.patient_student_id})</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">แพทย์ผู้สั่ง:</span>
                    <span className="font-semibold text-slate-800">{revokeTarget.doctor_name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 shrink-0">ผลวินิจฉัย:</span>
                    <span className="text-slate-800 text-right ml-4">{revokeTarget.diagnosis || 'ไม่ระบุ'}</span>
                  </div>
                </div>

                {/* Medications Restock Preview Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    รายการเวชภัณฑ์ที่จะคืนเข้าคลังยา
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">ยา</th>
                          <th className="px-3 py-2.5 font-semibold text-center">จำนวนคืน</th>
                          <th className="px-3 py-2.5 font-semibold text-center">สต็อกปัจจุบัน</th>
                          <th className="px-3 py-2.5 font-semibold text-center">สต็อกหลังคืน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {revokeTarget.prescribed_medications.map((item, idx) => {
                          const med = medications.find(
                            (m) => m.id === item.medication_id || m.name.toLowerCase() === item.name.toLowerCase()
                          );
                          const currentStock = med ? med.stock : 0;
                          const afterStock = currentStock + item.quantity;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition">
                              <td className="px-3 py-2.5 font-medium text-slate-900">
                                {item.name}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-emerald-600">
                                +{item.quantity}
                              </td>
                              <td className="px-3 py-2.5 text-center text-slate-600">
                                {med ? currentStock : 'ไม่พบ'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold text-slate-800">
                                {med ? afterStock : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Optional Restock To Inventory Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200 transition select-none">
                  <input
                    type="checkbox"
                    checked={restockToInventory}
                    onChange={(e) => setRestockToInventory(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-medium">
                    คืนจำนวนยากลับเข้าสต็อกในคลังทันที (บวกยอดสต็อกกลับ)
                  </span>
                </label>

                {/* Revoke Reason Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เหตุผลในการยกเลิกการตัดจ่าย (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="เช่น ตัดจ่ายผิดใบสั่ง, คีย์ข้อมูลผิดพลาด หรือผู้ป่วยขอยกเลิก"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 p-4 sm:p-6 pt-3 sm:pt-4 shrink-0 bg-slate-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCloseRevokeModal}
                  disabled={isRevoking}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmRevokeDispense()}
                  disabled={isRevoking}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {isRevoking ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังยกเลิก...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>ยืนยันยกเลิกและคืนสต็อก</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ViewportPortal>
      )}
    </div>
  );
}
