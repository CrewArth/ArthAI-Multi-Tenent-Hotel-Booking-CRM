import { createRoomSchema, updateRoomSchema, listRoomsQuerySchema } from '../validators/room.schema.js';
import { logAction } from '../utils/auditLogger.js';
import { isObjectId } from '../utils/isObjectId.js';
import { getCache, setCache, deletePatternCache } from '../config/redis.js';

const sendError = (res, status, message, details) =>
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });

const resolveGuestHouse = async (GuestHouse, guestHouseIdParam) => {
  if (!guestHouseIdParam) return null;
  const isObjId = isObjectId(guestHouseIdParam);
  return await GuestHouse.findOne({
    $or: [
      { guestHouseId: guestHouseIdParam },
      ...(isObjId ? [{ _id: guestHouseIdParam }] : []),
    ],
  }).lean();
};

// Create Room 
export const createRoom = async (req, res) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const { error, value } = createRoomSchema.validate(req.body, { abortEarly: false });
    if (error) return sendError(res, 400, 'Validation failed', error.details);

    const { guestHouseId, roomNumber, roomType, roomCapacity, price, discountPercentage, isAvailable } = value;

    const gh = await resolveGuestHouse(GuestHouse, guestHouseId);
    if (!gh) return sendError(res, 404, `Guest House ${guestHouseId} not found`);

    const room = await Room.create({
      guestHouseId: gh.guestHouseId,
      roomNumber,
      roomType: roomType || 'single',
      roomCapacity,
      price,
      discountPercentage: discountPercentage ?? 0,
      isAvailable
    });

    await logAction({
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: room._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        guestHouseId: room.guestHouseId,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
      },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:rooms:*`);

    return res.status(201).json({ success: true, message: 'Room created', room });
  } catch (err) {
    if (err?.code === 11000) {
      return sendError(res, 409, 'Room already exists for this guest house (duplicate roomNumber).');
    }
    console.error('createRoom error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// GET /api/rooms
export const listRooms = async (req, res) => {
  try {
    const { Room } = req.tenantModels;
    const { error, value } = listRoomsQuerySchema.validate(req.body, { abortEarly: false });
    if (error) return sendError(res, 400, 'Invalid query', error.details);

    const { guestHouseId, roomType, isAvailable, isActive, page, limit, sort, order } = value;

    const filter = {};
    if (guestHouseId !== undefined) filter.guestHouseId = guestHouseId;
    if (roomType !== undefined) filter.roomType = roomType;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable;
    if (isActive !== undefined) filter.isActive = isActive;
    else filter.isActive = true;

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      Room.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit),
      Room.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items
    });
  } catch (err) {
    console.error('listRooms error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// GET /api/rooms/:id
export const getRoomById = async (req, res) => {
  try {
    const { Room } = req.tenantModels;
    const room = await Room.findById(req.params.id);
    if (!room || !room.isActive) return sendError(res, 404, 'Room not found');
    return res.json({ success: true, room });
  } catch (err) {
    console.error('getRoomById error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// PUT /api/rooms/:id
export const updateRoom = async (req, res) => {
  try {
    const { Room } = req.tenantModels;
    const { error, value } = updateRoomSchema.validate(req.body, { abortEarly: false });
    if (error) return sendError(res, 400, 'Validation failed', error.details);

    if (Object.prototype.hasOwnProperty.call(value, 'guestHouseId')) {
      return sendError(res, 400, 'guestHouseId cannot be updated via this endpoint');
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!room) return sendError(res, 404, 'Room not found');

    await logAction({
      action: 'ROOM_UPDATED',
      entityType: 'Room',
      entityId: room._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        updatedFields: req.body,
      },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:rooms:*`);

    return res.json({ success: true, message: 'Room updated', room });
  } catch (err) {
    if (err?.code === 11000) {
      return sendError(res, 409, 'Room number already exists for this guest house.');
    }
    console.error('updateRoom error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// PATCH /api/rooms/:id/availability
export const setAvailability = async (req, res) => {
  try {
    const { Room } = req.tenantModels;
    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return sendError(res, 400, 'isAvailable must be boolean');
    }
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: { isAvailable } },
      { new: true }
    );

    if (!room) return sendError(res, 404, 'Room not found');

    await logAction({
      action: 'ROOM_AVAILABILITY_TOGGLED',
      entityType: 'Room',
      entityId: room._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        previousStatus: !room.isAvailable,
        newStatus: room.isAvailable,
      },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:rooms:*`);

    return res.json({ success: true, message: 'Availability updated', room });
  } catch (err) {
    console.error('setAvailability error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// DELETE /api/rooms/:id (soft delete)
export const softDeleteRoom = async (req, res) => {
  try {
    const { Room } = req.tenantModels;
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!room) return sendError(res, 404, 'Room not found');

    await logAction({
      action: 'ROOM_DELETED',
      entityType: 'Room',
      entityId: room._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        message: 'Room archived (soft deleted)',
        roomId: room._id.toString(),
      },
    }, req.tenantDb);

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:rooms:*`);

    return res.json({ success: true, message: 'Room archived', room });
  } catch (err) {
    console.error('softDeleteRoom error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// Fetch rooms by guestHouseId
export const getRoomsByGuestHouse = async (req, res) => {
  try {
    const { Room, GuestHouse } = req.tenantModels;
    const guestHouseIdParam = req.body.guestHouseId;

    if (!guestHouseIdParam) {
      return res.status(400).json({ error: "guestHouseId is required" });
    }

    const gh = await resolveGuestHouse(GuestHouse, guestHouseIdParam);
    if (!gh) {
      return res.status(404).json({ error: "Guest house not found" });
    }

    const dbName = req.tenantDb?.name || 'default';
    const cacheKey = `tenant:${dbName}:rooms:gh:${gh.guestHouseId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, rooms: cached });
    }

    const rooms = await Room.find({ guestHouseId: gh.guestHouseId, isActive: true }).lean();
    await setCache(cacheKey, rooms, 600);

    res.json({ success: true, rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Server error while fetching rooms" });
  }
};