# Implementation Task: QR-Based Mobile Document Capture for Bookings

## Context

You are working on the **Rishabh Guest House Booking System** — a multi-tenant MERN
CRM (MongoDB, Express 5, React 19, Node.js, ESM modules, Redux Toolkit). Read
`CODEBASE_OVERVIEW.md` in the repo root first for full architecture context
(multi-tenant DB-per-tenant via `useDb()`, JWT auth, roles, existing S3 image
pipeline) before writing any code.

**Current problem:** When a guest checks in, staff must photograph the guest's
and family members' verification documents on a personal phone, transfer the
photo to the desk computer (WhatsApp-to-self / USB / email), then upload it via
a file picker into the booking. This is slow and error-prone.

**Goal:** Add a second upload path — scan a QR code shown on the desktop
booking form, which opens a scoped mobile web session on the admin's phone.
From that session, the admin captures documents directly to the camera and
they upload straight to the booking, with the desktop view updating live. The
existing "upload from computer" file picker must continue to work unchanged —
this is an additive option, not a replacement.

---

## Functional requirements

### 1. Two upload paths, side by side, per document slot
On the booking form, every document slot (primary guest, each family member)
must offer:
- **Upload from computer** — existing file-picker flow, unchanged.
- **Capture via phone** — new QR flow described below.

### 2. Guest hierarchy on a booking
A booking has:
- Exactly one **primary guest** (fixed slot, always present).
- Zero or more **family members**, each with a name and relation, added either
  from the desktop form or from the mobile session.
- Each guest (primary or family member) has **a single verification photo** —
  it could be any document type (Aadhar, driving licence, passport, etc.), not
  a fixed front/back pair. Capture a freeform document label (e.g. "Aadhar")
  alongside the photo rather than a fixed enum of document types.

### 3. QR-scoped mobile capture session (not a single-use single-photo token)
Clicking "Capture via phone" issues a **session-scoped, narrow-permission
token**, rendered as a QR code:
- Scoped to exactly one `bookingId`.
- Time-boxed expiry (~20–30 minutes), OR explicitly ended early by the admin
  clicking "End capture session" on desktop.
- Permissions: read the booking's current guest roster (names only, no
  pricing/payment/PII beyond what's needed), create new family-member entries
  (name + relation only), upload a verification photo tagged to a specific
  guest (with an optional freeform document label), mark a slot complete.
- **Must not** allow: editing dates, room assignment, pricing, payments,
  deleting bookings, or accessing any booking other than the one it was
  issued for.
- The token is **not** the admin's real JWT and must never grant tenant-wide
  or multi-booking access.

