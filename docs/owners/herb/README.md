# เฮิร์บ — Broadcast, Notifications และ Dashboard

## เจ้าของ

- เจ้าของ: เฮิร์บ
- คู่ตรวจ: ฟีม
- ขอบเขต: Broadcast, notification inbox/read state และ role dashboards

## Code boundary

- `src/app/(dashboard)/dashboard/`
- `src/components/dashboard/`
- `src/features/dashboard/`
- `src/services/dashboardService.ts`
- `src/app/(patient)/notifications/page.tsx`
- notification/broadcast migrations และ dashboard tests

## Dependency และ handoff

อ่านข้อมูลที่โมดูลอื่นบันทึกแล้ว แสดงเฉพาะข้อมูลตาม role และส่ง Broadcast เมื่อ `staff_admin` กดคำสั่ง

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [Acceptance Criteria](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
- [Team Decisions](../../10_team_decisions.md)
