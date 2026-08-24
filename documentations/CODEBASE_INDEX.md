# Codebase Index

This document provides a complete map of the Guest House Booking System codebase, covering both the backend and frontend layers.

---

## 1. Project Overview

The application is a MERN-stack booking system for managing guest houses, rooms, beds, bookings, users, payments, taxes, reports, and admin operations.

### Core purpose
- Allow users to register, sign in, browse guest houses, and create bookings.
- Allow admins and super admins to manage guest houses, rooms, beds, bookings, users, payments, taxes, reports, and audit history.
- Support secure authentication through JWT and role-based access control.

### Main technologies
- Frontend: React, React Router, Redux Toolkit, Vite, Axios, Tailwind/MUI styling
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, Multer, Sharp, Nodemailer

---

## 2. Repository Structure

```text
backend/          # Express API server and business logic
frontend/         # React application and UI
documentation/    # project docs and workflow notes
README.md         # high-level project overview
IMPLEMENTATION.md # implementation notes
```

---

## 3. Backend Index

### 3.1 Entry Points

- [backend/server.js](backend/server.js)  
  Main Express server entry point. Loads environment variables, enables JSON parsing and CORS, mounts API routes, serves uploaded images, and starts the database connection.

- [backend/routes/index.js](backend/routes/index.js)  
  Central router that mounts all API route groups.

### 3.2 API Route Groups

All backend routes are mounted under `/api` from [backend/server.js](backend/server.js).

#### Authentication
- [backend/routes/auth.js](backend/routes/auth.js)  
  Routes for sign-in, forgot password, and reset password.

#### Admin / Super Admin
- [backend/routes/createadmin.js](backend/routes/createadmin.js)  
  Admin creation and privileged admin-related routes.
- [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js)  
  Administrative summary and dashboard data endpoints.

#### Guest Houses
- [backend/routes/guestHouseRoutes.js](backend/routes/guestHouseRoutes.js)  
  CRUD routes for guest houses.

#### Rooms
- [backend/routes/roomRoutes.js](backend/routes/roomRoutes.js)  
  CRUD routes for rooms.

#### Beds
- [backend/routes/bedRoutes.js](backend/routes/bedRoutes.js)  
  CRUD routes for beds.

#### Bookings
- [backend/routes/bookingRoutes.js](backend/routes/bookingRoutes.js)  
  Booking creation, management, availability checks, calendar data, and admin actions.

#### Users
- [backend/routes/userRoute.js](backend/routes/userRoute.js)  
  User management and profile-related routes.

#### Contact
- [backend/routes/contactRoutes.js](backend/routes/contactRoutes.js)  
  Contact form submission routes.

#### Reports
- [backend/reports/routes/reportRoutes.js](backend/reports/routes/reportRoutes.js)  
  Report listing, filter, and download endpoints.

#### Taxes and Payments
- [backend/routes/taxRoutes.js](backend/routes/taxRoutes.js)  
  Tax management routes.
- [backend/routes/paymentRoutes.js](backend/routes/paymentRoutes.js)  
  Payment-related routes.

#### Audit Logs
- [backend/routes/auditLogRoutes.js](backend/routes/auditLogRoutes.js)  
  Routes for audit log retrieval and inspection.

### 3.3 Controllers

Controllers contain the business logic for each feature area.

- [backend/controller/authController.js](backend/controller/authController.js)  
  User registration, login, forgot password, and reset password logic.

- [backend/controller/guestHouseController.js](backend/controller/guestHouseController.js)  
  Guest house creation and management.

- [backend/controller/roomController.js](backend/controller/roomController.js)  
  Room creation, validation, and management.

- [backend/controller/bedController.js](backend/controller/bedController.js)  
  Bed management and availability handling.

- [backend/controller/bookingController.js](backend/controller/bookingController.js)  
  Booking creation, admin approval/rejection, availability checks, calendar retrieval, and export logic.

- [backend/controller/userController.js](backend/controller/userController.js)  
  User profile updates and user account management.

- [backend/controller/adminController.js](backend/controller/adminController.js)  
  Admin summary, dashboard statistics, and filtered analytics.

- [backend/controller/auditLogController.js](backend/controller/auditLogController.js)  
  Audit log retrieval and pagination.

- [backend/controller/contactController.js](backend/controller/contactController.js)  
  Contact form submission handling.

- [backend/controller/paymentController.js](backend/controller/paymentController.js)  
  Payment creation and processing logic.

- [backend/controller/taxController.js](backend/controller/taxController.js)  
  Tax CRUD operations.

### 3.4 Models

MongoDB schema definitions live in [backend/models](backend/models).

- [backend/models/User.js](backend/models/User.js)  
  User accounts, roles, credentials, and profile fields.

- [backend/models/GuestHouse.js](backend/models/GuestHouse.js)  
  Guest house metadata, location, images, and maintenance status.

