import { logAction } from '../utils/auditLogger.js';
import { calculateDynamicStayPricing } from '../utils/dynamicPricingEngine.js';
import { deletePatternCache } from '../config/redis.js';

/**
 * Resolves GuestHouse ObjectId from param/body/query
 */
const resolveGuestHouseObjectId = async (GuestHouse, ghIdentifier) => {
  if (!ghIdentifier) return null;
  const isObjId = /^[0-9a-fA-F]{24}$/.test(String(ghIdentifier));
  const gh = await GuestHouse.findOne({
    $or: [
      { guestHouseId: String(ghIdentifier) },
      ...(isObjId ? [{ _id: ghIdentifier }] : []),
    ],
  }).lean();
  return gh;
};

/**
 * POST /api/dynamic-pricing/list
 * Lists pricing rules for a hotel with pagination
 */
export const listPricingRules = async (req, res) => {
  try {
    const { DynamicPricing, GuestHouse } = req.tenantModels;
    const {
      guestHouseId,
      page = 1,
      limit = 10,
      ruleType,
      search,
    } = req.body;

    if (!guestHouseId) {
      return res.status(400).json({ message: 'guestHouseId is required.' });
    }

    const gh = await resolveGuestHouseObjectId(GuestHouse, guestHouseId);
    if (!gh) {
      return res.status(404).json({ message: 'Guest house not found.' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const filter = { guestHouseId: gh._id };

    if (ruleType && ruleType !== 'all') {
      filter.ruleType = ruleType;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { roomType: new RegExp(q, 'i') },
        { ruleType: new RegExp(q, 'i') },
      ];
    }

    const [totalCount, rules] = await Promise.all([
      DynamicPricing.countDocuments(filter),
      DynamicPricing.find(filter)
        .populate('createdBy', 'firstName lastName email role')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return res.status(200).json({
      hotel: {
        _id: gh._id,
        guestHouseId: gh.guestHouseId,
        guestHouseName: gh.guestHouseName,
        location: gh.location,
      },
      rules,
      totalCount,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('[DynamicPricingController] listPricingRules error:', error);
    return res.status(500).json({ message: error.message || 'Failed to list pricing rules' });
  }
};

/**
 * POST /api/dynamic-pricing/create
 * Creates a new dynamic pricing rule
 */
export const createPricingRule = async (req, res) => {
  try {
    const { DynamicPricing, GuestHouse } = req.tenantModels;
    const {
      guestHouseId,
      name,
      ruleType,
      roomType = 'all',
      adjustmentType = 'percentage',
      adjustmentValue,
      applicableDays,
      startDate,
      endDate,
      isActive = true,
      priority = 0,
    } = req.body;

    if (!guestHouseId || !name || !ruleType || adjustmentValue === undefined) {
      return res.status(400).json({
        message: 'guestHouseId, rule name, ruleType, and adjustmentValue are required.',
      });
    }

    const gh = await resolveGuestHouseObjectId(GuestHouse, guestHouseId);
    if (!gh) {
      return res.status(404).json({ message: 'Guest house not found.' });
    }

    if (ruleType === 'holiday' || ruleType === 'custom_date_range') {
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Holiday rules require both startDate and endDate.' });
      }
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ message: 'endDate cannot be before startDate.' });
      }
    }

    const newRule = await DynamicPricing.create({
      guestHouseId: gh._id,
      name: String(name).trim(),
      ruleType,
      roomType: String(roomType || 'all').trim().toLowerCase(),
      adjustmentType,
      adjustmentValue: Number(adjustmentValue),
      applicableDays: Array.isArray(applicableDays) ? applicableDays : [],
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: Boolean(isActive),
      priority: Number(priority) || (ruleType === 'holiday' ? 10 : ruleType === 'weekend' ? 5 : 0),
      createdBy: req.user?._id || null,
    });

    await logAction({
      action: 'DYNAMIC_PRICING_RULE_CREATED',
      entityType: 'DynamicPricing',
      entityId: newRule._id,
      performedBy: req.user?.email || 'Super Admin',
      details: { name: newRule.name, ruleType: newRule.ruleType, hotel: gh.guestHouseName },
    }, req.tenantDb).catch(() => {});

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(201).json({
      message: 'Dynamic pricing rule created successfully',
      rule: newRule,
    });
  } catch (error) {
    console.error('[DynamicPricingController] createPricingRule error:', error);
    return res.status(500).json({ message: error.message || 'Failed to create pricing rule' });
  }
};

/**
 * POST /api/dynamic-pricing/update
 * Updates an existing pricing rule
 */
export const updatePricingRule = async (req, res) => {
  try {
    const { DynamicPricing } = req.tenantModels;
    const {
      _id,
      id,
      name,
      ruleType,
      roomType,
      adjustmentType,
      adjustmentValue,
      applicableDays,
      startDate,
      endDate,
      isActive,
      priority,
    } = req.body;

    const ruleId = _id || id;
    if (!ruleId) {
      return res.status(400).json({ message: 'Rule ID (_id) is required.' });
    }

    const updateFields = {};
    if (name !== undefined) updateFields.name = String(name).trim();
    if (ruleType !== undefined) updateFields.ruleType = ruleType;
    if (roomType !== undefined) updateFields.roomType = String(roomType).trim().toLowerCase();
    if (adjustmentType !== undefined) updateFields.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) updateFields.adjustmentValue = Number(adjustmentValue);
    if (applicableDays !== undefined) updateFields.applicableDays = Array.isArray(applicableDays) ? applicableDays : [];
    if (startDate !== undefined) updateFields.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateFields.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);
    if (priority !== undefined) updateFields.priority = Number(priority);

    const updatedRule = await DynamicPricing.findByIdAndUpdate(
      ruleId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedRule) {
      return res.status(404).json({ message: 'Dynamic pricing rule not found.' });
    }

    await logAction({
      action: 'DYNAMIC_PRICING_RULE_UPDATED',
      entityType: 'DynamicPricing',
      entityId: updatedRule._id,
      performedBy: req.user?.email || 'Super Admin',
      details: updateFields,
    }, req.tenantDb).catch(() => {});

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({
      message: 'Dynamic pricing rule updated successfully',
      rule: updatedRule,
    });
  } catch (error) {
    console.error('[DynamicPricingController] updatePricingRule error:', error);
    return res.status(500).json({ message: error.message || 'Failed to update pricing rule' });
  }
};

