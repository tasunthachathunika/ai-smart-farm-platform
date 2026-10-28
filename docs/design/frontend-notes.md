# Goviya Plus Frontend Architectural & Implementation Notes

## 1. Architectural Decisions & Tech Stack

### Framework & Routing
- **Next.js 14.2 (App Router):** Route grouping `(auth)` for public unauthenticated flows and `(app)` for protected authenticated application layouts.
- **Client/Server Boundary Separation:** Interactive layouts (`AppShell`, `Sidebar`, `MobileTopBar`, `MobileBottomNav`) maintain client context for auth and i18n, while routes leverage metadata, lazy chunking, and Suspense boundaries for maximum performance.
- **Role-Based Guards:** `AuthGuard` validates user roles against allowed roles on every client transition. Backend enforces database-backed authorization on every request (HTTP 401/403/404).

### State Management & Layered Services
- **Layered Architecture:** `routes/pages` → `components` → `services` (`farmService`, `shareService`, `officerService`, `adminService`) → `lib/api` (Axios client with automatic CSRF token interception and 401 handling).
- **Zustand Auth Store (`useAuthStore`):** Manages user session state, initial bootstrap check (`GET /api/auth/me`), and logout.
- **Zero Sensitive Storage:** Tokens and sessions reside in `httpOnly` cookies managed exclusively by the browser and backend. Neither JWTs nor passwords nor GPS coordinates are ever stored in `localStorage`, `sessionStorage`, cookies, query parameters, or client-side logs.

### Internationalization (i18n) Architecture
- **Supported Locales:** English (`en`), Sinhala (`si`), Tamil (`ta`).
- **Storage & Persistence:** Persistent non-sensitive cookie (`goviya_lang=en|si|ta; path=/; max-age=31536000; SameSite=Lax`).
- **Dynamic Font Switching:** Dynamic injection of Google Fonts `Noto Sans`, `Noto Sans Sinhala`, and `Noto Sans Tamil` via CSS variables (`--font-noto-sans`, `--font-noto-sans-sinhala`, `--font-noto-sans-tamil`) and root utility classes (`font-english`, `font-sinhala`, `font-tamil`).
- **Safe Fallback:** The `t(path, params)` utility implements key path traversal with graceful fallback to English dictionary values and parameter substitution.

---

## 2. Non-Negotiable Security Boundaries

### 1. GPS Privacy & Field Location Blurring (AGENTS.md Rule 4)
- **Encryption:** Exact coordinates (`latitude`, `longitude`) are encrypted using AES-256-GCM on the backend.
- **Owner-Only Visibility:** Exact coordinates are only returned to the plot owner (`farmer`).
- **Officer Blurring:** Agricultural Extension Officers only receive district-level location metadata (e.g. "Kurunegala", "Anuradhapura"). Exact GPS is never present in officer API payloads.
- **URL & Log Protection:** Exact coordinates are never placed in URLs, query strings, error messages, or telemetry logs.

### 2. Admin Privacy Boundary (AGENTS.md Rule 2)
- **Zero Farm Record Access:** System administrators have **zero** access to farm records, activity logs, input applications, harvests, or crop photos.
- **Strict Scope:** Admin UI and API are strictly restricted to user account administration (`GET /api/admin/users`, `PATCH /api/admin/users/:id/status`), officer credential verification (`GET /api/admin/officers/pending`, `POST /api/admin/officers/:id/verify`), and immutable audit metadata (`GET /api/admin/audit`).
- **Visual Privacy Banner:** Mandatory `AdminPrivacyBanner` displayed permanently across all `/admin/*` routes reminding administrators of this non-negotiable boundary.

### 3. Responsible AI Guardrails & Grounding (AGENTS.md Rule 5)
- **Informational Advisory Only:** AI assistance is strictly scoped to summarizing farmer records and generating visit briefing questions for extension officers.
- **Zero Chemical Prescriptions:** The system explicitly forbids chemical dosages, pesticide prescriptions, or autonomous agronomic decisions.
- **Mandatory Safety Disclaimer:** Permanent visual disclaimer rendered on all AI result cards with warning styling.
- **Source Record Grounding:** AI observations link directly to verified farmer records (`sourceRecordIds`).
- **Deterministic Rule-Based Fallback:** If the external LLM is unavailable or fails safety filters, a non-AI rule-based summary synthesizer provides fallback data without disruption.

