# ช้อป (สุพจน์) — แผนก แพทย์ ตาราง และ Slot

## เจ้าของ

- เจ้าของ: ช้อป (สุพจน์)
- คู่ตรวจ: ปาย
- ขอบเขต: service catalog, daily offering, department, doctor, leave, schedule, slot

## Code boundary

- `src/app/(clinic)/schedules/`, `src/app/(clinic)/departments/`
- `src/components/schedules/`
- `src/features/shop/`
- `src/constants/dateTime.ts` และ shared confirmation UI เมื่อถูกใช้โดย flow นี้

## Dependency และ handoff

ส่ง `slotId`, `serviceId`, `dailyServiceOfferingId`, `doctorId`, วันเวลาไทย, capacity, slot status และรายการ slot ที่ได้รับผลกระทบจากวันลาให้โมดูลนัดหมาย

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [Acceptance Criteria](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
- [Team Decisions D25/D26/D28](../../10_team_decisions.md)
- [Refactoring and Routing Plan](../../13_code_refactoring_and_routing_plan.md)
