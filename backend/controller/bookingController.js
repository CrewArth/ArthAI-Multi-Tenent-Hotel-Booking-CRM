import mongoose from "mongoose";
import { logAction } from "../utils/auditLogger.js";
import { sendEmail } from '../utils/emailService.js';
import { sendBookingWhatsApp, sendCancelWhatsApp } from '../utils/whatsappService.js';
import { bookingRequest } from "../utils/emailTemplates/bookingRequest.js";
import { bookingStatusUpdate } from "../utils/emailTemplates/bookingStatusUpdate.js";
import { upsertNormalUser } from "../utils/upsertNormalUser.js";
import { isObjectId } from "../utils/isObjectId.js";

const parseFamilyMembers = (familyMembers) => {
  if (!familyMembers) return [];

  const parsedFamilyMembers = typeof familyMembers === "string"
    ? JSON.parse(familyMembers)
    : familyMembers;

  if (!Array.isArray(parsedFamilyMembers)) {
    throw new Error("Family details must be a list");
  }

  return parsedFamilyMembers
    .filter((member) => member?.name || member?.relation || member?.age)
    .map((member) => ({
      name: String(member.name || "").trim(),
      relation: String(member.relation || "").trim(),
      age: member.age === "" || member.age == null ? undefined : Number(member.age),
    }));
};

