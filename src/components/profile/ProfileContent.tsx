"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, updateMyPersonalProfile, updateMyHealthProfile, updateMyProfileAvatar } from "@/services/authService";
import { createClient } from "@/utils/supabase/client";
import type { Profile, ProfileTitle, UserRole } from "@/types/database";
import { formatProfileName, getProfileInitial } from "@/lib/profileName";
import { useLocale } from "@/context/LocaleContext";
const supabase = createClient();
import {
  Phone,
  Mail,
  Pencil,
  AlertCircle,
  HeartPulse,
  FileClock,
  Stethoscope,
  ShieldCheck,
  Users,
  X,
  Check,
  Loader2,
} from "lucide-react";

const roleLabels: Record<UserRole, string> = {
  patient: "ผู้ป่วย",
  staff_admin: "แอดมิน",
  medical: "หมอ",
};

const titleOptionsByRole: Record<UserRole, ProfileTitle[]> = {
  patient: ["นาย", "นาง", "นางสาว", "อื่น ๆ"],
  medical: ["นายแพทย์", "แพทย์หญิง", "ดร."],
  staff_admin: ["นาย", "นาง", "นางสาว", "ดร."],
};

type HealthStatus = "yes" | "no" | "unknown";

interface DoctorInfo {
  specialty: string | null;
  license_number: string | null;
  department: { name: string } | null;
}