---

## 3. Accessibility (a11y) & WCAG AA/AAA Compliance

- **Color Contrast:** All interactive text and UI accents maintain $\ge 4.5:1$ contrast against their backgrounds (WCAG AA) and $\ge 7:1$ for primary indicators (WCAG AAA).
- **Universal Focus Rings:** High-visibility focus indicator implemented via CSS:
  `focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`.
- **Keyboard Traps & Modals:** Modals and bottom sheets implement Tab/Shift+Tab focus trapping and Escape-key closure listeners.
- **Skip Link:** High-contrast skip-to-content link positioned at the root of `AppShell` targeting `<main id="main-content" tabIndex={-1}>`.
- **Screen Reader Support:** Decorative icons are annotated with `aria-hidden="true"`; all interactive form controls have programmatic `<label htmlFor="...">` associations.
- **Reduced Motion:** Global media query `@media (prefers-reduced-motion: reduce)` dampens all animations and transitions to $\le 0.01$ms.

---

## 4. Responsive Design & Mobile Adaptations

Tested and verified across target viewport widths: **360px**, **390px**, **768px**, **1024px**, and **1440px**.
- **No Horizontal Scroll:** Universal `overflow-x: hidden` enforced on `html` and `body`.
- **Desktop Sidebar $\leftrightarrow$ Mobile Bottom Nav:** Seamless transition from desktop collapsible 64px/256px sidebar to a fixed mobile bottom navigation bar at $< 768$px (`md` breakpoint).
- **Desktop Modals $\leftrightarrow$ Mobile Bottom Sheets:** The `Modal` component automatically adapts on mobile viewports into an accessible touch-friendly bottom sheet with handle indicator and rounded top corners (`rounded-t-2xl md:rounded-card`).
- **Table Collapse:** Responsive `Table` component displays high-density tabular records on desktop while rendering structured, touch-friendly card layouts on mobile viewports.
- **Touch Target Sizing:** All buttons, form inputs, and navigation elements meet or exceed the minimum $48 \times 48$px touch target standard.

---

## 5. Performance Optimizations & Bundle Analysis

- **Dynamic Component Chunking:** Heavy interactive modules are lazily imported using `next/dynamic` with `ssr: false`:
  - `PhotoManager` (Canvas-based client-side image compression & WebP encoding)
  - `WeatherWidget` (Open-Meteo telemetry graphs and forecast parsing)
  - Full-screen Photo Lightbox
- **Initial JS Bundle Impact:**
  - Route `/farmer/plots/[id]` First Load JS dropped from **167 kB** to **137 kB** ($\approx 18\%$ bundle size reduction).
  - Shared Vendor Chunks: `chunks/framework-*.js` (45 kB), `chunks/main-*.js` (32 kB).
  - All page bundles compile well under the recommended 200 kB budget.

---

## 6. Stubs, "Coming Soon" Elements & Known Backend Gaps

In accordance with project rules, the frontend strictly implements endpoints documented in `docs/api/openapi.yaml`. Any requested UI enhancements without backend endpoint backing are rendered with disabled states and marked as "Coming Soon":

1. **User Profile Edit & Avatar Upload:**
   - *Status:* "Coming Soon" disabled state.
   - *Reason:* No `PATCH /api/users/profile` or avatar image upload endpoint exists in `openapi.yaml`. Password changes and profile updates are awaiting Phase 4 backend implementation.
2. **Push Notifications / SMS Alerts:**
   - *Status:* Disabled stub in Settings.
   - *Reason:* Weather alert SMS/WebPush subscriptions are not yet supported in the backend API.
3. **Automated Soil Sensor IoT Integration:**
   - *Status:* Informational card placeholder.
   - *Reason:* Soil moisture and NPK telemetry endpoints are planned for hardware integration in future phases.
4. **Offline PWA Record Sync:**
   - *Status:* Informational stub.
   - *Reason:* IndexedDB offline sync and background sync worker require specialized conflict resolution endpoints not currently specified in `openapi.yaml`.
