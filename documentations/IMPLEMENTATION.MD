# Hotel / Guest House CRM System
## Phase 1 - Project Refactoring & Core Implementation Plan

> **Goal**
>
> Convert the existing Guest House Booking System into an Enterprise Grade Hotel / Guest House CRM System with Role Based Access Control (RBAC), scalable architecture, and clean backend structure.

---

# Overall Development Roadmap

This project should be implemented in phases.

```
Phase 1
├── Project Refactoring
├── Authentication
├── RBAC
├── Backend Architecture

Phase 2
├── Super Admin Module
├── Room Management
├── Bed Management
├── Image Management
├── Admin Management

Phase 3
├── Booking Module
├── Booking Management
├── Availability Logic

Phase 4
├── Reports
├── Dashboard
├── Analytics

Phase 5
├── Future CRM Features
├── Payments
├── Additional Services
├── Customer CRM
```

---

# Phase 1
# Project Refactoring

---

## Task 1
# Remove Public Homepage

### Current

```
/
    Hero Section
    About
    Contact
```

### New

```
/
    Login Page
```

Requirements

- Remove Hero section
- Remove landing page
- Remove public navigation
- Login becomes the default route
- If already logged in:
  - Super Admin → Dashboard
  - Admin → Dashboard

---

## Task 2
# Authentication Flow

There will be one common login page.

```
Email
Password
Login
```

After login

```
if role == SUPER_ADMIN

    Navigate
    /super-admin/dashboard

if role == ADMIN

    Navigate
    /admin/dashboard
```

---

## Task 3
# RBAC

Two roles only.

```
SUPER_ADMIN

ADMIN
```

Permissions

| Module | Super Admin | Admin |
|----------|------------|--------|
| Dashboard | ✅ | ✅ |
| Rooms | ✅ | ❌ |
| Beds | ✅ | ❌ |
| Images | ✅ | ❌ |
| Admin Management | ✅ | ❌ |
| Bookings | View | Create / Update |
| Reports | All | Limited |
| Analytics | ✅ | ❌ |

Future roles should be easy to add.

Recommended middleware

```
authenticate()

authorize([
    "SUPER_ADMIN"
])

authorize([
    "ADMIN"
])

authorize([
    "SUPER_ADMIN",
    "ADMIN"
])
```

---

# Task 4
# Navigation Structure

## Super Admin

```
Dashboard

Room Management

Bed Management

Images

Admin Management

Reports

Settings
```

---

## Admin

```
Dashboard

Bookings

Reports

Profile
```

---

# Phase 1
# Backend Refactoring

---

## Current Goal

Refactor backend into enterprise architecture.

Suggested structure

```
src

│
├── config
│
├── constants
│
├── database
│
├── middleware
│
├── routes
│
├── controllers
│
├── services
│
├── repositories
│
├── validators
│
├── dto
│
├── models
│
├── interfaces
│
├── helpers
│
├── utils
│
├── logger
│
├── uploads
│
├── storage
│
├── exceptions
│
├── jobs
│
├── cron
│
├── events
│
├── sockets
│
├── permissions
│
├── types
│
└── app.ts
```

---

## Folder Responsibilities

### controllers

Receive Request

↓

Validate Request

↓

Call Service

↓

Return Response

No business logic.

---

### services

Contains

- Business Logic
- Validations
- Database orchestration
- Transaction handling

---

### repositories

Contains only

```
Mongo Queries

Create

Update

Delete

Aggregation

Pagination
```

No business logic.

---

### validators

Request validation

Example

```
Login Validation

Create Room Validation

Booking Validation

Admin Validation
```

---

### dto

Request DTO

Response DTO

Mapping

---

### middleware

```
Authentication

Authorization

Error Handler

Upload

Logger

Rate Limiter
```

---

### utils

Reusable helpers

```
JWT

Password

Date

Pagination

Response

Encryption

File Upload
```

---

### constants

```
Roles

Permissions

Status

Messages

Booking Status

Room Status

Response Codes
```

---

### logger

```
Request Logs

Error Logs

Audit Logs
```

---

# Database Collections

---

## Users

```
_id

name

email

password

role

status

createdAt

updatedAt
```

---

## Rooms

```
_id

room_number

room_name

room_type

floor

capacity

description

status

createdAt

updatedAt
```

---

## Beds

```
_id

room_id

bed_number

bed_type

status
```

---

## Images

```
_id

room_id

image

display_order
```

---

## Bookings

```
_id

booking_number

customer_name

phone

email

room_id

bed_id

check_in

check_out

number_of_guests

status

remarks

created_by

createdAt

updatedAt
```

---

# API Structure

```
/api/v1

/auth

/users

/admins

/rooms

/beds

/images

/bookings

/reports

/dashboard
```

---

# Response Structure

Always maintain common API response.

Success

```json
{
    "success": true,
    "message": "Room created successfully",
    "data": {}
}
```

Error

```json
{
    "success": false,
    "message": "Room not found",
    "errors": []
}
```

---

# Authentication Flow

```
User Login

↓

Validate Credentials

↓

Generate JWT

↓

Store User Session (Optional)

↓

Return Token

↓

Frontend Stores Token

↓

Authenticated Requests
```

---

# Route Protection

Public

```
POST

/login
```

Authenticated

```
GET

/dashboard
```

Super Admin

```
POST /rooms

PUT /rooms

DELETE /rooms

POST /admins
```

Admin

```
POST /bookings

PUT /bookings

GET /reports
```

---

# Development Order

## Step 1

Remove homepage

---

## Step 2

Implement Login Page

---

## Step 3

RBAC Navigation

---

## Step 4

Backend Refactoring

---

## Step 5

Authentication Cleanup

---

## Step 6

Authorization Middleware

---

## Step 7

Room CRUD

---

## Step 8

Bed CRUD

---

## Step 9

Room Images CRUD

---

## Step 10

Admin CRUD

---

## Step 11

Booking Module

---

## Step 12

Booking Management

---

## Step 13

Dashboard

---

## Step 14

Reports

---

# Deliverables After Phase 1

- ✅ Login-first application
- ✅ Role Based Authentication
- ✅ Super Admin Dashboard
- ✅ Admin Dashboard
- ✅ Enterprise Backend Structure
- ✅ Clean API Architecture
- ✅ JWT Authentication
- ✅ Authorization Middleware
- ✅ Room Management
- ✅ Bed Management
- ✅ Image Management
- ✅ Admin Management
- ✅ Booking Module Foundation
- ✅ Reports Foundation

---

# Future Enhancements (Phase 2+)

These modules are intentionally kept out of the initial implementation but should be considered in future releases:

## CRM
- Guest Profiles
- Stay History
- Loyalty Program
- Guest Preferences
- Communication History

## Booking Enhancements
- Group Bookings
- Corporate Bookings
- Waitlist
- Room Upgrades
- Booking Extensions
- Booking Amendments

## Payments
- Advance Payments
- Split Payments
- Refunds
- Invoices
- GST Support
- Multiple Payment Modes

## Additional Services
- Food Orders
- Laundry
- Airport Pickup
- Housekeeping Requests
- Extra Bed
- Vehicle Parking

## Operations
- Housekeeping Dashboard
- Room Maintenance
- Inventory Management
- Staff Management

## Reports & Analytics
- Occupancy Reports
- Revenue Reports
- Booking Trends
- Customer Insights
- Room Utilization
- Admin Performance

## Enterprise Features
- Multi-Property Support
- Audit Logs
- Notification System
- Email & WhatsApp Integration
- Backup & Restore
- Activity Tracking
- API Documentation
- Unit & Integration Testing