async function updateProfile(
  userId: string,
  updates: Partial<Profile>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export default function ProfileContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { text } = useLocale();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [licenseDraft, setLicenseDraft] = useState('');
  const [editingLicense, setEditingLicense] = useState(false);
  const [confirmLicense, setConfirmLicense] = useState(false);
  const [savingLicense, setSavingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================================================
  // Personal information edit
  // =========================================================

  const [editingPersonal, setEditingPersonal] = useState(false);

  const [personalForm, setPersonalForm] = useState({
    title: null as ProfileTitle | null,
    first_name: "",
    last_name: "",
    phone: "",
    emergency_phone: "",
    address: "",
  });

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // =========================================================
  // Health information edit
  // =========================================================

  const [editingHealth, setEditingHealth] = useState(false);

  const [allergyStatus, setAllergyStatus] = useState<HealthStatus>("unknown");

  const [allergyDetail, setAllergyDetail] = useState("");

  const [chronicStatus, setChronicStatus] = useState<HealthStatus>("unknown");

  const [chronicDetail, setChronicDetail] = useState("");

  const [savingHealth, setSavingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const role = profile?.role ?? null;

  // =========================================================
  // Load profile
  // =========================================================

  async function loadProfile() {
    if (!user) return;

    const data = await getProfile(user.id);

    setProfile(data);

    setPersonalForm({
      title: data?.title ?? null,
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      phone: data?.phone ?? "",
      emergency_phone: data?.emergency_phone ?? "",
      address: data?.address ?? "",
    });

    setAllergyStatus((data?.allergy_status as HealthStatus) ?? "unknown");

    setAllergyDetail(data?.allergies ?? "");

    setChronicStatus(
      (data?.chronic_disease_status as HealthStatus) ?? "unknown",
    );

    setChronicDetail(data?.chronic_diseases ?? "");

    // Medical role
    if (data?.role === "medical") {
      const { data: medicalData } = await supabase
        .from("doctors")
        .select("specialty, license_number, department:departments(name)")
        .eq("id", user.id)
        .maybeSingle();

      setDoctorInfo(medicalData as unknown as DoctorInfo);
      setLicenseDraft(medicalData?.license_number ?? "");
    } else {
      setDoctorInfo(null);
    }
  }

  // =========================================================
  // Initial load
  // =========================================================

  useEffect(() => {
    if (!user) {
      const timer = window.setTimeout(() => setIsLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;

    const timer = window.setTimeout(() => {
      if (!active) return;
      setIsLoading(true);
      setError(null);
      loadProfile()
        .catch((err) => {
          if (active) {
            setError(
              err instanceof Error ? err.message : text("โหลดข้อมูลไม่สำเร็จ", "Could not load your information."),
            );
          }
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // =========================================================
  // Save personal information
  // =========================================================

  async function handleSavePersonal() {
    if (!user) return;

    setPersonalError(null);

    if (!personalForm.first_name.trim() || !personalForm.last_name.trim()) {
      setPersonalError(text("กรุณากรอกชื่อและนามสกุล", "Enter your first and last name."));
      return;
    }

    if (!personalForm.phone.trim()) {
      setPersonalError(text("กรุณากรอกเบอร์โทรศัพท์", "Enter your phone number."));
      return;
    }

    if (role === "patient" && !personalForm.emergency_phone.trim()) {
      setPersonalError(text("กรุณากรอกเบอร์ติดต่อฉุกเฉิน", "Enter an emergency contact number."));
      return;
    }

    setSavingPersonal(true);

    try {
      await updateMyPersonalProfile({
        title: personalForm.title,
        first_name: personalForm.first_name.trim(),
        last_name: personalForm.last_name.trim(),
        phone: personalForm.phone.trim(),
        emergency_phone: personalForm.emergency_phone.trim() || null,
        address: personalForm.address.trim() || null,
      });

      await loadProfile();

      setEditingPersonal(false);
    } catch (err) {
      setPersonalError(err instanceof Error ? err.message : text("บันทึกไม่สำเร็จ", "Could not save your changes."));
    } finally {
      setSavingPersonal(false);
    }
  }

  // =========================================================
  // Save health information
  // =========================================================

  async function handleSaveHealth() {
    if (!user) return;

    setHealthError(null);

    if (allergyStatus === "yes" && !allergyDetail.trim()) {
      setHealthError(text("กรุณากรอกรายละเอียดประวัติแพ้ยา", "Describe your medication allergy."));
      return;
    }

    if (chronicStatus === "yes" && !chronicDetail.trim()) {
      setHealthError(text("กรุณากรอกรายละเอียดโรคประจำตัว", "Describe your chronic condition."));
      return;
    }

    setSavingHealth(true);

    try {
      await updateMyHealthProfile({
        allergy_status: allergyStatus,
        allergies: allergyStatus === "yes" ? allergyDetail.trim() : null,
        chronic_disease_status: chronicStatus,
        chronic_diseases: chronicStatus === "yes" ? chronicDetail.trim() : null,
      });

      await loadProfile();

      setEditingHealth(false);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : text("บันทึกไม่สำเร็จ", "Could not save your changes."));
    } finally {
      setSavingHealth(false);
    }
  }

  async function saveLicense() {
    setSavingLicense(true);
    setLicenseError(null);
    try {
      const { error: saveError } = await supabase.rpc('update_own_doctor_license', { new_license: licenseDraft.trim() });
      if (saveError) throw saveError;
      await loadProfile();
      setEditingLicense(false);
      setConfirmLicense(false);
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : 'บันทึกเลขใบประกอบวิชาชีพไม่สำเร็จ');
      setConfirmLicense(false);
    } finally {
      setSavingLicense(false);
    }
  }

  // =========================================================
  // Loading
  // =========================================================

  if (authLoading || isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="mb-5">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-100" />

          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="h-72 animate-pulse rounded-xl border border-slate-100 bg-white" />

          <div className="h-72 animate-pulse rounded-xl border border-slate-100 bg-white" />
        </div>
      </main>
    );
  }

  // =========================================================
  // No user
  // =========================================================

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            {text("กรุณาเข้าสู่ระบบเพื่อดูข้อมูลส่วนตัว", "Sign in to view your profile.")}
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // Error
  // =========================================================

  if (error) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">
          {error}
        </div>
      </main>
    );
  }

  // =========================================================
  // Helpers
  // =========================================================

  const statusLabel = (status: HealthStatus | null | undefined) => {
    if (status === "yes") return text("มี", "Yes");
    if (status === "no") return text("ไม่มี", "No");
    return text("ไม่ทราบ", "Unknown");
  };

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const avatarUrl = await updateMyProfileAvatar(file);
      setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : text("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ", "Could not upload your profile photo."));
    } finally {
      setUploadingAvatar(false);
    }
  }

  function cancelPersonalEdit() {
    setEditingPersonal(false);
    setPersonalError(null);
    void loadProfile();
  }

  // =========================================================
  // Page
  // =========================================================

  return (
    <div
      className="relative min-h-[calc(100vh-80px)] w-screen overflow-x-hidden bg-brand-surface"
      style={{
        marginLeft: "calc(50% - 50vw)",
      }}
    >
      <div className="flex min-h-[calc(100vh-80px)] w-full min-w-0 flex-col lg:flex-row">

      

        {/* =====================================================
            Main
        ====================================================== */}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            {/* Page heading */}

            <div className="mb-6">
              <h1 className="text-[22px] font-bold tracking-tight text-slate-800 sm:text-[24px]">{text("ข้อมูลส่วนตัว", "My profile")}</h1>
              <p className="mt-1 text-sm text-slate-500">{text("จัดการข้อมูลส่วนตัวและข้อมูลสุขภาพของคุณ", "Manage your personal and health information.")}</p>
            </div>

            {/* =================================================
                PATIENT
            ================================================== */}

            {role === "patient" ? (
              <>
                {/* =================================================
                    Patient top cards
                ================================================== */}

                <div className="grid w-full min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  {/* =================================================
                      Personal information
                  ================================================== */}

                  <section className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                    <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-0">
                      <h2 className="text-[18px] font-bold text-slate-800">
                        {text("ข้อมูลส่วนตัว", "Personal information")}
                      </h2>

                      {!editingPersonal && (
                        <button
                          type="button"
                          onClick={() => setEditingPersonal(true)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                        >
                          <Pencil className="size-4" />
                          {text("แก้ไขข้อมูล", "Edit")}
                        </button>
                      )}
                    </div>

                    {/* =================================================
                        Patient personal edit
                    ================================================== */}

                    {editingPersonal ? (
                      <div className="p-6">
                        {personalError && (
                          <p className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {personalError}
                          </p>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Name */}

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-600">{text("คำนำหน้า", "Title")}</label>
                            <select
                              value={personalForm.title ?? ""}
                              onChange={(e) => setPersonalForm({ ...personalForm, title: (e.target.value || null) as ProfileTitle | null })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            >
                              <option value="">{text("ไม่ระบุ", "Prefer not to say")}</option>
                              {titleOptionsByRole.patient.map((title) => (
                                <option key={title} value={title}>{title}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-600">{text("ชื่อ", "First name")}</label>
                            <input
                              required
                              value={personalForm.first_name}
                              onChange={(e) => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-600">{text("นามสกุล", "Last name")}</label>
                            <input
                              required
                              value={personalForm.last_name}
                              onChange={(e) => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          </div>

                          {/* Phone */}

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-600">
                              {text("เบอร์โทรศัพท์", "Phone number")}
                            </label>

                            <input
                              value={personalForm.phone}
                              onChange={(e) =>
                                setPersonalForm({
                                  ...personalForm,
                                  phone: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          </div>

                          {/* Emergency */}

                          <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-600">
                              {text("เบอร์ติดต่อฉุกเฉิน *", "Emergency contact *")}
                            </label>

                            <input
                              value={personalForm.emergency_phone}
                              onChange={(e) =>
                                setPersonalForm({
                                  ...personalForm,
                                  emergency_phone: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          </div>

                          {/* Address */}

                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-xs font-semibold text-slate-600">
                              {text("ที่อยู่", "Address")}
                            </label>

                            <textarea
                              value={personalForm.address}
                              onChange={(e) =>
                                setPersonalForm({
                                  ...personalForm,
                                  address: e.target.value,
                                })
                              }
                              rows={3}
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          </div>
                        </div>

                        {/* Buttons */}

                        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
                          <button
                            type="button"
                            onClick={handleSavePersonal}
                            disabled={savingPersonal}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                          >
                            {savingPersonal ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" />
                            )}
                            {text("บันทึก", "Save")}
                          </button>

                          <button
                            type="button"
                            onClick={cancelPersonalEdit}
                            disabled={savingPersonal}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <X className="size-4" />
                            {text("ยกเลิก", "Cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Patient profile header */}

                        <div className="flex min-w-0 items-center gap-4 px-4 py-5 sm:gap-5 sm:px-6">
                          <div className="relative size-16 shrink-0 sm:size-[86px]">
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-sky-100 text-2xl font-semibold text-sky-600 sm:text-[30px]">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={text("รูปโปรไฟล์", "Profile photo")} className="h-full w-full object-cover" />
                              ) : (
                                getProfileInitial(profile)
                              )}
                            </div>
                            <label
                              htmlFor="patient-profile-avatar"
                              aria-label={text("เปลี่ยนรูปโปรไฟล์", "Change profile photo")}
                              className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow transition hover:bg-sky-700"
                            >
                              {uploadingAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}
                            </label>
                            <input
                              id="patient-profile-avatar"
                              type="file"
                              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                              className="sr-only"
                              disabled={uploadingAvatar}
                              onChange={(event) => {
                                void uploadAvatar(event.target.files?.[0]);
                                event.target.value = "";
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[18px] font-bold text-slate-800">
                              {formatProfileName(profile) || text("ไม่ระบุชื่อ", "Name not provided")}
                            </p>

                            <span className="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                              {text(roleLabels[role || ""] || "ผู้ใช้งาน", "Patient")}
                            </span>

                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {text("รหัสนักศึกษา:", "Student ID:")}{" "}
                              {profile?.student_id || text("ยังไม่ได้ระบุ", "Not provided")}
                            </p>
                            {avatarError && <p role="alert" className="mt-2 text-xs text-rose-600">{avatarError}</p>}
                          </div>
                        </div>

                        {/* Patient contact information */}

                        <div className="grid border-t border-slate-100 sm:grid-cols-2">
                          {/* Phone */}

                          <div className="border-b border-slate-100 px-4 py-5 sm:border-r sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-sky-50">
                                <Phone className="size-4 text-sky-600" />
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  {text("เบอร์โทรศัพท์", "Phone number")}
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {profile?.phone || text("ยังไม่ได้ระบุ", "Not provided")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Email */}

                          <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-sky-50">
                                <Mail className="size-4 text-sky-600" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-slate-400">{text("อีเมล", "Email")}</p>

                                <p className="mt-1 break-all text-sm font-medium text-slate-700">
                                  {user.email || "-"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Emergency phone */}

                          <div className="px-4 py-5 sm:border-r sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-full bg-rose-50">
                                <Phone className="size-4 text-rose-500" />
                              </div>

                              <div>
                                <p className="text-xs text-slate-400">
                                  {text("เบอร์ติดต่อฉุกเฉิน", "Emergency contact")}
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {profile?.emergency_phone || text("ยังไม่ได้ระบุ", "Not provided")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Address */}

                          <div className="border-t border-slate-100 px-4 py-5 sm:border-t-0 sm:px-6">
                            <div className="flex items-start gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50">
                                <Users className="size-4 text-sky-600" />
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs text-slate-400">
                                  {text("ที่อยู่", "Address")}
                                </p>

                                <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                                  {profile?.address || text("ยังไม่ได้ระบุ", "Not provided")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </section>

                  {/* =================================================
                      Health information
                  ================================================== */}

                  <section className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                    <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-0">
                      <div>
                        <h2 className="text-[18px] font-bold text-slate-800">
                          {text("ข้อมูลสุขภาพ", "Health information")}
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                          {text("ข้อมูลสุขภาพ", "Health information")}
                        </p>
                      </div>

                      {!editingHealth && (
                        <button
                          type="button"
                          onClick={() => setEditingHealth(true)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                        >
                          <Pencil className="size-4" />
                          {text("แก้ไขข้อมูล", "Edit")}
                        </button>
                      )}
                    </div>

                    {/* Health edit */}

                    {editingHealth ? (
                      <div className="space-y-6 p-6">
                        {healthError && (
                          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {healthError}
                          </p>
                        )}

                        {/* Allergy */}

                        <div>
                          <p className="mb-3 text-sm font-semibold text-slate-700">
                            {text("ประวัติแพ้ยา", "Medication allergies")}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {(["yes", "no", "unknown"] as HealthStatus[]).map(
                              (s) => (
                                <label
                                  key={s}
                                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition ${
                                    allergyStatus === s
                                      ? "border-sky-300 bg-sky-50 font-semibold text-sky-600"
                                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="allergyStatus"
                                    checked={allergyStatus === s}
                                    onChange={() => setAllergyStatus(s)}
                                    className="sr-only"
                                  />

                                  {statusLabel(s)}
                                </label>
                              ),
                            )}
                          </div>

                          {allergyStatus === "yes" && (
                            <textarea
                              value={allergyDetail}
                              onChange={(e) => setAllergyDetail(e.target.value)}
                              placeholder={text("ระบุรายละเอียดประวัติแพ้ยา", "Describe your medication allergies")}
                              rows={3}
                              className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          )}
                        </div>

                        {/* Chronic disease */}

                        <div>
                          <p className="mb-3 text-sm font-semibold text-slate-700">
                            {text("โรคประจำตัว", "Chronic conditions")}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {(["yes", "no", "unknown"] as HealthStatus[]).map(
                              (s) => (
                                <label
                                  key={s}
                                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition ${
                                    chronicStatus === s
                                      ? "border-sky-300 bg-sky-50 font-semibold text-sky-600"
                                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="chronicStatus"
                                    checked={chronicStatus === s}
                                    onChange={() => setChronicStatus(s)}
                                    className="sr-only"
                                  />

                                  {statusLabel(s)}
                                </label>
                              ),
                            )}
                          </div>

                          {chronicStatus === "yes" && (
                            <textarea
                              value={chronicDetail}
                              onChange={(e) => setChronicDetail(e.target.value)}
                              placeholder={text("ระบุรายละเอียดโรคประจำตัว", "Describe your chronic conditions")}
                              rows={3}
                              className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                            />
                          )}
                        </div>

                        {/* Health buttons */}

                        <div className="flex gap-2 border-t border-slate-100 pt-5">
                          <button
                            type="button"
                            onClick={handleSaveHealth}
                            disabled={savingHealth}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                          >
                            {savingHealth ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" />
                            )}
                            {text("บันทึก", "Save")}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingHealth(false);
                              setHealthError(null);
                              loadProfile();
                            }}
                            disabled={savingHealth}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <X className="size-4" />
                            {text("ยกเลิก", "Cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Allergy tile */}

                          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50">
                                <HeartPulse className="size-5 text-rose-500" />
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  profile?.allergy_status === "yes"
                                    ? "bg-rose-50 text-rose-600"
                                    : profile?.allergy_status === "no"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {statusLabel(
                                  profile?.allergy_status as HealthStatus,
                                )}
                              </span>
                            </div>

                            <p className="mt-5 text-sm font-semibold text-slate-700">
                              {text("ประวัติแพ้ยา", "Medication allergies")}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                              {profile?.allergy_status === "yes" &&
                              profile?.allergies
                                ? profile.allergies
                                : profile?.allergy_status === "no"
                                  ? text("ไม่มีประวัติแพ้ยาที่ระบุ", "No medication allergies reported")
                                  : text("ยังไม่ได้ระบุข้อมูล", "No information provided")}
                            </p>
                          </div>

                          {/* Chronic disease tile */}

                          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex size-11 items-center justify-center rounded-xl bg-sky-50">
                                <AlertCircle className="size-5 text-sky-600" />
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  profile?.chronic_disease_status === "yes"
                                    ? "bg-amber-50 text-amber-600"
                                    : profile?.chronic_disease_status === "no"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {statusLabel(
                                  profile?.chronic_disease_status as HealthStatus,
                                )}
                              </span>
                            </div>

                            <p className="mt-5 text-sm font-semibold text-slate-700">
                              {text("โรคประจำตัว", "Chronic conditions")}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-400">
                              {profile?.chronic_disease_status === "yes" &&
                              profile?.chronic_diseases
                                ? profile.chronic_diseases
                                : profile?.chronic_disease_status === "no"
                                  ? text("ไม่มีโรคประจำตัวที่ระบุ", "No chronic conditions reported")
                                  : text("ยังไม่ได้ระบุข้อมูล", "No information provided")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                {/* =================================================
                    Recent treatment
                ================================================== */}

                <section className="mt-5 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                  <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-0">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50">
                        <FileClock className="size-5 text-sky-600" />
                      </div>

                      <h2 className="text-[18px] font-bold text-slate-800">
                        {text("ประวัติการรักษาล่าสุด", "Recent medical history")}
                      </h2>
                    </div>

                  </div>

                  <div className="p-5">
                    <div className="flex min-h-[190px] items-center justify-center rounded-2xl bg-brand-page text-center">
                      <div>
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sky-50">
                          <FileClock className="size-7 text-sky-500" />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-700">
                          {text("ยังไม่มีประวัติการรักษา", "No medical history yet")}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {text("เมื่อมีข้อมูลการรักษา จะแสดงที่นี่", "Your medical history will appear here.")}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              /* =====================================================
                 STAFF_ADMIN / MEDICAL
              ====================================================== */

              <div className="space-y-5">
                {/* =================================================
                    Staff / Medical personal information
                ================================================== */}

                <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                  <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-0">
                    <h2 className="text-[18px] font-bold text-slate-800">
                      ข้อมูลส่วนตัว
                    </h2>

                    {!editingPersonal && (
                      <button
                        type="button"
                        onClick={() => setEditingPersonal(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                      >
                        <Pencil className="size-4" />
                        แก้ไขข้อมูล
                      </button>
                    )}
                  </div>

                  {/* =================================================
                      Staff / Medical edit
                  ================================================== */}

                  {editingPersonal ? (
                    <div className="p-6">
                      {personalError && (
                        <p className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {personalError}
                        </p>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Full name */}

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">คำนำหน้า</label>
                          <select
                            value={personalForm.title ?? ""}
                            onChange={(e) => setPersonalForm({ ...personalForm, title: (e.target.value || null) as ProfileTitle | null })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                          >
                            <option value="">ไม่ระบุ</option>
                            {(role ? titleOptionsByRole[role] : []).map((title) => (
                              <option key={title} value={title}>{title}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">ชื่อ</label>
                          <input
                            required
                            value={personalForm.first_name}
                            onChange={(e) => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">นามสกุล</label>
                          <input
                            required
                            value={personalForm.last_name}
                            onChange={(e) => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>

                        {/* Phone */}

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">
                            เบอร์โทรศัพท์
                          </label>

                          <input
                            value={personalForm.phone}
                            onChange={(e) =>
                              setPersonalForm({
                                ...personalForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>

                        {/* Address */}

                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">
                            ที่อยู่
                          </label>

                          <input
                            value={personalForm.address}
                            onChange={(e) =>
                              setPersonalForm({
                                ...personalForm,
                                address: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={handleSavePersonal}
                          disabled={savingPersonal}
                          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                        >
                          {savingPersonal ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          บันทึก
                        </button>

                        <button
                          type="button"
                          onClick={cancelPersonalEdit}
                          disabled={savingPersonal}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <X className="size-4" />
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 sm:p-6">
                      {/* Profile identity */}

                      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                        {/* Avatar */}

                        <div className="relative size-20 shrink-0 sm:size-24">
                          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-sky-100 text-2xl font-semibold text-sky-600 sm:text-3xl">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="รูปโปรไฟล์" className="h-full w-full object-cover" />
                            ) : (
                              getProfileInitial(profile)
                            )}
                          </div>
                          <label
                            htmlFor="account-profile-avatar"
                            aria-label="เปลี่ยนรูปโปรไฟล์"
                            className="absolute -bottom-1 -right-1 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow transition hover:bg-sky-700"
                          >
                            {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                          </label>
                          <input
                            id="account-profile-avatar"
                            type="file"
                            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                            className="sr-only"
                            disabled={uploadingAvatar}
                            onChange={(event) => {
                              void uploadAvatar(event.target.files?.[0]);
                              event.target.value = "";
                            }}
                          />
                        </div>

                        {/* Identity */}

                        <div className="min-w-0">
                          <p className="text-xl font-bold text-slate-800">
                            {formatProfileName(profile) || "ไม่ระบุชื่อ"}
                          </p>

                          <span className="mt-2 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
{role ? roleLabels[role] : "ไม่ระบุบทบาท"}                          </span>

                          {/* Staff ID */}

                          {role === "staff_admin" && (
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              รหัสเจ้าหน้าที่:{" "}
                              {profile?.employee_id || "ยังไม่ได้ระบุ"}
                            </p>
                          )}

                          {/* Medical ID */}

                          {role === "medical" && (
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              รหัสบุคลากร:{" "}
                              {profile?.employee_id || "ยังไม่ได้ระบุ"}
                            </p>
                          )}
                          {avatarError && <p role="alert" className="mt-2 text-xs text-rose-600">{avatarError}</p>}
                        </div>
                      </div>

                      {role === "medical" && (
                        <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">เลขใบประกอบวิชาชีพเวชกรรม</p>{!editingLicense && <button type="button" onClick={() => setEditingLicense(true)} className="text-sm font-semibold text-sky-600">แก้ไข</button>}</div>
                        {editingLicense ? <div className="mt-3 space-y-3"><input aria-label="เลขใบประกอบวิชาชีพเวชกรรม" value={licenseDraft} onChange={(event) => setLicenseDraft(event.target.value)} maxLength={30} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" placeholder="ว.12345" /><div className="flex gap-3"><button type="button" onClick={() => { setLicenseError(null); setConfirmLicense(true); }} className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white">บันทึก</button><button type="button" onClick={() => { setLicenseDraft(doctorInfo?.license_number ?? ''); setEditingLicense(false); setLicenseError(null); }} className="text-sm text-slate-600">ยกเลิก</button></div></div> : <p className="mt-2 text-sm font-semibold text-slate-700">{doctorInfo?.license_number || 'ยังไม่ได้ระบุ'}</p>}
                        {licenseError && <p role="alert" className="mt-2 text-sm text-rose-600">{licenseError}</p>}
                        </div>
                      )}

                      {/* =================================================
                          Contact tiles
                      ================================================== */}

                      <div className="mt-6 grid border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Phone */}

                        <div className="border-b border-slate-100 py-4 sm:pr-5 lg:border-r">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-sky-50">
                              <Phone className="size-4 text-sky-600" />
                            </div>

                            <div>
                              <p className="text-xs text-slate-400">
                                เบอร์โทรศัพท์
                              </p>

                              <p className="mt-2 text-sm font-medium text-slate-700">
                                {profile?.phone || "ยังไม่ได้ระบุ"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Email */}

                        <div className="border-b border-slate-100 py-4 sm:pl-5 lg:border-r lg:px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-sky-50">
                              <Mail className="size-4 text-sky-600" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">อีเมล</p>

                              <p className="mt-2 break-all text-sm font-medium text-slate-700">
                                {user.email || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Address */}

                        <div className="py-4 sm:col-span-2 lg:col-span-1 lg:pl-5">
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50">
                              <Users className="size-4 text-sky-600" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">ที่อยู่</p>

                              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                                {profile?.address || "ยังไม่ได้ระบุ"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* =================================================
                    Medical work information
                ================================================== */}

                {role === "medical" && (
                  <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                    <div className="border-b border-slate-100 px-6 py-4">
                      <h2 className="text-[18px] font-bold text-slate-800">
                        ข้อมูลการปฏิบัติงาน
                      </h2>
                    </div>

                    <div className="grid gap-4 p-6 sm:grid-cols-2">
                      {/* Specialty */}

                      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <p className="text-xs text-slate-400">ความเชี่ยวชาญ</p>

                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {doctorInfo?.specialty || "ยังไม่ได้ระบุ"}
                        </p>
                      </div>



                      {/* Department */}

                      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <p className="text-xs text-slate-400">แผนก</p>

                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {doctorInfo?.department?.name || "ยังไม่ได้ระบุ"}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* =================================================
                    Staff/Admin management
                ================================================== */}

                {role === "staff_admin" && (
                  <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
                    <div className="border-b border-slate-100 px-6 py-4">
                      <h2 className="text-[18px] font-bold text-slate-800">
                        งานบริหารจัดการ
                      </h2>
                    </div>

                    <div className="grid gap-4 p-6 sm:grid-cols-2">
                      {/* Schedules */}

                      <Link
                        href="/schedules"
                        className="rounded-2xl border border-slate-100 p-5 transition hover:border-sky-200 hover:bg-sky-50/50"
                      >
                        <p className="text-sm font-semibold text-slate-700">
                          ตารางแพทย์
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          จัดการรอบตรวจและวันลาแพทย์
                        </p>
                      </Link>

                      {/* Departments */}

                      <Link
                        href="/departments"
                        className="rounded-2xl border border-slate-100 p-5 transition hover:border-sky-200 hover:bg-sky-50/50"
                      >
                        <p className="text-sm font-semibold text-slate-700">
                          จัดการแผนก
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          เพิ่ม/แก้ไขแผนกการรักษา
                        </p>
                      </Link>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
          {confirmLicense && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="license-confirm-title"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 id="license-confirm-title" className="text-lg font-bold text-slate-800">ยืนยันการแก้ไขเลขใบประกอบวิชาชีพ</h2><p className="mt-3 text-sm leading-6 text-slate-600">เลขใบประกอบวิชาชีพเป็นข้อมูลสำคัญที่ใช้ยืนยันสถานะผู้ประกอบวิชาชีพ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก ระบบจะเก็บประวัติการแก้ไขเพื่อตรวจสอบย้อนหลัง</p><p className="mt-3 font-semibold text-slate-800">{licenseDraft}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmLicense(false)} disabled={savingLicense} className="rounded-lg px-4 py-2 text-slate-600">ยกเลิก</button><button type="button" onClick={() => void saveLicense()} disabled={savingLicense} className="rounded-lg bg-sky-600 px-4 py-2 text-white disabled:opacity-50">{savingLicense ? 'กำลังบันทึก…' : 'ยืนยันและบันทึก'}</button></div></div></div>}
        </main>
      </div>
    </div>
  );
}
