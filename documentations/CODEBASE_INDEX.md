# Codebase Index

Verified index of the tenant booking application in `backend/` and `frontend/`.
The platform control plane is maintained separately in `sa_backend/` and
`sa_frontend/`; it is described in `CODEBASE_OVERVIEW.md`.

## 1. Architecture At A Glance

```text
frontend (React/Vite, port 5173)
        | REST + JWT
backend (Express/ESM, port 5000)
        | Mongoose/useDb tenant resolution
MongoDB central database + tenant databases
```

- `backend/server.js` loads environment variables, configures request bodies, serves
  local images, resolves tenant context, mounts `/api`, and starts the API unless on Vercel.
- `frontend/src/main.jsx` bootstraps React and Redux; `frontend/src/App.jsx` owns
  routing, initial site-settings loading, role guards, and lazy-loaded screens.
- Tenant roles are normalized as `SUPER_ADMIN`, `ADMIN`, and `USER`. The frontend
  protects routes, but backend middleware remains the authorization boundary.

## 2. Backend

### Entry points and routing

- [backend/server.js](backend/server.js): Express application and server startup.
- [backend/routes/index.js](backend/routes/index.js): mounts all tenant API routers below `/api`.

Mounted route groups:

| API path | Router | Responsibility |
| --- | --- | --- |
| `/api/auth` | [backend/routes/auth.js](backend/routes/auth.js) | Sign-in, password recovery, reset |
| `/api/admin` | [backend/routes/createadmin.js](backend/routes/createadmin.js), [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js) | Admin management and dashboard summaries |
| `/api/hotel-admin` | [backend/routes/hotelAdminRoutes.js](backend/routes/hotelAdminRoutes.js) | Hotel-admin scoped operations |
| `/api/guesthouses` | [backend/routes/guestHouseRoutes.js](backend/routes/guestHouseRoutes.js) | Guest-house CRUD |
| `/api/rooms` | [backend/routes/roomRoutes.js](backend/routes/roomRoutes.js) | Room CRUD |
| `/api/beds` | [backend/routes/bedRoutes.js](backend/routes/bedRoutes.js) | Bed CRUD and availability |
| `/api/dynamic-pricing` | [backend/routes/dynamicPricingRoutes.js](backend/routes/dynamicPricingRoutes.js) | Dynamic pricing rules |
| `/api/bookings` | [backend/routes/bookingRoutes.js](backend/routes/bookingRoutes.js) | Booking, availability, calendar, approval, export |
| `/api/capture-session` | [backend/routes/captureSessionRoutes.js](backend/routes/captureSessionRoutes.js) | Mobile capture sessions |
| `/api/users` | [backend/routes/userRoute.js](backend/routes/userRoute.js) | User administration and profiles |
| `/api/contact` | [backend/routes/contactRoutes.js](backend/routes/contactRoutes.js) | Contact submissions |
| `/api/reports` | [backend/reports/routes/reportRoutes.js](backend/reports/routes/reportRoutes.js) | Report filters and downloads |
| `/api/taxes` | [backend/routes/taxRoutes.js](backend/routes/taxRoutes.js) | Tax configuration |
| `/api/payments` | [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js) | Payment operations |
| `/api/tenants` | [backend/routes/tenantRoutes.js](backend/routes/tenantRoutes.js) | Tenant operations |
| `/api/subscription` | [backend/routes/subscriptionRoutes.js](backend/routes/subscriptionRoutes.js) | Subscription limits and status |
| `/api/settings` | [backend/routes/settingsRoutes.js](backend/routes/settingsRoutes.js) | Site and hotel settings |
| `/api/audit-logs` | [backend/routes/auditLogRoutes.js](backend/routes/auditLogRoutes.js) | Audit history |

### Business logic

Controllers are in [backend/controller](backend/controller):

- `authController.js`: authentication and password flows.
- `adminController.js`, `hotelAdminController.js`: dashboards and scoped admin workflows.
- `guestHouseController.js`, `roomController.js`, `bedController.js`: inventory hierarchy.
- `bookingController.js`: booking lifecycle, availability, calendar, and exports.
- `paymentController.js`, `taxController.js`, `subscriptionController.js`: billing and limits.
- `dynamicPricingController.js`, `settingsController.js`: pricing and configuration.
- `userController.js`, `tenantController.js`: account and tenant administration.
- `auditLogController.js`, `contactController.js`, `captureSessionController.js`: supporting workflows.

### Data and infrastructure

- [backend/models/centralModels](backend/models/centralModels): central tenant registry models.
- [backend/models/tenantModels](backend/models/tenantModels): tenant-scoped models for users,
  guest houses, rooms, beds, bookings, payments, invoices, taxes, audit logs, counters,
  configuration, bed configuration, and dynamic pricing.
- [backend/models](backend/models): legacy/shared model locations still present in the repository.
- [backend/config](backend/config): MongoDB connections and tenant database management,
  Redis, subscription limits, and deletion helpers.
- [backend/middlewares](backend/middlewares): JWT/tenant context, hotel-admin scope,
  capture-session auth, image uploads, rate limiting, and subscription checks.
- [backend/utils](backend/utils): JWT, roles, email, S3, audit, tenant seeding, IDs,
  WhatsApp, and other integrations.
- [backend/validators](backend/validators): request validation schemas.
- [backend/queues](backend/queues): BullMQ email queue.
- [backend/images](backend/images): local image storage fallback.

