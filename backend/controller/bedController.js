import { logAction } from '../utils/auditLogger.js';

// Create a new Bed
export const createBed = async (req, res) => {
  try {
    const { Bed, Room } = req.tenantModels;
    const { roomId, bedNumber, bedType } = req.body;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room Not Found!" });

    const activeBedsCount = await Bed.countDocuments({ roomId, isActive: true });

    if (activeBedsCount >= room.roomCapacity) {
      return res.status(400).json({ error: `Room capacity exceeded. Max capacity is ${room.roomCapacity}` });
    }

    const existingBed = await Bed.findOne({ roomId, bedNumber, isActive: true });
    if (existingBed) {
      return res.status(400).json({ error: "Bed Number already exists in this room" });
    }

    const bed = await Bed.create({ roomId, bedNumber, bedType: bedType || 'single' });

    await logAction({
      action: 'BED_CREATED',
      entityType: 'Bed',
      entityId: bed._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        roomId: bed.roomId,
        bedNumber: bed.bedNumber,
        bedType: bed.bedType,
      },
    }, req.tenantDb);

    const beds = await Bed.find({ roomId, isActive: true });

    return res.status(201).json({
      success: true,
      message: "Bed created successfully",
      beds,
    });
  } catch (error) {
    console.error('Error creating bed: ', error);
    res.status(500).json({ error: "Server error while creating bed" });
  }
};

// List beds by roomId
export const listBedsByRoom = async (req, res) => {
  try {
    const { Bed } = req.tenantModels;
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const beds = await Bed.find({ roomId, isActive: true });
    return res.json({ success: true, beds });
  } catch (error) {
    console.error('Error fetching beds: ', error);
    return res.status(500).json({ error: "Server error while fetching beds" });
  }
};

// Update bed details
export const updateBed = async (req, res) => {
  try {
    const { Bed } = req.tenantModels;
    const updatedBed = await Bed.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedBed) return res.status(404).json({ error: 'Bed not found' });

    await logAction({
      action: 'BED_UPDATED',
      entityType: 'Bed',
      entityId: updatedBed._id,
      performedBy: req.user?.email || 'Admin',
      details: { updatedFields: req.body },
    }, req.tenantDb);

    const beds = await Bed.find({ roomId: updatedBed.roomId, isActive: true });

    return res.json({
      success: true,
      message: 'Bed updated successfully',
      beds,
    });
  } catch (error) {
    console.error("Error updating bed: ", error);
    return res.status(500).json({ error: "Server error while updating beds" });
  }
};

// Toggle Bed Availability
export const toggleAvailability = async (req, res) => {
  try {
    const { Bed } = req.tenantModels;
    const { isAvailable } = req.body;
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be boolean' });
    }

    const bed = await Bed.findByIdAndUpdate(
      req.params.id,
      { $set: { isAvailable } },
      { new: true }
    );

    if (!bed) return res.status(404).json({ error: 'Bed not found' });

    await logAction({
      action: 'BED_AVAILABILITY_TOGGLED',
      entityType: 'Bed',
      entityId: bed._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        previousStatus: !bed.isAvailable,
        newStatus: bed.isAvailable,
      },
    }, req.tenantDb);

    res.json({ success: true, message: 'Availability updated', bed });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ error: 'Server error while toggling availability' });
  }
};

// Soft Delete bed
export const softDeleteBed = async (req, res) => {
  try {
    const { Bed } = req.tenantModels;
    const bed = await Bed.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!bed) return res.status(404).json({ error: 'Bed not found' });

    await logAction({
      action: 'BED_DELETED',
      entityType: 'Bed',
      entityId: bed._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        message: 'Bed archived (soft deleted)',
        bedId: bed._id.toString(),
      },
    }, req.tenantDb);

    const beds = await Bed.find({ roomId: bed.roomId, isActive: true });

    return res.json({
      success: true,
      message: 'Bed archived',
      beds,
    });
  } catch (error) {
    console.error('Error deleting bed', error);
    return res.status(500).json({ error: 'Server error while deleting bed' });
  }
};

// Auto-create beds based on room capacity
export const autoCreateBeds = async (req, res) => {
  try {
    const { Bed, Room } = req.tenantModels;
    const { roomId, bedType = 'single' } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const existingBeds = await Bed.find({ roomId, isActive: true }).sort({ bedNumber: 1 });
    const existingBedsCount = existingBeds.length;

    if (existingBedsCount >= room.roomCapacity) {
      return res.status(400).json({ 
        error: `Room is already at full capacity (${room.roomCapacity} beds). Cannot create more beds.` 
      });
    }

    const bedsToCreate = room.roomCapacity - existingBedsCount;

    let nextBedNumber = 1;
    if (existingBeds.length > 0) {
      const maxBedNumber = Math.max(...existingBeds.map(b => b.bedNumber));
      nextBedNumber = maxBedNumber + 1;
    }

    const bedsToInsert = [];
    for (let i = 0; i < bedsToCreate; i++) {
      bedsToInsert.push({
        roomId,
        bedNumber: nextBedNumber + i,
        bedType,
        isAvailable: true,
        isActive: true,
      });
    }

    const createdBeds = await Bed.insertMany(bedsToInsert);

    for (const bed of createdBeds) {
      await logAction({
        action: 'BED_CREATED',
        entityType: 'Bed',
        entityId: bed._id,
        performedBy: req.user?.email || 'Admin',
        details: {
          roomId: bed.roomId,
          bedNumber: bed.bedNumber,
          bedType: bed.bedType,
          autoCreated: true,
        },
      }, req.tenantDb);
    }

    const allBeds = await Bed.find({ roomId, isActive: true }).sort({ bedNumber: 1 });

    return res.status(201).json({
      success: true,
      message: `Successfully created ${bedsToCreate} bed(s)`,
      createdCount: bedsToCreate,
      beds: allBeds,
    });
  } catch (error) {
    console.error('Error auto-creating beds:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Bed number conflict. Some beds may have been created. Please refresh and try again.' 
      });
    }
    return res.status(500).json({ error: 'Server error while auto-creating beds' });
  }
};