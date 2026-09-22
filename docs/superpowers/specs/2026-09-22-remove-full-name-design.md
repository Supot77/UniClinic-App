# Remove `full_name` From the Profile Contract

## Status

Approved design for implementation.

## Goal

Make `profiles.title`, `profiles.first_name`, and `profiles.last_name` the canonical identity fields across the clinic application and remove `profiles.full_name` from the database contract.

## Decisions

- `first_name` and `last_name` are required for every profile created by the application.
- `title` remains optional because the current contract supports `อื่น ๆ` and nullable values.
- Display names are composed at the application/RPC boundary from the structured fields.
- Existing user-facing behavior keeps the same visible name format wherever possible.
- `student_id`, `employee_id`, emergency-contact fields, allergy fields, and chronic-disease fields are out of scope.
- No automatic parsing of legacy `full_name` values will be added; a database migration must fail before dropping the column if any profile lacks a usable first or last name.

## Database changes

Add a new migration after the current profile migrations that:

1. Checks for profiles with missing or blank `first_name` or `last_name`.
2. Raises an exception with the affected IDs instead of guessing a split.
3. Changes `first_name` and `last_name` to `NOT NULL`.
4. Drops the redundant `profiles_first_name_check` and `profiles_last_name_check` constraints because the format constraints already reject digits.
5. Drops `profiles.full_name` only after all database functions have been updated.

The migration must not drop `auth.users`, profile IDs, or unrelated columns.

## Application changes

- Add one shared profile-name formatter for `title`, `first_name`, and `last_name`.
- Update auth state, header, profile pages, patient search, staff forms, pharmacy views, notifications, reminders, dashboards, mocks, and database types to stop selecting or writing `full_name`.
- Update staff account/personnel APIs to write structured name fields only.
- Update all SQL functions/RPCs that currently select, order by, or embed `profile.full_name`.
- Preserve the existing visible output by formatting the same components in the same order.

## Verification

- Search source, migrations, tests, and active documentation for remaining runtime `full_name` references.
- Run targeted profile/auth/patient/header/pharmacy/scheduling tests.
- Run the full test suite, typecheck, lint, production build, and `git diff --check`.
- Verify the migration against a database fixture containing valid structured names and a fixture with missing names that must fail before destructive change.
- Live Supabase migration deployment remains a separate action and will not be claimed from local checks.