const parseRoomIds = (body) => {
  const rawIds = body.roomIds ?? body['roomIds[]'];
  let ids = Array.isArray(rawIds) ? rawIds : rawIds;

  if (typeof ids === 'string') {
    try {
      const parsed = JSON.parse(ids);
      ids = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      ids = ids.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (Array.isArray(ids) && ids.length > 0) {
    return [...new Set(ids.map(String).filter(Boolean))];
  }
  if (body.roomId) {
    return [String(body.roomId)];
  }
  return [];
};

const getBookingRoomIdStrings = (booking) => {
  if (booking.roomIds?.length) {
    return booking.roomIds.map((room) =>
      (typeof room === "object" && room?._id ? room._id : room).toString()
    );
  }
  if (booking.roomId) {
    const id = typeof booking.roomId === "object" && booking.roomId._id
      ? booking.roomId._id
      : booking.roomId;
    return [id.toString()];
  }
  return [];
};

const formatBookingRoomsLabel = (booking) => {
  const rooms = booking.roomIds?.length
    ? booking.roomIds
    : booking.roomId
      ? [booking.roomId]
      : [];
  return rooms
    .map((room) => (typeof room === "object" && room?.roomNumber ? `Room ${room.roomNumber}` : ""))
    .filter(Boolean)
    .join(", ");
};

const checkRoomAvailability = async ({ Booking, roomIds, bedId, checkInDate, checkOutDate, excludeId }) => {
  if (bedId && roomIds.length === 1) {
    const query = {
      bedId,
      status: "approved",
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const overlap = await Booking.findOne(query);
    if (overlap) {
      return { conflict: true, message: "This bed is already booked for the selected dates" };
    }
    return { conflict: false };
  }

  for (const roomId of roomIds) {
    const query = {
      status: "approved",
      bedId: null,
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      $or: [{ roomId }, { roomIds: roomId }],
    };
    if (excludeId) query._id = { $ne: excludeId };
    const overlap = await Booking.findOne(query);
    if (overlap) {
      return { conflict: true, message: "One or more selected rooms are already booked for the selected dates" };
    }
  }

  return { conflict: false };
};

export const createAdminBooking = async (req, res) => {
  try {
    const { Booking, GuestHouse, Room, Bed } = req.tenantModels;
    const {
      guestHouseId, bedId, checkIn, checkOut,
      fullName, email, phone, address, dateOfBirth, gender, nationality,
      identityType, identityNumber, emergencyContactName, emergencyContactPhone, specialRequests,
    } = req.body;

    const roomIds = parseRoomIds(req.body);
    const primaryRoomId = roomIds[0] || req.body.roomId;
    const selectedBedId = bedId && String(bedId).trim() !== '' && String(bedId).trim() !== 'null' && String(bedId).trim() !== 'undefined' ? bedId : null;

    if (!guestHouseId || roomIds.length === 0 || !checkIn || !checkOut || !fullName || !email || !phone || !address || !identityType || !req.verificationImageUrl) {
      return res.status(400).json({ message: "Booking, guest, identity, and verification image details are required" });
    }

    if (roomIds.length > 1 && selectedBedId) {
      return res.status(400).json({ message: "Bed selection is only available when booking a single room" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out must be after check-in" });
    }

    const familyMembers = parseFamilyMembers(req.body.familyMembers);
    if (familyMembers.some((member) => !member.name || !member.relation || (member.age !== undefined && Number.isNaN(member.age)))) {
      return res.status(400).json({ message: "Each family member needs a name, relation, and valid age" });
    }

    const familyMemberImageUrls = req.familyMemberImageUrls || {};
    const familyMembersWithImages = familyMembers.map((member, i) => ({
      ...member,
      ...(familyMemberImageUrls[i] ? { verificationImage: familyMemberImageUrls[i] } : {}),
    }));

    const isObjId = isObjectId(guestHouseId);
    const [guestHouse, rooms, bed, overlapResult] = await Promise.all([
      GuestHouse.findOne({
        $or: [
          { guestHouseId },
          ...(isObjId ? [{ _id: guestHouseId }] : []),
        ],
      }),
      Room.find({ _id: { $in: roomIds } }),
      selectedBedId ? Bed.findById(selectedBedId) : Promise.resolve(null),
      checkRoomAvailability({ Booking, roomIds, bedId: selectedBedId, checkInDate, checkOutDate }),
    ]);

    if (!guestHouse) {
      return res.status(404).json({ message: "Selected guest house was not found" });
    }

    if (rooms.length !== roomIds.length) {
      return res.status(404).json({ message: "One or more selected rooms were not found" });
    }

    const invalidRoom = rooms.find((room) => room.guestHouseId !== guestHouse.guestHouseId);
    if (invalidRoom) {
      return res.status(400).json({ message: "All selected rooms must belong to the chosen guest house" });
    }

    if (selectedBedId && !bed) {
      return res.status(404).json({ message: "Selected bed was not found" });
    }

    if (bed && (String(bed.roomId) !== String(primaryRoomId) || rooms[0].guestHouseId !== guestHouse.guestHouseId)) {
      return res.status(400).json({ message: "Selected room and bed do not belong to this guest house" });
    }

    if (overlapResult.conflict) {
      return res.status(409).json({ message: overlapResult.message });
    }

    const guestUser = await upsertNormalUser({
      fullName, email, phone, address,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      nationality, identityType, identityNumber,
      emergencyContactName, emergencyContactPhone,
      guestHouseId: guestHouse._id,
      bookingId: null,
    }, req.tenantDb);

    const booking = await Booking.create({
      userId: guestUser._id,
      guestHouseId: guestHouse._id,
      roomId: primaryRoomId,
      roomIds,
      bedId: selectedBedId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: "approved",
      verificationImage: req.verificationImageUrl,
      familyMembers: familyMembersWithImages,
      specialRequests: specialRequests?.trim(),
      bookingSource: "admin",
      createdBy: req.user?._id,
    });

    upsertNormalUser({
      fullName, email, phone, address,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      nationality, identityType, identityNumber,
      emergencyContactName, emergencyContactPhone,
      guestHouseId: guestHouse._id,
      bookingId: booking._id,
    }, req.tenantDb).catch((error) => console.error("NormalUser upsert error:", error));

    sendEmail({
      to: email,
      subject: "Room Booked Successfully",
      html: bookingRequest({ email, firstName: fullName.split(' ')[0] || fullName, lastName: fullName.split(' ').slice(1).join(' ') || '' }, booking, guestHouse),
    }).catch((error) => console.error("Email send error:", error));

    sendBookingWhatsApp({
      to: phone,
      guestHouseName: guestHouse.guestHouseName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomNumber: rooms.map(r => `Room ${r.roomNumber}`).join(", "),
    }).catch((error) => console.error("WhatsApp send error:", error));

    return res.status(201).json({ message: "Room booked successfully", booking });
  } catch (error) {
    console.error("Error creating admin booking:", error);
    return res.status(500).json({ message: error.message || "Server error creating booking" });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { Booking, User, GuestHouse } = req.tenantModels;
    const { guestHouseId, roomId, bedId, checkIn, checkOut } = req.body;
    const userId = req.user?._id || req.body.userId;
    const roomIds = parseRoomIds(req.body);
    const primaryRoomId = roomIds[0] || roomId;
    const selectedBedId = bedId && String(bedId).trim() !== '' && String(bedId).trim() !== 'null' && String(bedId).trim() !== 'undefined' ? bedId : null;

    if (!guestHouseId || roomIds.length === 0 || !checkIn || !checkOut) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (roomIds.length > 1 && selectedBedId) {
      return res.status(400).json({ message: "Bed selection is only available when booking a single room" });
    }

    const isObjectIdGH = isObjectId(guestHouseId);
    const [user, guestHouse, overlap] = await Promise.all([
      User.findById(userId),
      GuestHouse.findOne({
        $or: [
          { guestHouseId },
          ...(isObjectIdGH ? [{ _id: guestHouseId }] : []),
        ],
      }),
      Booking.findOne({
        bedId: selectedBedId,
        status: "approved",
        $or: [
          { checkIn: { $lte: new Date(checkOut) }, checkOut: { $gte: new Date(checkIn) } },
        ],
      })
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!guestHouse) {
      return res.status(404).json({ message: "Guest house not found" });
    }

    if (overlap) {
      return res.status(400).json({ message: "This bed is already booked for the selected dates" });
    }

    const newBooking = new Booking({
      userId,
      guestHouseId: guestHouse._id,
      roomId: primaryRoomId,
      roomIds,
      bedId: selectedBedId,
      checkIn,
      checkOut,
      specialRequests: req.body.specialRequests,
    });

    await newBooking.save();

    res.status(201).json({ message: "Booking request submitted", newBooking });

    sendEmail({
      to: user.email || req.body.email,
      subject: "Room Booked Successfully",
      html: bookingRequest(user, newBooking, guestHouse),
    }).catch(err => console.error("Email send error:", err));

    sendBookingWhatsApp({
      to: req.body.phone || user.phone,
      guestHouseName: guestHouse.guestHouseName,
      checkIn: newBooking.checkIn,
      checkOut: newBooking.checkOut,
      roomNumber: "Pending assignment",
    }).catch(err => console.error("WhatsApp send error:", err));

    logAction({
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: newBooking._id,
      performedBy: req.user?.email || "User",
      details: { guestHouseId, roomId, bedId, checkIn, checkOut },
    }, req.tenantDb).catch(err => console.error("Audit log error:", err));
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error creating booking" });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const { Booking, GuestHouse } = req.tenantModels;
    const { startDate, endDate, guestHouseId, status } = req.body;
    const page  = Math.max(1, parseInt(req.body.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.body.limit) || 10));
    const skip  = (page - 1) * limit;

    const query = {};

    if (guestHouseId) {
      const isObjId = isObjectId(guestHouseId);
      const gh = await GuestHouse.findOne({
        $or: [
          { guestHouseId },
          ...(isObjId ? [{ _id: guestHouseId }] : [])
        ]
      }).lean();

      const targetId = gh ? gh._id : (isObjId ? new mongoose.Types.ObjectId(guestHouseId) : null);
      if (targetId) query.guestHouseId = targetId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid start date" });
        }
        query.checkOut = { $gt: start };
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid end date" });
        }
        query.checkIn = { $lt: end };
      }
    }

    const [totalCount, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .populate("userId", "email firstName lastName phone")
        .populate("guestHouseId", "guestHouseId guestHouseName location")
        .populate("roomId", "roomNumber")
        .populate("roomIds", "roomNumber roomType")
        .populate("bedId", "bedNumber bedType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ bookings, totalCount, totalPages, currentPage: page, limit });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ message: "Server error fetching bookings" });
  }
};

export const exportDailyBookings = async (req, res) => {
  try {
    const { Booking } = req.tenantModels;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: "date query parameter is required (YYYY-MM-DD)" });
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const bookings = await Booking.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("userId", "firstName lastName email phone")
      .populate("guestHouseId", "guestHouseId guestHouseName location")
      .populate("roomId", "roomNumber")
      .populate("roomIds", "roomNumber roomType")
      .populate("bedId", "bedNumber bedType")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Applied On", "Status", "Guest House", "User Name", "User Email", "User Phone",
      "Check In", "Check Out", "Room", "Bed", "Special Requests"
    ];

    const escapeValue = (value) => {
      if (value === null || value === undefined) return '""';
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = bookings.map((b) => [
      escapeValue(new Date(b.createdAt).toISOString()),
      escapeValue(b.status),
      escapeValue(b.guestHouseId?.guestHouseName || ""),
      escapeValue(`${b.userId?.firstName || ""} ${b.userId?.lastName || ""}`.trim()),
      escapeValue(b.userId?.email || ""),
      escapeValue(b.userId?.phone || ""),
      escapeValue(new Date(b.checkIn).toISOString()),
      escapeValue(new Date(b.checkOut).toISOString()),
      escapeValue(formatBookingRoomsLabel(b)),
      escapeValue(b.bedId?.bedNumber ? `Bed ${b.bedId.bedNumber} (${b.bedId.bedType})` : ""),
      escapeValue(b.specialRequests || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-${date}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting daily bookings:", error);
    return res.status(500).json({ success: false, error: "Server error while exporting bookings" });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { Booking } = req.tenantModels;
    const userId = req.user?._id || req.body.userId;
    const bookings = await Booking.find({ userId })
      .populate("guestHouseId", "guestHouseId guestHouseName location")
      .populate("roomId", "roomNumber")
      .populate("roomIds", "roomNumber roomType")
      .populate("bedId", "bedNumber bedType")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ message: "Server error fetching user bookings" });
  }
};

export const approveBooking = async (req, res) => {
  try {
    const { Booking, Bed, User, GuestHouse, Room } = req.tenantModels;
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const [user, guestHouse] = await Promise.all([
      User.findById(booking.userId),
      GuestHouse.findById(booking.guestHouseId)
    ]);

    if (!user || !guestHouse) {
      return res.status(404).json({ message: "User or Guest House not found" });
    }

    const [updatedBooking] = await Promise.all([
      Booking.findByIdAndUpdate(id, { status: "approved" }, { new: true }),
      Bed.findByIdAndUpdate(booking.bedId, { isAvailable: false })
    ]);

    res.json({ message: "Booking approved successfully", booking: updatedBooking });

    sendEmail({
      to: user.email,
      subject: "✅ Booking Approved",
      html: bookingStatusUpdate(user, updatedBooking, guestHouse, "approved"),
    }).catch(err => console.error("❌ Failed to send approval email:", err));

    Room.find({ _id: { $in: updatedBooking.roomIds?.length ? updatedBooking.roomIds : [updatedBooking.roomId] } })
      .then(rooms => sendBookingWhatsApp({
        to: user.phone,
        guestHouseName: guestHouse.guestHouseName,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        roomNumber: rooms.map(r => `Room ${r.roomNumber}`).join(", ") || "N/A",
      }))
      .catch(err => console.error("❌ WhatsApp send error (approve):", err));

    logAction({
      action: "BOOKING_APPROVED",
      entityType: "Booking",
      entityId: updatedBooking._id,
      performedBy: req.user?.email || "Admin",
      details: { status: "approved" },
    }, req.tenantDb).catch(err => console.error("❌ Audit log error:", err));
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({ message: "Server error approving booking" });
  }
};

export const rejectBooking = async (req, res) => {
  try {
    const { Booking, User, GuestHouse, Room } = req.tenantModels;
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const [user, guestHouse] = await Promise.all([
      User.findById(booking.userId),
      GuestHouse.findById(booking.guestHouseId)
    ]);

    if (!user || !guestHouse) {
      return res.status(404).json({ message: "User or Guest House not found" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      id, 
      { status: "rejected" }, 
      { new: true }
    );

    res.json({ message: "Booking rejected successfully", booking: updatedBooking });

    sendEmail({
      to: user.email,
      subject: "❌ Booking Rejected",
      html: bookingStatusUpdate(user, updatedBooking, guestHouse, "rejected"),
    }).catch(err => console.error("❌ Failed to send rejection email:", err));

    Room.find({ _id: { $in: updatedBooking.roomIds?.length ? updatedBooking.roomIds : [updatedBooking.roomId] } })
      .then(rooms => sendBookingWhatsApp({
        to: user.phone,
        guestHouseName: guestHouse.guestHouseName,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        roomNumber: rooms.map(r => `Room ${r.roomNumber}`).join(", ") || "N/A",
      }))
      .catch(err => console.error("❌ WhatsApp send error (reject):", err));

    logAction({
      action: "BOOKING_REJECTED",
      entityType: "Booking",
      entityId: updatedBooking._id,
      performedBy: req.user?.email || "Admin",
      details: { status: "rejected" },
    }, req.tenantDb).catch(err => console.error("❌ Audit log error:", err));
  } catch (error) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ message: "Server error rejecting booking" });
  }
};

export const checkAvailability = async (req, res) => {
  try {
    const { GuestHouse, Booking, Room, Bed } = req.tenantModels;
    const { guestHouseId, checkIn, checkOut, excludeBookingId } = req.body;

    if (!guestHouseId || !checkIn || !checkOut) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const isObjId = isObjectId(guestHouseId);
    const guestHouse = await GuestHouse.findOne({
      $or: [
        { guestHouseId },
        ...(isObjId ? [{ _id: guestHouseId }] : []),
      ],
    });

    if (!guestHouse) {
      return res.status(404).json({ message: "Guest house not found" });
    }

    const bookingQuery = {
      guestHouseId: guestHouse._id,
      status: "approved",
      $or: [
        {
          checkIn: { $lte: new Date(checkOut) },
          checkOut: { $gte: new Date(checkIn) },
        },
      ],
    };

    if (excludeBookingId && isObjectId(excludeBookingId)) {
      bookingQuery._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId) };
    }

    const overlappingBookings = await Booking.find(bookingQuery)
      .populate("roomId", "roomNumber")
      .populate("roomIds", "roomNumber roomType")
      .populate("bedId", "bedNumber bedType");

    const unavailableBeds = [
      ...new Set(overlappingBookings.map(b => b.bedId?._id.toString())),
    ];

    const rooms = await Room.find({
      guestHouseId: guestHouse.guestHouseId,
      isActive: true,
    });

    const unavailableRooms = [];

    for (const room of rooms) {
      const hasRoomLevelBooking = overlappingBookings.some(
        (b) => !b.bedId && getBookingRoomIdStrings(b).includes(room._id.toString())
      );

      if (hasRoomLevelBooking) {
        unavailableRooms.push(room._id.toString());
        continue;
      }

      const totalBeds = await Bed.countDocuments({ roomId: room._id, isActive: true });
      if (totalBeds === 0) continue;

      const bookedBedsInRoom = overlappingBookings.filter(
        (booking) => booking.bedId && getBookingRoomIdStrings(booking).includes(room._id.toString())
      );

      const bookedBedIds = new Set(
        bookedBedsInRoom.map(b => b.bedId?._id.toString()).filter(Boolean)
      );

      if (bookedBedIds.size >= totalBeds) {
        unavailableRooms.push(room._id.toString());
      }
    }

    res.json({ unavailableRooms, unavailableBeds });
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ message: "Server error while checking availability" });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { Booking, Bed, User, GuestHouse, Room } = req.tenantModels;
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    const [user, guestHouse] = await Promise.all([
      User.findById(booking.userId),
      GuestHouse.findById(booking.guestHouseId),
    ]);

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );

    await Bed.findByIdAndUpdate(booking.bedId, { isAvailable: true });

    res.json({ message: "Booking cancelled successfully", booking: updatedBooking });

    if (user && guestHouse) {
      sendEmail({
        to: user.email,
        subject: "🚫 Booking Cancelled",
        html: bookingStatusUpdate(user, updatedBooking, guestHouse, "cancelled"),
      }).catch(err => console.error("❌ Failed to send cancellation email:", err));

      Room.find({ _id: { $in: updatedBooking.roomIds?.length ? updatedBooking.roomIds : [updatedBooking.roomId] } })
        .then(rooms => sendCancelWhatsApp({
          to: user.phone,
          roomNumber: rooms.map(r => `Room ${r.roomNumber}`).join(", ") || "N/A",
          guestHouseName: guestHouse.guestHouseName,
        }))
        .catch(err => console.error("❌ WhatsApp send error (cancel):", err));
    }

    logAction({
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: updatedBooking._id,
      performedBy: req.user?.email || "Admin",
      details: { status: "cancelled" },
    }, req.tenantDb).catch(err => console.error("❌ Audit log error:", err));
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Server error cancelling booking" });
  }
};

