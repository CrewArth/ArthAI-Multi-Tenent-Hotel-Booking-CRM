import crypto from 'crypto';
import { generateCaptureSessionToken } from '../utils/jwt.js';
import { logAction } from '../utils/auditLogger.js';

/**
 * Initializes or normalizes the booking.guests array from legacy fields
 */
const ensureGuestRoster = (booking) => {
  if (!Array.isArray(booking.guests) || booking.guests.length === 0) {
    const primaryName = booking.userId?.firstName
      ? `${booking.userId.firstName} ${booking.userId.lastName || ''}`.trim()
      : (booking.fullName || 'Primary Guest');

    const guests = [
      {
        role: 'PRIMARY',
        name: primaryName,
        relation: '',
        document: booking.verificationImage
          ? {
              label: 'Identity Document',
              url: booking.verificationImage,
              uploadedVia: 'manual',
              uploadedAt: booking.createdAt || new Date(),
            }
          : undefined,
      },
    ];

    if (Array.isArray(booking.familyMembers)) {
      booking.familyMembers.forEach((m) => {
        if (m?.name) {
          guests.push({
            role: 'FAMILY_MEMBER',
            name: m.name,
            relation: m.relation || '',
            age: m.age,
            document: m.verificationImage
              ? {
                  label: 'Verification Document',
                  url: m.verificationImage,
                  uploadedVia: 'manual',
                  uploadedAt: booking.createdAt || new Date(),
                }
              : undefined,
          });
        }
      });
    }

    booking.guests = guests;
  }
  return booking.guests;
};

/**
 * POST /api/bookings/:id/capture-session
 * Admin-authenticated endpoint to create a time-boxed QR capture session
 */
export const createCaptureSession = async (req, res) => {
  try {
    const { Booking, GuestHouse } = req.tenantModels;
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('guestHouseId', 'guestHouseName location');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    ensureGuestRoster(booking);

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const adminEmail = req.user?.email || 'admin';
    const adminName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Admin';

    booking.captureSession = {
      sessionId,
      active: true,
      issuedAt: new Date(),
      expiresAt,
      issuedBy: {
        userId: req.user?._id,
        email: adminEmail,
        name: adminName,
      },
    };

    await booking.save();

    const token = generateCaptureSessionToken({
      bookingId: booking._id,
      sessionId,
      tenantId: req.userInfo?.tenantId || 'default',
      dbName: req.tenantDb?.name || req.userInfo?.dbName || 'guesthouses',
      tenantSlug: req.userInfo?.tenantSlug || 'default',
      issuedBy: {
        id: req.user?._id,
        email: adminEmail,
        name: adminName,
      },
      expiresIn: '30m',
    });

    logAction({
      action: 'CAPTURE_SESSION_STARTED',
      entityType: 'Booking',
      entityId: booking._id,
      performedBy: adminEmail,
      details: {
        sessionId,
        expiresAt,
        guestHouseName: booking.guestHouseId?.guestHouseName,
        guestCount: booking.guests.length,
      },
    }, req.tenantDb).catch((err) => console.error('[AUDIT] capture session start error:', err));

    return res.status(200).json({
      message: 'Capture session started successfully',
      token,
      sessionId,
      expiresAt,
      captureUrl: `/capture/${token}`,
      bookingId: booking._id,
      guests: booking.guests,
    });
  } catch (error) {
    console.error('[CAPTURE_SESSION] createCaptureSession failed:', error);
    return res.status(500).json({ message: error.message || 'Server error starting capture session' });
  }
};

/**
 * POST /api/bookings/:id/capture-session/end or POST /api/capture-session/end
 * Admin-authenticated endpoint to invalidate the capture session early
 */
