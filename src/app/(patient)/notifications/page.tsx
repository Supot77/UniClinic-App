"use client";

import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
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

type InboxFilter = "all" | "unread";
type UnreadRoleFilter = "all" | UserRole;
type NotificationPeriod = "today" | "7d" | "30d";

const filters: Array<{ value: InboxFilter; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "unread", label: "ยังไม่อ่าน" },
];

const unreadRoleFilters: Array<{ value: UnreadRoleFilter; label: string }> = [
  { value: "all", label: "ผู้ใช้ทั้งหมด" },
  { value: "patient", label: "ผู้ป่วย" },
  { value: "medical", label: "แพทย์" },
  { value: "staff_admin", label: "แอดมินคนอื่นๆ" },
];

const notificationPeriods: Array<{ value: NotificationPeriod; label: string }> =
  [
    { value: "today", label: "วันนี้" },
    { value: "7d", label: "7 วันที่ผ่านมา" },
    { value: "30d", label: "30 วันที่ผ่านมา" },
  ];

const typeMeta: Record<
  NotificationType,
  { label: string; icon: typeof Bell; className: string }
> = {
  appointment: {
    label: "นัดหมาย",
    icon: CalendarDays,
    className: "bg-status-info-bg text-status-info",
  },
  reminder: {
    label: "เตือนยา",
    icon: Pill,
    className: "bg-status-warning-bg text-status-warning",
  },
  broadcast: {
    label: "ประกาศ",
    icon: Megaphone,
    className: "bg-status-warning-bg text-status-warning",
  },
  system: {
    label: "ระบบ",
    icon: BellRing,
    className: "bg-status-neutral-bg text-status-neutral",
  },
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
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

function formatBangkokDate(value = new Date()): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function NotificationDate() {
  return (
    <time
      suppressHydrationWarning
      dateTime={bangkokDate()}
      className="shrink-0 px-1 text-xs text-brand-muted"
    >
      {formatBangkokDate()}
    </time>
  );
}

function NotificationPeriodFilter({
  period,
  onSelect,
  showDate = true,
}: {
  period: NotificationPeriod;
  onSelect: (period: NotificationPeriod) => void;
  showDate?: boolean;
}) {
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2 md:w-auto"
      aria-label="ช่วงข้อมูล"
    >
      {showDate && <NotificationDate />}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-semibold text-brand-ink">
          <Filter className="size-4 text-brand-strong" aria-hidden="true" />
          ช่วงข้อมูล
        </div>
        <div
          className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-xl bg-brand-page p-1 sm:w-auto sm:min-w-[360px]"
          role="tablist"
          aria-label="เลือกช่วงเวลาการแจ้งเตือน"
        >
          {notificationPeriods.map((item) => {
            const isSelected = period === item.value;
            return (
              <button
                key={item.value}
                id={`period-${item.value}-tab`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="notification-content"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelect(item.value)}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const values = notificationPeriods.map((item) => item.value);
                  const currentIndex = values.indexOf(item.value);
                  let nextValue: NotificationPeriod;
                  if (event.key === "Home") nextValue = values[0];
                  else if (event.key === "End")
                    nextValue = values[values.length - 1];
                  else if (event.key === "ArrowRight")
                    nextValue = values[(currentIndex + 1) % values.length];
                  else
                    nextValue =
                      values[
                        (currentIndex - 1 + values.length) % values.length
                      ];
                  onSelect(nextValue);
                  document.getElementById(`period-${nextValue}-tab`)?.focus();
                }}
                className={`inline-flex min-h-10 items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong cursor-pointer ${
                  isSelected
                    ? "bg-brand-strong text-white shadow-xs"
                    : "text-brand-body hover:bg-white hover:text-brand-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
        `${result.created ? "ส่ง Broadcast สำเร็จ" : "คำขอนี้ถูกส่งแล้ว"} · ผู้รับ ${result.recipientCount} คน`,
      );
      if (result.created) {
        onDraftChange(emptyBroadcastDraft);
        requestKey.current = crypto.randomUUID();
        await onSent();
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "ส่ง Broadcast ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-brand-border-soft pb-4 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-ink">
            ส่งประกาศ Broadcast
          </h2>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            ส่งประกาศถึงบัญชีที่ใช้งานอยู่ทุกบทบาท และบันทึกลงกล่องแจ้งเตือน
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="ปิดแบบฟอร์มส่ง Broadcast"
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
            placeholder="เช่น แจ้งเปลี่ยนเวลาทำการ"
          />
        </label>
        <label className="block text-sm font-medium text-brand-ink">
          ข้อความ
          <textarea
            value={draft.message}
            onChange={(event) =>
              onDraftChange({ ...draft, message: event.target.value })
            }
            maxLength={1000}
            required
            rows={4}
            className="mt-2 w-full resize-y rounded-lg border border-brand-border-strong bg-white px-3.5 py-2.5 font-normal text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-strong focus:ring-2 focus:ring-brand-soft"
            placeholder="รายละเอียดประกาศ"
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
                <Send className="size-4" />
              )}
              {busy ? "กำลังส่ง…" : "ยืนยันการส่ง"}
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
      aria-label="ประวัติ Broadcast"
    >
      <div className="flex flex-col gap-2 border-b border-brand-border-soft px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-brand-ink">
            ประวัติ Broadcast
          </h2>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            ประกาศที่ส่งจากบัญชีแอดมินและสถานะการอ่านของผู้รับ
          </p>
        </div>
        <span className="self-start rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
          {history.length} รายการ
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 p-5" aria-label="กำลังโหลดประวัติ Broadcast">
          <div className="h-24 animate-pulse rounded-xl bg-brand-page" />
          <div className="h-24 animate-pulse rounded-xl bg-brand-page" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
          <Send className="size-8 text-brand-muted" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-brand-ink">
            ยังไม่มีประวัติ Broadcast
          </h3>
          <p className="mt-1 text-sm text-brand-muted">
            ประกาศที่ส่งสำเร็จจะแสดงในส่วนนี้
          </p>
        </div>
      ) : (
        <div className="divide-y divide-brand-border-soft">
          {history.map((item) => (
            <article key={item.id} className="px-5 py-5 sm:px-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-semibold text-brand-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1 break-words text-sm leading-6 text-brand-body">
                    {item.message}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-brand-muted">
                  {formatDateTime(item.sentAt)}
                </time>
              </div>
              <p className="mt-3 text-xs font-medium text-status-success">
                ส่งสำเร็จ · ผู้รับ {item.recipientCount} คน · อ่านแล้ว{" "}
                {item.readCount ?? 0} คน
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {broadcastRoleOrder.map((role) => {
                  const summary = item.roleReadCounts?.[role] ?? {
                    read: 0,
                    total: 0,
                  };
                  return (
                    <span
                      key={role}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${summary.total > 0 && summary.read === summary.total ? "bg-status-success-bg text-status-success" : "bg-brand-page text-brand-body"}`}
                    >
                      {roleLabels[role]} อ่านแล้ว {summary.read}/{summary.total}
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
  const [error, setError] = useState<string | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] =
    useState<BroadcastDraft>(emptyBroadcastDraft);

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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "โหลดการแจ้งเตือนไม่สำเร็จ",
          );
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
          setError(
            loadError instanceof Error
              ? loadError.message
              : "โหลดประวัติ Broadcast ไม่สำเร็จ",
          ),
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "โหลดการแจ้งเตือนไม่สำเร็จ",
      );
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
        return notification.type === filter;
      }),
    [filter, notifications],
  );
  const roleLabel = (role: UserRole) =>
    role === "staff_admin"
      ? "แอดมิน"
      : role === "medical"
        ? "แพทย์"
        : "ผู้ป่วย";
  const unreadUsers = useMemo(() => {
    const users = new Map<
      string,
      { recipient: UnreadNotificationRecipient; unreadCount: number }
    >();
    unreadRecipients.forEach((recipient) => {
      if (
        auth.role === "staff_admin" &&
        recipient.role === "staff_admin" &&
        recipient.user_id === inboxUserId
      )
        return;
      const current = users.get(recipient.user_id);
      users.set(recipient.user_id, {
        recipient,
        unreadCount: (current?.unreadCount ?? 0) + 1,
      });
    });
    return Array.from(users.values());
  }, [auth.role, inboxUserId, unreadRecipients]);
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
  const useTwoColumnUnreadList = visibleUnreadUsers.length > 1;

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
      setError(
        updateError instanceof Error
          ? updateError.message
          : "บันทึกสถานะอ่านไม่สำเร็จ",
      );
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
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ลบการแจ้งเตือนไม่สำเร็จ",
      );
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <main className="dashboard-shell mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-2 pb-8 sm:px-6 lg:px-8">
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="relative mt-2 pl-4 text-2xl font-bold tracking-tight text-brand-ink before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand sm:text-3xl">
              ศูนย์แจ้งเตือน
            </h1>
            <p className="mt-1 text-sm text-brand-body">
              นัดหมาย เตือนยา และประกาศที่ส่งถึงบัญชีนี้
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {auth.role === "staff_admin" && (
              <button
                onClick={() => setIsBroadcastOpen(true)}
                aria-expanded={isBroadcastOpen}
                aria-controls="notification-broadcast-panel"
                className="inline-flex min-h-10 w-full flex-1 shrink-0 items-center justify-center gap-2 rounded-brand-button bg-brand-strong px-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:w-auto sm:flex-initial"
              >
                <Send className="size-4" aria-hidden="true" />
                ส่ง Broadcast
              </button>
            )}
            <button
              onClick={() => void reloadInbox()}
              disabled={loading || auth.isLoading}
              className="inline-flex min-h-10 w-full flex-1 shrink-0 items-center justify-center gap-2 rounded-brand-button border border-brand-border bg-white px-3 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:flex-initial"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />{" "}
              รีเฟรช
            </button>
          </div>
        </div>
        {!auth.isLoading && !auth.isAuthenticated && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            กรุณาเข้าสู่ระบบเพื่อดูการแจ้งเตือน
          </p>
        )}
      </header>

      {auth.role === "staff_admin" && (
        <section
          className="border-b border-brand-border-soft py-4"
          aria-label="ผู้ใช้ที่ยังไม่อ่านประกาศ"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="font-semibold text-brand-ink">
                ผู้ใช้ที่ยังไม่อ่าน
              </h2>
              <p className="mt-1 text-xs text-brand-muted">
                รายชื่อจากข้อมูลประกาศจริงที่ยังไม่มีการกดอ่าน
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 border-b border-brand-border-soft pb-3 md:flex-row md:items-end md:justify-between md:gap-5">
            <div
              className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl bg-brand-page p-1 md:flex-1 md:grid-cols-4"
              role="tablist"
              aria-label="กรองผู้ใช้ที่ยังไม่อ่านตามบทบาท"
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
                    className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong cursor-pointer ${
                      isSelected
                        ? "bg-brand-strong text-white shadow-xs"
                        : "text-brand-body hover:bg-white hover:text-brand-ink"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${isSelected ? "bg-white/20 text-white" : "bg-brand-page text-brand-muted"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <NotificationPeriodFilter period={period} onSelect={selectPeriod} />
          </div>
          <div
            id="unread-users-panel"
            role="tabpanel"
            aria-label="รายชื่อผู้ใช้ที่ยังไม่อ่าน"
            className="mt-4"
          >
            {visibleUnreadUsers.length === 0 ? (
              <p className="flex min-h-32 items-center justify-center py-10 text-center text-lg font-bold text-brand-ink">
                ไม่มีผู้ใช้ที่ยังไม่อ่านในช่วงนี้
              </p>
            ) : (
              <div
                className={
                  useTwoColumnUnreadList
                    ? "grid gap-x-8 md:grid-cols-2"
                    : "divide-y divide-brand-border-soft"
                }
              >
                {visibleUnreadUsers.map(
                  ({ recipient, unreadCount: userUnreadCount }) => (
                    <div
                      key={recipient.user_id}
                      className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${useTwoColumnUnreadList ? "border-b border-brand-border-soft" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-ink">
                          {recipient.full_name}
                        </p>
                        <p className="mt-1 text-xs text-brand-muted">
                          {roleLabel(recipient.role)} · ล่าสุด{" "}
                          {formatDateTime(recipient.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning">
                        ยังไม่อ่าน {userUnreadCount}
                      </span>
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
          <span>{error}</span>
          <button
            onClick={() => void reloadInbox()}
            className="inline-flex shrink-0 items-center gap-1 font-semibold"
          >
            <RefreshCw className="size-4" /> ลองใหม่
          </button>
        </div>
      )}

      {auth.role === "staff_admin" ? (
        <div
          id="notification-content"
          role="tabpanel"
          aria-label="เนื้อหาการแจ้งเตือน"
        >
          <AdminBroadcastHistory
            history={broadcastHistory}
            loading={loading || auth.isLoading}
          />
        </div>
      ) : (
        <div
          id="notification-content"
          role="tabpanel"
          aria-label="เนื้อหาการแจ้งเตือน"
        >
          <section
            className="border-b border-brand-border-soft py-2 md:py-3"
            aria-label="ตัวกรองสถานะการอ่าน"
          >
            <div className="flex flex-col gap-2 md:gap-3">
              <div className="flex justify-end">
                <NotificationDate />
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
                <NotificationPeriodFilter
                  period={period}
                  onSelect={selectPeriod}
                  showDate={false}
                />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div
                  className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl bg-brand-page p-1 sm:w-auto sm:min-w-[220px]"
                  role="group"
                  aria-label="เลือกสถานะการอ่าน"
                >
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilter(item.value)}
                      aria-pressed={filter === item.value}
                      className={`inline-flex min-h-9 items-center justify-center rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${filter === item.value ? "bg-brand-strong text-white shadow-xs" : "text-brand-body hover:bg-white hover:text-brand-ink"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-semibold text-slate-950">
                  รายการแจ้งเตือน
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  แสดง {visibleNotifications.length} จาก {notifications.length}{" "}
                  ข้อความ
                </p>
              </div>
            </div>
            {loading || auth.isLoading ? (
              <div className="space-y-3 p-5" aria-label="กำลังโหลดข้อความ">
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
                  ไม่มีข้อความในรายการนี้
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  เมื่อมีข้อความใหม่ ระบบจะแสดงที่นี่
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
                      className={`group flex flex-col gap-3 px-5 py-4 transition sm:flex-row sm:gap-4 sm:px-6 ${notification.is_read ? "bg-white" : "bg-sky-50/30"}`}
                    >
                      <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                        <div
                          className={`mt-0.5 shrink-0 self-start rounded-xl p-2.5 ring-1 ring-inset ${meta.className}`}
                          aria-hidden="true"
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2
                              className={`truncate text-sm sm:text-base ${notification.is_read ? "font-medium text-slate-700" : "font-semibold text-slate-950"}`}
                            >
                              {notification.title}
                            </h2>
                            {!notification.is_read && (
                              <span
                                className="size-2 shrink-0 rounded-full bg-sky-500"
                                aria-label="ยังไม่อ่าน"
                              />
                            )}
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-slate-600">
                            {notification.message}
                          </p>
                          {notification.type === "broadcast" && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>ส่งโดย:</span>
                              <span className="font-medium text-slate-500">
                                {notification.sender_name ?? "แอดมิน"}
                              </span>
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand-strong">
                                {notification.sender_role === "staff_admin"
                                  ? "แอดมิน"
                                  : notification.sender_role === "medical"
                                    ? "แพทย์"
                                    : "แอดมิน"}
                              </span>
                            </div>
                          )}
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            {meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-start justify-end gap-2">
                        <div className="flex min-w-0 flex-col items-end gap-2">
                          <time className="text-xs text-slate-400">
                            {formatDateTime(notification.created_at)}
                          </time>
                          {notification.is_read ? (
                            <span
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-status-success-bg px-3 py-2 text-xs font-semibold text-status-success"
                              aria-label={`${notification.title} อ่านแล้ว`}
                            >
                              <CheckCheck className="size-4" aria-hidden="true" />
                              อ่านแล้ว
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void markRead(notification)}
                              disabled={busy || Boolean(workingId)}
                              aria-label={`ทำเครื่องหมาย ${notification.title} ว่าอ่านแล้ว`}
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-600 hover:text-white hover:ring-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busy ? (
                                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <CheckCheck className="size-4" aria-hidden="true" />
                              )}
                              {busy ? "กำลังบันทึก…" : "ยังไม่อ่าน"}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => void deleteNotification(notification)}
                          disabled={busy}
                          aria-label={`ลบ ${notification.title} ออกจากกล่องข้อความ`}
                          className="shrink-0 self-start rounded-lg bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-ink/20 p-2 backdrop-blur-sm sm:p-6"
          role="presentation"
        >
          <div
            className="relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-border-soft bg-brand-surface px-4 py-5 shadow-2xl sm:max-h-[90vh] sm:px-8 sm:py-6"
            role="dialog"
            aria-modal="true"
            aria-label="ส่งประกาศ Broadcast"
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
        การอ่านหรือลบมีผลกับกล่องข้อความของบัญชีนี้ · สถานะการอ่าน Broadcast
        จะสรุปให้ staff_admin เห็นแยกตาม role
      </p>
    </main>
  );
}
