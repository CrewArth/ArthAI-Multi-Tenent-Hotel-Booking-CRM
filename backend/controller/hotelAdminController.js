import { logAction } from '../utils/auditLogger.js';
import { deletePatternCache } from '../config/redis.js';
import { generateId } from '../utils/generateId.js';

/**
 * Helper to ensure the request is scoped to the user's assigned hotel.
 */
const getAssignedGuestHouseId = (user) => {
  if (!user) return null;
  const assigned = user.assignedGuestHouseId;
  if (typeof assigned === 'object' && assigned !== null) {
    return assigned.guestHouseId || assigned._id || null;
  }
  return assigned || null;
};

/**
 * GET /api/hotel-admin/dashboard-stats
 * Returns summary statistics for the assigned hotel
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { GuestHouse, Room, Bed, Booking } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const ghId = guestHouse.guestHouseId;

    // Fetch rooms and beds
    const rooms = await Room.find({ guestHouseId: ghId }).lean();
    const roomIds = rooms.map(r => r._id);
    const beds = await Bed.find({ roomId: { $in: roomIds } }).lean();

    // Today range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bookings query
    const allBookings = await Booking.find({ guestHouseId: guestHouse._id })
      .populate('roomIds', 'roomNumber roomType price')
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .lean();

    const activeBookings = allBookings.filter(b => b.status === 'approved' || b.status === 'confirmed' || b.status === 'checked-in');
    const todayArrivals = allBookings.filter(b => {
      const checkIn = new Date(b.checkIn);
      return checkIn >= today && checkIn < tomorrow;
    });
    const todayDepartures = allBookings.filter(b => {
      const checkOut = new Date(b.checkOut);
      return checkOut >= today && checkOut < tomorrow;
    });

    const totalRevenue = allBookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
      .reduce((sum, b) => sum + (Number(b.bookingTotal) || Number(b.amountPaid) || 0), 0);

    const pendingPayments = allBookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'rejected')
      .reduce((sum, b) => sum + (Number(b.outstandingBalance) || 0), 0);

    const totalRooms = rooms.length;
    const occupiedRooms = activeBookings.reduce((acc, b) => acc + (b.roomIds?.length || 1), 0);
    const occupancyRate = totalRooms > 0 ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100)) : 0;

    return res.status(200).json({
      hotel: guestHouse,
      stats: {
        totalRooms,
        totalBeds: beds.length,
        activeBookings: activeBookings.length,
        todayArrivals: todayArrivals.length,
        todayDepartures: todayDepartures.length,
        occupancyRate,
        totalRevenue,
        pendingPayments,
      },
      recentBookings: allBookings.slice(0, 5),
    });
  } catch (error) {
    console.error('[HotelAdminController] getDashboardStats error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
  }
};

/**
 * GET /api/hotel-admin/hotel
 * Returns details of the assigned hotel
 */
export const getAssignedHotel = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    return res.status(200).json({ guestHouse });
  } catch (error) {
    console.error('[HotelAdminController] getAssignedHotel error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch hotel details' });
  }
};

/**
 * PUT /api/hotel-admin/hotel
 * Updates details of the assigned hotel (name, description, location, image, maintenance)
 */
