---
name: Konsi
description: Warm, disciplined, and field-practical web design system for consignment operations in warungs.
colors:
  susu-segar: "#f7f3eb"
  latte-foam: "#fff8e7"
  karamel-aksen: "#c69c6d"
  espresso: "#5d4037"
  kopi-tubruk: "#4e342e"
  kopi-intens: "#3e2723"
  kopi-dasar: "#2b1810"
  hijau-segar: "#16a34a"
  kuning-peringatan: "#d97706"
  merah-bahaya: "#dc2626"
  biru-info: "#2563eb"
  hijau-latar-halus: "#f0fdf4"
  kuning-latar-halus: "#fffbeb"
  merah-latar-halus: "#fef2f2"
  biru-latar-halus: "#eff6ff"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "0.375rem"
  lg: "0.75rem"
  xl: "1rem"
  "2xl": "1.5rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  "2xl": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.kopi-tubruk}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "0.625rem 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.kopi-intens}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
  button-secondary:
    backgroundColor: "{colors.latte-foam}"
    textColor: "{colors.kopi-tubruk}"
    rounded: "{rounded.xl}"
    padding: "0.625rem 1rem"
    height: "2.75rem"
  card-default:
    backgroundColor: "{colors.latte-foam}"
    textColor: "{colors.kopi-intens}"
    rounded: "{rounded.2xl}"
    padding: "1rem"
  card-dashboard:
    backgroundColor: "#fff7ed"
    textColor: "{colors.kopi-intens}"
    rounded: "{rounded.2xl}"
    padding: "1rem"
  nav-item-active:
    backgroundColor: "{colors.espresso}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
  input:
    backgroundColor: "{colors.latte-foam}"
    textColor: "{colors.kopi-intens}"
    rounded: "{rounded.xl}"
    height: "2.75rem"
---

# Design System: Konsi

## Overview

**Creative North Star: "The Warung Field Desk"**

Konsi is a warm, disciplined, and field-practical web interface built for consignment operations in warungs. The design feels like a dependable task desk carried into the field: it values clarity, direct action, and honest operational signals more than ornament or theatrics.

The visual personality stays calm and structured, but not cold. Coffee browns, creamy surfaces, and soft card layering keep the experience approachable, while role-aware navigation and constrained interactions keep it operationally serious. Every major surface is oriented around smartphone use first, especially for staff completing visit, outlet, and product tasks on the road.

The system is deliberately restrained. Color is used for brand continuity and operational status, not decoration. Spacing is generous enough to remain legible under pressure, but tight enough to keep a complete workflow visible without unnecessary scrolling.

**Key Characteristics:**
- Smartphone-first shell with compact top chrome and persistent bottom navigation on mobile.
- Warm coffee/cream palette with clear semantic signaling for success, warning, danger, and info states.
- Soft card-based hierarchy instead of heavy layering or decorative visual flourishes.
- Role-aware interface that shows owners financial and administrative context while protecting staff from sensitive cost, margin, and override controls.
- Direct field copy in Bahasa Indonesia, paired with iconography that reinforces urgency, location, action, and submission state.

## Colors

The palette is practical and brand-aligned: a warm coffee and cream surface language, one operational accent, and clearly separated semantic status tones.

### Primary