export const endCaptureSession = async (req, res) => {
  try {
    const { Booking } = req.tenantModels;
    const bookingId = req.params.id || req.body.bookingId || req.booking?._id;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.captureSession) {
      booking.captureSession.active = false;
      await booking.save();
    }

    const adminEmail = req.user?.email || req.captureSession?.issuedBy?.email || 'Admin';

    logAction({
      action: 'CAPTURE_SESSION_ENDED',
      entityType: 'Booking',
      entityId: booking._id,
      performedBy: adminEmail,
      details: { sessionId: booking.captureSession?.sessionId },
    }, req.tenantDb).catch((err) => console.error('[AUDIT] capture session end error:', err));

    return res.status(200).json({ message: 'Capture session ended successfully' });
  } catch (error) {
    console.error('[CAPTURE_SESSION] endCaptureSession failed:', error);
    return res.status(500).json({ message: 'Failed to end capture session' });
  }
};

/**
 * GET /api/capture-session/roster
 * Mobile/Session-authenticated endpoint to view the booking roster & document status
 */
export const getRoster = async (req, res) => {
  try {
    const booking = req.booking;
    const { GuestHouse, User } = req.tenantModels;

    ensureGuestRoster(booking);

    let guestHouseName = 'Guest House';
    if (booking.guestHouseId) {
      const gh = await GuestHouse.findById(booking.guestHouseId).select('guestHouseName location').lean();
      if (gh?.guestHouseName) guestHouseName = gh.guestHouseName;
    }

    let primaryGuestName = '';
    if (booking.userId) {
      const user = await User.findById(booking.userId).select('firstName lastName phone').lean();
      if (user?.firstName) {
        primaryGuestName = `${user.firstName} ${user.lastName || ''}`.trim();
      }
    }

    const primarySlot = booking.guests.find((g) => g.role === 'PRIMARY');
    if (!primaryGuestName && primarySlot?.name) {
      primaryGuestName = primarySlot.name;
    }

    const guests = booking.guests.map((g) => ({
      _id: g._id,
      role: g.role,
      name: g.name,
      relation: g.relation || '',
      age: g.age,
      document: g.document?.url
        ? {
            label: g.document.label || 'Verification Document',
            url: g.document.url,
            uploadedVia: g.document.uploadedVia || 'manual',
            uploadedAt: g.document.uploadedAt,
            isComplete: true,
          }
        : null,
    }));

    return res.status(200).json({
      bookingId: booking._id,
      primaryGuestName: primaryGuestName || 'Guest',
      guestHouseName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      expiresAt: booking.captureSession?.expiresAt,
      sessionActive: booking.captureSession?.active !== false,
      guests,
    });
  } catch (error) {
    console.error('[CAPTURE_SESSION] getRoster failed:', error);
    return res.status(500).json({ message: 'Failed to fetch guest roster' });
  }
};

/**
 * POST /api/capture-session/guests
 * Mobile/Session-authenticated endpoint to add a new family member
 */
export const addGuestToSession = async (req, res) => {
  try {
    const booking = req.booking;
    const { name, relation, age } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Guest name is required' });
    }

    ensureGuestRoster(booking);

    const newGuest = {
      role: 'FAMILY_MEMBER',
      name: name.trim(),
      relation: (relation || '').trim(),
      age: age !== undefined && age !== '' ? Number(age) : undefined,
    };

    booking.guests.push(newGuest);

    // Sync with legacy familyMembers array
    if (!Array.isArray(booking.familyMembers)) booking.familyMembers = [];
    booking.familyMembers.push({
      name: newGuest.name,
      relation: newGuest.relation,
      age: newGuest.age,
    });

    await booking.save();

    const added = booking.guests[booking.guests.length - 1];

    const performer = req.captureSession?.issuedBy?.email || 'Admin (Mobile QR)';
    logAction({
      action: 'CAPTURE_SESSION_GUEST_ADDED',
      entityType: 'Booking',
      entityId: booking._id,
      performedBy: performer,
      details: {
        guestId: added._id,
        name: added.name,
        relation: added.relation,
      },
    }, req.tenantDb).catch((err) => console.error('[AUDIT] capture add guest error:', err));

    return res.status(201).json({
      message: 'Family member added successfully',
      guest: added,
      guests: booking.guests,
    });
  } catch (error) {
    console.error('[CAPTURE_SESSION] addGuestToSession failed:', error);
    return res.status(500).json({ message: 'Failed to add guest to roster' });
  }
};