### Reports

[backend/reports](backend/reports) is a separate reporting module:

- `routes/`: report API router.
- `controllers/`, `services/`, `repositories/`: request, business, and data-access layers.
- `aggregations/`: booking-by-guest-house, monthly revenue, and payment-method reports.
- `pdf/`: PDF generator, image source handling, and invoice/report templates.
- `constants/`: report registry and supported report definitions.

## 3. Frontend

### Application shell

- [frontend/src/main.jsx](frontend/src/main.jsx): React root and Redux provider.
- [frontend/src/App.jsx](frontend/src/App.jsx): router, role-protected layouts, public pages,
  site-settings synchronization, and lazy imports.
- [frontend/src/index.css](frontend/src/index.css): global styles.
- [frontend/src/utils/api.js](frontend/src/utils/api.js): Axios client and request auth.
- [frontend/src/utils/auth.js](frontend/src/utils/auth.js): token, role, and redirect helpers.
- [frontend/src/utils/lazyLoad.js](frontend/src/utils/lazyLoad.js): route-level lazy loading.

### Route map

Public routes include `/`, `/signin`, `/login` redirect, `/signup` redirect,
`/forgot-password`, `/reset-password`, `/about`, `/contact`, `/terms`, `/faq`,
`/capture`, `/capture/:token`, and `/checkout` redirect.

Authenticated user routes include `/profile`; legacy `/dashboard`, `/booking`, and
`/my-bookings` redirect into the admin experience.

Admin routes include `/admin/dashboard`, `/admin/book-room`, `/admin/guest-house-bookings`,
`/admin/payment`, `/admin/checkout`, `/admin/invoice`, `/admin/receipts`,
`/admin/invoice-list`, `/admin/user-profiles`, `/admin/reports`, and
`/admin/dynamic-pricing/:hotelId`.

Super-admin routes include `/super-admin/dashboard`, `/super-admin/users`,
`/super-admin/hotel`, `/super-admin/guesthouses` redirect, `/super-admin/add-hotel`,
`/super-admin/rooms`, `/super-admin/beds`, `/super-admin/audits`, `/super-admin/bookings`,
`/super-admin/reports`, `/super-admin/settings`, `/super-admin/taxes`, and
`/super-admin/dynamic-pricing/:hotelId`.

Dedicated hotel-admin routes include `/hotel-admin/dashboard`, `/hotel-admin/bookings`,
`/hotel-admin/rooms`, `/hotel-admin/beds`, `/hotel-admin/invoices`,
`/hotel-admin/receipts`, `/hotel-admin/reports`, and `/hotel-admin/configuration`.

### Feature directories

- [frontend/src/admin](frontend/src/admin): admin and super-admin pages, layout components,
  route guards, styles, utilities, charts, reports, invoices, taxes, and inventory management.
- [frontend/src/hotel_admin](frontend/src/hotel_admin): dedicated hotel-admin layout,
  dashboard, booking, configuration, styles, utilities, and scoped route guard.
- [frontend/src/users](frontend/src/users): login, password recovery, profile, legacy
  booking/dashboard pages, public user components, and route guards.
- [frontend/src/commonPages](frontend/src/commonPages): about, contact, FAQ, terms, and capture pages.
- [frontend/src/components](frontend/src/components): shared loader, navigation, scroll,
  not-found, and common UI components.
- [frontend/src/common](frontend/src/common): shared icons, payment methods, months,
  widget configuration, and report configuration.
- [frontend/src/redux](frontend/src/redux): auth, guest-house, hotel-admin, site-settings
  slices and the Redux store.
- [frontend/src/styles](frontend/src/styles): shared/page styling.
- [frontend/src/assets](frontend/src/assets): bundled frontend assets.

## 4. State, Auth, And Data Flow

1. `App.jsx` requests `/api/settings` and stores site settings in Redux.
2. Login stores the JWT and user data through the auth slice/helpers.
3. `ProtectedRoute` handles authenticated user pages; `ProtectedAdminRoute` handles
   admin and hotel-admin shells.
4. `api.js` sends API requests with the JWT; backend tenant middleware resolves context
   and authorization before controllers access tenant models.
5. Booking and payment screens use availability, booking, payment, invoice, receipt,
   and report endpoints.

## 5. Quick Start

```text
Backend:  cd backend  && npm install  && npm run dev
Frontend: cd frontend && npm install  && npm run dev
```

The backend defaults to port `5000`; Vite defaults to port `5173`. The root
`startServer.bat` launches the two applications in separate terminals.

## 6. Reading Order

1. [backend/server.js](backend/server.js)
2. [backend/routes/index.js](backend/routes/index.js)
3. [backend/middlewares/auth.js](backend/middlewares/auth.js)
4. [backend/controller/authController.js](backend/controller/authController.js)
5. [backend/controller/bookingController.js](backend/controller/bookingController.js)
6. [frontend/src/main.jsx](frontend/src/main.jsx)
7. [frontend/src/App.jsx](frontend/src/App.jsx)
8. [frontend/src/utils/api.js](frontend/src/utils/api.js)
9. [frontend/src/redux/store.js](frontend/src/redux/store.js)

## 7. Indexing Notes

- Refreshed against the current route and source directories on September 9, 2026.
- `CODEBASE_OVERVIEW.md` remains the deeper architecture and workflow reference.
- `sa_backend/` and `sa_frontend/` form the platform control plane and are referenced there.
