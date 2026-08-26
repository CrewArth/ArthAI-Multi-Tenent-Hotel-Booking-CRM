import { sendEmail } from '../utils/emailService.js';
import { adminCreatedUserEmail } from '../utils/emailTemplates/adminCreatedUser.js';
import { logAction } from '../utils/auditLogger.js';
import { normalizeUser } from '../utils/roles.js';
import { isObjectId } from '../utils/isObjectId.js';

const getGuestHouseFilter = async (user, GuestHouse) => {
  if ((user?.role === 'ADMIN' || user?.role === 'HOTEL_ADMIN') && user.assignedGuestHouseId) {
    const ghId = typeof user.assignedGuestHouseId === 'object'
      ? user.assignedGuestHouseId.guestHouseId
      : user.assignedGuestHouseId;
    if (ghId) {
      const isObjId = isObjectId(ghId);
      const gh = await GuestHouse.findOne({
        $or: [
          { guestHouseId: ghId },
          ...(isObjId ? [{ _id: ghId }] : []),
        ],
      }).lean();
      if (gh) return { guestHouseId: gh._id };
    }
  }
  return {};
};

// Fetch Dashboard Summary (LIVE STATS)
export const getAdminSummary = async (req, res) => {
  try {
    const { User, GuestHouse, Booking } = req.tenantModels;
    const bookingQuery = await getGuestHouseFilter(req.user, GuestHouse);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const isTodayBooking = {
      $cond: {
        if: {
          $or: [
            { $gte: ["$createdAt", today] },
            {
              $and: [
                { $lte: ["$checkIn", now] },
                { $gte: ["$checkOut", today] }
              ]
            }
          ]
        },
        then: 1,
        else: 0
      }
    };

    const pipeline = [
      { $match: bookingQuery },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          approvedBookings: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pendingBookings: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          cancelledBookings: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          rejectedBookings: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          todaysBookings: { $sum: isTodayBooking }
        }
      }
    ];

    const [totalUsers, totalGuestHouses, bookingResult] = await Promise.all([
      User.countDocuments({ role: 'ADMIN' }),
      GuestHouse.countDocuments(),
      Booking.aggregate(pipeline).exec()
    ]);

    const counts = bookingResult[0] || {
      totalBookings: 0,
      approvedBookings: 0,
      pendingBookings: 0,
      cancelledBookings: 0,
      rejectedBookings: 0,
      todaysBookings: 0
    };

    const { totalBookings, approvedBookings, pendingBookings, cancelledBookings, rejectedBookings, todaysBookings } = counts;

    const occupancyRate =
      totalBookings > 0 ? ((approvedBookings / totalBookings) * 100).toFixed(2) : 0;

    const summary = {
      totalUsers,
      totalGuestHouses,
      totalBookings,
      approvedBookings,
      pendingBookings,
      cancelledBookings,
      rejectedBookings,
      todaysBookings,
      occupancyRate
    };

    res.json(summary);
  } catch (error) {
    console.error("Error in admin summary:", error);
    res.status(500).json({ error: "Server error while fetching dashboard stats" });
  }
};

const buildDateRange = (startDateParam, endDateParam, rangeParam) => {
  const endDate = endDateParam ? new Date(endDateParam) : new Date();
  if (Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid endDate");
  }
  endDate.setHours(23, 59, 59, 999);

  let startDate;
  if (startDateParam) {
    startDate = new Date(startDateParam);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid startDate");
    }
  } else {
    const days = parseInt(rangeParam, 10) || 30;
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
  }
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

export const getBookingsPerDay = async (req, res) => {
  try {
    const { Booking, GuestHouse } = req.tenantModels;
    const { startDate, endDate } = buildDateRange(
      req.body.startDate,
      req.body.endDate,
      req.body.range
    );

    const matchStage = {
      ...await getGuestHouseFilter(req.user, GuestHouse),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (req.body.status && req.body.status !== "all") {
      matchStage.status = req.body.status;
    }

    const bookingsPerDay = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          totalBookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalBookings: 1,
        },
      },
    ]);

    res.json({ range: { startDate, endDate }, data: bookingsPerDay });
  } catch (error) {
    console.error("Error fetching bookings per day:", error);
    res.status(400).json({ error: error.message || "Unable to fetch data" });
  }
};