/**
 * POST /api/capture-session/guests/:guestId/document
 * Mobile/Session-authenticated endpoint to upload or replace a guest's verification document
 */
export const uploadGuestDocument = async (req, res) => {
  try {
    const booking = req.booking;
    const { guestId } = req.params;
    const documentUrl = req.uploadedDocumentUrl;

    if (!documentUrl) {
      return res.status(400).json({ message: 'Document image was not processed' });
    }

    ensureGuestRoster(booking);

    const guest = booking.guests.id ? booking.guests.id(guestId) : booking.guests.find((g) => String(g._id) === String(guestId));

    if (!guest) {
      return res.status(404).json({ message: 'Guest slot not found in booking roster' });
    }

    const label = req.body.label?.trim() || guest.document?.label || 'Verification Document';

    guest.document = {
      label,
      url: documentUrl,
      uploadedVia: 'qr',
      uploadedAt: new Date(),
    };

    // Keep legacy fields in sync
    if (guest.role === 'PRIMARY') {
      booking.verificationImage = documentUrl;
    } else if (guest.role === 'FAMILY_MEMBER' && Array.isArray(booking.familyMembers)) {
      const match = booking.familyMembers.find((m) => m.name === guest.name) || booking.familyMembers[0];
      if (match) {
        match.verificationImage = documentUrl;
      }
    }

    await booking.save();

    const performer = req.captureSession?.issuedBy?.email || 'Admin (Mobile QR)';
    logAction({
      action: 'CAPTURE_SESSION_DOCUMENT_UPLOADED',
      entityType: 'Booking',
      entityId: booking._id,
      performedBy: performer,
      details: {
        guestId: guest._id,
        guestName: guest.name,
        role: guest.role,
        label,
        uploadedVia: 'qr',
        documentUrl,
      },
    }, req.tenantDb).catch((err) => console.error('[AUDIT] capture upload doc error:', err));

    return res.status(200).json({
      message: 'Document uploaded successfully',
      guest,
      document: guest.document,
    });
  } catch (error) {
    console.error('[CAPTURE_SESSION] uploadGuestDocument failed:', error);
    return res.status(500).json({ message: 'Failed to save guest document' });
  }
};

/**
 * POST /api/bookings/:id/guests/:guestId/document
 * Desktop/Admin-authenticated endpoint to upload document directly for a guest slot
 */
export const uploadManualGuestDocument = async (req, res) => {
  try {
    const { Booking } = req.tenantModels;
    const { id: bookingId, guestId } = req.params;
    const documentUrl = req.uploadedDocumentUrl;

    if (!documentUrl) {
      return res.status(400).json({ message: 'Document image was not processed' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    ensureGuestRoster(booking);

    const guest = booking.guests.id ? booking.guests.id(guestId) : booking.guests.find((g) => String(g._id) === String(guestId));
    if (!guest) {
      return res.status(404).json({ message: 'Guest slot not found' });
    }

    const label = req.body.label?.trim() || guest.document?.label || 'Verification Document';
    guest.document = {
      label,
      url: documentUrl,
      uploadedVia: 'manual',
      uploadedAt: new Date(),
    };

    if (guest.role === 'PRIMARY') {
      booking.verificationImage = documentUrl;
    } else if (guest.role === 'FAMILY_MEMBER' && Array.isArray(booking.familyMembers)) {
      const match = booking.familyMembers.find((m) => m.name === guest.name);
      if (match) {
        match.verificationImage = documentUrl;
      }
    }

    await booking.save();

    logAction({
      action: 'ADMIN_GUEST_DOCUMENT_UPLOADED',
      entityType: 'Booking',
      entityId: booking._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        guestId: guest._id,
        guestName: guest.name,
        role: guest.role,
        label,
        uploadedVia: 'manual',
      },
    }, req.tenantDb).catch((err) => console.error('[AUDIT] manual upload doc error:', err));

    return res.status(200).json({
      message: 'Document uploaded successfully',
      guest,
      document: guest.document,
    });
  } catch (error) {
    console.error('[MANUAL_UPLOAD] uploadManualGuestDocument failed:', error);
    return res.status(500).json({ message: 'Failed to upload guest document' });
  }
};
