"use client";

import {
  AlertTriangle,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  deleteStaffProfile,
  getStaffProfileDirectory,
  updateStaffProfile,
  type StaffProfileDirectoryItem,
} from "@/services/dashboardService";
import type { ProfileTitle, UserRole } from "@/types/database";
import Toast from "@/components/common/Toast";

const roleOrder: UserRole[] = ["patient", "medical", "staff_admin"];
const accountRoleLabels: Record<UserRole, string> = {
  patient: "ผู้ป่วย",
  medical: "แพทย์",
  staff_admin: "ผู้ดูแลระบบ",
};
type ProfileSort = "name-th" | "name-en" | "registered-asc" | "registered-desc";
type ProfileFilter = UserRole | "all" | "suspended";
type AccountAction =
  | { kind: "toggle"; profile: StaffProfileDirectoryItem; nextActive: boolean }
  | { kind: "hard-delete"; profile: StaffProfileDirectoryItem };

function displayValue(value: string | null): string {
  return value?.trim() || "ไม่ระบุ";
}

function summaryCardClass(isSelected: boolean): string {
  return `rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${isSelected ? "border-brand-strong bg-brand-soft text-brand-strong shadow-sm" : "border-transparent text-brand-ink hover:border-brand-border-soft hover:bg-brand-page"}`;
}

function BodyPortal({ children }: { children: ReactNode }) {
  return typeof document === "undefined"
    ? null
    : createPortal(children, document.body);
}

