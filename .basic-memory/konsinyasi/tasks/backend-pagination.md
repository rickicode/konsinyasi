---
status: done
current_step: completed
completed_at: 2026-07-25 02:30:00+07:00
permalink: konsinyasi/tasks/backend-pagination
---

# Backend pagination

## Goal

Add optional backend pagination to all resource list endpoints so clients can request `page` and `limit` query parameters and receive a paginated envelope while keeping the existing no-params array response unchanged for current frontend compatibility.

## Completed work

- Added shared pagination schemas/types in `src/shared/schemas/pagination.schema.ts`.
- Added worker helper `src/worker/lib/pagination.ts`:
  - `parsePaginationParams(query)` — opt-in pagination; returns `null` when no params; validates `page`/`limit`.
  - `buildPaginatedResponse(data, page, limit, total)` — paginated envelope builder.
- Updated list routes to support `?page=&limit=`:
  - `src/worker/routes/products.ts`
  - `src/worker/routes/raw_materials.ts`
  - `src/worker/routes/users.ts`
  - `src/worker/routes/outlets.ts`
- Added unit tests: `src/worker/lib/__tests__/pagination.test.ts`.

## Design

- Default behavior (no `page`/`limit`): returns existing plain array.
- Paginated behavior (any `page` or `limit` provided): returns `{ data: T[], meta: { page, limit, total, total_pages } }`.
- `page` defaults to 1; `limit` defaults to 20; `limit` capped at 100.
- Invalid query values throw `ValidationError`.

## Verification

- `pnpm check` ✅
- `pnpm lint` ✅
- `pnpm test` ✅ (139 tests)
- `pnpm build` ✅

## Notes

- This change intentionally stops at the API/backend boundary. Frontend UI (list pages, cursor/infinite scroll) will be handled by the next phase/agent so existing list schemas remain arrays for default requests.
- Next phase can use `paginatedListSchema()` from `src/shared/schemas/pagination.schema.ts` and add new query options that pass `page`/`limit` to the backend.
