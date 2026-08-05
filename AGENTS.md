# AGENTS.md — Konsi Project Rules

## Deploy Gate: Wajib Fix Warning & Error

**Sebelum `wrangler deploy`, WAJIB:**

1. **Build tanpa error:**
   ```bash
   npx vite build 2>&1 | grep -E "error|failed"
   ```
   Jika ada error, fix dulu sebelum deploy.

2. **Fix semua warning Svelte:**
   ```bash
   npx vite build 2>&1 | grep -E "warning|deprecated|implicitly|must have"
   ```
   Warning yang wajib fix:
   - `implicitly closed` — tambah `</div>` yang missing
   - `deprecated` — update syntax ke versi terbaru
   - `must have an ARIA role` — tambah `role` attribute
   - `must be accompanied by a keyboard event handler` — tambah `onkeydown`
   - `Attribute shorthand cannot be empty` — fix syntax

3. **Run detector:**
   ```bash
   node /home/ricki/.pi/agent/skills/impeccable/scripts/detect.mjs --json src/web/
   ```
   Pastikan 0 findings untuk `design-system-font-size`.

4. **Deploy hanya jika semua bersih:**
   ```bash
   npx wrangler deploy
   ```

## Checklist Pre-Deploy

```bash
# 1. Build check
npx vite build 2>&1

# 2. Warning check
npx vite build 2>&1 | grep -c "warning"
# Target: 0

# 3. Font-size violations
node /home/ricki/.pi/agent/skills/impeccable/scripts/detect.mjs --json src/web/ | grep -c "design-system-font-size"
# Target: 0

# 4. Deploy
npx wrangler deploy
```

## Design System Rules

### Typography (DESIGN.md)
Gunakan HANYA ukuran ini:
- `text-xs` (0.75rem / 12px) — Label, metadata
- `text-sm` (0.875rem / 14px) — Subtitle, secondary
- `text-base` (1rem / 16px) — Body, minimum input size
- `text-lg` (1.25rem / 20px) — Headline
- `text-xl` (1.5rem / 24px) — Display

**DILARANG:** `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[9px]`

### Accessibility
- Semua `<div>` dengan `onclick` WAJIB punya:
  - `onkeydown` handler
  - `role="button"` atau `role="dialog"`
  - `tabindex` jika perlu
- Modal/dialog WAJIB punya:
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-label` atau `aria-labelledby`

### Responsive Layout
- Mobile: `max-w-3xl` (768px)
- Desktop: `lg:max-w-5xl` (1024px)
- Sidebar: `lg:flex` (1024px+)

## Commit Message Format

```
<type>: <description>

Types:
- fix: bug fix
- feat: new feature
- style: formatting, missing semi colons, etc
- refactor: code change that neither fixes a bug nor adds a feature
- docs: documentation
- test: adding tests
- chore: maintenance
```

## Quick Commands

```bash
# Dev
npm run dev

# Build
npx vite build

# Deploy
npx wrangler deploy

# Check warnings
npx vite build 2>&1 | grep -E "warning|deprecated|implicitly"

# Check font violations
node /home/ricki/.pi/agent/skills/impeccable/scripts/detect.mjs --json src/web/
```
