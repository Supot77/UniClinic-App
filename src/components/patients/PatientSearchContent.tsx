"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  HeartPulse,
  Loader2,
  Pencil,
  Phone,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { searchProfilesByGroup } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/database";

const healthStatusLabel: Record<string, { text: string; className: string }> = {
  yes: {
    text: "มี",
    className: "bg-status-critical-bg text-status-critical border-red-200",
  },
  no: {
    text: "ไม่มี",
    className: "bg-status-success-bg text-status-success border-emerald-200",
  },
  unknown: {
    text: "ไม่ทราบ",
    className:
      "bg-status-neutral-bg text-status-neutral border-brand-border-soft",
  },
};

function HealthBadge({ status }: { status: string | null | undefined }) {
  const info =
    healthStatusLabel[status ?? "unknown"] ?? healthStatusLabel.unknown;

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${info.className}`}
    >
      {info.text}
    </span>
  );
}

const PAGE_SIZE = 10;

function patientTypeLabel(patient: Profile): string {
  if (patient.patient_type === "employee") return "บุคลากร";
  if (patient.patient_type === "student") return "นักศึกษา";
  return patient.employee_id && !patient.student_id ? "บุคลากร" : "ผู้ป่วย";
}

function patientIdentifier(patient: Profile): string {
  if (patient.patient_type === "employee") {
    return patient.employee_id || patient.student_id || "ไม่ระบุรหัส";
  }

  return patient.student_id || patient.employee_id || "ไม่ระบุรหัส";
}

function healthDetail(
  status: string | null | undefined,
  value: string | null | undefined,
  positiveText: string,
  negativeText: string,
): string {
  if (value?.trim()) return value;
  if (status === "yes") return positiveText;
  if (status === "no") return negativeText;
  return "ยังไม่ได้ระบุข้อมูล";
}

export default function PatientSearchContent() {
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const fetchProfiles = useCallback(
    async (searchQuery: string, pageNumber: number, append = false) => {
      const currentRequestVersion = ++requestVersion.current;

      if (pageNumber === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);
      setHasSearched(true);
      setActiveQuery(searchQuery.trim());

      try {
        const {
          profiles,
          hasMore: moreAvailable,
          totalCount: total,
        } = await searchProfilesByGroup(
          "patient",
          searchQuery,
          pageNumber,
          PAGE_SIZE,
        );

        if (currentRequestVersion !== requestVersion.current) return;

        if (append) {
          setResults((current) => [...current, ...profiles]);
        } else {
          setResults(profiles);
        }

        setHasMore(moreAvailable);
        setTotalCount(total);
        setPage(pageNumber);
      } catch (fetchError) {
        if (currentRequestVersion !== requestVersion.current) return;

        if (!append) {
          setResults([]);
          setHasMore(false);
          setTotalCount(0);
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "ค้นหาข้อมูลผู้ป่วยไม่สำเร็จ",
        );
      } finally {
        if (currentRequestVersion !== requestVersion.current) return;

        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();

    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setError("กรุณากรอกคำค้นหาอย่างน้อย 2 ตัวอักษรหรือตัวเลข");
      return;
    }

    await fetchProfiles(normalizedQuery, 0, false);
  }

  function handleClearSearch() {
    requestVersion.current += 1;
    setQuery("");
    setActiveQuery("");
    setHasSearched(false);
    setResults([]);
    setPage(0);
    setHasMore(false);
    setTotalCount(0);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
  }

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;

    await fetchProfiles(activeQuery, page + 1, true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
            Patient directory
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            ค้นหาผู้ป่วย
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            ค้นหาด้วยชื่อ รหัสนักศึกษา/บุคลากร หรือเบอร์โทรศัพท์
          </p>
        </div>

        {hasSearched && !isLoading && totalCount > 0 && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 sm:self-auto">
            <UserRound className="size-3.5" aria-hidden="true" />
            พบผู้ป่วย {totalCount} รายการ
          </span>
        )}
      </header>

      <form
        onSubmit={handleSearch}
        aria-label="ค้นหาผู้ป่วย"
        className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
      >
        <label htmlFor="patient-search" className="sr-only">
          ค้นหาผู้ป่วย
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="patient-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError(null);
              }}
              placeholder="ชื่อ รหัส หรือเบอร์โทรศัพท์"
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby="patient-search-help"
              className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {query && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="ล้างคำค้นหา"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || isLoadingMore}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            ค้นหา
          </button>
        </div>
        <p id="patient-search-help" className="mt-2 px-1 text-xs text-zinc-500">
          กรอกอย่างน้อย 2 ตัวอักษรหรือตัวเลข ระบบค้นหาได้จากชื่อ รหัส และเบอร์โทรศัพท์
        </p>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          {hasSearched && activeQuery && (
            <button
              type="button"
              onClick={() => void fetchProfiles(activeQuery, 0, false)}
              className="shrink-0 font-semibold underline underline-offset-4 hover:text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              ลองอีกครั้ง
            </button>
          )}
        </div>
      )}

      {hasSearched && isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white py-14 text-zinc-400"
        >
          <Loader2 className="size-7 animate-spin text-sky-500" aria-hidden="true" />
          <p className="text-sm font-medium text-zinc-500">กำลังค้นหาผู้ป่วย…</p>
        </div>
      )}

      {!hasSearched && !error && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <Search className="mx-auto size-10 text-zinc-300" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-zinc-800">
            เริ่มค้นหาผู้ป่วย
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            ใช้ชื่อ รหัสนักศึกษา/บุคลากร หรือเบอร์โทรศัพท์ เพื่อค้นหาข้อมูลที่ต้องการ
          </p>
        </div>
      )}

      {hasSearched && !isLoading && !error && results.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <UserRound className="mx-auto size-10 text-zinc-300" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-zinc-800">
            ไม่พบผู้ป่วยที่ตรงกับคำค้นหา
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            ลองตรวจสอบการสะกดคำ หรือค้นหาด้วยรหัสและเบอร์โทรศัพท์
          </p>
          <button
            type="button"
            onClick={handleClearSearch}
            className="mt-4 text-sm font-semibold text-sky-700 underline underline-offset-4 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            ล้างคำค้นหา
          </button>
        </div>
      )}

      {hasSearched && !isLoading && !error && results.length > 0 && (
        <section aria-labelledby="patient-results-heading" className="space-y-3">
          <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="patient-results-heading" className="text-base font-semibold text-zinc-900">
                ผลการค้นหา
              </h2>
              <p className="text-xs text-zinc-500">
                คำค้นหา “{activeQuery}” · แสดง {results.length} จาก {totalCount} รายการ
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="self-start text-sm font-medium text-sky-700 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:self-auto"
            >
              ล้างคำค้นหา
            </button>
          </div>

          <div className="space-y-3" aria-live="polite">
            {results.map((patient) => (
              <article
                key={patient.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-900">
                        {patient.full_name}
                      </h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {patientTypeLabel(patient)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      รหัส: {patientIdentifier(patient)}
                    </p>
                  </div>

                  {role === "staff_admin" && (
                    <Link
                      href={`/patients/${patient.id}/edit`}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      แก้ไขข้อมูล
                    </Link>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-4 text-zinc-400" aria-hidden="true" />
                    <span>{patient.phone || "ไม่ระบุเบอร์โทร"}</span>
                  </div>
                </div>

                {role === "medical" && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                          <AlertCircle className="size-3.5 text-amber-600" aria-hidden="true" />
                          ประวัติแพ้ยา
                        </p>
                        <HealthBadge
                          status={
                            patient.allergies?.trim()
                              ? "yes"
                              : (patient.allergy_status ?? null)
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs font-medium text-zinc-700">
                        {healthDetail(
                          patient.allergy_status,
                          patient.allergies,
                          "มีประวัติแพ้ยา แต่ยังไม่ระบุรายละเอียด",
                          "ไม่มีประวัติแพ้ยา",
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
                          <HeartPulse className="size-3.5 text-rose-600" aria-hidden="true" />
                          โรคประจำตัว
                        </p>
                        <HealthBadge
                          status={
                            patient.chronic_diseases?.trim()
                              ? "yes"
                              : (patient.chronic_disease_status ?? null)
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs font-medium text-zinc-700">
                        {healthDetail(
                          patient.chronic_disease_status,
                          patient.chronic_diseases,
                          "มีโรคประจำตัว แต่ยังไม่ระบุรายละเอียด",
                          "ไม่มีโรคประจำตัว",
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          {hasMore && (
            <div className="flex flex-col items-center gap-2 pt-3">
              <p className="text-xs text-zinc-500">
                แสดงแล้ว {results.length} จาก {totalCount} รายการ
              </p>
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-sky-500" aria-hidden="true" />
                    กำลังโหลดเพิ่มเติม…
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4 text-zinc-500" aria-hidden="true" />
                    แสดงเพิ่มอีก {totalCount - results.length} รายการ
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && totalCount > PAGE_SIZE && (
            <p className="pt-3 text-center text-xs text-zinc-400">
              แสดงข้อมูลครบทั้งหมดแล้ว
            </p>
          )}
        </section>
      )}
    </div>
  );
}
