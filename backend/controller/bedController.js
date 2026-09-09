import { logAction } from '../utils/auditLogger.js';
import CentralBedConfig from '../models/BedConfig.js';

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

    const parsedBedNumber = Number(bedNumber);
    if (isNaN(parsedBedNumber) || parsedBedNumber < 1) {
      return res.status(400).json({ error: "Valid bed number is required" });
    }

    const existingActiveBed = await Bed.findOne({ roomId, bedNumber: parsedBedNumber, isActive: true });
    if (existingActiveBed) {
      return res.status(400).json({ error: "Bed Number already exists in this room" });
    }

    if (!bedType || !bedType.trim()) {
      return res.status(400).json({ error: "Bed Type is required" });
    }

    const existingInactiveBed = await Bed.findOne({ roomId, bedNumber: parsedBedNumber, isActive: false });
    let bed;
    if (existingInactiveBed) {
      existingInactiveBed.isActive = true;
      existingInactiveBed.isAvailable = true;
      existingInactiveBed.bedType = bedType.trim();
      await existingInactiveBed.save();
      bed = existingInactiveBed;
    } else {
      bed = await Bed.create({
        roomId,
        bedNumber: parsedBedNumber,
        bedType: bedType.trim(),
        isAvailable: true,
        isActive: true,
      });
    }

    await logAction({
      action: 'BED_CREATED',
      entityType: 'Bed',
      entityId: bed._id,
      performedBy: req.user?.email || 'Admin',
      details: {
        roomId: bed.roomId,
        bedNumber: bed.bedNumber,
        bedType: bed.bedType,
        reactivated: Boolean(existingInactiveBed),
      },
    }, req.tenantDb);

    const beds = await Bed.find({ roomId, isActive: true }).sort({ bedNumber: 1 });

    return res.status(201).json({
      success: true,
      message: "Bed created successfully",
      beds,
    });
  } catch (error) {
    console.error('Error creating bed: ', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Bed Number already exists in this room" });
    }
    return res.status(500).json({ error: error?.message || "Server error while creating bed" });
  }
};

// List beds by roomId or array of roomIds
export const listBedsByRoom = async (req, res) => {
  try {
    const { Bed } = req.tenantModels;
    const { roomId, roomIds } = req.body;

    if (roomIds && Array.isArray(roomIds) && roomIds.length > 0) {
      const beds = await Bed.find({ roomId: { $in: roomIds }, isActive: true });
      return res.json({ success: true, beds });
    }

    if (!roomId) {
      return res.json({ success: true, beds: [] });
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

    const beds = await Bed.find({ roomId: updatedBed.roomId, isActive: true }).sort({ bedNumber: 1 });

    return res.json({
      success: true,
      message: 'Bed updated successfully',
      beds,
    });
  } catch (error) {
    console.error("Error updating bed: ", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Bed Number already exists in this room" });
    }
    return res.status(500).json({ error: error?.message || "Server error while updating bed" });
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
    const BedConfig = req.tenantModels?.BedConfig || CentralBedConfig;
    let { roomId, bedType } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }

    if (!bedType || !bedType.trim()) {
      const firstConfig = await BedConfig.findOne({ isActive: true }).sort({ createdAt: 1 });
      if (firstConfig) {
        bedType = firstConfig.bedType;
      } else {
        return res.status(400).json({ error: 'No bed type configured. Please configure bed types first in Bed Config.' });
      }
    } else {
      bedType = bedType.trim();
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

    const activeBedNumbers = new Set(existingBeds.map(b => b.bedNumber));
    const numbersToCreate = [];
    let candidate = 1;
    while (numbersToCreate.length < bedsToCreate && candidate <= 1000) {
      if (!activeBedNumbers.has(candidate)) {
        numbersToCreate.push(candidate);
      }
      candidate++;
    }

    const createdBeds = [];
    for (const num of numbersToCreate) {
      const existingInactive = await Bed.findOne({ roomId, bedNumber: num, isActive: false });
      let bed;
      if (existingInactive) {
        existingInactive.isActive = true;
        existingInactive.isAvailable = true;
        existingInactive.bedType = bedType;
        await existingInactive.save();
        bed = existingInactive;
      } else {
        bed = await Bed.create({
          roomId,
          bedNumber: num,
          bedType,
          isAvailable: true,
          isActive: true,
        });
      }
      createdBeds.push(bed);
    }

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

// ── Bed Configuration Endpoints ──────────────────────
export const listBedConfigs = async (req, res) => {
  try {
    const BedConfig = req.tenantModels?.BedConfig || CentralBedConfig;
    const configs = await BedConfig.find({ isActive: true }).sort({ createdAt: 1 });
    return res.json({ success: true, configs: configs || [] });
  } catch (error) {
    console.error('Error listing bed configs:', error);
    return res.status(500).json({ error: 'Server error while listing bed configs' });
  }
};

export const saveBedConfig = async (req, res) => {
  try {
    const BedConfig = req.tenantModels?.BedConfig || CentralBedConfig;
    const { bedType, capacity } = req.body;

    if (!bedType || !bedType.trim()) {
      return res.status(400).json({ error: 'Bed Type is required' });
    }

    const trimmedType = bedType.trim();
    const parsedCapacity = Number(capacity);

    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      return res.status(400).json({ error: 'Valid capacity (min 1) is required' });
    }

    const escaped = trimmedType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await BedConfig.findOne({
      bedType: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    let config;
    if (existing) {
      existing.bedType = trimmedType;
      existing.capacity = parsedCapacity;
      existing.isActive = true;
      await existing.save();
      config = existing;
    } else {
      config = await BedConfig.create({
        bedType: trimmedType,
        capacity: parsedCapacity,
      });
    }

    const configs = await BedConfig.find({ isActive: true }).sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      message: 'Bed configuration saved successfully',
      config,
      configs,
    });
  } catch (error) {
    console.error('Error saving bed config:', error);
    return res.status(500).json({ error: 'Server error while saving bed config' });
  }
};

export const deleteBedConfig = async (req, res) => {
  try {
    const BedConfig = req.tenantModels?.BedConfig || CentralBedConfig;
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Config ID is required' });

    await BedConfig.findByIdAndUpdate(id, { isActive: false });
    const configs = await BedConfig.find({ isActive: true }).sort({ createdAt: 1 });
    return res.json({ success: true, message: 'Bed configuration deleted', configs });
  } catch (error) {
    console.error('Error deleting bed config:', error);
    return res.status(500).json({ error: 'Server error while deleting bed config' });
  }
};