### 4. Mobile capture page (what opens after scanning the QR)
A minimal, login-free web page (validated purely by the scoped token in the
URL) that shows:
- Guest/booking context (e.g. primary guest's name) so the admin knows they
  scanned the right QR.
- A roster list: primary guest row first, then any existing family members,
  each showing per-guest capture status (done / missing) since each guest
  needs exactly one verification photo.
- Tapping a row's capture button opens the device camera directly
  (`<input type="file" accept="image/*" capture="environment">` or
  equivalent) — not the photo gallery. An optional freeform label field
  (e.g. "Aadhar", "Driving licence") can be filled before or after capture.
- A successful capture uploads immediately (no manual "submit" batch step)
  and the row updates to reflect the new status. Recapturing replaces the
  guest's existing photo.
- An "Add family member" action: small name + relation form, then immediately
  offers capture for that new row.

### 5. Live sync back to desktop
While a capture session is open, the desktop booking form must reflect new
uploads and new family-member rows without a manual refresh. Use **polling**
(every 3–5 seconds while the QR/session panel is open) for the first version.
Do not build WebSocket/Socket.io infrastructure for this unless explicitly
asked later — polling is sufficient at this scale and keeps the change small.

### 6. Storage layout
Photos must be stored per-guest, not dumped flat into one booking folder,
e.g.:
```
bookings/{bookingId}/guests/{guestId}/document-{timestamp}.webp
```
Reuse the existing image pipeline (Multer + Sharp WebP conversion + S3 upload)
already implemented in `backend/middlewares/imageUpload.js` — do not build a
parallel image-processing pipeline.

### 7. Audit logging
Every mutation performed via a capture-session token (family member added,
document uploaded, slot marked complete) must call the existing
`logAction()` utility (`backend/utils/auditLogger.js`), recording which admin
issued the session token, even though the phone itself never holds that
admin's full JWT.

---

## Data model changes

Extend the relevant tenant model (locate the existing `Booking` schema under
`backend/models/tenantModels/` — read it first, do not assume field names,
match existing conventions) to add a guest roster, roughly:

```js
guests: [
  {
    role: { type: String, enum: ["PRIMARY", "FAMILY_MEMBER"], required: true },
    name: { type: String, required: true },
    relation: { type: String }, // only meaningful for FAMILY_MEMBER
    document: {
      label: { type: String }, // freeform, e.g. "Aadhar", "Driving licence" — no fixed enum
      url: { type: String },
      uploadedVia: { type: String, enum: ["manual", "qr"] },
      uploadedAt: { type: Date },
    },
  },
]
```

Adjust field names/style to match the existing schema conventions in the
codebase rather than copying this verbatim.

---

## Backend work

1. **Token issuance endpoint** — new route (e.g. `POST /api/bookings/:id/capture-session`),
   authenticated with the normal admin JWT + tenant context (same as any
   existing protected route). Issues a short-lived, narrowly-scoped JWT using
   the existing `backend/utils/jwt.js` signing utility — add a distinct
   `scope: "guest-capture"` claim and `bookingId`, do not reuse the full user
   JWT shape. Returns the token (to be embedded in a QR-encoded URL) and an
   expiry timestamp.

2. **New middleware** for capture-session tokens — validates `scope ===
   "guest-capture"`, resolves `bookingId` and tenant DB from the token
   (do not require `X-Tenant-*` headers or full `resolveTenantContext` if it
   assumes a real user JWT — read `backend/middlewares/auth.js` first and
   decide whether to extend it or add a sibling middleware; prefer extending
   only if it doesn't complicate the existing tenant-resolution logic for
   normal requests).

3. **Capture-session-scoped routes**, all gated by the new middleware and all
   scoped strictly to the `bookingId` in the token:
   - `GET /api/capture-session/roster` — returns guest list + per-guest
     photo status for the booking.
   - `POST /api/capture-session/guests` — add a family member (name +
     relation only).
   - `POST /api/capture-session/guests/:guestId/document` — upload (or
     replace) the guest's single verification photo, with an optional
     freeform label field, reusing the existing image middleware pipeline.
   - `POST /api/capture-session/end` (admin-authenticated, not token-authenticated)
     — invalidate the session early.

4. **Existing manual upload endpoint(s)** — locate wherever booking document
   uploads currently happen and confirm the new guest/document schema is
   compatible with that flow too, so "upload from computer" and "capture via
   phone" write to the same data structure. Do not fork the data model per
   upload method.

## Frontend work

1. **Desktop booking form** — per document slot, add the "Capture via phone"
   button next to the existing file picker. Clicking it calls the new
   session-issuance endpoint, renders the returned URL as a QR code (pick a
   lightweight, already-common QR library rather than adding a heavy new
   dependency — check `frontend/package.json` first for anything already
   available), and starts polling the roster endpoint while the panel is
   open. Stop polling when the panel is closed or the session ends/expires.

2. **New mobile capture route** — a separate, minimal route (not reusing the
   full `AdminDashboard` layout/sidebar) that:
   - Reads the token from the URL query/path.
   - Fetches the roster via the capture-session endpoint.
   - Renders the roster with per-row capture buttons using
     `capture="environment"` file inputs.
   - Uploads immediately on file selection — no separate "submit" step.
   - Handles token expiry gracefully (clear message, no crash) since the
     admin may still be mid-checkin when it lapses.

3. Keep this mobile page **outside** the existing Redux-authenticated flows —
   it must work without `localStorage.token`/`localStorage.user` being set,
   since the phone is not logged in as the admin.

---

## Explicit non-goals / things NOT to do

- Do **not** replace or remove the existing manual file-picker upload path.
- Do **not** make the capture-session token a full admin JWT or grant it
  access beyond the single booking it was issued for.
- Do **not** build WebSocket/Socket.io real-time sync for this — polling is
  the agreed approach for v1.
- Do **not** build a native mobile app or require any app install — this must
  work in a plain mobile browser via QR scan.
- Do **not** invent a new image-processing/upload pipeline — reuse
  `imageUpload.js` (Multer + Sharp + S3).
- Do **not** skip audit logging for actions taken via a capture-session token.
- Do **not** assume field/model names — read the actual existing `Booking`
  schema, `auth.js` middleware, `jwt.js`, and `imageUpload.js` before writing
  code, and match existing code style/conventions (ESM imports, existing
  error-handling patterns, existing response shapes).
- Do **not** hardcode tenant DB resolution logic differently from the existing
  pattern — capture-session requests still need to resolve the correct tenant
  DB, just via the token's embedded tenant/booking info instead of the normal
  JWT.

---

## Suggested implementation order

1. Data model change (guest roster + documents on Booking schema).
2. Backend: capture-session token issuance endpoint + middleware.
3. Backend: roster/add-guest/upload-document/end-session endpoints, reusing
   existing image middleware.
4. Backend: audit logging wired into all capture-session mutations.
5. Frontend: mobile capture page (token-based, no login).
6. Frontend: desktop "Capture via phone" button, QR rendering, live polling.
7. Manual QA pass: verify manual upload path is unaffected; verify a
   capture-session token cannot access any other booking, cannot mutate
   price/dates/payment, and expires correctly; verify audit log entries are
   created for capture-session actions.

---

## Acceptance criteria

- [ ] Desktop shows both "upload from computer" and "capture via phone" per
      document slot.
- [ ] Scanning the QR opens a login-free mobile page showing the correct
      booking's guest roster.
- [ ] Adding a family member from the phone appears on desktop within one
      polling interval.
- [ ] Capturing a photo opens the camera directly, not the gallery.
- [ ] Uploaded photos are stored under
      `bookings/{bookingId}/guests/{guestId}/document-{timestamp}.webp`.
- [ ] Recapturing a guest's photo replaces the existing one rather than
      creating a duplicate.
- [ ] A capture-session token cannot read/write any booking other than the
      one it was issued for.
- [ ] A capture-session token cannot modify price, dates, room assignment, or
      payment data.
- [ ] The token expires (or can be manually ended) and the mobile page
      reflects that clearly.
- [ ] Every capture-session mutation produces an audit log entry attributing
      it to the issuing admin.
- [ ] Existing manual upload flow is untouched and still works.
