---
title: Phase D dashboard screen
type: task
permalink: konsinyasi/tasks/phase-d-dashboard-screen
---

# Phase D: dashboard screen\n\nImplement the dashboard feature under src/web/features/dashboard/.\n\n- fetchDashboard() + dashboardQueryOptions with typed apiClient against /api/dashboard.\n- SummaryCards.svelte for summary stats.\n- UrgencyCard.svelte for outlet urgency rows (name, AgeBadge, distance, estimated bill).\n- DashboardPage.svelte mobile-first with summary, sorted urgent outlets, pull-to-refresh.\n- Staff gating: hide estimated bill financial fields.\n\n## Status\n- current_step: tsc & lint verified; waiting for merge\n- status: done\n
