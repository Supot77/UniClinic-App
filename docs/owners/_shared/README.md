# Shared / Core

## ความรับผิดชอบ

ไฟล์กลางไม่มีเจ้าของคนเดียว ต้องประสานเจ้าของโมดูลที่ได้รับผลกระทบและคู่ตรวจทุกครั้ง

## ขอบเขต

- `src/types/` — `auth.ts`, `database.ts`, `schedule.ts`
- `src/utils/supabase/`, `src/lib/supabase*.ts` — client, server และ middleware
- `src/constants/dateTime.ts`
- `src/components/common/` — shared UI เช่น `DatePicker`, `Toast`, `ConfirmationModal`
- `src/mocks/`, `src/features/mock-database/`
- `supabase/migrations/` และ `tests/setup.ts` เมื่อกระทบหลายโมดูล

## Dependency และ handoff

ทุกโมดูลเป็นผู้ตรวจผลกระทบของ contract ที่ตนใช้งาน ผู้ดูแลไฟล์กลางต้องตรวจ compatibility, role contract และ data source ก่อนส่งต่อ

## เอกสารอ้างอิง

- [05 Folder and Git Workflow](../../05_folder_and_git_workflow.md)
- [08 System Rules and Acceptance](../../08_system_rules_and_acceptance.md)
- [09 Implementation Plan](../../09_implementation_plan.md)
- [13 Refactoring and Routing Plan](../../13_code_refactoring_and_routing_plan.md)