interface ProfileActionsProps {
  profile: StaffProfileDirectoryItem;
  roleFilter: ProfileFilter;
  onEdit: (profile: StaffProfileDirectoryItem) => void;
  onAction: (action: AccountAction) => void;
}
function ProfileActions({
  profile,
  roleFilter,
  onEdit,
  onAction,
}: ProfileActionsProps) {
  return (
    <div className="flex flex-nowrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(profile)}
        aria-label="แก้ไขข้อมูลผู้ใช้"
        title="แก้ไขข้อมูลผู้ใช้"
        className={`inline-flex size-10 items-center justify-center rounded-lg border bg-transparent transition ${profile.isActive ? "border-brand-border-strong text-brand-strong hover:border-brand-strong hover:bg-brand-soft" : "border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-50"}`}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={profile.isActive}
        aria-label={
          profile.isActive ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"
        }
        onClick={() =>
          onAction({
            kind: "toggle",
            profile,
            nextActive: !profile.isActive,
          })
        }
        title={profile.isActive ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${profile.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          aria-hidden="true"
          className={`size-6 rounded-full bg-white shadow-sm transition-transform ${profile.isActive ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
      {roleFilter === "suspended" && !profile.isActive && (
        <button
          type="button"
          onClick={() => onAction({ kind: "hard-delete", profile })}
          aria-label="ลบบัญชีถาวร"
          title="ลบบัญชีถาวร"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-rose-200 bg-transparent text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface StaffProfileDirectoryProps {
  patientOnly?: boolean;
  canCreatePersonnel?: boolean;
}

export default function StaffProfileDirectory({ patientOnly = false, canCreatePersonnel = false }: StaffProfileDirectoryProps) {
  const [profiles, setProfiles] = useState<StaffProfileDirectoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ProfileFilter>(patientOnly ? "patient" : "all");
  const [sortBy, setSortBy] = useState<ProfileSort>("name-th");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] =
    useState<StaffProfileDirectoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: null as ProfileTitle | null,
    firstName: "",
    lastName: "",
    phone: "",
    role: "patient" as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function openEdit(profile: StaffProfileDirectoryItem) {
    setEditingProfile(profile);
    setEditForm({
      title: profile.title,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
      role: profile.role,
    });
    setSaveError(null);
  }

  function closeEdit() {
    if (saving) return;
    setEditingProfile(null);
    setSaveError(null);
  }

  async function handleSave() {
    if (!editingProfile) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setSaveError("กรอกชื่อและนามสกุล");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateStaffProfile(editingProfile.id, {
        title: editForm.title,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        isActive: editingProfile.isActive,
      });
      await loadProfiles(true);
      setEditingProfile(null);
      setToast("บันทึกข้อมูลแล้ว");
    } catch (saveProfileError) {
      setSaveError(
        saveProfileError instanceof Error
          ? saveProfileError.message
          : "บันทึกข้อมูลไม่สำเร็จ ลองใหม่",
      );
    } finally {
      setSaving(false);
    }
  }

  const loadProfiles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setProfiles(await getStaffProfileDirectory());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "โหลดรายชื่อบัญชีไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfiles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfiles]);

  const counts = useMemo(() => {
    const result: Record<UserRole, number> = {
      patient: 0,
      medical: 0,
      staff_admin: 0,
    };
    profiles.forEach((profile) => {
      result[profile.role] += 1;
    });
    return result;
  }, [profiles]);

  const suspendedCount = useMemo(
    () => profiles.filter((profile) => !profile.isActive).length,
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return profiles
      .filter((profile) => {
        if (roleFilter === "suspended" && profile.isActive) return false;
        if (
          roleFilter !== "all" &&
          roleFilter !== "suspended" &&
          profile.role !== roleFilter
        )
          return false;
        if (!normalizedQuery) return true;
        return [
          profile.fullName,
          profile.email ?? "",
          profile.phone ?? "",
        ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortBy === "registered-asc" || sortBy === "registered-desc") {
          const aTime = Date.parse(a.createdAt);
          const bTime = Date.parse(b.createdAt);
          const registrationOrder =
            sortBy === "registered-asc" ? aTime - bTime : bTime - aTime;
          if (registrationOrder !== 0) return registrationOrder;
        } else {
          const locale = sortBy === "name-th" ? "th" : "en";
          const nameOrder = a.fullName.localeCompare(b.fullName, locale, {
            sensitivity: "base",
          });
          if (nameOrder !== 0) return nameOrder;
        }
        return Number(b.isActive) - Number(a.isActive);
      });
  }, [profiles, query, roleFilter, sortBy]);

  async function confirmAccountAction() {
    if (!accountAction) return;
    const { profile } = accountAction;
    setActionSaving(true);
    setError(null);
    try {
      if (accountAction.kind === "hard-delete") {
        await deleteStaffProfile(profile.id);
      } else {
        await updateStaffProfile(profile.id, {
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          role: profile.role,
          isActive: accountAction.nextActive,
        });
      }
      await loadProfiles(true);
      setAccountAction(null);
      setToast(
        accountAction.kind === "hard-delete"
          ? "ลบบัญชีถาวรแล้ว"
          : accountAction.nextActive
            ? "เปิดใช้งานบัญชีแล้ว"
            : "ระงับบัญชีแล้ว",
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : accountAction.kind === "hard-delete"
            ? "ลบบัญชีถาวรไม่สำเร็จ ลองใหม่"
            : accountAction.nextActive
              ? "เปิดใช้งานบัญชีไม่สำเร็จ ลองใหม่"
              : "ระงับบัญชีไม่สำเร็จ ลองใหม่",
      );
      setAccountAction(null);
    } finally {
      setActionSaving(false);
    }
  }

  const isHardDeleteAction = accountAction?.kind === "hard-delete";
  const isRestoringAction =
    accountAction?.kind === "toggle" && accountAction.nextActive;

  return (
    <main className="dashboard-shell flex w-full flex-col gap-10 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="relative pl-4 text-3xl font-bold tracking-tight text-brand-ink before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand sm:text-4xl">
            จัดการบัญชีผู้ใช้
          </h1>
          <p className="mt-2 text-sm text-brand-muted">
            ดูและแก้ไขข้อมูลติดต่อ บทบาท และสถานะบัญชี
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {canCreatePersonnel && <Link
            href="/staff/accounts/personnel/new"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-white transition hover:bg-brand-hover sm:flex-none"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>สร้างบัญชี</span>
          </Link>}
          <button
            type="button"
            onClick={() => void loadProfiles(true)}
            disabled={loading || refreshing}
            aria-label="รีเฟรชรายชื่อบัญชี"
            title="รีเฟรช"
            className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-strong px-0 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto sm:px-4"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </header>

      {!patientOnly && <section
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        aria-label="สรุปบัญชีผู้ใช้"
      >
        <button
          type="button"
          onClick={() => setRoleFilter("all")}
          aria-pressed={roleFilter === "all"}
          className={`${summaryCardClass(roleFilter === "all")} min-w-0 text-left`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-800">ผู้ใช้ทั้งหมด</p>
            <Users className="size-5 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {profiles.length}
          </p>
        </button>
        {roleOrder.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            aria-pressed={roleFilter === role}
            className={summaryCardClass(roleFilter === role)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{accountRoleLabels[role]}</p>
              </div>
              <UserRound className="size-5 text-slate-400" aria-hidden="true" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {counts[role]}
            </p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRoleFilter("suspended")}
          aria-pressed={roleFilter === "suspended"}
          className={summaryCardClass(roleFilter === "suspended")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">บัญชีถูกระงับ</p>
              <p className="mt-0.5 text-xs text-slate-400">
                เข้าสู่ระบบไม่ได้
              </p>
            </div>
            <UserRound className="size-5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {suspendedCount}
          </p>
        </button>
      </section>}

      <section className="overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-brand-border-soft pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-ink">{patientOnly ? "รายชื่อผู้ป่วย" : "บัญชีผู้ใช้"}</h2>
            <p className="mt-1 text-sm text-brand-muted">
              พบ {filteredProfiles.length} จาก {profiles.length} บัญชี
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 lg:w-auto lg:flex-row">
            <label className="relative block w-full lg:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-body"
                aria-hidden="true"
              />
              <span className="sr-only">ค้นหาผู้ใช้</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร"
                className="h-11 w-full rounded-lg border border-brand-border-strong bg-transparent py-2.5 pl-9 pr-3 text-sm text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
              />
            </label>
            {!patientOnly && <><label className="sr-only" htmlFor="role-filter">
              กรองตามบทบาท
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as ProfileFilter)
              }
              className="h-11 rounded-lg border border-brand-border-strong bg-transparent px-3 text-sm text-brand-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
            >
              <option value="all">ผู้ใช้ทั้งหมด</option>
              <option value="suspended">บัญชีถูกระงับ</option>
              {roleOrder.map((role) => (
                <option key={role} value={role}>
                  {accountRoleLabels[role]}
                </option>
              ))}
            </select></>}
            <label className="sr-only" htmlFor="profile-sort">
              เรียงลำดับผู้ใช้
            </label>
            <select
              id="profile-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ProfileSort)}
              className="h-11 rounded-lg border border-brand-border-strong bg-transparent px-3 text-sm text-brand-ink outline-none transition focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
            >
              <option value="name-th">ชื่อ ก-ฮ</option>
              <option value="name-en">ชื่อ A-Z</option>
              <option value="registered-asc">สมัครเก่าสุด</option>
              <option value="registered-desc">สมัครล่าสุด</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 py-10 text-sm text-brand-muted">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            กำลังโหลดรายชื่อบัญชี…
          </div>
        ) : error ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadProfiles()}
              className="rounded-lg border border-brand-border-strong px-3 py-2 text-sm font-medium text-brand-strong hover:border-brand-strong hover:bg-brand-soft"
            >
              ลองใหม่
            </button>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center py-10 text-sm text-brand-muted">
            ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[17%]" />
                <col className="w-[24%]" />
                <col className="w-[18%]" />
                <col className="w-[17%]" />
                <col className="w-[19%]" />
              </colgroup>
              <thead className="border-b border-brand-border-soft text-xs font-semibold text-brand-muted">
                <tr>
                  <th className="px-5 py-4 text-center">ลำดับ</th>
              <th className="px-5 py-4 text-center">ชื่อ-นามสกุล</th>
                  <th className="px-5 py-4 text-center">อีเมล</th>
                  <th className="px-5 py-4 text-center">เบอร์โทรศัพท์</th>
              <th className="px-5 py-4 text-center">บทบาท</th>
              <th className="whitespace-nowrap px-5 py-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-soft">
                {filteredProfiles.map((profile, index) => (
                  <tr
                    key={profile.id}
                    className={`transition-colors ${profile.isActive ? "text-brand-body" : "text-brand-muted"}`}
                  >
                    <td className="px-5 py-5 text-center text-brand-muted">{index + 1}</td>
                    <td
                      className={`px-5 py-5 text-center font-medium ${profile.isActive ? "text-brand-ink" : "line-through"}`}
                    >
                      <span className="block truncate">
                        {displayValue(profile.fullName)}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <span className="flex min-w-0 max-w-full items-center justify-center gap-2">
                        <Mail
                          className="size-4 shrink-0 text-brand-muted"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{displayValue(profile.email)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <span className="flex min-w-0 max-w-full items-center justify-center gap-2">
                        <Phone
                          className="size-4 shrink-0 text-brand-muted"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{displayValue(profile.phone)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${profile.isActive ? "text-brand-strong" : "text-brand-muted"}`}
                      >
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        {accountRoleLabels[profile.role]}
                      </span>
                      <span
                        className="mt-1 block text-xs text-brand-muted"
                      >
                        {profile.isActive ? "ใช้งานอยู่" : "ถูกระงับ"}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-center">
                      <ProfileActions
                        profile={profile}
                        roleFilter={roleFilter}
                        onEdit={openEdit}
                        onAction={(action) => setAccountAction(action)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="divide-y divide-brand-border-soft md:hidden">
            {filteredProfiles.map((profile, index) => (
              <article
                key={profile.id}
                className={`py-5 ${profile.isActive ? "" : "text-brand-muted"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 shrink-0 pt-0.5 text-sm text-brand-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-base font-semibold ${profile.isActive ? "text-brand-ink" : "line-through"}`}
                    >
                      {displayValue(profile.fullName)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${profile.isActive ? "text-brand-strong" : "text-brand-muted"}`}
                      >
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        {accountRoleLabels[profile.role]}
                      </span>
                      <span className="text-brand-muted">
                        · {profile.isActive ? "ใช้งานอยู่" : "ถูกระงับ"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2 text-brand-body">
                    <Mail
                      className="size-4 shrink-0 text-brand-muted"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate">
                      {displayValue(profile.email)}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-brand-body">
                      <Phone
                        className="size-4 shrink-0 text-brand-muted"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">
                        {displayValue(profile.phone)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <ProfileActions
                        profile={profile}
                        roleFilter={roleFilter}
                        onEdit={openEdit}
                        onAction={(action) => setAccountAction(action)}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
            </div>
          </>
        )}
      </section>

      {accountAction && (
        <BodyPortal>
          <div
            className="clinic-modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-action-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !actionSaving)
                setAccountAction(null);
            }}
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div
              className={`mx-auto flex size-14 items-center justify-center rounded-full ${isHardDeleteAction ? "bg-rose-100 text-rose-600" : isRestoringAction ? "bg-emerald-100 text-emerald-600" : "bg-status-warning-bg text-status-warning"}`}
            >
              {isHardDeleteAction ? (
                <Trash2 className="size-7" aria-hidden="true" />
              ) : isRestoringAction ? (
                <RotateCcw className="size-7" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-7" aria-hidden="true" />
              )}
            </div>
            <div className="mt-5 text-center">
              <h2
                id="account-action-title"
                className="text-xl font-bold text-slate-950"
              >
                {isHardDeleteAction
                  ? "ยืนยันการลบบัญชีถาวร"
                  : isRestoringAction
                    ? "ยืนยันการเปิดใช้งานบัญชี"
                    : "ยืนยันการระงับบัญชี"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                บัญชี “{accountAction.profile.fullName}”{" "}
                {isHardDeleteAction
                  ? "จะถูกลบถาวรและกู้คืนไม่ได้"
                  : isRestoringAction
                    ? "จะกลับมาเข้าสู่ระบบได้อีกครั้ง"
                    : "จะถูกระงับและเข้าสู่ระบบไม่ได้"}
              </p>
              {!isHardDeleteAction && !isRestoringAction ? (
                <p className="mt-2 text-xs text-slate-400">
                  ข้อมูลจะยังอยู่และเปิดใช้งานได้ภายหลัง
                </p>
              ) : null}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={actionSaving}
                onClick={() => setAccountAction(null)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={actionSaving}
                onClick={() => void confirmAccountAction()}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 ${isHardDeleteAction ? "bg-rose-600 hover:bg-rose-700" : isRestoringAction ? "bg-emerald-600 hover:bg-emerald-700" : "bg-status-warning hover:bg-amber-800"}`}
              >
                {actionSaving && (
                  <RefreshCw
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {actionSaving
                  ? "กำลังดำเนินการ…"
                  : isHardDeleteAction
                    ? "ลบบัญชีถาวร"
                    : isRestoringAction
                      ? "เปิดใช้งานบัญชี"
                      : "ระงับบัญชี"}
              </button>
            </div>
            </div>
          </div>
        </BodyPortal>
      )}

      {editingProfile && (
        <BodyPortal>
          <div
            className="clinic-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEdit();
            }}
          >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="edit-profile-title"
                  className="text-xl font-bold text-slate-950"
                >
                  แก้ไขข้อมูลผู้ใช้
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingProfile.email ?? "ไม่ระบุอีเมล"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="ปิด"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                คำนำหน้า
                <select
                  value={editForm.title ?? ""}
                  onChange={(event) => setEditForm((form) => ({ ...form, title: (event.target.value || null) as ProfileTitle | null }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                ชื่อ
                <input
                  required
                  value={editForm.firstName}
                  onChange={(event) => setEditForm((form) => ({ ...form, firstName: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                นามสกุล
                <input
                  required
                  value={editForm.lastName}
                  onChange={(event) => setEditForm((form) => ({ ...form, lastName: event.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                เบอร์โทรศัพท์
                <input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      phone: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                บทบาท
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((form) => ({
                      ...form,
                      role: event.target.value as UserRole,
                    }))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  {roleOrder.map((role) => (
                    <option key={role} value={role}>
                      {accountRoleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {saveError && (
              <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {saveError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
          </div>
        </BodyPortal>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
