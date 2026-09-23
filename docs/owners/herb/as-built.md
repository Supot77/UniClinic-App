# เฮิร์บ — As-built Trace

| Requirement | Route/component | Function/service/RPC | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| Dashboard แยกตาม role | `/dashboard/{patient,medical,staff_admin}` | `normalizeDashboardRole`, `dashboardPathForRole`, `DashboardScreen` และ role pages | `tests/dashboard-access.test.tsx`, `tests/dashboard-service.test.ts` | ทำแล้วใน code; metric source ต้องแยกตาม path |
| canonical กับ legacy dashboard route | `src/app/(dashboard)/dashboard/{doctor,staff,medical,staff_admin}/page.tsx` | `dashboardPathForRole` ใช้ canonical path แต่ duplicate `doctor`/`staff` pages ยังมีอยู่ | `tests/dashboard-access.test.tsx`, `docs/13_code_refactoring_and_routing_plan.md` | ทำบางส่วน; duplicate route และ redirect/delete ยังเป็น target |
| Dashboard UI states และ filters | `src/components/dashboard/DashboardScreen.tsx` | loading/error/empty state, range filter, role-specific sections, queue table และ notifications link | `tests/dashboard-access.test.tsx`, `tests/dashboard-service.test.ts` | ทำแล้วใน code; ยังไม่ตรวจ browser และเหลือ UI polish |
| อ่าน notifications | `/notifications` | `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `deleteNotification` | `src/app/(patient)/notifications/page.tsx`, `tests/dashboard-notifications.test.ts` | ทำแล้วใน code; RLS ยังไม่ยืนยัน |
| ส่ง Broadcast แบบ manual | notifications page | `sendBroadcast`, `getBroadcastHistory`, Supabase RPC `send_broadcast`, `get_broadcast_history` | migration `09_broadcast_rpc.sql`, dashboard notification tests | ทำแล้วใน code; deployment/RLS ยังไม่ยืนยัน |
| dashboard medication/summary data | `DashboardScreen` | `getMedicationDashboardData`, `getDashboardView`, `getDashboardStats` ใช้ Supabase client | `tests/dashboard-service.test.ts` และ source ใน `src/services/dashboardService.ts` | ทำแล้วใน code; deployment/RLS ยังไม่ยืนยัน |
| ส่งข้อความซ้ำตามเวลา/worker | `src/app/(patient)/notifications/page.tsx`, `src/services/dashboardService.ts` | ไม่พบ automation, worker หรือ email flow | AC12/AC14, D22 | นอก scope |

## ข้อจำกัด

Dashboard metric, notifications และ Broadcast อ่านผ่าน Supabase query/RPC; deployment และ session-based RLS ยังต้องตรวจบนระบบจริง
