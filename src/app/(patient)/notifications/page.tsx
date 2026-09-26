"use client";

import {
  Bell,
  BellRing,
  CalendarDays,
  Filter,
  Inbox,
  Megaphone,
  Pill,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  roleLabels,
  type BroadcastHistoryItem,
} from "@/features/dashboard/types";
import {
  deleteNotification as deleteNotificationFromDatabase,
  getBroadcastHistory,
  getNotifications,
  getUnreadNotificationRecipients,
  markAsRead,
  sendBroadcast,
} from "@/services/dashboardService";
import type {
  Notification,
  NotificationType,
  UnreadNotificationRecipient,
  UserRole,
} from "@/types/database";
import Toast from "@/components/common/Toast";
import SegmentedControl from "@/components/common/SegmentedControl";
import { toNotificationErrorMessage } from "@/lib/userFacingErrors";
import { useLocale } from "@/context/LocaleContext";

type InboxFilter = "all" | "unread" | "read" | NotificationType;
type UnreadRoleFilter = "all" | UserRole;
type NotificationPeriod = "today" | "7d" | "30d";

const filters: Array<{ value: InboxFilter; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "read", label: "อ่านแล้ว" },
  { value: "unread", label: "ยังไม่อ่าน" },
];

function initialInboxFilter(): InboxFilter {
  if (typeof window === "undefined") return "all";
  const initialFilter = new URLSearchParams(window.location.search).get(
    "filter",
  );
  return initialFilter === "read" ||
    initialFilter === "unread" ||
    initialFilter === "all"
    ? initialFilter
    : "all";
}

const unreadRoleFilters: Array<{ value: UnreadRoleFilter; label: string }> = [
  { value: "all", label: "ผู้รับทุกคน" },
  { value: "patient", label: "ผู้ป่วย" },
  { value: "medical", label: "แพทย์" },
  { value: "staff_admin", label: "ผู้ดูแลระบบ" },
];

const notificationPeriods: Array<{ value: NotificationPeriod; label: string }> =
  [
    { value: "today", label: "วันนี้" },
    { value: "7d", label: "ย้อนหลัง 7 วัน" },
    { value: "30d", label: "ย้อนหลัง 30 วัน" },
  ];

const typeMeta: Record<
  NotificationType,
  { thai: string; english: string; icon: typeof Bell; className: string }
> = {
  appointment: {
    thai: "นัดหมาย",
    english: "Appointment",
    icon: CalendarDays,
    className: "bg-status-info-bg text-status-info",
  },
  reminder: {
    thai: "เตือนกินยา",
    english: "Medication reminder",
    icon: Pill,
    className: "bg-status-warning-bg text-status-warning",
  },
  broadcast: {
    thai: "ประกาศ",
    english: "Announcement",
    icon: Megaphone,
    className: "bg-status-warning-bg text-status-warning",
  },
  system: {
    thai: "ระบบ",
    english: "System",
    icon: BellRing,
    className: "bg-status-neutral-bg text-status-neutral",
  },
};
const notificationErrorEnglish: Record<string, string> = {
  คุณไม่มีสิทธิ์ดำเนินการนี้: "You are not allowed to perform this action.",
  "เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่":
    "Could not connect. Check your internet connection and try again.",
  "ส่งประกาศไม่สำเร็จ ลองใหม่":
    "Could not send the announcement. Please try again.",
  "โหลดการแจ้งเตือนไม่สำเร็จ ลองใหม่":
    "Could not load notifications. Please try again.",
  "โหลดประวัติประกาศไม่สำเร็จ ลองใหม่":
    "Could not load announcement history. Please try again.",
  "ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ ลองใหม่":
    "Could not mark the notification as read. Please try again.",
  "ลบการแจ้งเตือนไม่สำเร็จ ลองใหม่":
    "Could not delete the notification. Please try again.",
};

function formatDateTime(value: string, locale: "en" | "th" = "th"): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function bangkokDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  }).formatToParts(value);
  const dateParts = Object.fromEntries(
    parts.map(({ type, value: partValue }) => [type, partValue]),
  );
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function notificationDateRange(period: NotificationPeriod): {
  startAt: string;
  endAt: string;
} {
  const now = new Date();
  const daysBack = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const start = new Date(`${bangkokDate(now)}T00:00:00+07:00`);
  start.setUTCDate(start.getUTCDate() - daysBack);
  return { startAt: start.toISOString(), endAt: now.toISOString() };
}