export const updateAssignedHotel = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    let location = {};
    if (req.body.location) {
      try {
        location = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
      } catch {
        location = req.body.location;
      }
    }

    const updateData = {
      ...(req.body.guestHouseName && { guestHouseName: req.body.guestHouseName.trim() }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(Object.keys(location).length > 0 && { location }),
      ...(req.body.maintenance !== undefined && { maintenance: Boolean(req.body.maintenance) }),
    };

    if (req.optimizedImageUrl) {
      updateData.image = req.optimizedImageUrl;
    }

    const updatedGuestHouse = await GuestHouse.findOneAndUpdate(
      assignedId ? { guestHouseId: assignedId } : {},
      updateData,
      { new: true }
    );

    if (!updatedGuestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    await logAction({
      action: 'GUESTHOUSE_UPDATED',
      entityType: 'GuestHouse',
      entityId: updatedGuestHouse.guestHouseId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: updateData,
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:guesthouse*`);

    return res.status(200).json({
      message: 'Hotel details updated successfully',
      guestHouse: updatedGuestHouse,
    });
  } catch (error) {
    console.error('[HotelAdminController] updateAssignedHotel error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update hotel details' });
  }
};

/**
 * GET /api/hotel-admin/rooms
 * Returns rooms belonging strictly to the assigned hotel
 */
export const getAssignedRooms = async (req, res) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const rooms = await Room.find({ guestHouseId: guestHouse.guestHouseId })
      .sort({ roomNumber: 1 })
      .lean();

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('[HotelAdminController] getAssignedRooms error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch rooms' });
  }
};

/**
 * POST /api/hotel-admin/rooms
 * Creates a room for the assigned hotel
 */
export const createAssignedRoom = async (req, res) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const { roomNumber, roomType, floor, capacity, ratePerNight, price, discountPercentage } = req.body;

    if (!roomNumber) {
      return res.status(400).json({ message: 'Room number is required.' });
    }

    const existing = await Room.findOne({
      guestHouseId: guestHouse.guestHouseId,
      roomNumber: String(roomNumber).trim(),
    });

    if (existing) {
      return res.status(400).json({ message: `Room ${roomNumber} already exists in this hotel.` });
    }

    const roomId = await generateId('room', req.tenantDb);

    const newRoom = await Room.create({
      roomId,
      guestHouseId: guestHouse.guestHouseId,
      roomNumber: String(roomNumber).trim(),
      roomType: roomType || 'Standard',
      floor: Number(floor) || 1,
      roomCapacity: Number(capacity) || 2,
      price: Number(price) || Number(ratePerNight) || 1500,
      discountPercentage: Number(discountPercentage) || 0,
      isAvailable: req.body.isAvailable !== undefined ? Boolean(req.body.isAvailable) : (req.body.available !== undefined ? Boolean(req.body.available) : true),
      image: req.optimizedImageUrl || null,
    });

    await logAction({
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: newRoom.roomId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { roomNumber: newRoom.roomNumber, guestHouseId: newRoom.guestHouseId },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:room*`);

    return res.status(201).json({
      message: 'Room created successfully',
      room: newRoom,
    });
  } catch (error) {
    console.error('[HotelAdminController] createAssignedRoom error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create room' });
  }
};

/**
 * PUT /api/hotel-admin/rooms/:id
 * Updates a room for the assigned hotel
 */
export const updateAssignedRoom = async (req, res) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const { id } = req.params;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const room = await Room.findOne({
      _id: id,
      guestHouseId: guestHouse.guestHouseId,
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found in this hotel.' });
    }

    const { roomNumber, roomType, floor, capacity, ratePerNight, price, discountPercentage, available, isAvailable } = req.body;

    if (roomNumber !== undefined) room.roomNumber = String(roomNumber).trim();
    if (roomType !== undefined) room.roomType = roomType;
    if (floor !== undefined) room.floor = Number(floor);
    if (capacity !== undefined) room.roomCapacity = Number(capacity);
    if (price !== undefined || ratePerNight !== undefined) room.price = Number(price ?? ratePerNight);
    if (discountPercentage !== undefined) room.discountPercentage = Number(discountPercentage);
    if (isAvailable !== undefined || available !== undefined) {
      const activeVal = Boolean(isAvailable !== undefined ? isAvailable : available);
      room.isAvailable = activeVal;
    }
    if (req.optimizedImageUrl) room.image = req.optimizedImageUrl;

    await room.save();

    await logAction({
      action: 'ROOM_UPDATED',
      entityType: 'Room',
      entityId: room.roomId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { roomNumber: room.roomNumber },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:room*`);

    return res.status(200).json({
      message: 'Room updated successfully',
      room,
    });
  } catch (error) {
    console.error('[HotelAdminController] updateAssignedRoom error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update room' });
  }
};

/**
 * DELETE /api/hotel-admin/rooms/:id
 * Deletes a room and associated beds
 */
export const deleteAssignedRoom = async (req, res) => {
  try {
    const { Room, Bed, GuestHouse } = req.tenantModels;
    const { id } = req.params;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const room = await Room.findOneAndDelete({
      _id: id,
      guestHouseId: guestHouse.guestHouseId,
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found in this hotel.' });
    }

    // Delete associated beds
    await Bed.deleteMany({ roomId: id });

    await logAction({
      action: 'ROOM_DELETED',
      entityType: 'Room',
      entityId: room.roomId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { roomNumber: room.roomNumber },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:room*`);
    await deletePatternCache(`tenant:${dbName}:bed*`);

    return res.status(200).json({ message: 'Room and its beds deleted successfully' });
  } catch (error) {
    console.error('[HotelAdminController] deleteAssignedRoom error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete room' });
  }
};

