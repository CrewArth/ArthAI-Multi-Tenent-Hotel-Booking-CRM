# Implementation Prompt: Route Architecture Refactor (`frontend/src`)

## Context

This is the **Rishabh Guest House Booking System** frontend — a multi-tenant MERN
hotel/guest house CRM (React 19, Redux Toolkit, React Router). Currently all
routing lives inline in `src/App.jsx`: ~30 lazy imports, hardcoded path strings,
and JSX route definitions all in one file. This has become hard to extend safely
— path strings are duplicated between `App.jsx` and the sidebar/nav components,
there is no single guard that checks a route's *required role* (only whether the
user is authenticated as *some* kind of admin), and there's no recovery path
when a lazy chunk fails to load after a deploy.

Your job is to refactor routing into a small, data-driven module under
`src/common/routes/`, without changing any page behavior, without renaming
existing page components, and without breaking any existing imports of
`App.jsx` from elsewhere in the app (e.g. `main.jsx`).

## Step 0 — Index the codebase first. Do not skip this.

Before writing or moving anything, build an accurate picture of the current
frontend. Specifically:

1. Print the full `src/` tree (2–3 levels deep) so you have the real folder
   names — do not assume `common/`, `admin/`, `hotel_admin/`, `users/`,
   `commonPages/`, `utils/`, `redux/`, `components/` are structured the way this
   prompt assumes. Confirm actual casing and pluralization (e.g. `commonPages`
   vs `common-pages`) before using them in import paths.
2. Open and read the current `src/App.jsx` in full — it is the source of truth
   for every path string, every lazy import, and every route nesting
   relationship (which routes sit inside `ProtectedAdminRoute` wrapping
   `AdminDashboard` vs `HotelAdminLayout`). Do not work from memory of a prior
   version.
3. Open `src/utils/roles.js` (or wherever role constants/normalization lives)
   and confirm the exact exported names — the guard component you write must
   import the real constant names, not guessed ones (`ROLES.ADMIN`,
   `ROLES.SUPER_ADMIN`, etc. are placeholders until confirmed).
4. Open `src/users/routes/ProtectedRoute.jsx` and
   `src/admin/routes/ProtectedAdminRoute.jsx` and read what they actually check
   today (token presence? role? both?). Your new `RoleGuard` sits *inside* these,
   adding a role check — it must not duplicate or conflict with what they
   already do.
5. Search the repo (`grep -R` or equivalent) for every place a route path
   string like `/admin/`, `/super-admin/`, `/hotel-admin/` is hardcoded outside
   `App.jsx` — sidebar/nav components, breadcrumb components, any
   `navigate('/...')` or `<Link to="/...">` calls. List every file you find.
   These are candidates to migrate onto the new `PATHS` constants in a later
   pass, but for *this* task, only note them — do not edit unrelated files
   unless a path changes.
6. Confirm how the current user's role is available in Redux state (the exact
   slice/selector shape) so `RoleGuard` reads real state, not a guessed shape
   like `state.auth.user.role`.
7. Confirm the exact export shape of each lazy-loaded page — some use
   `export default`, and at least `DynamicPricingPage` and the `HotelAdmin*`
   pages use named exports accessed via `.then(m => ({ default: m.X }))`.
   Preserve each page's actual export style exactly; do not assume default
   exports uniformly.

Only proceed to implementation once you can state, in your own words, the
current route tree and the current export shape of every page component.

## Step 1 — Create the new route module

Create these files under `src/common/routes/` (adjust the folder name if Step
0 revealed a different actual path):

- `paths.js` — a single nested object of every route path as a named constant.
  Include a `dynamicPricing(hotelId)` helper function for both `admin` and
  `superAdmin` variants (defaulting the param to `:hotelId` so it still works
  unparameterized inside `<Route path={...}>`).
- `lazyComponents.js` — every `lazyLoad(() => import(...))` call currently
  inline in `App.jsx`, moved here verbatim (same import paths, same `.then()`
  reshaping where it exists today), exported as named exports. This file is
  the *only* place lazy imports for routed pages are declared.