export const getApprovedBookingsForCalendar = async (req, res) => {
  try {
    const { Booking, GuestHouse } = req.tenantModels;
    const query = { status: { $in: ["approved", "cancelled"] } };
    const user = req.user;

    if (user?.role === 'ADMIN' && user.assignedGuestHouseId) {
      const ghId = typeof user.assignedGuestHouseId === 'object'
        ? user.assignedGuestHouseId.guestHouseId
        : user.assignedGuestHouseId;
      if (ghId) {
        const isObjId = isObjectId(ghId) && /^[a-f\d]{24}$/i.test(ghId);
        const gh = await GuestHouse.findOne({
          $or: [{ guestHouseId: ghId }, ...(isObjId ? [{ _id: ghId }] : [])],
        }).lean();
        if (gh) query.guestHouseId = gh._id;
      }
    }

    const bookings = await Booking.find(query)
      .populate("userId", "firstName lastName email")
      .populate({ path: "guestHouseId", select: "guestHouseId guestHouseName location", options: { strictPopulate: false } })
      .populate("roomId", "roomNumber")
      .populate("roomIds", "roomNumber roomType")
      .populate("bedId", "bedNumber bedType")
      .sort({ checkIn: 1 })
      .lean();

    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching approved bookings for calendar:", error);
    res.status(500).json({ message: "Server error fetching calendar bookings" });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { Booking } = req.tenantModels;
    const booking = await Booking.findById(req.params.id)
      .populate("userId", "firstName lastName email phone address dateOfBirth gender nationality identityType identityNumber emergencyContactName emergencyContactPhone")
      .populate("guestHouseId", "guestHouseId guestHouseName location")
      .populate("roomId", "roomNumber roomType _id")
      .populate("roomIds", "roomNumber roomType _id")
      .populate("bedId", "bedNumber bedType _id")
      .lean();

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error fetching booking" });
  }
};

