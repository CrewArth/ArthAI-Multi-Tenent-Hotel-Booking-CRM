# ArthAI Hotel CRM System - Complete Codebase Overview

> **Purpose of this document:** Feed this file to any AI assistant to give it full context about the project — architecture, directories, data models, API surface, auth flow, roles, and workflows — without needing to re-explore the repo.

**Last indexed:** August 24, 2026  
**Repository root:** `RishabhGuestHouseBooking/`  
**Primary stack:** MERN (MongoDB, Express 5, React 19, Node.js)  
**License:** ISC

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Repository Layout](#3-repository-layout)
4. [Applications & Ports](#4-applications--ports)
5. [Multi-Tenant Architecture](#5-multi-tenant-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Backend — Complete Index](#7-backend--complete-index)
8. [Frontend — Complete Index](#8-frontend--complete-index)
9. [Super Admin Control Plane (sa_backend + sa_frontend)](#9-super-admin-control-plane-sa_backend--sa_frontend)
10. [Data Models & Schemas](#10-data-models--schemas)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Key Business Workflows](#12-key-business-workflows)
13. [Reports & PDF Generation](#13-reports--pdf-generation)
14. [External Integrations](#14-external-integrations)
15. [Environment Variables](#15-environment-variables)
16. [Scripts & Utilities](#16-scripts--utilities)
17. [Deployment](#17-deployment)
18. [Existing Documentation Files](#18-existing-documentation-files)
19. [Key Files to Read First](#19-key-files-to-read-first)
20. [Run Commands](#20-run-commands)
21. [Known Conventions & Gotchas](#21-known-conventions--gotchas)

---

## 1. Executive Summary

This is an **enterprise-grade Guest House / Hotel CRM and booking system** evolved from a single-tenant MERN app into a **multi-tenant SaaS platform**.

### What it does

| Actor                                                   | Capabilities                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Platform Super Admin** (`sa_backend` / `sa_frontend`) | Provision new hotel tenants, manage subscription plans, view platform-wide stats                                |
| **Tenant Super Admin** (`SUPER_ADMIN` role)             | Full CRUD on guest houses, rooms, beds, bookings, users, taxes, reports, audit logs, site settings              |
| **Tenant Admin** (`ADMIN` role)                         | Book rooms, manage guest-house bookings, payments, invoices, receipts, reports (scoped to assigned guest house) |
| **Guest / User** (`USER` role)                          | Profile management, booking (legacy user routes largely redirect to admin panel now)                            |

### Core domain entities

`Tenant → GuestHouse → Room → Bed → Booking → Payment → Invoice → Tax → AuditLog`

### Evolution status

- **Phase 1 (done):** RBAC, login-as-home, admin/super-admin split, backend refactor
- **Multi-tenant (done):** Database-per-tenant on single MongoDB cluster via `useDb()`
- **Subscription limits:** Basic / Pro / Enterprise tiers cap hotels, rooms, admins
- **Payments & billing:** Checkout, outstanding receipts, invoice PDFs
- **Reports:** Booking, revenue, payment-method PDF reports

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                         GUEST HOUSE BOOKING ECOSYSTEM                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +------------------+    +------------------+    +-----------------------------+  |
|  |   sa_frontend    |    |    frontend      |    |   (legacy user pages exist  |  |
|  | Platform SA UI   |    | Tenant CRM UI    |    |    but routes redirect)     |  |
|  | React + Vite     |    | React 19 + Vite  |    |                             |  |
|  | Port: 5174*      |    | Port: 5173       |    |                             |  |
|  +--------+---------+    +--------+---------+    +-----------------------------+  |
|           |                       |                                               |
|           | REST                  | REST (+ JWT Bearer)                           |
|           v                       v                                               |
|  +------------------+    +--------------------------------------------------+    |
|  |   sa_backend     |    |              backend (Tenant Data Plane)          |    |
|  | Control Plane    |    |  Express 5 + Dynamic Tenant DB Resolution         |    |
|  | Port: 5002       |    |  Port: 5000 (or PORT_NUMBER env)                  |    |
|  +--------+---------+    +------------------------+-------------------------+    |
|           |                                         |                             |
|           v                                         v                             |
|  +------------------+              +--------------+--------------+              |
|  | Central MongoDB  |              |  Tenant DB Pool (useDb)     |              |
|  | guesthouse_central|             |  gh_tenant_<slug> / guesthouses|            |
|  | - tenants        |              |  - GuestHouses, Rooms, Beds  |              |
|  | - sa_users       |              |  - Bookings, Payments, Users |              |
|  +------------------+              +------------------------------+              |
|                                                                                   |
|  External: AWS S3 (per-tenant images), Gmail SMTP, Twilio WhatsApp               |
+-----------------------------------------------------------------------------------+
```

sa_frontend port depends on Vite config; backend defaults to 5002.

---

## 3. Repository Layout

```
RishabhGuestHouseBooking/
├── backend/                    # Main tenant API (Express 5, ESM)
│   ├── config/                 # DB connection, subscription limits
│   ├── controller/             # Business logic (13 controllers)
│   ├── middlewares/            # auth, imageUpload, subscription
│   ├── models/
│   │   ├── centralModels/      # Tenant registry (central DB)
│   │   └── tenantModels/       # Per-tenant schemas (10 models)
│   ├── reports/                # Report module (routes, services, PDF)
│   ├── routes/                 # API route definitions
│   ├── scripts/                # Migration, seed, test scripts
│   ├── utils/                  # JWT, email, S3, audit, WhatsApp
│   ├── validators/             # Joi schemas
│   ├── images/                 # Local static uploads (fallback)
│   └── server.js               # Entry point
│
├── frontend/                   # Tenant CRM React app
│   ├── src/
│   │   ├── admin/              # Admin + Super Admin UI
│   │   ├── users/              # Login, profile, legacy user pages
│   │   ├── commonPages/        # About, Contact, FAQ, Terms
│   │   ├── common/             # Shared configs (widgets, reports, icons)
│   │   ├── components/         # Shared UI (Navbar, Footer, etc.)
│   │   ├── redux/              # Redux Toolkit store + slices
│   │   └── utils/              # api.js, auth.js, lazyLoad
│   ├── public/                 # Static assets, favicons
│   └── vite.config.js
│
├── sa_backend/                 # Platform control plane API
│   ├── config/db.js            # Central DB + tenant DB helpers
│   ├── controllers/            # SA auth + tenant provisioning
│   ├── middlewares/saAuth.js   # Platform SA JWT auth
│   ├── models/                 # SaUser, Tenant
│   ├── routes/                 # /api/v1/sa/*
│   ├── scripts/                # seedSaAdmin, testProvisioning
│   └── server.js               # Port 5002
│
├── sa_frontend/                # Platform SA dashboard UI
│   └── src/
│       ├── pages/              # SaLogin, SaDashboard, ProvisionHotelPage
│       ├── components/         # Navbar, modals
│       ├── context/            # SaAuthContext
│       └── api/saApi.js        # Axios client for sa_backend
│
├── documentations/             # 15 detailed workflow/architecture docs
├── .github/chatmodes/          # Cursor chat mode configs
├── .vscode/settings.json
├── README.md                   # User-facing project readme
├── IMPLEMENTATION.MD           # Phase 1-5 refactoring roadmap
├── CODEBASE_INDEX.md           # Earlier partial index (superseded by this file)
├── CODEBASE_OVERVIEW.md        # ← THIS FILE
└── CLAUDE.md                   # AI coding behavior guidelines
```

---

## 4. Applications & Ports

| App             | Path           | Default Port | Base API Path | Purpose                                          |
| --------------- | -------------- | ------------ | ------------- | ------------------------------------------------ |
| **backend**     | `backend/`     | 5000         | `/api/`\*     | Tenant operations: auth, bookings, CRUD, reports |
| **frontend**    | `frontend/`    | 5173         | —             | Tenant admin/super-admin CRM UI                  |
| **sa_backend**  | `sa_backend/`  | 5002         | `/api/v1/`\*  | Platform tenant provisioning & SA auth           |
| **sa_frontend** | `sa_frontend/` | Vite default | —             | Platform super-admin dashboard                   |

---

## 5. Multi-Tenant Architecture

### Pattern: Database-per-Tenant on Single MongoDB Cluster

- **Central DB** (`guesthouse_central` or value of `MONGODB_URI` database): stores `Tenant` registry
- **Tenant DBs** (e.g. `guesthouses`, `gh_tenant_rishabh`): isolated data per hotel organization
- **Connection switching:** `masterConn.useDb(dbName, { useCache: true })` — no TCP reconnect per request
- **Model registration:** `initTenantModels(conn)` registers all 10 tenant schemas on each connection

### Key files

| File                                     | Role                                                              |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `backend/config/dbManager.js`            | `connectMasterDb()`, `getTenantDb(dbName)`                        |
| `backend/models/centralModels/Tenant.js` | Central tenant registry schema                                    |
| `backend/models/tenantModels/index.js`   | Registers all tenant models on a connection                       |
| `backend/middlewares/auth.js`            | `resolveTenantContext` — sets `req.tenantDb` + `req.tenantModels` |
| `backend/controller/authController.js`   | Resolves tenant DB at login via email/headers/body                |
| `backend/utils/tenantSeeder.js`          | Seeds new tenant DB with admin + default taxes                    |

### Tenant resolution order (per request)

1. JWT payload `dbName` (from login token)
2. Headers: `X-Tenant-ID` or `X-Tenant-Slug`
3. Body: `dbName` or `tenantSlug`
4. Query: `tenantSlug`
5. Fallback: `DEFAULT_TENANT_DB` env or `'guesthouses'`

### Auth routes bypass global tenant middleware

`/api/auth/*` skips `resolveTenantContext` so `authController` can dynamically resolve DB per login email.

---

## 6. Authentication & Authorization

### JWT Token Payload (tenant users)

Generated in `backend/utils/jwt.js`, includes:

```javascript
{
  (id, // MongoDB user _id
    email,
    role, // SUPER_ADMIN | ADMIN | USER
    tenantId, // tenant slug
    dbName, // tenant database name
    secret_key, // 40-byte hex session key (invalidates old sessions)
    ip_address); // client IP at login (optional enforcement)
}
```

### Session invalidation

- On login, `login_secret_key` is regenerated and stored on user document
- `authenticate` middleware compares JWT `secret_key` vs DB value
- Mismatch → 401 "session expired or terminated"

### Roles

| Role          | Backend enum  | Frontend redirect        | Access                                         |
| ------------- | ------------- | ------------------------ | ---------------------------------------------- |
| `SUPER_ADMIN` | `SUPER_ADMIN` | `/super-admin/dashboard` | Full tenant management                         |
| `ADMIN`       | `ADMIN`       | `/admin/dashboard`       | Scoped to `assignedGuestHouseId`               |
| `USER`        | `USER`        | `/signin` (legacy)       | Profile only; booking routes redirect to admin |

**Note:** Frontend `normalizeRole()` maps legacy `"user"` → `"ADMIN"`. Backend maps `"admin"` → `"SUPER_ADMIN"`.

### Middleware chain

```
Request → resolveTenantContext (global, except /auth)
        → authenticate (protected routes)
        → authorize('SUPER_ADMIN', ...) (role-gated routes)
        → resolveSubscriptionPlan + checkRoomLimit (subscription-gated)
        → Controller
```

### Frontend auth storage

- `localStorage.token` — JWT
- `localStorage.user` — JSON user profile
- Axios interceptor in `frontend/src/utils/api.js` attaches `Authorization: Bearer <token>`

### Platform SA auth (separate)

- `sa_backend` uses `SaUser` model in central DB
- Routes under `/api/v1/sa/auth/login` and `/api/v1/sa/tenants/*`
- `sa_frontend` uses `SaAuthContext` (separate from tenant frontend auth)

---

## 7. Backend — Complete Index

### 7.1 Entry Point

- `backend/server.js` — Express app, CORS, static `/images`, global `resolveTenantContext`, mounts `/api`, connects DB, listens on `PORT_NUMBER`

### 7.2 Config

| File                           | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `config/db.js`                 | Wrapper calling `connectMasterDb()` |
| `config/dbManager.js`          | Master + tenant connection pool     |
| `config/subscriptionLimits.js` | Basic/Pro/Enterprise resource caps  |
| `config/deleteDb.js`           | DB cleanup utility                  |

### 7.3 Controllers (13 files)

| Controller                  | Responsibility                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| `authController.js`         | Login, register, forgot/reset password, tenant DB resolution               |
| `adminController.js`        | Dashboard summary, metrics, user list, widget assignment                   |
| `guestHouseController.js`   | Guest house CRUD, maintenance toggle, image upload                         |
| `roomController.js`         | Room CRUD, availability, list by guest house                               |
| `bedController.js`          | Bed CRUD, auto-create, availability toggle                                 |
| `bookingController.js`      | Create/list/approve/reject/cancel bookings, availability, calendar, export |
| `userController.js`         | Update profile, deactivate, delete, e-signature upload                     |
| `auditLogController.js`     | List audit logs, daily CSV export                                          |
| `contactController.js`      | Contact form submission                                                    |
| `paymentController.js`      | Payments, outstanding receipts, checked-out bookings, invoice lookup       |
| `taxController.js`          | Tax CRUD                                                                   |
| `tenantController.js`       | Tenant onboarding via `/api/tenants`                                       |
| `subscriptionController.js` | Subscription usage stats                                                   |

### 7.4 Middlewares

| File                                    | Purpose                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| `middlewares/auth.js`                   | `resolveTenantContext`, `authenticate`, `authorize`             |
| `middlewares/imageUpload.js`            | Multer + Sharp WebP optimization + S3 upload                    |
| `middlewares/subscriptionMiddleware.js` | `resolveSubscriptionPlan`, `checkRoomLimit`, hotel/admin limits |

### 7.5 Routes (mounted at `/api`)

| Mount Path      | File                                              | Notes                                   |
| --------------- | ------------------------------------------------- | --------------------------------------- |
| `/auth`         | `routes/auth.js`                                  | signin, forgot-password, reset-password |
| `/admin`        | `routes/createadmin.js` + `routes/adminRoutes.js` | create-admin, summary, users, metrics   |
| `/guesthouses`  | `routes/guestHouseRoutes.js`                      | CRUD + maintenance                      |
| `/rooms`        | `routes/roomRoutes.js`                            | CRUD + subscription limit on create     |
| `/beds`         | `routes/bedRoutes.js`                             | CRUD + auto-create                      |
| `/bookings`     | `routes/bookingRoutes.js`                         | Full booking lifecycle                  |
| `/users`        | `routes/userRoute.js`                             | Profile updates, status toggle          |
| `/audit-logs`   | `routes/auditLogRoutes.js`                        | List + export                           |
| `/contact`      | `routes/contactRoutes.js`                         | Public contact form                     |
| `/reports`      | `reports/routes/reportRoutes.js`                  | Report list, filters, PDF generate      |
| `/taxes`        | `routes/taxRoutes.js`                             | Tax management                          |
| `/payments`     | `routes/paymentRoutes.js`                         | Payment + invoice flows                 |
| `/tenants`      | `routes/tenantRoutes.js`                          | Tenant CRUD (SUPER_ADMIN)               |
| `/subscription` | `routes/subscriptionRoutes.js`                    | Usage endpoint                          |

### 7.6 Utils

| File                                          | Purpose                                       |
| --------------------------------------------- | --------------------------------------------- |
| `utils/jwt.js`                                | Token generate/verify                         |
| `utils/roles.js`                              | Role normalization                            |
| `utils/auditLogger.js`                        | `logAction()` for audit trail                 |
| `utils/emailService.js`                       | Nodemailer wrapper                            |
| `utils/emailTemplates/*`                      | HTML email templates (8 templates)            |
| `utils/s3Client.js`                           | Default AWS S3 client                         |
| `utils/s3TenantClient.js`                     | Per-tenant S3 credentials                     |
| `utils/generateId.js`                         | Auto-increment IDs (guestHouseId, roomNumber) |
| `utils/tenantSeeder.js`                       | Seed new tenant database                      |
| `utils/upsertNormalUser.js`                   | Guest user upsert helper                      |
| `utils/whatsappService.js`                    | Twilio WhatsApp notifications                 |
| `utils/whatsappTemplates/bookingTemplates.js` | WhatsApp message templates                    |
| `utils/ipHelper.js`                           | Client IP extraction                          |
| `utils/isObjectId.js`                         | ObjectId validation helper                    |

### 7.7 Reports Module (`backend/reports/`)

```
reports/
├── constants/reportsRegistry.js   # Report definitions + permission checks
├── routes/reportRoutes.js
├── controllers/reportController.js
├── services/reportService.js
├── repositories/reportRepository.js
├── aggregations/
│   ├── bookingByGuestHouse.js
│   ├── monthlyRevenueByGuestHouse.js
│   └── paymentMethodReport.js
└── pdf/
    ├── pdfGenerator.js
    ├── imageSource.js
    └── templates/
        ├── bookingByGuestHousePdf.js
        ├── monthlyRevenueByGuestHousePdf.js
        ├── paymentMethodReportPdf.js
        └── invoicePdf.js
```

### 7.8 Scripts (`backend/scripts/`)

| Script                                                 | Purpose                      |
| ------------------------------------------------------ | ---------------------------- |
| `createAdmins.js`                                      | Create admin accounts        |
| `hashPassword.js`                                      | Password hashing utility     |
| `migrateToMultiTenant.js`                              | Multi-tenant migration       |
| `migrateBookingToUserId.js`                            | Booking userId migration     |
| `migrateGuestHouseId.js`                               | Guest house ID migration     |
| `seedBookings.js` / `seedPayments.js`                  | Test data seeding            |
| `inspectTenants.js`                                    | Tenant inspection            |
| `testAvailability.js`                                  | Availability logic tests     |
| `testGuestHousesList.js`                               | Guest house list tests       |
| `testLoginResolution.js`                               | Auth tenant resolution tests |
| `testNewHotelProvisionAndLogin.js`                     | E2E provision + login test   |
| `testSubscriptionLimits.js`                            | Subscription limit tests     |
| `testListAdmins.js` / `testUnassignedAdminBookings.js` | Admin tests                  |
| `fixOrphanBooking.js`                                  | Data fix script              |

---

## 8. Frontend — Complete Index

### 8.1 Entry Points

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `src/main.jsx`  | React root + Redux Provider                       |
| `src/App.jsx`   | Router config, lazy-loaded routes, ToastContainer |
| `src/index.css` | Global styles (Tailwind 4)                        |

### 8.2 Route Map

#### Public routes

| Path                                   | Component                    | Notes                   |
| -------------------------------------- | ---------------------------- | ----------------------- |
| `/`, `/signin`                         | `Login.jsx`                  | Default landing = login |
| `/signup`                              | Redirect → `/signin`         | Registration disabled   |
| `/forgot-password`                     | `ForgotPassword.jsx`         |                         |
| `/reset-password`                      | `ResetPassword.jsx`          |                         |
| `/about`, `/contact`, `/terms`, `/faq` | Common pages                 |                         |
| `/checkout`                            | Redirect → `/admin/checkout` |                         |

#### Legacy user redirects (Phase 1 refactor)

| Old Path       | Redirects To       |
| -------------- | ------------------ |
| `/dashboard`   | `/admin/dashboard` |
| `/booking`     | `/admin/book-room` |
| `/my-bookings` | `/admin/dashboard` |

#### Protected user route

| Path       | Component     | Guard            |
| ---------- | ------------- | ---------------- |
| `/profile` | `Profile.jsx` | `ProtectedRoute` |

#### Admin routes (nested under `AdminDashboard` layout)

| Path                                | Component                | Role  |
| ----------------------------------- | ------------------------ | ----- |
| `/admin/dashboard`                  | `AdminUserDashboard.jsx` | ADMIN |
| `/admin/book-room`                  | `AdminRoomBooking.jsx`   | ADMIN |
| `/admin/guest-house-bookings`       | `GuestHouseBookings.jsx` | ADMIN |
| `/admin/payment`, `/admin/checkout` | `PaymentPage.jsx`        | ADMIN |
| `/admin/invoice`                    | `InvoicePage.jsx`        | ADMIN |
| `/admin/receipts`                   | `Receipts.jsx`           | ADMIN |
| `/admin/invoice-list`               | `InvoiceList.jsx`        | ADMIN |
| `/admin/reports`                    | `Reports.jsx`            | ADMIN |

#### Super Admin routes (same layout shell)

| Path                       | Component                  |
| -------------------------- | -------------------------- |
| `/super-admin/dashboard`   | `Overview.jsx`             |
| `/super-admin/guesthouses` | `GuestHouseManagement.jsx` |
| `/super-admin/add-hotel`   | `AddHotelPage.jsx`         |
| `/super-admin/rooms`       | `RoomManagement.jsx`       |
| `/super-admin/beds`        | `BedManagement.jsx`        |
| `/super-admin/bookings`    | `Bookings.jsx`             |
| `/super-admin/reports`     | `Reports.jsx`              |
| `/super-admin/users`       | `UsersList.jsx`            |
| `/super-admin/audits`      | `AuditLogs.jsx`            |
| `/super-admin/settings`    | `Settings.jsx`             |
| `/super-admin/taxes`       | `TaxesManagement.jsx`      |

### 8.3 Admin Components

| Component                   | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `Sidebar.jsx`               | Role-based navigation from `sidebarData.js` |
| `GuestHouseFormModal.jsx`   | Create/edit guest house                     |
| `RoomFormModel.jsx`         | Create/edit room                            |
| `BedFormModal.jsx`          | Create/edit bed                             |
| `CreateUserModal.jsx`       | Create admin user                           |
| `EditUserModel.jsx`         | Edit user                                   |
| `AssignGuestHouseModal.jsx` | Assign guest house to admin                 |
| `ConfirmDeleteModal.jsx`    | Delete confirmation                         |
| `ReceiptPaymentModal.jsx`   | Record payment                              |
| `Calender.jsx`              | FullCalendar booking view                   |
| `BookingsPerDayChart.jsx`   | Dashboard chart                             |
| `TopGuestHousesChart.jsx`   | Dashboard chart                             |
| `TodayBookings.jsx`         | Today's booking widget                      |
| `AllowWidgetsDropdown.jsx`  | Widget permission config                    |

### 8.4 Redux Store

| Slice                  | State                                 |
| ---------------------- | ------------------------------------- |
| `authSlice.js`         | `user`, `token`, login/logout actions |
| `guestHouseSlice.js`   | Guest house list, loading, errors     |
| `siteSettingsSlice.js` | Site name, logo, branding             |

Store config: `redux/store.js`

### 8.5 Shared Config Files

| File                       | Purpose                      |
| -------------------------- | ---------------------------- |
| `common/widgetsConfig.js`  | Dashboard widget definitions |
| `common/reportsConfig.js`  | Frontend report metadata     |
| `common/paymentMethods.js` | Payment method enums         |
| `common/months.js`         | Month name helpers           |
| `common/icons.js`          | Icon mappings                |

### 8.6 Route Guards

| File                                   | Logic                                         |
| -------------------------------------- | --------------------------------------------- |
| `users/routes/ProtectedRoute.jsx`      | Requires token for user routes                |
| `admin/routes/ProtectedAdminRoute.jsx` | Requires token + ADMIN or SUPER_ADMIN role    |
| `users/routes/PublicRoute.jsx`         | Redirects authenticated users away from login |

---

## 9. Super Admin Control Plane (sa_backend + sa_frontend)

Separate application for **platform-level** tenant management (not tenant CRM).

### sa_backend API (`/api/v1`)

| Method | Path                            | Auth   | Purpose                                         |
| ------ | ------------------------------- | ------ | ----------------------------------------------- |
| POST   | `/sa/auth/login`                | Public | Platform SA login                               |
| GET    | `/sa/tenants/dashboard-summary` | SA JWT | Platform stats + tenant list                    |
| POST   | `/sa/tenants/provision`         | SA JWT | Create new tenant + seed DB + email credentials |
| GET    | `/sa/tenants`                   | SA JWT | List all tenants                                |
| PATCH  | `/sa/tenants/:tenantId/status`  | SA JWT | Activate/deactivate tenant                      |
| PATCH  | `/sa/tenants/:tenantId/plan`    | SA JWT | Change subscription plan                        |
| GET    | `/sa/tenants/stats`             | SA JWT | Platform statistics                             |

### sa_frontend Pages

| Route              | Page                     | Purpose                        |
| ------------------ | ------------------------ | ------------------------------ |
| `/login`           | `SaLogin.jsx`            | Platform admin login           |
| `/`                | `SaDashboard.jsx`        | Tenant list + platform metrics |
| `/provision-hotel` | `ProvisionHotelPage.jsx` | New tenant provisioning form   |

### Provisioning flow (sa_backend)

1. Validate tenant slug + owner info
2. Create `Tenant` record in central DB
3. Generate credentials (super admin email/password)
4. Call `getTenantDb(dbName)` + seed schemas
5. Create SUPER_ADMIN user in tenant DB
6. Send welcome email with credentials
7. Return tenant + credentials to UI

---

## 10. Data Models & Schemas

### 10.1 Central Model — Tenant (`centralModels/Tenant.js`)

```
tenantId (slug, unique)
name
dbName (unique)
isActive (boolean)
plan: free | pro | enterprise
config: { s3, siteName, logoUrl, primaryColor, customDomain, whatsapp_enabled }
timestamps
```

### 10.2 Tenant Models (all in `tenantModels/`)

#### User

```
firstName, lastName, email (unique), phone (unique)
address, role (ADMIN|SUPER_ADMIN|USER), password (bcrypt)
isActive, login_secret_key, last_login
assignedGuestHouseId, allowedWidgets[], allowedReports[], eSignatureUrl
passwordResetToken, passwordResetExpires
dateOfBirth, gender, nationality, identityType, identityNumber
emergencyContactName, emergencyContactPhone
registeredGuestHouseId, bookingIds[], totalBookings, lastBookingAt
```

#### GuestHouse

```
guestHouseId (string, unique), guestHouseName (unique)
location: { city, state }
image, description, maintenance (boolean)
```

#### Room

```
guestHouseId (ref), roomNumber, roomType (single|double|family)
isAvailable, roomCapacity, price, discountPercentage, isActive
Indexes: (guestHouseId + roomNumber) unique
```

#### Bed

```
roomId (ref), bedNumber, isAvailable, isActive
```

#### Booking

```
userId, createdBy, guestHouseId, roomId, roomIds[], bedId
checkIn, checkOut, status (pending|approved|rejected|cancelled)
verificationImage, familyMembers[{name, relation, age, verificationImage}]
bookingSource (self_service|admin), specialRequests, isCheckedOut
Indexes: bedId+status+dates, userId, guestHouseId, status+checkIn
```

#### Payment

```
bookingId, amount, paymentMethod, status, transaction details
```

#### Invoice

```
bookingId, paymentId, line items, taxes, totals, PDF metadata
```

#### Tax

```
name, percentage, isActive, applicable scope
```

#### AuditLog

```
action, entity, entityId, userId, details, ipAddress, timestamp
```

#### Counter

```
Auto-increment sequences for guestHouseId, room numbers, etc.
```

### 10.3 Subscription Plan Limits

| Plan       | Max Hotels | Max Rooms/Hotel | Max Admins/Hotel |
| ---------- | ---------- | --------------- | ---------------- |
| basic      | 1          | 10              | 2                |
| pro        | 3          | 20              | 4                |
| enterprise | 5          | 50              | 8                |

Enforced via `middlewares/subscriptionMiddleware.js` on room/hotel/admin creation.

---

## 11. API Endpoints Reference

All tenant API routes prefixed with `/api`. Most POST-based list endpoints use POST for filter bodies.

### Auth — `/api/auth`

| Method | Path               | Auth | Description               |
| ------ | ------------------ | ---- | ------------------------- |
| POST   | `/signin`          | No   | Login, returns JWT + user |
| POST   | `/forgot-password` | No   | Send reset email          |
| POST   | `/reset-password`  | No   | Reset with token          |

### Admin — `/api/admin`

| Method | Path                           | Auth             | Description              |
| ------ | ------------------------------ | ---------------- | ------------------------ |
| POST   | `/create-admin`                | No\*             | Create admin (bootstrap) |
| POST   | `/summary`                     | Yes              | Dashboard summary        |
| POST   | `/me`                          | Yes              | Current user profile     |
| POST   | `/users/list`                  | Yes              | List users               |
| POST   | `/users/create`                | Yes, SUPER_ADMIN | Create user              |
| PATCH  | `/users/:id/assign-guesthouse` | Yes, SUPER_ADMIN | Assign guest house       |
| PATCH  | `/users/:id/widgets`           | Yes, SUPER_ADMIN | Set allowed widgets      |
| POST   | `/metrics/bookings-per-day`    | Yes              | Chart data               |
| POST   | `/metrics/top-guest-houses`    | Yes              | Chart data               |

### Guest Houses — `/api/guesthouses`

| Method | Path                         | Description                |
| ------ | ---------------------------- | -------------------------- |
| POST   | `/`                          | Create (with image upload) |
| POST   | `/list`                      | List all                   |
| GET    | `/:guestHouseId`             | Get one                    |
| PUT    | `/:guestHouseId`             | Update                     |
| DELETE | `/:guestHouseId`             | Delete                     |
| PATCH  | `/:guestHouseId/maintenance` | Toggle maintenance         |

### Rooms — `/api/rooms`

| Method | Path                | Description                         |
| ------ | ------------------- | ----------------------------------- |
| POST   | `/`                 | Create (subscription limit checked) |
| POST   | `/by-guesthouse`    | Rooms for guest house               |
| POST   | `/list`             | Filtered list                       |
| GET    | `/:id`              | Get one                             |
| PUT    | `/:id`              | Update                              |
| PATCH  | `/:id/availability` | Set availability                    |
| DELETE | `/:id`              | Soft delete                         |

### Beds — `/api/beds`

| Method | Path                | Description               |
| ------ | ------------------- | ------------------------- |
| POST   | `/`                 | Create                    |
| POST   | `/auto-create`      | Auto-create beds for room |
| POST   | `/list`             | List by room              |
| PUT    | `/:id`              | Update                    |
| PATCH  | `/:id/availability` | Toggle                    |
| DELETE | `/:id`              | Soft delete               |

### Bookings — `/api/bookings`

| Method | Path            | Description                    |
| ------ | --------------- | ------------------------------ |
| POST   | `/`             | Create booking                 |
| POST   | `/my`           | Current user's bookings        |
| POST   | `/list`         | All bookings (admin)           |
| POST   | `/export/daily` | CSV export                     |
| POST   | `/availability` | Check availability             |
| POST   | `/calendar`     | Approved bookings for calendar |
| GET    | `/:id`          | Get booking by ID              |
| PUT    | `/:id`          | Update booking                 |
| PATCH  | `/:id/approve`  | Approve                        |
| PATCH  | `/:id/reject`   | Reject                         |
| PATCH  | `/:id/cancel`   | Cancel                         |

### Users — `/api/users`

| Method | Path              | Description                       |
| ------ | ----------------- | --------------------------------- |
| PUT    | `/:id`            | Update (incl. e-signature upload) |
| DELETE | `/:id`            | Delete                            |
| PATCH  | `/:id/deactivate` | Deactivate                        |
| PATCH  | `/:id/toggle`     | Toggle active status              |

### Payments — `/api/payments`

| Method | Path                          | Description                 |
| ------ | ----------------------------- | --------------------------- |
| GET    | `/`                           | List payments               |
| GET    | `/outstanding`                | Outstanding receipts        |
| POST   | `/outstanding`                | Outstanding (authenticated) |
| POST   | `/checked-out`                | Checked-out bookings        |
| GET    | `/booking/:bookingId/invoice` | Invoice by booking          |
| POST   | `/`                           | Create payment              |

### Taxes — `/api/taxes`

| Method | Path    | Description |
| ------ | ------- | ----------- |
| POST   | `/list` | List taxes  |
| POST   | `/`     | Create      |
| PATCH  | `/:id`  | Update      |
| DELETE | `/:id`  | Delete      |

### Reports — `/api/reports`

| Method | Path                    | Description                      |
| ------ | ----------------------- | -------------------------------- |
| POST   | `/list`                 | Available reports for user       |
| GET    | `/permissions/:adminId` | Report permissions (SUPER_ADMIN) |
| POST   | `/:reportName/filters`  | Get filter options               |
| POST   | `/:reportName/generate` | Generate PDF                     |

### Tenants — `/api/tenants`

| Method | Path             | Description                 |
| ------ | ---------------- | --------------------------- |
| GET    | `/by-slug/:slug` | Public tenant lookup        |
| GET    | `/`              | List tenants (SUPER_ADMIN)  |
| POST   | `/`              | Create tenant (SUPER_ADMIN) |

### Subscription — `/api/subscription`

| Method | Path     | Description              |
| ------ | -------- | ------------------------ |
| POST   | `/usage` | Current plan usage stats |

### Audit Logs — `/api/audit-logs`

| Method | Path            | Description       |
| ------ | --------------- | ----------------- |
| POST   | `/list`         | List with filters |
| POST   | `/export/daily` | CSV export        |

### Contact — `/api/contact`

| Method | Path      | Description  |
| ------ | --------- | ------------ |
| POST   | `/submit` | Contact form |

---

## 12. Key Business Workflows

### 12.1 Login Flow

```
1. User submits email + password on /signin
2. POST /api/auth/signin
3. authController.resolveTargetDbName() finds tenant DB via:
   - explicit tenantSlug/dbName in body/headers
   - central Tenant registry email lookup
   - scan all active tenant DBs for email
   - fallback to DEFAULT_TENANT_DB
4. Verify bcrypt password in tenant User collection
5. Generate new login_secret_key, update last_login
6. Return JWT (with dbName, secret_key, ip) + user profile
7. Frontend stores token + user in localStorage
8. Redirect: SUPER_ADMIN → /super-admin/dashboard, ADMIN → /admin/dashboard
```

### 12.2 Booking Flow

```
1. Admin selects guest house → room → bed → dates on /admin/book-room
2. POST /api/bookings/availability (check conflicts)
3. POST /api/bookings (with optional ID verification image)
4. Booking created with status "pending"
5. Email + optional WhatsApp notification sent
6. Super Admin approves/rejects via PATCH /api/bookings/:id/approve|reject
7. On approval: bed marked unavailable for date range
8. Admin processes payment via /admin/payment or /admin/receipts
9. Invoice generated via reports/pdf/invoicePdf.js
```

### 12.3 Tenant Provisioning Flow

```
Option A (in-tenant): POST /api/tenants (SUPER_ADMIN in existing tenant)
Option B (platform):   POST /api/v1/sa/tenants/provision (sa_backend)

Both:
1. Create Tenant record in central DB
2. getTenantDb(slug) → new isolated database
3. Seed default taxes + SUPER_ADMIN user
4. Return credentials
```

### 12.4 Image Upload Flow

```
1. Multer receives file in middleware
2. Sharp resizes + converts to WebP
3. Upload to tenant S3 bucket (s3TenantClient) or default S3
4. Store URL/key on GuestHouse/Booking/User document
5. Serve via S3 URL or local /images static fallback
```

---

## 13. Reports & PDF Generation

### Available Reports (from `reportsRegistry.js`)

| ID                           | Name                  | Filters                          |
| ---------------------------- | --------------------- | -------------------------------- |
| `bookingByGuestHouse`        | Booking Report        | fromDate, toDate, guestHouseId   |
| `monthlyRevenueByGuestHouse` | Monthly Revenue       | month, year, guestHouseId        |
| `paymentMethodReport`        | Payment Method Report | paymentMethods, fromDate, toDate |
| `invoice`                    | Invoice               | (auto, post-payment)             |

### Permission model

- SUPER_ADMIN: all reports
- ADMIN: filtered by `allowedReports[]` on user document
- `null` allowedReports = all reports allowed

PDF generation uses **PDFKit** (`backend/reports/pdf/pdfGenerator.js`).

---

## 14. External Integrations

| Service           | Library                       | Usage                                                        |
| ----------------- | ----------------------------- | ------------------------------------------------------------ |
| **MongoDB Atlas** | Mongoose 8                    | Primary database                                             |
| **AWS S3**        | @aws-sdk/client-s3, multer-s3 | Guest house images, booking ID verification, e-signatures    |
| **Gmail SMTP**    | Nodemailer                    | Welcome, password reset, booking notifications, contact form |
| **Twilio**        | twilio                        | WhatsApp booking notifications (optional per tenant)         |
| **Sharp**         | sharp                         | Image optimization before S3 upload                          |

### Email Templates (`backend/utils/emailTemplates/`)

- `welcomeEmail.js`
- `passwordReset.js`
- `bookingRequest.js`
- `bookingStatusUpdate.js`
- `adminBookingAlert.js`
- `adminCreatedUser.js`
- `contactForm.js`
- `contactFormConfirmation.js`
- `baseTemplate.js`

---

## 15. Environment Variables

### backend/.env

```env
MONGODB_URI=                    # MongoDB connection string (cluster)
DEFAULT_TENANT_DB=guesthouses  # Fallback tenant database name
PORT_NUMBER=5000
JWT_SECRET=
JWT_EXPIRES_IN=
FRONTEND_URL=                   # CORS allowed origin

# AWS S3 (default/fallback)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Email
EMAIL_USER=
EMAIL_PASS=

# Optional
ENFORCE_IP_CHECK=true|false
VERCEL=1                        # Skip listen when on Vercel

# Redis (referenced in README, usage TBD)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

### frontend/.env

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_BACKEND_PORT=5000
```

### sa_backend/.env

```env
MONGODB_URI=                    # Same cluster, central DB
PORT=5002
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
```

---

## 16. Scripts & Utilities

### Backend npm scripts

```json
"start": "node server.js",
"dev": "nodemon server.js"
```

### Frontend npm scripts

```json
"dev": "vite",
"build": "vite build",
"lint": "eslint .",
"preview": "vite preview"
```

### One-off scripts

Run from `backend/` directory:

```bash
node scripts/createAdmins.js
node scripts/migrateToMultiTenant.js
node scripts/seedBookings.js
node scripts/testNewHotelProvisionAndLogin.js
```

Run from `sa_backend/`:

```bash
node scripts/seedSaAdmin.js
node scripts/testProvisioning.js
```

---

## 17. Deployment

Both `backend/vercel.json` and `frontend/vercel.json` exist for Vercel serverless deployment.

- Backend exports Express app as default (`export default app`)
- Server only calls `app.listen()` when `VERCEL !== '1'`
- Frontend built with Vite, deployed as static SPA

---

## 18. Existing Documentation Files

| File                                                   | Content                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `documentations/MULTI_TENANT_END_TO_END_WORKFLOW.md`   | **Primary** — Guest house multi-tenant workflow |
| `documentations/MULTI_TENANT_ARCHITECTURE_ANALYSIS.md` | Reference architecture (based on PROACT system) |
| `documentations/TENANT_DB_CONNECTION_AND_AUTH_FLOW.md` | Deep dive on DB switching + req.userInfo        |
| `documentations/ProjectWorkflow.md`                    | Function/file workflow docs                     |
| `documentations/JWTAuthentication.md`                  | JWT auth process                                |
| `documentations/PasswordResetProcess.md`               | Password reset flow                             |
| `documentations/AWSImageUploadProcess.md`              | S3 upload pipeline                              |
| `documentations/AdminDashboardChartsWorkflow.md`       | Dashboard charts                                |
| `documentations/DailyReports.md`                       | Daily report exports                            |
| `documentations/reports.md`                            | Reports module docs                             |
| `documentations/subcription.md`                        | Subscription tiers                              |
| `documentations/KeyImprovements.md`                    | Planned improvements                            |
| `documentations/SystemDiagrams.md`                     | ER/class/use-case diagrams                      |
| `documentations/Guest House Booking.md`                | Original requirements                           |
| `IMPLEMENTATION.MD`                                    | Phase 1-5 refactoring plan                      |

---

## 19. Key Files to Read First

For fastest understanding, read in this order:

1. `backend/server.js` — entry point, middleware stack
2. `backend/config/dbManager.js` — multi-tenant DB switching
3. `backend/middlewares/auth.js` — tenant context + JWT auth
4. `backend/controller/authController.js` — login + tenant resolution
5. `backend/routes/index.js` — all API mount points
6. `backend/models/tenantModels/index.js` — all tenant schemas
7. `frontend/src/App.jsx` — all frontend routes
8. `frontend/src/utils/api.js` — API client
9. `frontend/src/utils/auth.js` — role redirects
10. `documentations/MULTI_TENANT_END_TO_END_WORKFLOW.md` — architecture narrative

---

## 20. Run Commands

```bash
# Terminal 1 — Tenant API
cd backend && npm install && npm run dev

# Terminal 2 — Tenant Frontend
cd frontend && npm install && npm run dev

# Terminal 3 — Platform Control Plane (optional)
cd sa_backend && npm install && npm start

# Terminal 4 — Platform SA UI (optional)
cd sa_frontend && npm install && npm run dev
```

**URLs:**

- Tenant UI: [http://localhost:5173](http://localhost:5173)
- Tenant API: [http://localhost:5000](http://localhost:5000)
- Platform SA API: [http://localhost:5002](http://localhost:5002)

---

## 21. Known Conventions & Gotchas

1. **ES Modules everywhere** — `"type": "module"` in all package.json files; use `import/export`, not `require`.
2. **POST for list endpoints** — Many list/filter endpoints use POST (not GET) to accept filter bodies.
3. **Role naming inconsistency** — Frontend maps `"user"` → `"ADMIN"`. Backend maps `"admin"` → `"SUPER_ADMIN"`. Always normalize via `utils/roles.js`.
4. **Legacy user routes redirect** — `/dashboard`, `/booking`, `/my-bookings` redirect to admin routes. User self-service booking is largely replaced by admin booking flow.
5. **Dual tenant provisioning** — Both `backend/routes/tenantRoutes.js` and `sa_backend` can provision tenants. Platform SA app is the preferred path for new hotel onboarding.
6. **Tenant models vs legacy models** — `backend/models/` has both root-level models (legacy) and `tenantModels/` (active). Controllers use `req.tenantModels` from middleware.
7. **Subscription middleware** — Room creation checks plan limits. Hotel and admin limits also enforced in subscription middleware.
8. **No refresh token** — Single JWT with expiry. On expiry, user re-logs in. Session invalidation via `login_secret_key` rotation.
9. **Image paths** — Images may be S3 URLs or served from `/images` static path for local uploads.
10. **Audit logging** — Most mutating operations call `logAction()` from `utils/auditLogger.js`.

---

## Quick AI Prompt Template

When starting a new AI session on this project, paste:

```
I'm working on the Rishabh Guest House Booking System.
Read CODEBASE_OVERVIEW.md in the repo root for full context.

Stack: MERN, multi-tenant (useDb per tenant), Express 5, React 19, Redux Toolkit.
Apps: backend (5000), frontend (5173), sa_backend (5002), sa_frontend.
Roles: SUPER_ADMIN, ADMIN, USER.
Main entities: Tenant, GuestHouse, Room, Bed, Booking, Payment, Invoice, Tax.

My task: [describe your task here]
```

---

_Generated by codebase indexing — covers all directories except_ `node_modules`_,_ `.git`_, and binary image assets._
