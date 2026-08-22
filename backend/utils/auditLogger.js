import { getTenantDb } from "../config/dbManager.js";

export const logAction = async (
  { action, entityType, entityId, performedBy = "System", details = {} },
  tenantDbOrModels = null
) => {
  try {
    let tenantDb = null;
    let models = null;

    if (tenantDbOrModels?.model) {
      models = tenantDbOrModels.models || tenantDbOrModels;
    } else if (tenantDbOrModels?.name) {
      tenantDb = tenantDbOrModels;
      models = tenantDb.models;
    } else {
      const defaultDbName = process.env.DEFAULT_TENANT_DB || 'gh_tenant_default';
      tenantDb = await getTenantDb(defaultDbName);
      models = tenantDb.models;
    }

    const { AuditLog, GuestHouse, Room, Bed, User, Booking } = models;
    let enriched = { ...details };

    // ========= ENRICHMENT BASED ON ENTITY TYPE =========
    if (entityType === "GuestHouse" && GuestHouse) {
      const gh = await GuestHouse.findOne({ guestHouseId: entityId });
      if (gh) {
        enriched.guestHouseName = gh.guestHouseName;
        enriched.location = gh.location;
      }
    }

    if (entityType === "Room" && Room) {
      const room = await Room.findById(entityId);
      if (room && GuestHouse) {
        const gh = await GuestHouse.findOne({ guestHouseId: room.guestHouseId });
        enriched.roomNumber = room.roomNumber;
        enriched.roomType = room.roomType;
        enriched.guestHouseName = gh?.guestHouseName;
      }
    }

    if (entityType === "Bed" && Bed) {
      const bed = await Bed.findById(entityId).populate("roomId");
      if (bed && GuestHouse) {
        const gh = await GuestHouse.findOne({ guestHouseId: bed.roomId?.guestHouseId });
        enriched.bedNumber = bed.bedNumber;
        enriched.bedType = bed.bedType;
        enriched.roomNumber = bed.roomId?.roomNumber;
        enriched.guestHouseName = gh?.guestHouseName;
      }
    }

    if (entityType === "Booking" && Booking) {
      const bk = await Booking.findById(entityId)
        .populate("guestHouseId")
        .populate("roomId")
        .populate("bedId")
        .populate("userId");

      if (bk) {
        enriched = {
          user: bk.userId ? {
            name: `${bk.userId.firstName || ''} ${bk.userId.lastName || ''}`.trim(),
            email: bk.userId.email,
            phone: bk.userId.phone,
          } : null,
          guestHouse: bk.guestHouseId?.guestHouseName,
          room: bk.roomId?.roomNumber,
          bed: bk.bedId ? `${bk.bedId.bedNumber} (${bk.bedId.bedType})` : null,
          checkIn: bk.checkIn,
          checkOut: bk.checkOut,
          status: bk.status
        };
      }
    }

    if (entityType === "User" && User) {
      if (details.name && details.email) {
        enriched.userDetails = {
          name: details.name,
          email: details.email,
          phone: details.phone,
          isActive: details.isActive !== undefined ? details.isActive : true
        };
      } else if (details.userDetails) {
        enriched.userDetails = details.userDetails;
      } else {
        const user = await User.findById(entityId);
        if (user) {
          enriched.userDetails = {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: user.phone,
            isActive: user.isActive
          };
        }
      }
    }

    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      details: enriched
    });
  } catch (err) {
    console.error("Audit Log Error →", err);
  }
};
