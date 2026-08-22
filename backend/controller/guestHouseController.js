import { logAction } from '../utils/auditLogger.js';
import { deleteFromS3 } from "../utils/s3Client.js";
import { generateId } from '../utils/generateId.js';

const MAX_GUEST_HOUSES = 4;

export const createGuestHouse = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const { guestHouseName, description } = req.body;

    // Check guest house limit
    const guestHouseCount = await GuestHouse.countDocuments();
    if (guestHouseCount >= MAX_GUEST_HOUSES) {
      return res.status(400).json({ 
        message: `Maximum limit of ${MAX_GUEST_HOUSES} guest houses reached. Please delete an existing guest house to add a new one.`,
        limit: MAX_GUEST_HOUSES,
        currentCount: guestHouseCount
      });
    }

    const location = JSON.parse(req.body.location);

    if (!guestHouseName || !location?.city || !location?.state) {
      return res.status(400).json({ message: "Required Fields Missing" });
    }

    const imageUrl = req.optimizedImageUrl || null;
    const newGuestHouseId = await generateId('guesthouse', req.tenantDb);

    const guestHouse = await GuestHouse.create({
      guestHouseId: newGuestHouseId,
      guestHouseName,
      location,
      description,
      image: imageUrl,
    });

    await logAction({
      action: 'GUESTHOUSE_CREATED',
      entityType: 'GuestHouse',
      entityId: guestHouse.guestHouseId,
      performedBy: req.user?.email || 'Admin',
      details: {
        guestHouseName: guestHouse.guestHouseName,
        location: guestHouse.location,
      },
    }, req.tenantDb);

    res.status(201).json({
      message: "Guest House Created Successfully",
      guestHouse,
    });
  } catch (error) {
    console.error("Error creating GuestHouse ", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const friendlyField = field === 'guestHouseName' ? 'Guest House Name' : field;
      return res.status(400).json({ message: `${friendlyField} already exists. Please choose a unique name.` });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error?.message || "Error creating guest house" });
  }
};

// Get all the Guest Houses
export const getGuestHouses = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const guestHouses = await GuestHouse.find().sort({ guestHouseId: 1 });
    res.status(200).json(guestHouses);
  } catch (error) {
    console.error("Error fetching guest houses:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle Maintenance Mode
export const toggleMaintenanceMode = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const { guestHouseId } = req.params;

    const guestHouse = await GuestHouse.findOne({ guestHouseId });

    if (!guestHouse) {
      return res.status(404).json({ message: 'Guest house not found' });
    }

    guestHouse.maintenance = !guestHouse.maintenance;
    await guestHouse.save();

    await logAction({
      action: 'MAINTENANCE_TOGGLED',
      entityType: 'GuestHouse',
      entityId: guestHouse.guestHouseId,
      performedBy: req.user?.email || 'Admin',
      details: {
        previousStatus: !guestHouse.maintenance,
        newStatus: guestHouse.maintenance,
      },
    }, req.tenantDb);

    res.json({
      message: `Maintenance mode ${guestHouse.maintenance ? 'activated' : 'deactivated'}`,
      guestHouse,
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ message: 'Server error while toggling maintenance mode' });
  }
};

// Delete Guest House
export const deleteGuestHouse = async (req, res) => {
  const { GuestHouse, Room, Bed } = req.tenantModels;
  const guestHouseId = req.params.guestHouseId;

  try {
    const guestHouse = await GuestHouse.findOne({ guestHouseId });
    if (!guestHouse) {
      return res.status(404).json({ error: "Guest House not found" });
    }

    await deleteFromS3(guestHouse.image);

    const rooms = await Room.find({ guestHouseId });
    const roomIds = rooms.map((room) => room._id);

    await Bed.deleteMany({ roomId: { $in: roomIds } });
    await Room.deleteMany({ guestHouseId });
    await GuestHouse.deleteOne({ guestHouseId });

    try {
      await logAction({
        action: 'GUESTHOUSE_DELETED',
        entityType: 'GuestHouse',
        entityId: guestHouseId,
        performedBy: req.user?.email || 'Admin',
        details: {
          message: 'Guest house deleted permanently, including image on S3',
        },
      }, req.tenantDb);
    } catch (logError) {
      console.warn("Audit log error (continued):", logError.message);
    }

    return res.json({
      success: true,
      message: "Guest House, image, and associated Rooms & Beds deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting guest house:", error);
    res.status(500).json({ error: "Server error while deleting Guest House" });
  }
};

// Guest House Update Code  
export const updateGuestHouse = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const { guestHouseId } = req.params;

    let location = {};
    if (req.body.location) {
      try {
        location = JSON.parse(req.body.location);
      } catch {
        location = req.body.location;
      }
    }

    const updateData = {
      guestHouseName: req.body.guestHouseName,
      description: req.body.description,
      location,
    };

    if (req.optimizedImageUrl) {
      updateData.image = req.optimizedImageUrl;
    }

    const updatedGuestHouse = await GuestHouse.findOneAndUpdate(
      { guestHouseId },
      updateData,
      { new: true }
    );

    if (!updatedGuestHouse) {
      return res.status(404).json({ message: "Guest House not found" });
    }

    await logAction({
      action: 'GUESTHOUSE_UPDATED',
      entityType: 'GuestHouse',
      entityId: updatedGuestHouse.guestHouseId,
      performedBy: req.user?.email || 'Admin',
      details: updateData,
    }, req.tenantDb);

    res.status(200).json({
      message: "Guest House updated successfully",
      guestHouse: updatedGuestHouse,
    });
  } catch (error) {
    console.error("Error updating Guest House:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const friendlyField = field === 'guestHouseName' ? 'Guest House Name' : field;
      return res.status(400).json({ message: `${friendlyField} already exists. Please choose a unique name.` });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: "Server error while updating Guest House" });
  }
};

// Get single guest house by ID
export const getGuestHouseById = async (req, res) => {
  try {
    const { GuestHouse } = req.tenantModels;
    const guestHouseId = req.params.guestHouseId;

    const guestHouse = await GuestHouse.findOne({ guestHouseId });

    if (!guestHouse) {
      return res.status(404).json({ message: "Guest House not found" });
    }

    res.status(200).json({ success: true, guestHouse });
  } catch (error) {
    console.error("Error fetching guest house:", error);
    res.status(500).json({ message: "Server error while fetching guest house" });
  }
};
