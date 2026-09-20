import mongoose from 'mongoose';
import { isObjectId } from '../utils/isObjectId.js';

const PAGE_SIZE = 10;

const getPage = (value) => Math.max(1, Number.parseInt(value, 10) || 1);

const getAssignedGuestHouseId = (user) => {
  const assigned = user?.assignedGuestHouseId;
  if (assigned && typeof assigned === 'object') return assigned._id || assigned.guestHouseId || null;
  return assigned || null;
};

const resolveGuestHouse = async (GuestHouse, value) => {
  if (!value) return null;
  if (isObjectId(String(value))) return GuestHouse.findById(value).select('_id').lean();
  return GuestHouse.findOne({ guestHouseId: value }).select('_id').lean();
};

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const normalized = new Map();
  for (const item of items) {
    const itemId = String(item?.itemId || '');
    const quantity = Number(item?.quantity);
    const price = Number(item?.price);
    if (!isObjectId(itemId) || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) return null;
    if (normalized.has(itemId)) return null;
    normalized.set(itemId, { itemId: new mongoose.Types.ObjectId(itemId), quantity, price });
  }
  return [...normalized.values()];
};

const getHotelForUser = async (req) => {
  const assignedId = getAssignedGuestHouseId(req.user);
  if (!assignedId) return null;
  return resolveGuestHouse(req.tenantModels.GuestHouse, assignedId);
};

const allowHotelPriceChange = async (Configuration) => {
  const configuration = await Configuration.findOne({ guestHouseId: null }).select('allowHotelPriceChange').lean();
  return configuration?.allowHotelPriceChange !== false;
};

export const getInventoryConfiguration = async (req, res) => {
  try {
    const { Configuration } = req.tenantModels;
    return res.json({ allowHotelPriceChange: await allowHotelPriceChange(Configuration) });
  } catch (error) {
    console.error('Error loading inventory configuration:', error);
    return res.status(500).json({ message: 'Failed to load inventory configuration.' });
  }
};