- [backend/models/Room.js](backend/models/Room.js)  
  Room specifications, pricing, capacity, and guest house association.

- [backend/models/Bed.js](backend/models/Bed.js)  
  Bed definitions and room association.

- [backend/models/Booking.js](backend/models/Booking.js)  
  Booking records, dates, room/bed references, family member data, and status.

- [backend/models/Payment.js](backend/models/Payment.js)  
  Payment records and payment state.

- [backend/models/Tax.js](backend/models/Tax.js)  
  Tax configuration entries.

- [backend/models/Invoice.js](backend/models/Invoice.js)  
  Invoice representation for billing and reporting.

- [backend/models/AuditLog.js](backend/models/AuditLog.js)  
  Audit trail entity for system activity.

- [backend/models/Counter.js](backend/models/Counter.js)  
  Auto-increment helper for generated IDs.

### 3.5 Middleware and Security

- [backend/middlewares/auth.js](backend/middlewares/auth.js)  
  JWT authentication and role authorization middleware.

- [backend/middlewares/imageUpload.js](backend/middlewares/imageUpload.js)  
  Image upload handling, resizing/optimization, and image storage integration.

### 3.6 Utilities

- [backend/utils/jwt.js](backend/utils/jwt.js)  
  JWT token generation and verification helpers.

- [backend/utils/emailService.js](backend/utils/emailService.js)  
  Mail sending integration.

- [backend/utils/auditLogger.js](backend/utils/auditLogger.js)  
  Logging utility for audit trail creation.

- [backend/utils/generateId.js](backend/utils/generateId.js)  
  ID generation helper for entities such as guest houses and rooms.

- [backend/utils/s3Client.js](backend/utils/s3Client.js)  
  AWS S3 client initialization for image storage.

- [backend/utils/roles.js](backend/utils/roles.js)  
  Role normalization helpers.

### 3.7 Reports Module

The reports subsystem is organized under [backend/reports](backend/reports).

- [backend/reports/controllers/reportController.js](backend/reports/controllers/reportController.js)  
  Report endpoints and filter resolution.

- [backend/reports/services/reportService.js](backend/reports/services/reportService.js)  
  Business logic for report eligibility and filter options.

- [backend/reports/repositories/reportRepository.js](backend/reports/repositories/reportRepository.js)  
  Data access layer for report queries.

- [backend/reports/aggregations](backend/reports/aggregations)  
  Aggregation logic for booking and revenue analytics.

- [backend/reports/pdf](backend/reports/pdf)  
  PDF generation for report exports.

### 3.8 Validation and Scripts

- [backend/validators/room.schema.js](backend/validators/room.schema.js)  
  Joi validation schema for room creation.

- [backend/scripts/createAdmins.js](backend/scripts/createAdmins.js)  
  Script for creating admin accounts.

- [backend/scripts/hashPassword.js](backend/scripts/hashPassword.js)  
  Password hashing helper script.

---

## 4. Frontend Index

### 4.1 Entry Points

- [frontend/src/main.jsx](frontend/src/main.jsx)  
  Application bootstrap file. Creates the root React app and injects the Redux provider.

- [frontend/src/App.jsx](frontend/src/App.jsx)  
  Main application shell and router configuration. Defines public routes, protected user routes, and protected admin routes.

### 4.2 Route Structure

The app uses React Router with route groups for:

#### Public routes
- `/` and `/signin`
- `/signup` (redirects to sign-in)
- `/forgot-password`
- `/reset-password`
- `/about`, `/contact`, `/terms`, `/faq`

#### User-protected routes
- `/profile`

#### Admin routes
- `/admin/dashboard`
- `/admin/book-room`
- `/admin/guest-house-bookings`
- `/admin/payment`
- `/admin/invoice`
- `/admin/reports`

#### Super admin routes
- `/super-admin/users`
- `/super-admin/dashboard`
- `/super-admin/hotel`
- `/super-admin/rooms`
- `/super-admin/beds`
- `/super-admin/audits`
- `/super-admin/bookings`
- `/super-admin/reports`
- `/super-admin/settings`
- `/super-admin/taxes`

### 4.3 Frontend Feature Areas

#### User-facing area
- [frontend/src/users](frontend/src/users)  
  Includes pages, components, and routes for login, booking, dashboard, bookings, profile, and password recovery.

Key user pages include:
- [frontend/src/users/pages/Login.jsx](frontend/src/users/pages/Login.jsx)
- [frontend/src/users/pages/Dashboard.jsx](frontend/src/users/pages/Dashboard.jsx)
- [frontend/src/users/pages/Profile.jsx](frontend/src/users/pages/Profile.jsx)
- [frontend/src/users/pages/ForgotPassword.jsx](frontend/src/users/pages/ForgotPassword.jsx)
- [frontend/src/users/pages/ResetPassword.jsx](frontend/src/users/pages/ResetPassword.jsx)

