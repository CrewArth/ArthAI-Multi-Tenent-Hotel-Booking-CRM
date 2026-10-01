import mongoose from 'mongoose';

const findHotel = (GuestHouse, value) => {
  if (!value) return null;
  return mongoose.isValidObjectId(value)
    ? GuestHouse.findById(value).select('_id guestHouseId guestHouseName').lean()
    : GuestHouse.findOne({ guestHouseId: value }).select('_id guestHouseId guestHouseName').lean();
};

export const resolveBanquetHotel = async (req, requestedId) => {
  if (req.user.role === 'SUPER_ADMIN') {
    const hotel = await findHotel(req.tenantModels.GuestHouse, requestedId);
    return hotel ? { hotel } : { status: 404, message: 'Hotel not found.' };
  }

  const assigned = req.user.assignedGuestHouseId;
  const assignedId = assigned && typeof assigned === 'object' ? assigned._id || assigned.guestHouseId : assigned;
  if (!assignedId) return { status: 403, message: 'No hotel is assigned to this account.' };
  const hotel = await findHotel(req.tenantModels.GuestHouse, assignedId);
  if (!hotel) return { status: 404, message: 'Assigned hotel not found.' };
  if (requestedId) {
    const requested = await findHotel(req.tenantModels.GuestHouse, requestedId);
    if (!requested || String(requested._id) !== String(hotel._id)) return { status: 403, message: 'You cannot access another hotel’s banquet data.' };
  }
  return { hotel };
};