export const updateInventoryConfiguration = async (req, res) => {
  try {
    const { Configuration } = req.tenantModels;
    const allowChange = req.body?.allowHotelPriceChange !== false;
    await Configuration.findOneAndUpdate(
      { guestHouseId: null },
      { $set: { allowHotelPriceChange: allowChange, guestHouseId: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ message: 'Inventory configuration updated.', allowHotelPriceChange: allowChange });
  } catch (error) {
    console.error('Error updating inventory configuration:', error);
    return res.status(500).json({ message: 'Failed to update inventory configuration.' });
  }
};

export const addItem = async (req, res) => {
  try {
    const { Item, Inventory, GuestHouse } = req.tenantModels;
    const { name, description, unit, quantity, price, costPrice, guestHouseId } = req.body || {};
    const stockQuantity = Number(quantity);
    const sellingPrice = Number(price);
    const itemCostPrice = Number(costPrice);

    if (!String(name || '').trim() || !Number.isInteger(stockQuantity) || stockQuantity < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0 || !Number.isFinite(itemCostPrice) || itemCostPrice < 0) {
      return res.status(400).json({ message: 'Name, quantity, price, and cost price are required.' });
    }

    const hotel = guestHouseId ? await resolveGuestHouse(GuestHouse, guestHouseId) : null;
    if (guestHouseId && !hotel) return res.status(404).json({ message: 'Hotel not found.' });

    let item = await Item.findOne({ name: String(name).trim() });
    if (!item) {
      item = await Item.create({
        name: String(name).trim(),
        description: String(description || '').trim(),
        unit: String(unit || 'piece').trim(),
        createdBy: req.user._id,
      });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { itemId: item._id, guestHouseId: hotel?._id || null },
      {
        $inc: { quantity: stockQuantity },
        $set: { price: sellingPrice, costPrice: itemCostPrice, updatedBy: req.user._id },
        $setOnInsert: { itemId: item._id, guestHouseId: hotel?._id || null, createdBy: req.user._id },
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('itemId', 'name description unit').populate('guestHouseId', 'guestHouseName');

    return res.status(201).json({ message: 'Inventory added successfully.', inventory });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An item with this name already exists.' });
    console.error('Error adding inventory item:', error);
    return res.status(500).json({ message: 'Failed to add inventory item.' });
  }
};

export const listInventory = async (req, res) => {
  try {
    const { Inventory, GuestHouse } = req.tenantModels;
    const page = getPage(req.body?.page);
    const query = {};
    const guestHouseId = req.body?.guestHouseId;

    if (guestHouseId === 'central') {
      query.guestHouseId = null;
    } else if (guestHouseId) {
      const hotel = await resolveGuestHouse(GuestHouse, guestHouseId);
      if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });
      query.guestHouseId = hotel._id;
    }

    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .populate('itemId', 'name description unit')
        .populate('guestHouseId', 'guestHouseName guestHouseId')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.json({ inventory, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing inventory:', error);
    return res.status(500).json({ message: 'Failed to load inventory.' });
  }
};

export const listHotelInventory = async (req, res) => {
  try {
    const { Inventory } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });

    const page = getPage(req.body?.page);
    const query = { guestHouseId: hotel._id };
    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .select('-costPrice')
        .populate('itemId', 'name description unit')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.json({ inventory, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing hotel inventory:', error);
    return res.status(500).json({ message: 'Failed to load hotel inventory.' });
  }
};

export const listAvailableItems = async (req, res) => {
  try {
    const { Inventory } = req.tenantModels;
    const page = getPage(req.body?.page);
    const query = { guestHouseId: null, quantity: { $gt: 0 } };
    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .select('-costPrice')
        .populate('itemId', 'name description unit')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.json({ inventory, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing available inventory:', error);
    return res.status(500).json({ message: 'Failed to load available items.' });
  }
};

export const createItemRequest = async (req, res) => {
  try {
    const { Inventory, ItemRequest, Configuration } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    const items = normalizeItems(req.body?.items);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });
    if (!items) return res.status(400).json({ message: 'Select at least one item with a valid quantity.' });

    const availableInventory = await Inventory.find({ guestHouseId: null, itemId: { $in: items.map((item) => item.itemId) } }).lean();
    const availableByItem = new Map(availableInventory.map((inventory) => [String(inventory.itemId), inventory]));
    const unavailable = items.some((item) => (availableByItem.get(String(item.itemId))?.quantity || 0) < item.quantity);
    if (unavailable) return res.status(400).json({ message: 'One or more requested quantities exceed central stock.' });
    const priceChangesAllowed = await allowHotelPriceChange(Configuration);
    const requestedItems = items.map((item) => ({
      ...item,
      price: priceChangesAllowed ? item.price : availableByItem.get(String(item.itemId)).price,
    }));

    const request = await ItemRequest.create({
      guestHouseId: hotel._id,
      items: requestedItems,
      note: String(req.body?.note || '').trim(),
      requestedBy: req.user._id,
    });
    return res.status(201).json({ message: 'Item request sent successfully.', request });
  } catch (error) {
    console.error('Error creating item request:', error);
    return res.status(500).json({ message: 'Failed to send item request.' });
  }
};

export const listItemRequests = async (req, res) => {
  try {
    const { ItemRequest } = req.tenantModels;
    const page = getPage(req.body?.page);
    const status = req.body?.status;
    const query = status && ['PENDING', 'APPROVED', 'CANCELLED'].includes(status) ? { status } : {};
    const [totalCount, requests] = await Promise.all([
      ItemRequest.countDocuments(query),
      ItemRequest.find(query)
        .populate('guestHouseId', 'guestHouseName guestHouseId')
        .populate('items.itemId', 'name unit')
        .populate('requestedBy', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);
    return res.json({ requests, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing item requests:', error);
    return res.status(500).json({ message: 'Failed to load item requests.' });
  }
};

export const approveItemRequest = async (req, res) => {
  const session = await req.tenantDb.startSession();
  try {
    const { Inventory, ItemRequest, ItemIssue } = req.tenantModels;
    let approvedRequest;

    await session.withTransaction(async () => {
      const request = await ItemRequest.findOne({ _id: req.params.id, status: 'PENDING' }).session(session);
      if (!request) throw new Error('REQUEST_NOT_PENDING');

      for (const requestedItem of request.items) {
        const centralInventory = await Inventory.findOneAndUpdate(
          { itemId: requestedItem.itemId, guestHouseId: null, quantity: { $gte: requestedItem.quantity } },
          { $inc: { quantity: -requestedItem.quantity }, $set: { updatedBy: req.user._id } },
          { new: true, session }
        );
        if (!centralInventory) throw new Error('INSUFFICIENT_STOCK');

        await Inventory.findOneAndUpdate(
          { itemId: requestedItem.itemId, guestHouseId: request.guestHouseId },
          {
            $inc: { quantity: requestedItem.quantity },
            $set: { price: requestedItem.price, costPrice: centralInventory.costPrice, updatedBy: req.user._id },
            $setOnInsert: { itemId: requestedItem.itemId, guestHouseId: request.guestHouseId, createdBy: req.user._id },
          },
          { upsert: true, new: true, runValidators: true, session }
        );
      }

      request.status = 'APPROVED';
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      await request.save({ session });
      await ItemIssue.create([{
        guestHouseId: request.guestHouseId,
        items: request.items,
        type: 'REQUEST_APPROVAL',
        requestId: request._id,
        note: request.note,
        issuedBy: req.user._id,
      }], { session });
      approvedRequest = request;
    });

    return res.json({ message: 'Request approved and inventory issued.', request: approvedRequest });
  } catch (error) {
    if (error.message === 'REQUEST_NOT_PENDING') return res.status(404).json({ message: 'Pending request not found.' });
    if (error.message === 'INSUFFICIENT_STOCK') return res.status(400).json({ message: 'Central stock is no longer sufficient for this request.' });
    console.error('Error approving item request:', error);
    return res.status(500).json({ message: 'Failed to approve item request.' });
  } finally {
    await session.endSession();
  }
};

export const cancelItemRequest = async (req, res) => {
  try {
    const { ItemRequest } = req.tenantModels;
    const request = await ItemRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'PENDING' },
      { $set: { status: 'CANCELLED', reviewedBy: req.user._id, reviewedAt: new Date(), declineReason: String(req.body?.declineReason || '').trim() } },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: 'Pending request not found.' });
    return res.json({ message: 'Request cancelled.', request });
  } catch (error) {
    console.error('Error cancelling item request:', error);
    return res.status(500).json({ message: 'Failed to cancel item request.' });
  }
};

export const directIssueItems = async (req, res) => {
  const session = await req.tenantDb.startSession();
  try {
    const { Inventory, ItemIssue, Configuration } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    const items = normalizeItems(req.body?.items);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });
    if (!items) return res.status(400).json({ message: 'Select at least one item with a valid quantity.' });

    const priceChangesAllowed = await allowHotelPriceChange(Configuration);
    const issuedItems = [];
    await session.withTransaction(async () => {
      for (const item of items) {
        const hotelInventory = await Inventory.findOneAndUpdate(
          { itemId: item.itemId, guestHouseId: hotel._id, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity }, $set: { updatedBy: req.user._id } },
          { new: true, session }
        );
        if (!hotelInventory) throw new Error('INSUFFICIENT_STOCK');
        issuedItems.push({ ...item, price: priceChangesAllowed ? item.price : hotelInventory.price });
      }
      await ItemIssue.create([{
        guestHouseId: hotel._id,
        items: issuedItems,
        type: 'DIRECT_ISSUE',
        note: String(req.body?.note || '').trim(),
        issuedBy: req.user._id,
      }], { session });
    });

    return res.json({ message: 'Inventory issued successfully.' });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK') return res.status(400).json({ message: 'One or more issued quantities exceed available stock.' });
    console.error('Error directly issuing inventory:', error);
    return res.status(500).json({ message: 'Failed to issue inventory.' });
  } finally {
    await session.endSession();
  }
};