function formatBangkokDate(
  value = new Date(),
  locale: "en" | "th" = "th",
): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function formatBangkokRange(startAt: string, endAt: string, locale: 'en' | 'th' = 'th'): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (bangkokDate(start) === bangkokDate(end)) return formatBangkokDate(end, locale);
  const formatter = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

type BroadcastDraft = { title: string; message: string };
const emptyBroadcastDraft: BroadcastDraft = { title: "", message: "" };
const broadcastRoleOrder = ["patient", "medical", "staff_admin"] as const;

function BroadcastComposer({
  draft,
  onDraftChange,
  onClose,
  onCancel,
  onSent,
}: {
  draft: BroadcastDraft;
  onDraftChange: (draft: BroadcastDraft) => void;
  onClose: () => void;
  onCancel: () => void;
  onSent: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendBroadcast(
        draft.title,
        draft.message,
        requestKey.current,
      );
      setSuccess(
        `${result.created ? "ส่งประกาศแล้ว" : "ประกาศนี้ส่งไปแล้ว"} · ผู้รับ ${result.recipientCount} คน`,
      );
      if (result.created) {
        onDraftChange(emptyBroadcastDraft);
        requestKey.current = crypto.randomUUID();
        await onSent();
      }
    } catch (sendError) {
      setError(
        toNotificationErrorMessage(sendError, "ส่งประกาศไม่สำเร็จ ลองใหม่"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-brand-border-soft pb-4 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-ink">ส่งประกาศ</h2>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            ส่งประกาศถึงผู้ใช้ที่ยังใช้งานอยู่ ระบบจะบันทึกไว้ในศูนย์แจ้งเตือน
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="ปิดหน้าส่งประกาศ"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-brand-border-strong px-3 text-sm font-semibold text-brand-body transition hover:bg-brand-page hover:text-brand-ink"
        >
          <X className="size-4" aria-hidden="true" />
          ปิด
        </button>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-brand-ink">
          หัวข้อ
          <input
            value={draft.title}
            onChange={(event) =>
              onDraftChange({ ...draft, title: event.target.value })
            }
            maxLength={120}
            required
            className="mt-2 w-full rounded-lg border border-brand-border-strong bg-white px-3.5 py-2.5 font-normal text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
            placeholder="เช่น เปลี่ยนเวลาทำการ"
          />
        </label>
        <label className="block text-sm font-medium text-brand-ink">
          รายละเอียดประกาศ
          <textarea
            value={draft.message}
            onChange={(event) =>
              onDraftChange({ ...draft, message: event.target.value })
            }
            maxLength={1000}
            required
            rows={4}
            className="mt-2 w-full resize-y rounded-lg border border-brand-border-strong bg-white px-3.5 py-2.5 font-normal text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
            placeholder="พิมพ์รายละเอียดประกาศ"
          />
        </label>
        <div className="flex flex-col gap-3 border-t border-brand-border-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm text-status-critical">
            {error}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              {busy ? "กำลังส่ง…" : "ส่งประกาศ"}
            </button>
          </div>
        </div>
      </form>
      <Toast message={success} onDismiss={() => setSuccess(null)} />
    </div>
  );
}

function AdminBroadcastHistory({
  history,
  loading,
}: {
  history: BroadcastHistoryItem[];
  loading: boolean;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xs"
      aria-live="polite"
      aria-label="ประวัติประกาศ"
    >
      <div className="flex flex-col gap-3 border-b border-brand-border-soft bg-brand-page/35 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-ink">
            ประวัติประกาศ
          </h2>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            ประกาศที่ส่งและสถานะการอ่านของผู้รับ
          </p>
        </div>
        <span className="self-start rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
          พบ {history.length} รายการ
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 p-5" aria-label="กำลังโหลดประวัติประกาศ">
          <div className="h-24 animate-pulse rounded-xl bg-brand-page" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-page" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <span className="rounded-2xl bg-brand-soft p-3 text-brand-strong">
            <Megaphone className="size-7" aria-hidden="true" />
          </span>
          <h3 className="mt-3 font-semibold text-brand-ink">
            ยังไม่มีประกาศที่ส่ง
          </h3>
          <p className="mt-1 text-sm text-brand-muted">
            ประกาศที่ส่งแล้วจะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="divide-y divide-brand-border-soft">
          {history.map((item) => (
            <article key={item.id} className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                <div className="flex min-w-0 gap-3">
                  <span
                    className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"
                    aria-hidden="true"
                  >
                    <Megaphone className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-brand-ink">
                      {item.title}
                    </h3>
                    <p className="mt-1 break-words text-sm leading-6 text-brand-body">
                      {item.message}
                    </p>
                  </div>
                </div>
                <time className="shrink-0 text-xs text-brand-muted lg:pt-1">
                  {formatDateTime(item.sentAt)}
                </time>
              </div>
              <div className="mt-5 grid gap-3 border-y border-brand-border-soft py-3 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-brand-border-soft">
                <div className="sm:px-4 sm:first:pl-0">
                  <p className="text-xs text-brand-muted">สถานะ</p>
                  <p className="mt-1 text-sm font-semibold text-status-success">
                    ส่งแล้ว
                  </p>
                </div>
                <div className="sm:px-4">
                  <p className="text-xs text-brand-muted">ผู้รับ</p>
                  <p className="mt-1 text-sm font-semibold text-brand-ink">
                    {item.recipientCount} คน
                  </p>
                </div>
                <div className="sm:px-4 sm:last:pr-0">
                  <p className="text-xs text-brand-muted">อ่านแล้ว</p>
                  <p className="mt-1 text-sm font-semibold text-brand-ink">
                    {item.readCount ?? 0} คน
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {broadcastRoleOrder.map((role) => {
                  const summary = item.roleReadCounts?.[role] ?? {
                    read: 0,
                    total: 0,
                  };
                  const isComplete =
                    summary.total > 0 && summary.read === summary.total;
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isComplete ? "bg-status-success-bg text-status-success" : "bg-brand-page text-brand-body"}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${isComplete ? "bg-status-success" : "bg-brand-border-strong"}`}
                        aria-hidden="true"
                      />
                      {roleLabels[role]}{" "}
                      <span className="tabular-nums">
                        อ่านแล้ว {summary.read}/{summary.total} คน
                      </span>
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function NotificationsPage() {
  const auth = useAuth();
  const { locale, text } = useLocale();
  const localizedFilters = filters.map((item) => ({
    ...item,
    label: text(
      item.label,
      item.value === "all" ? "All" : item.value === "read" ? "Read" : "Unread",
    ),
  }));
  const localizedPeriods = notificationPeriods.map((item) => ({
    ...item,
    label: text(
      item.label,
      item.value === "today"
        ? "Today"
        : item.value === "7d"
          ? "Last 7 days"
          : "Last 30 days",
    ),
  }));
  const inboxUserId = auth.user?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadRecipients, setUnreadRecipients] = useState<
    UnreadNotificationRecipient[]
  >([]);
  const [broadcastHistory, setBroadcastHistory] = useState<
    BroadcastHistoryItem[]
  >([]);
  const [period, setPeriod] = useState<NotificationPeriod>("today");
  const [unreadRoleFilter, setUnreadRoleFilter] =
    useState<UnreadRoleFilter>("all");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<{
    message: string;
    canReload: boolean;
  } | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState<BroadcastDraft>(emptyBroadcastDraft);
  const selectedPeriodRange = notificationDateRange(period);

  useEffect(() => {
    const initialFilter = initialInboxFilter();
    if (initialFilter === "all") return;
    const timer = window.setTimeout(() => setFilter(initialFilter), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadInbox = useCallback(async () => {
    if (!inboxUserId) return [];
    return getNotifications(inboxUserId, 100, notificationDateRange(period));
  }, [inboxUserId, period]);

  const loadUnreadRecipients = useCallback(async () => {
    if (auth.role !== "staff_admin") return [];
    return getUnreadNotificationRecipients(100, notificationDateRange(period));
  }, [auth.role, period]);

  const loadBroadcastHistory = useCallback(async () => {
    if (auth.role !== "staff_admin") return [];
    return getBroadcastHistory(100, notificationDateRange(period));
  }, [auth.role, period]);

  const selectPeriod = (nextPeriod: NotificationPeriod) => {
    if (nextPeriod === period) return;
    setLoading(true);
    setPeriod(nextPeriod);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadInbox(),
      loadUnreadRecipients(),
      loadBroadcastHistory(),
    ])
      .then(([data, recipients, history]) => {
        if (!cancelled) {
          setNotifications(data);
          setUnreadRecipients(recipients);
          setBroadcastHistory(history);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled)
          setError({
            message: toNotificationErrorMessage(
              loadError,
              "โหลดการแจ้งเตือนไม่สำเร็จ ลองใหม่",
            ),
            canReload: true,
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadBroadcastHistory, loadInbox, loadUnreadRecipients]);

  useEffect(() => {
    if (auth.role !== "staff_admin") return;
    const poller = window.setInterval(() => {
      void loadBroadcastHistory()
        .then((history) => setBroadcastHistory(history))
        .catch((loadError) =>
          setError({
            message: toNotificationErrorMessage(
              loadError,
              "โหลดประวัติประกาศไม่สำเร็จ ลองใหม่",
            ),
            canReload: true,
          }),
        );
    }, 5000);
    return () => window.clearInterval(poller);
  }, [auth.role, loadBroadcastHistory]);

  const reloadInbox = async () => {
    setLoading(true);
    try {
      const [data, recipients, history] = await Promise.all([
        loadInbox(),
        loadUnreadRecipients(),
        loadBroadcastHistory(),
      ]);
      setNotifications(data);
      setUnreadRecipients(recipients);
      setBroadcastHistory(history);
      setError(null);
    } catch (loadError) {
      setError({
        message: toNotificationErrorMessage(
          loadError,
          "โหลดการแจ้งเตือนไม่สำเร็จ ลองใหม่",
        ),
        canReload: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBroadcast = () => {
    setBroadcastDraft(emptyBroadcastDraft);
    setIsBroadcastOpen(false);
  };

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (filter === "all") return true;
        if (filter === "unread") return !notification.is_read;
        if (filter === "read") return notification.is_read;
        return notification.type === filter;
      }),
    [filter, notifications],
  );
  const visibleBroadcastHistory = useMemo(
    () =>
      broadcastHistory.filter((item) => {
        if (filter === "unread")
          return (item.readCount ?? 0) < item.recipientCount;
        if (filter === "read")
          return (item.readCount ?? 0) >= item.recipientCount;
        return true;
      }),
    [broadcastHistory, filter],
  );
  const roleLabel = (role: UserRole) =>
    role === "staff_admin"
      ? "ผู้ดูแลระบบ"
      : role === "medical"
        ? "แพทย์"
        : "ผู้ป่วย";
  const unreadUsers = useMemo(() => {
    const users = new Map<
      string,
      { recipient: UnreadNotificationRecipient; unreadCount: number }
    >();
    unreadRecipients.forEach((recipient) => {
      const current = users.get(recipient.user_id);
      users.set(recipient.user_id, {
        recipient,
        unreadCount: (current?.unreadCount ?? 0) + 1,
      });
    });
    return Array.from(users.values());
  }, [unreadRecipients]);
  const unreadRoleCounts = useMemo(
    () =>
      unreadUsers.reduce<Record<UnreadRoleFilter, number>>(
        (counts, item) => {
          counts.all += 1;
          counts[item.recipient.role] += 1;
          return counts;
        },
        { all: 0, patient: 0, medical: 0, staff_admin: 0 },
      ),
    [unreadUsers],
  );
  const visibleUnreadUsers =
    unreadRoleFilter === "all"
      ? unreadUsers
      : unreadUsers.filter(
          ({ recipient }) => recipient.role === unreadRoleFilter,
        );

  const markRead = async (notification: Notification) => {
    if (notification.is_read || workingId) return;
    setWorkingId(notification.id);
    try {
      const updated = await markAsRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...updated,
                sender_name: item.sender_name,
                sender_role: item.sender_role,
              }
            : item,
        ),
      );
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("notifications-updated"));
      setError(null);
    } catch (updateError) {
      setError({
        message: toNotificationErrorMessage(
          updateError,
          "ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ ลองใหม่",
        ),
        canReload: false,
      });
    } finally {
      setWorkingId(null);
    }
  };

  const deleteNotification = async (notification: Notification) => {
    if (workingId) return;
    setWorkingId(notification.id);
    try {
      await deleteNotificationFromDatabase(notification.id);
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      );
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("notifications-updated"));
      setError(null);
    } catch (deleteError) {
      setError({
        message: toNotificationErrorMessage(
          deleteError,
          "ลบการแจ้งเตือนไม่สำเร็จ ลองใหม่",
        ),
        canReload: false,
      });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="dashboard-shell mx-auto flex w-full max-w-7xl flex-col gap-6 pt-4 pb-10">
      <header>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="relative mt-2 pl-4 text-2xl font-bold tracking-tight text-brand-ink before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand sm:text-3xl lg:text-4xl">{text('ศูนย์แจ้งเตือน', 'Notifications')}</h1>
          </div>
        </div>
        {!auth.isLoading && !auth.isAuthenticated && <p className="mt-2 text-xs font-semibold text-amber-700">{text('เข้าสู่ระบบเพื่อดูการแจ้งเตือน', 'Sign in to view your notifications.')}</p>}
        <div className="mt-5 overflow-hidden border-b border-brand-border-soft pb-2" aria-label={text('ตัวกรองการแจ้งเตือน', 'Notification filters')}>
          <div className="flex min-w-0 flex-col gap-3 pb-1 sm:flex-row sm:items-center" role="toolbar" aria-label={text('ตัวกรองการแจ้งเตือน', 'Notification filters')}>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-semibold text-brand-ink"><Filter className="size-4 text-brand-strong" aria-hidden="true" />{text('ช่วงเวลา', 'Period')}</div>
              <div className="scrollbar-none min-w-0 overflow-x-auto">
                <SegmentedControl
                  className="w-max max-w-none"
                  ariaLabel={text("เลือกช่วงเวลา", "Select a period")}
                  value={period}
                  options={localizedPeriods}
                  onChange={selectPeriod}
                />
              </div>
              <time suppressHydrationWarning dateTime={selectedPeriodRange.startAt} className="shrink-0 whitespace-nowrap px-1 text-xs font-medium tabular-nums text-brand-muted sm:ml-1">{formatBangkokRange(selectedPeriodRange.startAt, selectedPeriodRange.endAt, locale)}</time>
            </div>
            <div
              className="flex min-w-0 items-center gap-2 sm:ml-auto sm:shrink-0"
              role="group"
              aria-label={text("เลือกสถานะการอ่าน", "Select read status")}
            >
              <span
                className="hidden h-7 w-px shrink-0 bg-brand-border-soft sm:block"
                aria-hidden="true"
              />
              <div className="scrollbar-none min-w-0 overflow-x-auto">
                <SegmentedControl
                  className="w-max max-w-none"
                  ariaLabel={text("เลือกสถานะการอ่าน", "Select read status")}
                  value={
                    filter === "read" || filter === "unread" || filter === "all"
                      ? filter
                      : "all"
                  }
                  options={localizedFilters}
                  onChange={setFilter}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {auth.role === "staff_admin" && (
        <section
          className="border-b border-brand-border-soft py-4"
          aria-label="ผู้รับที่ยังไม่ได้อ่าน"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="font-semibold text-brand-ink">
                ผู้รับที่ยังไม่ได้อ่าน
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
              {visibleUnreadUsers.length} คน
            </span>
          </div>
          <div
            className="mt-5 flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-brand-border-soft pb-1.5"
            role="tablist"
            aria-label="กรองตามบทบาท"
          >
            {unreadRoleFilters.map((item) => {
              const isSelected = unreadRoleFilter === item.value;
              const count = unreadRoleCounts[item.value];
              return (
                <button
                  key={item.value}
                  id={`unread-role-${item.value}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls="unread-users-panel"
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setUnreadRoleFilter(item.value)}
                  onKeyDown={(e) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        e.key,
                      )
                    )
                      return;
                    e.preventDefault();
                    const values = unreadRoleFilters.map((f) => f.value);
                    const currentIndex = values.indexOf(item.value);
                    let nextValue: UnreadRoleFilter;
                    if (e.key === "Home") nextValue = values[0];
                    else if (e.key === "End")
                      nextValue = values[values.length - 1];
                    else if (e.key === "ArrowRight")
                      nextValue = values[(currentIndex + 1) % values.length];
                    else
                      nextValue =
                        values[
                          (currentIndex - 1 + values.length) % values.length
                        ];
                    setUnreadRoleFilter(nextValue);
                    document
                      .getElementById(`unread-role-${nextValue}-tab`)
                      ?.focus();
                  }}
                  className={`group relative inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong cursor-pointer ${
                    isSelected
                      ? "bg-brand-soft text-brand-strong font-bold shadow-2xs"
                      : "text-brand-body hover:bg-brand-soft/70 hover:text-brand-ink"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors ${
                      isSelected
                        ? "bg-brand-strong text-white shadow-2xs"
                        : "bg-white border border-brand-border-soft text-brand-muted group-hover:border-brand-border-strong group-hover:text-brand-ink"
                    }`}
                  >
                    {count}
                  </span>
                  <span
                    className={`absolute -bottom-[7px] left-2 right-2 h-0.5 rounded-full transition-all duration-150 ${
                      isSelected
                        ? "bg-brand-strong"
                        : "bg-transparent group-hover:bg-brand-border-strong/70"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          <div
            id="unread-users-panel"
            role="tabpanel"
            className="mt-1"
            aria-label={`รายชื่อ${unreadRoleFilters.find((item) => item.value === unreadRoleFilter)?.label ?? "ผู้รับ"}ที่ยังไม่ได้อ่าน`}
          >
            {loading || auth.isLoading ? (
              <div
                className="mt-4 h-12 animate-pulse rounded-xl bg-brand-page"
                aria-label="กำลังโหลดรายชื่อผู้รับ"
              />
            ) : unreadRecipients.length === 0 ? (
              <p className="mt-4 text-sm text-brand-muted">
                ผู้รับทุกคนอ่านครบแล้ว
              </p>
            ) : visibleUnreadUsers.length === 0 ? (
              <p className="mt-4 text-sm text-brand-muted">
                ไม่พบผู้รับในบทบาทนี้
              </p>
            ) : (
              <div
                className={
                  visibleUnreadUsers.length > 1
                    ? "grid grid-cols-1 gap-x-8 md:grid-cols-2"
                    : ""
                }
              >
                {visibleUnreadUsers.map(
                  ({ recipient, unreadCount: unreadForUser }) => (
                    <div
                      key={recipient.user_id}
                      className="flex min-w-0 flex-col gap-1 border-b border-brand-border-soft py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-ink">
                          {recipient.display_name}
                        </p>
                        <span className="mt-1 inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
                          {roleLabel(recipient.role)}
                        </span>
                      </div>
                      <p className="shrink-0 text-xs text-brand-muted">
                        {unreadForUser} รายการที่ยังไม่ได้อ่าน
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {error && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          <span>
            {locale === "en"
              ? (notificationErrorEnglish[error.message] ??
                "Could not complete this action. Please try again.")
              : error.message}
          </span>
          {error.canReload && (
            <button
              type="button"
              onClick={() => void reloadInbox()}
              className="inline-flex shrink-0 items-center gap-1 font-semibold"
            >
              <RefreshCw className="size-4" aria-hidden="true" />{" "}
              {text("โหลดข้อมูลใหม่", "Reload")}
            </button>
          )}
        </div>
      )}

      {auth.role === "staff_admin" ? (
        <div
          id="notification-content"
          role="tabpanel"
          aria-label="เนื้อหาการแจ้งเตือน"
        >
          <AdminBroadcastHistory
            history={visibleBroadcastHistory}
            loading={loading || auth.isLoading}
          />
        </div>
      ) : (
        <div
          id="notification-content"
          role="tabpanel"
          aria-label={text("เนื้อหาการแจ้งเตือน", "Notification content")}
        >
          <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-slate-950">
                  {text("การแจ้งเตือน", "Messages")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {text(
                    `พบ ${visibleNotifications.length} จาก ${notifications.length} ข้อความ`,
                    `Showing ${visibleNotifications.length} of ${notifications.length} messages`,
                  )}
                </p>
              </div>
            </div>
            {loading || auth.isLoading ? (
              <div
                className="space-y-3 p-5"
                aria-label={text(
                  "กำลังโหลดการแจ้งเตือน",
                  "Loading notifications",
                )}
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <span className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                  <Inbox className="size-8" />
                </span>
                <h2 className="mt-4 font-semibold text-slate-800">
                  {text("ไม่พบการแจ้งเตือน", "No notifications")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {text(
                    "เมื่อมีข้อความใหม่ จะแสดงที่นี่",
                    "New messages will appear here.",
                  )}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleNotifications.map((notification) => {
                  const meta = typeMeta[notification.type];
                  const Icon = meta.icon;
                  const busy = workingId === notification.id;
                  return (
                    <article
                      key={notification.id}
                      className={`group flex gap-3 px-5 py-4 transition sm:gap-4 sm:px-6 ${notification.is_read ? "bg-white" : "bg-sky-50/30"}`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 self-start rounded-xl p-2.5 ring-1 ring-inset ${meta.className}`}
                        aria-hidden="true"
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2
                              className={`truncate text-sm sm:text-base ${notification.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-950"}`}
                            >
                              {notification.title}
                            </h2>
                            {!notification.is_read && (
                              <span
                                className="size-2 shrink-0 rounded-full bg-rose-500"
                                aria-label={text("ยังไม่ได้อ่าน", "Unread")}
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-sm leading-6 text-slate-600">
                            {notification.message}
                          </p>
                          {notification.type === "broadcast" && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>{text("ผู้ส่ง:", "From:")}</span>
                              <span className="font-medium text-slate-500">
                                {notification.sender_name ??
                                  text("ผู้ดูแลระบบ", "Clinic administrator")}
                              </span>
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand-strong">
                                {notification.sender_role === "staff_admin"
                                  ? text("ผู้ดูแลระบบ", "Clinic administrator")
                                  : notification.sender_role === "medical"
                                    ? text("แพทย์", "Medical staff")
                                    : text(
                                        "ผู้ดูแลระบบ",
                                        "Clinic administrator",
                                      )}
                              </span>
                            </div>
                          )}
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            {text(meta.thai, meta.english)}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                          <time className="text-xs text-slate-400">
                            {formatDateTime(notification.created_at, locale)}
                          </time>
                          {notification.is_read ? (
                            <span
                              className="inline-flex min-h-9 items-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-200"
                              aria-label={`${notification.title} ${text("อ่านแล้ว", "read")}`}
                            >
                              {text("อ่านแล้ว", "Read")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void markRead(notification)}
                              disabled={busy || Boolean(workingId)}
                              aria-label={`${text("ทำเครื่องหมายว่าอ่านแล้ว", "Mark as read")}: ${notification.title}`}
                              className="inline-flex min-h-9 items-center rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-600 hover:text-white hover:ring-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busy
                                ? text("กำลังอัปเดต…", "Updating…")
                                : text(
                                    "ทำเครื่องหมายว่าอ่านแล้ว",
                                    "Mark as read",
                                  )}
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteNotification(notification)}
                        disabled={busy}
                        aria-label={`${text("ลบการแจ้งเตือน", "Delete notification")}: ${notification.title}`}
                        className="shrink-0 self-start rounded-lg bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {auth.role === "staff_admin" && isBroadcastOpen && (
        <div
          id="notification-broadcast-panel"
          className="clinic-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-brand-ink/20 p-2 backdrop-blur-sm sm:p-6"
          role="presentation"
        >
          <div
            className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-border-soft bg-brand-surface px-4 py-5 shadow-2xl sm:max-h-[90vh] sm:px-8 sm:py-6"
            role="dialog"
            aria-modal="true"
            aria-label="ส่งประกาศ"
          >
            <BroadcastComposer
              draft={broadcastDraft}
              onDraftChange={setBroadcastDraft}
              onClose={() => setIsBroadcastOpen(false)}
              onCancel={cancelBroadcast}
              onSent={reloadInbox}
            />
          </div>
        </div>
      )}

      <p className="text-center text-xs leading-5 text-slate-400">
        {text(
          "การอ่านและลบมีผลเฉพาะกับข้อความของคุณ",
          "Reading and deleting messages affects only your inbox.",
        )}
      </p>
    </main>
  );
}
