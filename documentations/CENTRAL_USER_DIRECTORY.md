# Central User Directory

## Purpose

The `centralusers` collection maps a normalized, globally unique email address to the tenant database that owns the user. Passwords and complete user profiles remain in tenant databases.

Login first performs one indexed central lookup. During the compatibility window, a missing directory entry falls back to the previous tenant scan and repairs the directory entry automatically.

## Data shape

- `email`: lowercase global login identity (unique)
- `tenantId`: tenant slug
- `dbName`: tenant MongoDB database name
- `userId`: `_id` of the user in the tenant database
- `role`: current tenant role
- `isActive`: current tenant-user status

The collection has unique indexes on `email` and on `{ dbName, userId }`.

## Rollout

1. Deploy the expanded schema and dual-write code.
2. From `backend`, run `npm run backfill:central-users` once with the production environment configured.
3. Confirm the script reports zero tenant failures and investigate any duplicate-email error.
4. Monitor `[CentralUserDirectory]` errors and legacy login-resolution logs.
5. After the directory is verified complete, remove the legacy cross-tenant scan in a separate change.

The backfill is idempotent and does not delete tenant or central data.

## Rollback

Revert the application code to restore legacy tenant scanning. The `centralusers` collection can remain unused; deleting it is not required for rollback and is intentionally not part of this migration.
