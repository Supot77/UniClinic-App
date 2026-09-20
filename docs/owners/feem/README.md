# ฟีม — สมาชิก โปรไฟล์ สิทธิ์ และ Patient Search

## เจ้าของ

- เจ้าของ: ฟีม
- คู่ตรวจ: เฮิร์บ
- ขอบเขต: auth, profile, role/session, patient directory

## Code boundary

- `src/app/(auth)/`
- `src/context/AuthContext.tsx`, `src/hooks/useAuth.ts`, `src/hooks/useRequireAuth.ts`
- `src/lib/requireRole.ts`
- `src/services/authService.ts`
- `src/components/profile/`, `src/components/patients/`
- `src/app/(clinic)/patients/`, `src/app/(dashboard)/staff/accounts/`

## Dependency และ handoff

ส่ง `user id`, canonical role, session validity และขอบเขตข้อมูลให้ทุกโมดูล ใช้ shared role/session contract จาก [_shared](../_shared/README.md)

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [System Rules and Acceptance](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
- [Team Decisions](../../10_team_decisions.md)