- `routeConfig.js` — arrays of `{ path, Component, roles }` objects, grouped as
  `publicRoutes`, `adminSuperAdminRoutes`, `hotelAdminRoutes`, built from
  `paths.js` and `lazyComponents.js`. Attach the correct `roles` array to each
  entry based on which section it currently sits under in `App.jsx`
  (`/admin/*` → both admin roles; `/super-admin/*` → super-admin only;
  `/hotel-admin/*` → leave `roles` undefined for now unless Step 0 revealed an
  existing hotel-admin-specific role).
- `RoleGuard.jsx` — reads the current user's role from Redux (using the real
  selector confirmed in Step 0) and renders `children` if `roles` is undefined
  or includes the user's role; otherwise redirects to `PATHS.admin.dashboard`.
- `RootRedirect.jsx` — same logic as the current inline `RootRedirect` in
  `App.jsx`, moved to module scope, importing `LoginPage` from
  `lazyComponents.js`.

Update `src/utils/lazyLoad.js` to add retry-then-reload behavior for failed
chunk loads (2 retries, ~800ms apart, then `window.location.reload()`) — this
handles the case where a deploy rotates chunk hashes while a tab is open. Keep
its exported signature (`lazyLoad(importFn)`) backward compatible so nothing
else calling it needs to change.

## Step 2 — Rewrite `App.jsx`

Replace the inline imports and JSX routes with:
- imports from `./common/routes/paths`, `./routeConfig`, `./lazyComponents`,
  `./RoleGuard`, `./RootRedirect`
- the settings-sync `useEffect` stays in `App.jsx` for now (do not extract it
  into a separate hook in this pass — keep this refactor scoped to routing)
- routes rendered via `.map()` over each `routeConfig.js` array, using `path`
  as the React `key`
- preserve every existing redirect (`/signup` → `/signin`, `/checkout` →
  `/admin/checkout`, `/dashboard` → `/admin/dashboard`, `/booking` →
  `/admin/book-room`, `/my-bookings` → `/admin/dashboard`,
  `/super-admin/guesthouses` → `/super-admin/hotel`) using `PATHS` constants
  instead of string literals
- preserve the exact nesting: `adminSuperAdminRoutes` render as children of
  `<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>`;
  `hotelAdminRoutes` render as children of
  `<ProtectedAdminRoute><HotelAdminLayout /></ProtectedAdminRoute>`
- `/profile` stays wrapped in `<ProtectedRoute>`, not `RoleGuard`
- keep the existing `<Suspense>` fallback UI, `<ScrollToTop />`, and
  `<ToastContainer>` config exactly as they are today

## Step 3 — Verify, don't assume

After writing the new files:

1. Run the frontend dev server (or build) and confirm it compiles with no
   import errors.
2. Manually trace at least one route from each group end-to-end in the code
   (not just visually) — e.g. confirm `/super-admin/settings` resolves to
   `Settings` wrapped in `RoleGuard(roles: [SUPER_ADMIN])` wrapped in
   `ProtectedAdminRoute(AdminDashboard)`.
3. Confirm every path string that existed in the old `App.jsx` still exists
   somewhere in `paths.js` — do a side-by-side diff of old hardcoded strings
   vs new `PATHS` object, and flag anything missing rather than silently
   dropping a route.
4. Confirm no page component's lazy import path changed relative to its
   original location — a wrong relative path (e.g. `../../` vs `../../../`
   after moving into `common/routes/`) is the most likely bug here, so check
   each import resolves to the same file as before.
5. List, in your final summary, exactly which files you created, which single
   file you modified (`App.jsx`) and which file you enhanced
   (`utils/lazyLoad.js`) — and confirm you touched nothing else.

## Explicit non-goals for this pass

- Do not migrate the sidebar/nav components found in Step 0.5 onto `PATHS`
  yet — just report where they are.
- Do not add role scoping to `hotel-admin` routes unless Step 0 shows an
  existing role for that layer.
- Do not extract the settings-sync effect out of `App.jsx`.
- Do not rename any existing page component or change any page's internal
  behavior — this is a routing-layer refactor only.