export const getTopGuestHouses = async (req, res) => {
  try {
    const { Booking, GuestHouse } = req.tenantModels;
    const { startDate, endDate } = buildDateRange(
      req.body.startDate,
      req.body.endDate,
      req.body.range
    );

    const limit = Math.min(parseInt(req.body.limit, 10) || 5, 20);

    const matchStage = {
      ...await getGuestHouseFilter(req.user, GuestHouse),
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (req.body.status && req.body.status !== "all") {
      matchStage.status = req.body.status;
    }

    const topGuestHouses = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$guestHouseId",
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: GuestHouse.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "guestHouse",
        },
      },
      { $unwind: "$guestHouse" },
      {
        $project: {
          guestHouseId: "$_id",
          guestHouseName: "$guestHouse.guestHouseName",
          bookingCount: 1,
          location: "$guestHouse.location",
        },
      },
    ]);

    res.json({
      range: { startDate, endDate },
      data: topGuestHouses,
    });
  } catch (error) {
    console.error("Error fetching top guest houses:", error);
    res.status(400).json({ error: error.message || "Unable to fetch data" });
  }
};

export const assignGuestHouse = async (req, res) => {
  try {
    const { User, GuestHouse } = req.tenantModels;
    const { id } = req.params;
    const { guestHouseId } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Admin not found' });
    if (user.role !== 'ADMIN' && user.role !== 'HOTEL_ADMIN') return res.status(400).json({ error: 'Guest house can only be assigned to ADMIN or HOTEL_ADMIN accounts' });

    let guestHouse = null;
    if (guestHouseId) {
      const isObjId = isObjectId(guestHouseId);
      guestHouse = await GuestHouse.findOne({
        $or: [
          { guestHouseId: guestHouseId },
          ...(isObjId ? [{ _id: guestHouseId }] : []),
        ],
      });
      if (!guestHouse) return res.status(404).json({ error: 'Guest house not found' });
    }

    const assignedId = guestHouse ? guestHouse.guestHouseId : null;
    user.assignedGuestHouseId = assignedId;
    await user.save();

    await logAction({
      action: assignedId ? 'GUESTHOUSE_ASSIGNED' : 'GUESTHOUSE_UNASSIGNED',
      entityType: 'User',
      entityId: user._id,
      performedBy: req.user?.email || 'SuperAdmin',
      details: { assignedGuestHouseId: assignedId },
    }, req.tenantDb);

    const userObj = user.toObject();
    if (guestHouse) {
      userObj.assignedGuestHouseId = guestHouse;
    }

    res.json({ message: assignedId ? 'Guest house assigned' : 'Guest house unassigned', user: userObj });
  } catch (err) {
    console.error('Error assigning guest house:', err);
    res.status(500).json({ error: 'Server error while assigning guest house' });
  }
};

