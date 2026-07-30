---
title: Mobile-UIUX-Parity-with-Web
type: task
permalink: konsinyasi/notes/tasks/mobile-uiux-parity-with-web
---

# Mobile UI/UX Parity with Web

## Goal
Audit and update the Flutter mobile app (`mobile/lib/**`) so its UI/UX is on par with the stable web version (`src/web/**`).

## Status
- status: in_progress
- current_step: 1
- assigned_to: claude

## Steps
1. [x] Map mobile screens and compare to web screens.
2. [x] Identify visual/UX gaps (theme, layout, components, navigation, states).
3. [x] Identify functional gaps (features present on web but missing on mobile).
4. [ ] Align theme tokens and shell to web (subagent).
5. [ ] Align dashboard, PlaceCoffeePage, and master/admin pages to web (subagent).
6. [ ] Verify mobile build and Dart analysis.

## Context
Web app is considered stable and should be the reference. Mobile app uses Flutter with custom theme at `mobile/lib/config/theme.dart`. Web uses Svelte 5 + Tailwind 4 with feature-based folders. Need to align mobile to web, not the other way around.
