---
title: frontend-rewrite-ultracode
type: note
permalink: konsinyasi/tasks/frontend-rewrite-ultracode
---

## openlore analyze codebase summary (2026-07-24)

- Project: konsi (Node.js/TypeScript, Svelte, Vitest)
- 205 of 232 files analyzed, 75 Svelte components, 9 Drizzle tables
- 9 Hono HTTP routes detected
- Top risks: `processVisit` (complexity 26, fan-out 22), `requestJson`, `ApiClient.get/post`, `voidVisit`
- Duplication: ~25% of functions in 15 clone groups, mostly TanStack mutation/query option factories and CRUD API wrappers
- Hubs: `ApiClient.get` (14 callers), `ApiClient.post` (10), `prefersReducedMotion` (8)
- Next recommended: review `processVisit`, consolidate API option factories, consolidate duplicated haversine helpers.
