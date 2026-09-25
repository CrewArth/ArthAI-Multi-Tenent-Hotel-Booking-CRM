import { isObjectId } from './isObjectId.js';

export const normalizeCredentialUsername = (value) => String(value || '').trim().toLowerCase();

export const isValidCredentialUsername = (value) => /^[a-z][a-z0-9]{2,31}$/.test(value);

export const hotelEmailDomain = (hotelName) => String(hotelName || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 63);

export const buildAdminCredentialEmail = (username, hotelName) => {
  const cleanUsername = normalizeCredentialUsername(username);
  const domain = hotelEmailDomain(hotelName);
  if (!isValidCredentialUsername(cleanUsername) || !domain) return null;
  return `${cleanUsername}@${domain}.in`;
};

export const assignedHotelId = (user) => {
  const assignment = user?.assignedGuestHouseId;
  return assignment && typeof assignment === 'object'
    ? assignment.guestHouseId || assignment._id
    : assignment;
};

export const resolveCredentialHotel = (GuestHouse, value) => {
  const id = String(value || '').trim();
  if (!id) return null;
  return GuestHouse.findOne({
    $or: [{ guestHouseId: id }, ...(isObjectId(id) ? [{ _id: id }] : [])],
  });
};
