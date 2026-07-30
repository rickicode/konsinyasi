---
title: 'Bug analysis: race condition in processVisit'
type: report
permalink: konsinyasi/notes/audits/bug-analysis-race-condition-in-process-visit
tags:
- bug
- visit
- konsinyasi
- race-condition
- backend
---

# Bug analysis: race condition in processVisit

## Problem
`src/worker/services/visit.ts::processVisit` performs validation **after** the write batch is committed.

```ts
await db.batch(statements as never);   // commits visit_submission + outlet update + cycle updates
await verifyCyclesClosed(db, idempotencyKey, pickups); // may throw after commit
```

If two visits for the same outlet read the same open cycles concurrently, the second visit's `processPickups` update will affect 0 rows because `eq(status, 'open')` no longer matches. The batch still commits the new `visit_submission` and the outlet `last_visit_at` update. `verifyCyclesClosed` then throws `ConflictError`, but the data is already inconsistent: an orphaned visit submission exists without the cycles being closed.

## Why it matters
- Financial totals in `visit_submissions` can diverge from actual `consignment_cycles`.
- The outlet's `last_visit_at` is updated even though the visit is rejected.
- Idempotency/double-submit recovery can return a stored result that does not match the committed cycles.

## Suggested fixes
1. Move the cycle-status check into the same atomic batch, and make the batch abort if any cycle update does not affect exactly one row.
2. If D1 cannot express conditional rollback inside a batch, acquire an optimistic per-outlet lock or serialize submissions per outlet.
3. Alternatively, check the cycle status with a second pre-flight query inside the batch and use a deliberately failing statement (e.g. unique violation on a sentinel) to abort the whole batch when a cycle has been closed by another visit.

## Related files
- `src/worker/services/visit.ts` (lines 433–502)
- `src/worker/services/__tests__/visit.test.ts` (currently only tests pure helpers)

## Other findings
- `processVisit` is an untested hotspot in the OpenLore health map.
- 15 files / 139 symbols are currently uncommitted, with 9 specs at risk of going stale.
- All existing unit tests, TypeScript checks, and lint pass.