#### Admin-facing area
- [frontend/src/admin](frontend/src/admin)  
  Includes admin and super-admin pages, sidebar components, route guards, and admin-specific utilities.

Key admin pages include:
- [frontend/src/admin/pages/AdminDashboard.jsx](frontend/src/admin/pages/AdminDashboard.jsx)
- [frontend/src/admin/pages/AdminUserDashboard.jsx](frontend/src/admin/pages/AdminUserDashboard.jsx)
- [frontend/src/admin/pages/AdminRoomBooking.jsx](frontend/src/admin/pages/AdminRoomBooking.jsx)
- [frontend/src/admin/pages/GuestHouseManagement.jsx](frontend/src/admin/pages/GuestHouseManagement.jsx)
- [frontend/src/admin/pages/RoomManagement.jsx](frontend/src/admin/pages/RoomManagement.jsx)
- [frontend/src/admin/pages/BedManagement.jsx](frontend/src/admin/pages/BedManagement.jsx)
- [frontend/src/admin/pages/Bookings.jsx](frontend/src/admin/pages/Bookings.jsx)
- [frontend/src/admin/pages/Reports.jsx](frontend/src/admin/pages/Reports.jsx)
- [frontend/src/admin/pages/Settings.jsx](frontend/src/admin/pages/Settings.jsx)
- [frontend/src/admin/pages/TaxesManagement.jsx](frontend/src/admin/pages/TaxesManagement.jsx)

#### Shared components
- [frontend/src/components](frontend/src/components)  
  Shared UI pieces like layout, logo, navbar, scroll behavior, and not-found handling.

- [frontend/src/common](frontend/src/common)  
  Shared common UI and helper modules.

- [frontend/src/commonPages](frontend/src/commonPages)  
  Public pages such as About Us, Contact Us, FAQ, and Terms & Policies.

### 4.4 State Management

Redux is used for global client state.

- [frontend/src/redux/store.js](frontend/src/redux/store.js)  
  Configures the Redux store.

- [frontend/src/redux/authSlice.js](frontend/src/redux/authSlice.js)  
  Stores authentication state, token, and user profile.

- [frontend/src/redux/guestHouseSlice.js](frontend/src/redux/guestHouseSlice.js)  
  Stores guest house listing and related loading/error state.

- [frontend/src/redux/siteSettingsSlice.js](frontend/src/redux/siteSettingsSlice.js)  
  Stores shared site settings such as site name and logo.

### 4.5 API Client

- [frontend/src/utils/api.js](frontend/src/utils/api.js)  
  Central Axios instance used by the frontend for API requests. It injects the JWT token from local storage into requests.

### 4.6 Route Guards

- [frontend/src/users/routes/ProtectedRoute.jsx](frontend/src/users/routes/ProtectedRoute.jsx)  
  Protects user routes and redirects unauthenticated users to sign-in.

- [frontend/src/admin/routes/ProtectedAdminRoute.jsx](frontend/src/admin/routes/ProtectedAdminRoute.jsx)  
  Protects admin/super-admin routes and restricts access based on role.

### 4.7 UI Styling and Assets

- [frontend/src/styles](frontend/src/styles)  
  Styling helpers and page-level style modules.

- [frontend/src/assets](frontend/src/assets)  
  Static assets and images.

---

## 5. How the Full Stack Works

### User flow
1. User signs in through the frontend.
2. Frontend stores the JWT token and user profile in Redux/local storage.
3. Protected routes check authentication and role.
4. API requests are sent through the Axios client with the JWT attached.
5. The backend validates the token and returns data or performs the requested action.

### Admin flow
1. Admin logs in with an admin or super-admin role.
2. Frontend routes them into the protected admin shell.
3. Admin pages fetch dashboard, bookings, users, and reports through backend endpoints.
4. Backend controllers query MongoDB and return the relevant data.

### Booking flow
1. User selects a guest house, room, and bed.
2. Frontend sends booking details to the backend.
3. Backend validates availability and creates a booking record.
4. Admin can approve, reject, or cancel the booking later.

---

## 6. Key Files to Start Reading

If you want to understand the project quickly, start with these files in order:

1. [backend/server.js](backend/server.js)
2. [backend/routes/index.js](backend/routes/index.js)
3. [backend/controller/authController.js](backend/controller/authController.js)
4. [backend/controller/bookingController.js](backend/controller/bookingController.js)
5. [frontend/src/App.jsx](frontend/src/App.jsx)
6. [frontend/src/main.jsx](frontend/src/main.jsx)
7. [frontend/src/redux/store.js](frontend/src/redux/store.js)
8. [frontend/src/utils/api.js](frontend/src/utils/api.js)

---

## 7. Run Commands

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 8. Notes

- The backend exposes most functionality through REST-style API endpoints mounted under `/api`.
- The frontend uses lazy loading for route-based screens to improve initial load performance.
- Authentication and role-based access are enforced both on the backend and in the frontend routing layer.