/**
 * GET /api/hotel-admin/beds
 * Returns beds for rooms in the assigned hotel
 */
export const getAssignedBeds = async (req, res) => {
  try {
    const { Bed, Room, GuestHouse } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const rooms = await Room.find({ guestHouseId: guestHouse.guestHouseId }).lean();
    const roomIds = rooms.map(r => r._id);

    const beds = await Bed.find({ roomId: { $in: roomIds } })
      .populate('roomId', 'roomNumber roomType floor')
      .sort({ bedNumber: 1 })
      .lean();

    return res.status(200).json({ beds, rooms });
  } catch (error) {
    console.error('[HotelAdminController] getAssignedBeds error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch beds' });
  }
};

/**
 * POST /api/hotel-admin/beds
 * Creates a bed for a room in the assigned hotel
 */
export const createAssignedBed = async (req, res) => {
  try {
    const { Bed, Room, GuestHouse } = req.tenantModels;
    const { roomId, bedNumber, bedType, price, available } = req.body;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    const room = await Room.findOne({ _id: roomId, guestHouseId: guestHouse.guestHouseId });

    if (!room) {
      return res.status(404).json({ message: 'Target room does not belong to your hotel.' });
    }

    const bedId = await generateId('bed', req.tenantDb);

    const newBed = await Bed.create({
      bedId,
      roomId,
      bedNumber: Number(bedNumber),
      bedType: bedType || 'Single',
      price: Number(price) || 500,
      available: available !== undefined ? Boolean(available) : true,
    });

    await logAction({
      action: 'BED_CREATED',
      entityType: 'Bed',
      entityId: newBed.bedId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { bedNumber: newBed.bedNumber, roomId },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:bed*`);

    return res.status(201).json({ message: 'Bed created successfully', bed: newBed });
  } catch (error) {
    console.error('[HotelAdminController] createAssignedBed error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create bed' });
  }
};

/**
 * DELETE /api/hotel-admin/beds/:id
 * Deletes a bed
 */
export const deleteAssignedBed = async (req, res) => {
  try {
    const { Bed, Room, GuestHouse } = req.tenantModels;
    const { id } = req.params;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    const rooms = await Room.find({ guestHouseId: guestHouse.guestHouseId }).select('_id').lean();
    const roomIds = rooms.map(r => String(r._id));

    const bed = await Bed.findById(id);
    if (!bed || !roomIds.includes(String(bed.roomId))) {
      return res.status(404).json({ message: 'Bed not found in your hotel.' });
    }

    await Bed.findByIdAndDelete(id);

    await logAction({
      action: 'BED_DELETED',
      entityType: 'Bed',
      entityId: bed.bedId,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { bedNumber: bed.bedNumber },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:bed*`);

    return res.status(200).json({ message: 'Bed deleted successfully' });
  } catch (error) {
    console.error('[HotelAdminController] deleteAssignedBed error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete bed' });
  }
};

/**
 * GET /api/hotel-admin/bookings
 * Returns bookings for the assigned hotel
 */