- **Espresso** (#5d4037): The stronger of the two primary browns, used for active chrome, selected tabs, selected navigation items, and emphasis in compact controls.
- **Kopi Tubruk** (#4e342e): The main action brown for primary buttons, prominent interactive controls, and owner chrome branding. It anchors the interface without becoming decorative.

### Neutral

- **Susu Segar** (#f7f3eb): The app background and default milk-tone surface behind content regions.
- **Latte Foam** (#fff8e7): Card, sheet, dialog, top bar, and bottom nav surfaces. This is the main resting surface color.
- **Kopi Intens** (#3e2723): Dark headings, strong body text, and high-emphasis foreground use.
- **Kopi Dasar** (#2b1810): Reserved dark tone for extreme contrast, dark overlays, and mode inversion when needed.
- **Coffee scale** (#efebe9 to #2b1810): Used across borders, subtle fills, skeleton placeholders, subdued icons, secondary text, and gradient branding tiles.

### Status

- **Hijau Segar** (#16a34a): Success confirmation, safe urgency, valid visit status, online recovery messaging, and success toasts.
- **Kuning Peringatan** (#d97706): Approaching urgency, offline banners, poor-GPS warnings, owner override caution, and warning feedback.
- **Merah Bahaya** (#dc2626): Critical urgency, invalid quantity equations, missing required submission state, geofence violations, destructive actions, and error feedback.
- **Biru Info** (#2563eb): Informational toast state and neutral informational feedback.

### Named Rules

**The Status Speaks First Rule.** Semantic status colors are reserved for operational truth. They must not be repurposed as decorative accent or brand chrome.

**The One Accent Rule.** Interface energy stays focused on status and action. The coffee family carries brand identity; semantic colors carry operational meaning; neither becomes visual noise.

## Typography

**Display Font:** 'Plus Jakarta Sans' with system-ui, -apple-system, and sans-serif fallback.

**Body Font:** 'Plus Jakarta Sans' with the same fallback stack.

**Label/Mono Font:** The interface primarily uses 'Plus Jakarta Sans'. Monospace appears only in rare technical contexts such as coordinate readouts.

**Character:** The type pairing is warm, legible, and utilitarian. It supports operational scanning rather than editorial drama.

### Hierarchy

- **Display** (700, 1.5rem, 1.2): Used for page titles such as the login heading and main page headers.
- **Headline** (700, 1.25rem, 1.3): Used for section-level emphasis in dashboards and key summaries.
- **Title** (700, 1rem, 1.4): Used for card headings, form section titles, and sheet titles.
- **Body** (400, 1rem, 1.5): The default readable text size; also the minimum editable text size to avoid mobile zoom.
- **Label** (600, 0.75rem, 1.3): Used for metadata, field hints, status subtitles, counts, and secondary labels.

### Named Rules

**The 16px Minimum Rule.** Editable inputs and primary field text use at least 1rem to keep the interface mobile-safe and avoid unwanted iOS zoom.

## Layout

The layout model is a single-column mobile shell wrapped around a centered content container. On smartphones, the app uses a sticky top bar, scrollable content area, and fixed bottom navigation. On larger screens, the owner shell adds a persistent desktop rail while the main content remains centered with clear max-width constraints.

Content pages typically follow a predictable rhythm: compact header, optional filter/search control, card-based content stack, and bottom safe-area padding for persistent chrome. Lists, dashboards, and reports rely on vertical stacking rather than multi-column sprawl.

The primary spacing model uses a consistent vertical rhythm with generous separation between cards and sections, but tighter internal padding inside controls and cards. This keeps the field interface breathable without wasting vertical space unnecessarily.

## Elevation & Depth

Konsi uses mostly soft card shadows for separation, with tonal surface layering underneath. The interface is intentionally calm rather than dramatic; depth is expressed through subtle shadow lifts and distinct surface tones rather than heavy drop shadows everywhere.

At rest, surfaces are mostly flat with border and background differentiation. Elevated elements such as dialogs, sheets, and floating toasts use stronger shadow treatment to communicate layering above the base interface.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 3px 0 rgb(62 39 35 / 0.08), 0 1px 2px -1px rgb(62 39 35 / 0.08)`): Default lift for cards and contained content blocks.
- **Float** (`box-shadow: 0 10px 15px -3px rgb(62 39 35 / 0.1), 0 4px 6px -4px rgb(62 39 35 / 0.1)`): Stronger elevation for dialogs, floating toasts, and prominent overlays.
- **Header blur** (backdrop blur with translucent cream): Used on sticky mobile headers to separate chrome from content without adding an opaque wall.

### Named Rules

**The Flat-By-Default Rule.** Screens stay visually flat unless elevation is needed for state or layering. Shadows support interaction and hierarchy; they are not decorative texture.

## Shapes

The form language is rounded, tactile, and container-friendly. Buttons, inputs, tabs, cards, sheets, dialogs, badges, and nav items all use generous corner radius to feel approachable and touch-safe on mobile.

Container components lean toward large rounding, while inner controls use slightly tighter corners. This creates a soft but legible hierarchy: big surfaces feel like containers, and smaller controls feel like embedded field elements rather than sharp widgets.

## Components

### Buttons

- **Shape:** Rounded-xl (`1rem`), with full-width treatment common on primary field actions.
- **Primary:** Kopi Tubruk background with white text, padded for comfortable tapping, with visible press feedback and a 44px minimum height.
- **Hover / Focus:** Hover darkens toward Kopi Intens; focus uses visible ring styling to keep keyboard navigation usable.
- **Secondary / Ghost / Destructive / Success:** Secondary uses cream-bordered styling; ghost buttons become transparent with hover fills; destructive and success states use their semantic colors with matching hover intensity.

### Chips

- **Style:** Small rounded pill shapes used for status, urgency, age, and contextual labels.
- **State:** Status chips pair soft semantic backgrounds with matching foreground tones; urgency labels can use stronger solid tones when the field needs faster recognition.

### Cards / Containers

- **Corner Style:** Large rounding (2xl), with cream background and soft card shadow by default.
- **Variants:** Domain-colored card variants exist for dashboard, visit, outlet, master, product, and raw-material sections. These provide gentle tonal context without changing the card structure.
- **Usage:** Cards are the main container for summaries, list items, forms, breakdowns, and operational modules.

### Tabs

- **Shape:** Rounded segmented container with pill-shaped active item.
- **Color assignment:** Active tab uses Espresso brown with white text; inactive tabs stay subdued with hover fill.
- **Behavior:** Tabs are used for role and section switching, not deep navigation.

### Nav (Bottom and Desktop Rail)

- **Shape:** Fixed bottom strip on mobile; persistent sidebar on large screens.
- **Color assignment:** Active destination uses Espresso brown with white text; inactive destinations use subdued coffee tones with hover feedback.
- **Behavior:** Navigation uses real link semantics with visible active-page indication. Bottom navigation is hidden on login and certain owner chrome states when it would compete with the shell.

### Input / TextArea / Select

- **Shape:** Rounded-xl fields with top-aligned label, helper text, and validation message.
- **Color assignment:** Fields rest on cream surface with coffee-tone borders; errors switch to danger background and border treatment.
- **Behavior:** Labels are explicitly associated with inputs; invalid states use both text and border/background signaling.

### Sheets / Dialogs

- **Shape:** Bottom sheets on mobile with rounded top corners; centered dialogs on small and larger viewports with large corner rounding.
- **Color assignment:** Latte Foam background with coffee borders and shadow lift.
- **Behavior:** Sheets support swipe-to-dismiss where applicable, trap focus, and include explicit close controls. Confirm dialogs present clear primary/secondary action separation.

### Toasts

- **Style:** Small floating message blocks with semantic background, border, icon, and optional title.
- **State:** Success, error, warning, and info use distinct semantic palettes; error messages stay persistent rather than auto-dismissing prematurely.

### Loading, Empty, Error

- **Loading:** Pulse skeletons use coffee-tone fills to avoid visual jarring while content loads.
- **Empty:** Centered empty states use rounded icon containers, clear titles, secondary description copy, and optional primary action buttons.
- **Error:** Error states repeat the same centered layout with danger styling and a visible retry control.

## Do's and Don'ts

- **Do** use 1rem as the minimum editable text size for mobile safety.
- **Do** keep semantic colors tied to real operational meaning.
- **Do** preserve real link semantics and visible active-page indicators in navigation.
- **Do** maintain at least 44px minimum interactive size for critical controls.
- **Do** keep status signaling visible through text, icon, or container treatment rather than color alone.
- **Do** preserve role-aware separation between staff-facing and owner-facing information.

- **Do not** shrink editable inputs below 16px.
- **Do not** use semantic status colors as decorative brand accents.
- **Do not** rely on hover alone for primary field interactions.
- **Do not** expose sensitive cost, margin, override, or administration controls to staff-facing surfaces.
- **Do not** replace the current operational vocabulary with generic commerce language unless the product direction explicitly changes.