export const getMe = async (req, res) => {
  try {
    const { User, GuestHouse } = req.tenantModels;
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.assignedGuestHouseId) {
      const guestHouse = await GuestHouse.findOne({ guestHouseId: user.assignedGuestHouseId }).lean();
      user.assignedGuestHouseId = guestHouse;
    }

    res.json({ user });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const listUsers = async (req, res) => {
  try {
    const { User, GuestHouse } = req.tenantModels;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const isHotelAdmin = req.user?.role === 'HOTEL_ADMIN';
    let queryFilter = { role: { $in: ["ADMIN", "HOTEL_ADMIN"] } };

    if (isHotelAdmin) {
      const assignedId = typeof req.user.assignedGuestHouseId === 'object'
        ? req.user.assignedGuestHouseId.guestHouseId
        : req.user.assignedGuestHouseId;
      queryFilter = {
        role: "ADMIN",
        assignedGuestHouseId: assignedId,
      };
    }

    let users = await User.find(
      queryFilter,
      "firstName lastName email phone address role isActive createdAt assignedGuestHouseId allowedWidgets allowedReports eSignatureUrl"
    )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const guestHouseIds = [...new Set(users.map(u => u.assignedGuestHouseId).filter(Boolean))];
    const guestHouses = await GuestHouse.find({ guestHouseId: { $in: guestHouseIds } }).lean();
    const guestHouseMap = {};
    guestHouses.forEach(gh => guestHouseMap[gh.guestHouseId] = gh);

    users = users.map(user => ({
      ...user,
      assignedGuestHouseId: guestHouseMap[user.assignedGuestHouseId] || user.assignedGuestHouseId
    }));

    const totalUsers = await User.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalUsers / limit);

    return res.json({
      users,
      totalUsers,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ error: "Server error while fetching users" });
  }
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { User } = req.tenantModels;
    const { firstName, lastName, email, phone, address, password, role } = req.body;
    const eSignatureUrl = req.eSignatureUrl || null;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ 
        error: "First name, last name, email, phone, and password are required." 
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: "Please provide a valid email address." 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone: String(phone).trim() }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ 
          error: "User with this email already exists." 
        });
      }
      if (existingUser.phone === String(phone).trim()) {
        return res.status(400).json({ 
          error: "User with this phone number already exists." 
        });
      }
    }

    const isHotelAdmin = req.user?.role === 'HOTEL_ADMIN';
    let targetRole = role === "HOTEL_ADMIN" ? "HOTEL_ADMIN" : "ADMIN";
    let assignedGuestHouseId = undefined;

    if (isHotelAdmin) {
      targetRole = "ADMIN";
      assignedGuestHouseId = typeof req.user.assignedGuestHouseId === 'object'
        ? req.user.assignedGuestHouseId.guestHouseId
        : req.user.assignedGuestHouseId;
    }

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: String(phone).trim(),
      address: address ? address.trim() : "",
      password,
      role: targetRole,
      assignedGuestHouseId,
      isActive: true,
      eSignatureUrl,
    });

    await newUser.save();

    const performerEmail = req.user?.email || "Admin";

    res.status(201).json({
      message: "Admin account created successfully.",
      user: {
        ...normalizeUser(newUser.toObject()),
      },
    });

    sendEmail({
      to: newUser.email,
      subject: "Your Rishabh Guest House Account Has Been Created",
      html: adminCreatedUserEmail(newUser),
    }).catch(err => {
      console.error("❌ Email send error for admin-created user:", err);
    });

    logAction({
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: newUser._id,
      performedBy: performerEmail,
      details: {
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        email: newUser.email,
        phone: newUser.phone,
        createdByAdmin: true,
      },
    }, req.tenantDb).catch(err => {
      console.error("❌ Audit log error:", err);
    });
  } catch (error) {
    console.error("Error creating user by admin:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `User with this ${field} already exists.`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: messages.join(", ")
      });
    }

    return res.status(500).json({
      error: "Server error while creating user."
    });
  }
};

export const updateUserWidgets = async (req, res) => {
  try {
    const { User } = req.tenantModels;
    const { id } = req.params;
    const { allowedWidgets } = req.body;

    if (allowedWidgets !== null && !Array.isArray(allowedWidgets)) {
      return res.status(400).json({ error: "allowedWidgets must be an array of widget IDs or null" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.allowedWidgets = allowedWidgets;
    await user.save();

    await logAction({
      action: "USER_WIDGETS_UPDATED",
      entityType: "User",
      entityId: user._id,
      performedBy: req.user?.email || "SuperAdmin",
      details: { allowedWidgets },
    }, req.tenantDb);

    res.json({
      message: "Widget permissions updated successfully",
      user: normalizeUser(user.toObject()),
    });
  } catch (err) {
    console.error("Error updating user widgets:", err);
    res.status(500).json({ error: "Server error while updating widget permissions" });
  }
};