/**
 * POST /api/dynamic-pricing/toggle
 * Toggles a rule's active state
 */
export const togglePricingRule = async (req, res) => {
  try {
    const { DynamicPricing } = req.tenantModels;
    const { _id, id } = req.body;
    const ruleId = _id || id;

    const rule = await DynamicPricing.findById(ruleId);
    if (!rule) {
      return res.status(404).json({ message: 'Dynamic pricing rule not found.' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({
      message: `Rule marked as ${rule.isActive ? 'Active' : 'Inactive'}`,
      rule,
    });
  } catch (error) {
    console.error('[DynamicPricingController] togglePricingRule error:', error);
    return res.status(500).json({ message: error.message || 'Failed to toggle rule' });
  }
};

/**
 * POST /api/dynamic-pricing/delete
 * Deletes a pricing rule
 */
export const deletePricingRule = async (req, res) => {
  try {
    const { DynamicPricing } = req.tenantModels;
    const { _id, id } = req.body;
    const ruleId = _id || id;

    const deleted = await DynamicPricing.findByIdAndDelete(ruleId);
    if (!deleted) {
      return res.status(404).json({ message: 'Dynamic pricing rule not found.' });
    }

    await logAction({
      action: 'DYNAMIC_PRICING_RULE_DELETED',
      entityType: 'DynamicPricing',
      entityId: deleted._id,
      performedBy: req.user?.email || 'Super Admin',
      details: { name: deleted.name },
    }, req.tenantDb).catch(() => {});

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({ message: 'Dynamic pricing rule deleted successfully' });
  } catch (error) {
    console.error('[DynamicPricingController] deletePricingRule error:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete rule' });
  }
};

/**
 * POST /api/dynamic-pricing/config-status
 * Returns whether dynamicRoomPrice is enabled in Configuration for this hotel
 */
export const getHotelConfigStatus = async (req, res) => {
  try {
    const { GuestHouse, Configuration, DynamicPricing } = req.tenantModels;
    const { guestHouseId } = req.body;

    const gh = await resolveGuestHouseObjectId(GuestHouse, guestHouseId);
    if (!gh) {
      return res.status(404).json({ message: 'Guest house not found.' });
    }

    const config = await Configuration.findOne(
      gh._id ? { guestHouseId: gh._id } : {}
    ).lean();

    const activeRulesCount = await DynamicPricing.countDocuments({
      guestHouseId: gh._id,
      isActive: true,
    });

    const isDynamicEnabled = config ? Boolean(config.dynamicRoomPrice) : false;

    return res.status(200).json({
      hotel: {
        _id: gh._id,
        guestHouseId: gh.guestHouseId,
        guestHouseName: gh.guestHouseName,
        location: gh.location,
      },
      dynamicRoomPrice: isDynamicEnabled,
      activeRulesCount,
    });
  } catch (error) {
    console.error('[DynamicPricingController] getHotelConfigStatus error:', error);
    return res.status(500).json({ message: error.message || 'Failed to get config status' });
  }
};

/**
 * POST /api/dynamic-pricing/toggle-config-status
 * Enables or disables dynamicRoomPrice in Configuration for this hotel
 */
export const toggleHotelConfigStatus = async (req, res) => {
  try {
    const { GuestHouse, Configuration } = req.tenantModels;
    const { guestHouseId, dynamicRoomPrice } = req.body;

    const gh = await resolveGuestHouseObjectId(GuestHouse, guestHouseId);
    if (!gh) {
      return res.status(404).json({ message: 'Guest house not found.' });
    }

    const updateVal = dynamicRoomPrice !== undefined
      ? Boolean(dynamicRoomPrice)
      : !(
          await Configuration.findOne({ guestHouseId: gh._id }).then(
            (c) => c?.dynamicRoomPrice
          )
        );

    const updatedConfig = await Configuration.findOneAndUpdate(
      { guestHouseId: gh._id },
      { $set: { dynamicRoomPrice: updateVal, guestHouseId: gh._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const dbName = req.tenantDb?.name || 'default';
    await deletePatternCache(`tenant:${dbName}:*`).catch(() => {});

    return res.status(200).json({
      message: `Dynamic pricing ${updateVal ? 'enabled' : 'disabled'} for ${gh.guestHouseName}`,
      dynamicRoomPrice: Boolean(updatedConfig.dynamicRoomPrice),
    });
  } catch (error) {
    console.error('[DynamicPricingController] toggleHotelConfigStatus error:', error);
    return res.status(500).json({ message: error.message || 'Failed to toggle config status' });
  }
};

/**
 * POST /api/dynamic-pricing/preview
 * Interactive price calculation simulator
 */
export const previewPricing = async (req, res) => {
  try {
    const { GuestHouse, Room, Configuration, DynamicPricing } = req.tenantModels;
    const {
      guestHouseId,
      roomId,
      checkIn,
      checkOut,
    } = req.body;

    if (!guestHouseId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'guestHouseId, checkIn, and checkOut are required.' });
    }

    const gh = await resolveGuestHouseObjectId(GuestHouse, guestHouseId);
    if (!gh) {
      return res.status(404).json({ message: 'Guest house not found.' });
    }

    let room = null;
    if (roomId) {
      room = await Room.findById(roomId).lean();
    } else {
      room = await Room.findOne({ guestHouseId: gh.guestHouseId }).lean();
    }

    if (!room) {
      return res.status(404).json({ message: 'Room not found for pricing preview.' });
    }

    const [config, rules] = await Promise.all([
      Configuration.findOne({ guestHouseId: gh._id }).lean(),
      DynamicPricing.find({ guestHouseId: gh._id, isActive: true }).sort({ priority: -1 }).lean(),
    ]);

    const isDynamicEnabled = config ? Boolean(config.dynamicRoomPrice) : false;

    const pricing = calculateDynamicStayPricing({
      room,
      checkIn,
      checkOut,
      pricingRules: rules,
      isDynamicEnabled,
    });

    return res.status(200).json({
      hotelName: gh.guestHouseName,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      isDynamicEnabled,
      pricing,
    });
  } catch (error) {
    console.error('[DynamicPricingController] previewPricing error:', error);
    return res.status(500).json({ message: error.message || 'Failed to preview pricing' });
  }
};