export const updateAdminBooking = async (req, res) => {
  try {
    const { Booking, GuestHouse, Room, Bed } = req.tenantModels;
    const { id } = req.params;
    const {
      guestHouseId, bedId,
      checkIn, checkOut,
      fullName, email, phone, address,
      dateOfBirth, gender, nationality,
      identityType, identityNumber,
      emergencyContactName, emergencyContactPhone,
      specialRequests,
    } = req.body;

    const roomIds = parseRoomIds(req.body);

    if (!guestHouseId || roomIds.length === 0 || !checkIn || !checkOut || !fullName || !email || !phone || !address || !identityType) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    if (roomIds.length > 1 && bedId) {
      return res.status(400).json({ message: "Bed selection is only available when booking a single room" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      return res.status(400).json({ message: "Check-out must be after check-in" });
    }

    const isObjectIdGH2 = isObjectId(guestHouseId);
    const [guestHouse, rooms, bed, overlapResult] = await Promise.all([
      GuestHouse.findOne({
        $or: [
          { guestHouseId },
          ...(isObjectIdGH2 ? [{ _id: guestHouseId }] : []),
        ],
      }),
      Room.find({ _id: { $in: roomIds } }),
      bedId ? Bed.findById(bedId) : Promise.resolve(null),
      checkRoomAvailability({ Booking, roomIds, bedId, checkInDate, checkOutDate, excludeId: id }),
    ]);

    if (!guestHouse) {
      return res.status(404).json({ message: "Selected guest house was not found" });
    }

    if (rooms.length !== roomIds.length) {
      return res.status(404).json({ message: "One or more selected rooms were not found" });
    }

    const invalidRoom = rooms.find((room) => room.guestHouseId !== guestHouse.guestHouseId);
    if (invalidRoom) {
      return res.status(400).json({ message: "All selected rooms must belong to the chosen guest house" });
    }

    if (bedId && !bed) {
      return res.status(404).json({ message: "Selected bed was not found" });
    }

    if (bed && String(bed.roomId) !== String(roomIds[0])) {
      return res.status(400).json({ message: "Selected bed does not belong to the selected room" });
    }

    if (overlapResult.conflict) {
      return res.status(409).json({ message: overlapResult.message });
    }

    const familyMembers = parseFamilyMembers(req.body.familyMembers);
    const familyMemberImageUrls = req.familyMemberImageUrls || {};
    const familyMembersWithImages = familyMembers.map((member, i) => ({
      ...member,
      ...(familyMemberImageUrls[i] ? { verificationImage: familyMemberImageUrls[i] } : {}),
    }));

    const existingBooking = await Booking.findById(id).lean();
    if (existingBooking?.userId) {
      upsertNormalUser({
        fullName, email, phone, address,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        nationality, identityType, identityNumber,
        emergencyContactName, emergencyContactPhone,
        bookingId: id,
      }, req.tenantDb).catch((err) => console.error("NormalUser upsert error:", err));
    }

    const primaryRoomId = roomIds[0];

    const updateData = {
      guestHouseId: guestHouse._id,
      roomId: primaryRoomId,
      roomIds,
      bedId: bedId || undefined,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      familyMembers: familyMembersWithImages,
      specialRequests: specialRequests?.trim(),
    };

    if (req.verificationImageUrl) {
      updateData.verificationImage = req.verificationImageUrl;
    }

    const updated = await Booking.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: "Booking not found" });

    logAction({
      action: "ADMIN_BOOKING_UPDATED",
      entityType: "Booking",
      entityId: updated._id,
      performedBy: req.user?.email || "Admin",
      details: { guestHouseId, roomIds, bedId, checkIn, checkOut },
    }, req.tenantDb).catch((err) => console.error("Audit log error:", err));

    return res.status(200).json({ message: "Booking updated successfully", booking: updated });
  } catch (error) {
    console.error("Error updating admin booking:", error);
    return res.status(500).json({ message: error.message || "Server error updating booking" });
  }
};
