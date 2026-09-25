import mongoose from 'mongoose';
import { isObjectId } from '../utils/isObjectId.js';

const PAGE_SIZE = 10;

const getPage = (value) => Math.max(1, Number.parseInt(value, 10) || 1);

const addItemSearch = async (query, Item, value) => {
  const search = String(value || '').trim();
  if (!search) return;
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const itemIds = await Item.find({
    $or: [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { initials: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ],
  }).distinct('_id');
  query.itemId = { $in: itemIds };
};

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

const itemPayload = (body) => {
  const name = String(body?.name || '').trim();
  const initials = String(body?.initials || '').trim().toUpperCase();
  const unit = String(body?.unit || 'piece').trim();
  const quantity = Number(body?.quantity);
  const price = Number(body?.price);
  const costPrice = Number(body?.costPrice);
  const isChargeable = body?.isChargeable === undefined ? true : body.isChargeable;
  if (!name || !/^[A-Z]{1,2}$/.test(initials) || !unit || typeof isChargeable !== 'boolean' || body?.quantity === '' || body?.price === '' || body?.costPrice === '' || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0) return null;
  return { name, initials, description: String(body?.description || '').trim(), unit, quantity, price: isChargeable ? price : 0, costPrice, isChargeable };
};

const chargeablePrice = (item, price) => item?.isChargeable === false ? 0 : price;

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
    const details = itemPayload(req.body);
    if (!details) return res.status(400).json({ message: 'Enter a name, one or two letter initials, quantity, price, and cost price.' });

    const hotel = req.body?.guestHouseId ? await resolveGuestHouse(GuestHouse, req.body.guestHouseId) : null;
    if (req.body?.guestHouseId && !hotel) return res.status(404).json({ message: 'Hotel not found.' });

    let item = await Item.findOne({ name: details.name });
    if (item && ((item.initials && item.initials !== details.initials) || item.isChargeable !== details.isChargeable)) {
      return res.status(409).json({ message: 'This item already exists with different initials or chargeability. Edit the item first.' });
    }
    if (!item) {
      item = await Item.create({
        name: details.name,
        initials: details.initials,
        description: details.description,
        unit: details.unit,
        isChargeable: details.isChargeable,
        createdBy: req.user._id,
      });
    } else if (!item.initials) {
      item.initials = details.initials;
      await item.save();
    }

    const inventory = await Inventory.findOneAndUpdate(
      { itemId: item._id, guestHouseId: hotel?._id || null },
      {
        $inc: { quantity: details.quantity },
        $set: { price: details.price, costPrice: details.costPrice, updatedBy: req.user._id },
        $setOnInsert: { itemId: item._id, guestHouseId: hotel?._id || null, createdBy: req.user._id },
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('itemId', 'name initials description unit isChargeable').populate('guestHouseId', 'guestHouseName');

    return res.status(201).json({ message: 'Inventory added successfully.', inventory });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'An item with this name already exists.' });
    console.error('Error adding inventory item:', error);
    return res.status(500).json({ message: 'Failed to add inventory item.' });
  }
};

export const updateItem = async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid inventory item.' });
  const details = itemPayload(req.body);
  if (!details) return res.status(400).json({ message: 'Enter a name, one or two letter initials, quantity, price, and cost price.' });
  const { Inventory, Item } = req.tenantModels;
  const session = await req.tenantDb.startSession();
  try {
    await session.withTransaction(async () => {
      const inventory = await Inventory.findById(req.params.id).session(session);
      if (!inventory) throw new Error('INVENTORY_NOT_FOUND');
      const item = await Item.findById(inventory.itemId).session(session);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      const duplicate = await Item.findOne({ name: details.name, _id: { $ne: item._id } }).session(session);
      if (duplicate) throw new Error('DUPLICATE_ITEM');
      item.set({ name: details.name, initials: details.initials, description: details.description, unit: details.unit, isChargeable: details.isChargeable });
      await item.save({ session });
      inventory.set({ quantity: details.quantity, price: details.price, costPrice: details.costPrice, updatedBy: req.user._id });
      await inventory.save({ session });
      if (!details.isChargeable) await Inventory.updateMany({ itemId: item._id }, { $set: { price: 0, updatedBy: req.user._id } }, { session });
    });
    const inventory = await Inventory.findById(req.params.id).populate('itemId', 'name initials description unit isChargeable').populate('guestHouseId', 'guestHouseName');
    return res.json({ message: 'Inventory item updated.', inventory });
  } catch (error) {
    if (error.message === 'INVENTORY_NOT_FOUND' || error.message === 'ITEM_NOT_FOUND') return res.status(404).json({ message: 'Inventory item not found.' });
    if (error.message === 'DUPLICATE_ITEM' || error?.code === 11000) return res.status(409).json({ message: 'An item with this name already exists.' });
    console.error('Error updating inventory item:', error);
    return res.status(500).json({ message: 'Failed to update inventory item.' });
  } finally {
    await session.endSession();
  }
};

