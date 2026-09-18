import DefaultUser from "../models/User.js";
import { syncCentralUserSafely } from "./centralUserDirectory.js";

/**
 * Upsert a guest into the User collection with role = "USER".
 */
export const upsertNormalUser = async ({
  fullName,
  email,
  phone,
  address,
  dateOfBirth,
  gender,
  nationality,
  identityType,
  identityNumber,
  emergencyContactName,
  emergencyContactPhone,
  guestHouseId,
  bookingId,
}, tenantDbOrUserModel = null) => {
  let User = DefaultUser;
  if (tenantDbOrUserModel?.model) {
    User = tenantDbOrUserModel.model('User');
  } else if (tenantDbOrUserModel?.models?.User) {
    User = tenantDbOrUserModel.models.User;
  }

  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedPhone = phone ? String(phone).trim() : null;

  const lookupConditions = [];
  if (normalizedEmail) lookupConditions.push({ email: normalizedEmail });
  if (normalizedPhone) lookupConditions.push({ phone: normalizedPhone });

  let existingUser = null;

  if (lookupConditions.length > 0) {
    existingUser = await User.findOne({
      role: "USER",
      $or: lookupConditions,
    });
  }

  const nameParts  = (fullName || "").trim().split(/\s+/);
  const firstName  = nameParts[0] || "Guest";
  const lastName   = nameParts.slice(1).join(" ") || "";

  const profileUpdate = {
    firstName,
    lastName,
    ...(normalizedEmail               && { email:                normalizedEmail }),
    ...(normalizedPhone               && { phone:                normalizedPhone }),
    ...(address?.trim()               && { address:              address.trim() }),
    ...(dateOfBirth                   && { dateOfBirth }),
    ...(gender                        && { gender }),
    ...(nationality?.trim()           && { nationality:          nationality.trim() }),
    ...(identityType                  && { identityType }),
    ...(identityNumber?.trim()        && { identityNumber:       identityNumber.trim() }),
    ...(emergencyContactName?.trim()  && { emergencyContactName: emergencyContactName.trim() }),
    ...(emergencyContactPhone?.trim() && { emergencyContactPhone: emergencyContactPhone.trim() }),
    lastBookingAt: new Date(),
  };

  if (existingUser) {
    existingUser.set(profileUpdate);
    if (bookingId && !existingUser.bookingIds.map(String).includes(String(bookingId))) {
      existingUser.bookingIds.push(bookingId);
    }
    existingUser.totalBookings = existingUser.bookingIds.length;
    await existingUser.save();
    if (tenantDbOrUserModel?.name) {
      await syncCentralUserSafely({ user: existingUser, dbName: tenantDbOrUserModel.name }, 'normal user upsert');
    }
    console.log(`👤 NormalUser updated: ${existingUser.email || existingUser.phone}`);
    return existingUser;
  }

  const newUser = await User.create({
    ...profileUpdate,
    role:                   "USER",
    password:               null,
    bookingIds:             bookingId ? [bookingId] : [],
    totalBookings:          bookingId ? 1 : 0,
    registeredGuestHouseId: guestHouseId || null,
  });

  if (tenantDbOrUserModel?.name) {
    await syncCentralUserSafely({ user: newUser, dbName: tenantDbOrUserModel.name }, 'normal user creation');
  }

  console.log(`👤 NormalUser created: ${newUser.email || newUser.phone}`);
  return newUser;
};