export const getAssignedBookings = async (req, res) => {
  try {
    const { Booking, GuestHouse, User } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const {
      page = 1,
      limit = 10,
      status,
      search,
      fromDate,
      toDate,
    } = { ...req.query, ...req.body };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { guestHouseId: guestHouse._id };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.checkIn = {};
      if (fromDate) filter.checkIn.$gte = new Date(fromDate);
      if (toDate) filter.checkIn.$lte = new Date(toDate);
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const userRegex = new RegExp(q, 'i');
      const matchingUsers = await User.find({
        $or: [
          { firstName: userRegex },
          { lastName: userRegex },
          { email: userRegex },
          { phone: userRegex },
        ],
      }).select('_id').lean();

      const userIds = matchingUsers.map(u => u._id);

      filter.$or = [
        { bookingId: new RegExp(q, 'i') },
        { fullName: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { userId: { $in: userIds } },
      ];
    }

    const [totalCount, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('roomIds', 'roomNumber roomType price')
        .populate('bedId', 'bedNumber bedType price')
        .populate('userId', 'firstName lastName email phone address identityType identityNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return res.status(200).json({
      hotel: guestHouse,
      bookings,
      totalCount,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('[HotelAdminController] getAssignedBookings error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch bookings' });
  }
};

/**
 * PATCH /api/hotel-admin/bookings/:id/status
 * Updates a booking status (check-in, check-out, cancel, approve)
 */
export const updateAssignedBookingStatus = async (req, res) => {
  try {
    const { Booking, GuestHouse, Bed } = req.tenantModels;
    const { id } = req.params;
    const { status } = req.body;
    const assignedId = getAssignedGuestHouseId(req.user);

    const allowedStatuses = ['pending', 'approved', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status '${status}'. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse) {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const booking = await Booking.findOne({ _id: id, guestHouseId: guestHouse._id });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this hotel.' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // Release bed if checked-out or cancelled
    if ((status === 'checked-out' || status === 'cancelled') && booking.bedId && Bed) {
      await Bed.findByIdAndUpdate(booking.bedId, { available: true, isAvailable: true }).catch(() => {});
    }

    await logAction({
      action: 'BOOKING_STATUS_UPDATED',
      entityType: 'Booking',
      entityId: booking.bookingId || booking._id,
      performedBy: req.user?.email || 'Hotel Admin',
      details: { previousStatus, newStatus: status },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({
      message: `Booking status updated to ${status}`,
      booking,
    });
  } catch (error) {
    console.error('[HotelAdminController] updateAssignedBookingStatus error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update booking status' });
  }
};

/**
 * GET /api/hotel-admin/configuration
 * Returns configuration settings for the assigned hotel from Configuration collection
 */
export const getAssignedConfiguration = async (req, res) => {
  try {
    const { GuestHouse, Configuration } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const ghObjectId = guestHouse?._id || null;

    let config = await Configuration.findOne(
      ghObjectId ? { guestHouseId: ghObjectId } : {}
    ).lean();

    if (!config) {
      config = await Configuration.create({
        guestHouseId: ghObjectId,
        sendEmail: true,
        sendWhatsapp: false,
        dynamicRoomPrice: false,
      });
    }

    return res.status(200).json({
      hotel: guestHouse ? {
        guestHouseId: guestHouse.guestHouseId,
        guestHouseName: guestHouse.guestHouseName,
      } : null,
      configuration: {
        sendEmail: config.sendEmail !== false,
        sendWhatsapp: Boolean(config.sendWhatsapp),
        dynamicRoomPrice: Boolean(config.dynamicRoomPrice),
      },
    });
  } catch (error) {
    console.error('[HotelAdminController] getAssignedConfiguration error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch configuration' });
  }
};

/**
 * PUT /api/hotel-admin/configuration
 * Updates configuration settings for the assigned hotel in Configuration collection
 */
export const updateAssignedConfiguration = async (req, res) => {
  try {
    const { GuestHouse, Configuration } = req.tenantModels;
    const assignedId = getAssignedGuestHouseId(req.user);
    const { sendEmail, sendWhatsapp, dynamicRoomPrice } = req.body;

    if (!assignedId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'No hotel assigned to your account.' });
    }

    const guestHouse = await GuestHouse.findOne(assignedId ? { guestHouseId: assignedId } : {}).lean();
    if (!guestHouse && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(404).json({ message: 'Assigned hotel not found.' });
    }

    const ghObjectId = guestHouse?._id || null;

    const updateData = {};
    if (sendEmail !== undefined) {
      updateData.sendEmail = Boolean(sendEmail);
    }
    if (sendWhatsapp !== undefined) {
      updateData.sendWhatsapp = Boolean(sendWhatsapp);
    }
    if (dynamicRoomPrice !== undefined) {
      updateData.dynamicRoomPrice = Boolean(dynamicRoomPrice);
    }

    const updatedConfig = await Configuration.findOneAndUpdate(
      ghObjectId ? { guestHouseId: ghObjectId } : {},
      { $set: { ...updateData, guestHouseId: ghObjectId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logAction({
      action: 'TENANT_CONFIGURATION_UPDATED',
      entityType: 'Configuration',
      entityId: updatedConfig._id,
      performedBy: req.user?.email || 'Hotel Admin',
      details: updateData,
    }, req.tenantDb).catch(() => {});

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({
      message: 'Configuration updated successfully',
      configuration: {
        sendEmail: updatedConfig.sendEmail !== false,
        sendWhatsapp: Boolean(updatedConfig.sendWhatsapp),
        dynamicRoomPrice: Boolean(updatedConfig.dynamicRoomPrice),
      },
    });
  } catch (error) {
    console.error('[HotelAdminController] updateAssignedConfiguration error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update configuration' });
  }
};