export const deleteItem = async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid inventory item.' });
  try {
    const inventory = await req.tenantModels.Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json({ message: 'Inventory item deleted.' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return res.status(500).json({ message: 'Failed to delete inventory item.' });
  }
};

export const listInventory = async (req, res) => {
  try {
    const { Inventory, GuestHouse, Item } = req.tenantModels;
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

    await addItemSearch(query, Item, req.body?.search);

    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .populate('itemId', 'name initials description unit isChargeable')
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
    const { Inventory, Item } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });

    const page = getPage(req.body?.page);
    const query = { guestHouseId: hotel._id };
    await addItemSearch(query, Item, req.body?.search);
    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .select('-costPrice')
        .populate('itemId', 'name initials description unit isChargeable')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.json({ inventory: inventory.map((entry) => ({ ...entry, price: chargeablePrice(entry.itemId, entry.price) })), currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing hotel inventory:', error);
    return res.status(500).json({ message: 'Failed to load hotel inventory.' });
  }
};

export const listAvailableItems = async (req, res) => {
  try {
    const { Inventory, Item } = req.tenantModels;
    const page = getPage(req.body?.page);
    const query = { guestHouseId: null, quantity: { $gt: 0 } };
    await addItemSearch(query, Item, req.body?.search);
    const [totalCount, inventory] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.find(query)
        .select('-costPrice')
        .populate('itemId', 'name initials description unit isChargeable')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    return res.json({ inventory: inventory.map((entry) => ({ ...entry, price: chargeablePrice(entry.itemId, entry.price) })), currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), totalCount });
  } catch (error) {
    console.error('Error listing available inventory:', error);
    return res.status(500).json({ message: 'Failed to load available items.' });
  }
};

export const createItemRequest = async (req, res) => {
  try {
    const { Inventory, Item, ItemRequest, Configuration } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    const items = normalizeItems(req.body?.items);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });
    if (!items) return res.status(400).json({ message: 'Select at least one item with a valid quantity.' });

    const availableInventory = await Inventory.find({ guestHouseId: null, itemId: { $in: items.map((item) => item.itemId) } }).lean();
    const availableByItem = new Map(availableInventory.map((inventory) => [String(inventory.itemId), inventory]));
    const unavailable = items.some((item) => (availableByItem.get(String(item.itemId))?.quantity || 0) < item.quantity);
    if (unavailable) return res.status(400).json({ message: 'One or more requested quantities exceed central stock.' });
    const priceChangesAllowed = await allowHotelPriceChange(Configuration);
    const itemDefinitions = await Item.find({ _id: { $in: items.map((item) => item.itemId) } }).select('_id isChargeable').lean();
    const definitionsById = new Map(itemDefinitions.map((item) => [String(item._id), item]));
    const requestedItems = items.map((item) => ({
      ...item,
      price: chargeablePrice(definitionsById.get(String(item.itemId)), priceChangesAllowed ? item.price : availableByItem.get(String(item.itemId)).price),
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
    const { Inventory, Item, ItemRequest, ItemIssue } = req.tenantModels;
    let approvedRequest;

    await session.withTransaction(async () => {
      const request = await ItemRequest.findOne({ _id: req.params.id, status: 'PENDING' }).session(session);
      if (!request) throw new Error('REQUEST_NOT_PENDING');

      for (const requestedItem of request.items) {
        const item = await Item.findById(requestedItem.itemId).select('isChargeable').session(session).lean();
        requestedItem.price = chargeablePrice(item, requestedItem.price);
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
    const { Inventory, Item, ItemIssue, Configuration } = req.tenantModels;
    const hotel = await getHotelForUser(req);
    const items = normalizeItems(req.body?.items);
    if (!hotel) return res.status(403).json({ message: 'No hotel assigned to your account.' });
    if (!items) return res.status(400).json({ message: 'Select at least one item with a valid quantity.' });

    const priceChangesAllowed = await allowHotelPriceChange(Configuration);
    const issuedItems = [];
    await session.withTransaction(async () => {
      for (const item of items) {
        const definition = await Item.findById(item.itemId).select('isChargeable').session(session).lean();
        const hotelInventory = await Inventory.findOneAndUpdate(
          { itemId: item.itemId, guestHouseId: hotel._id, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity }, $set: { updatedBy: req.user._id } },
          { new: true, session }
        );
        if (!hotelInventory) throw new Error('INSUFFICIENT_STOCK');
        issuedItems.push({ ...item, price: chargeablePrice(definition, priceChangesAllowed ? item.price : hotelInventory.price) });
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
