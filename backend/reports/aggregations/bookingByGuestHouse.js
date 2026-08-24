import { isObjectId } from '../../utils/isObjectId.js';

export const getBookingByGuestHouseData = async ({ guestHouseId, fromDate, toDate }, tenantModels) => {
  if (!guestHouseId) {
    throw new Error("Guest House is required for this report");
  }

  const { Booking, GuestHouse, User, Room, Bed } = tenantModels;

  const isObjId = isObjectId(guestHouseId);
  const guestHouse = await GuestHouse.findOne({
    $or: [
      { guestHouseId },
      ...(isObjId ? [{ _id: guestHouseId }] : []),
    ],
  }).lean();

  if (!guestHouse) {
    throw new Error("Selected guest house not found");
  }

  const matchStage = {
    guestHouseId: guestHouse._id,
  };

  if (fromDate || toDate) {
    matchStage.$and = [];
    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) {
        matchStage.$and.push({ checkOut: { $gte: start } });
      }
    }
    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) {
        matchStage.$and.push({ checkIn: { $lte: end } });
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { checkIn: 1, createdAt: -1 } },
    {
      $lookup: {
        from: User.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    {
      $unwind: {
        path: "$userDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: Room.collection.name,
        let: { roomIds: '$roomIds' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', { $ifNull: ['$$roomIds', []] }]
              }
            }
          }
        ],
        as: 'roomsDoc',
      },
    },
    {
      $lookup: {
        from: Bed.collection.name,
        localField: "bedId",
        foreignField: "_id",
        as: "bedDoc",
      },
    },
    {
      $unwind: {
        path: "$bedDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        bookingNo: { $substr: [{ $toString: "$_id" }, 18, 6] },
        guestName: {
          $concat: [
            { $ifNull: ["$userDoc.firstName", "$fullName"] },
            " ",
            { $ifNull: ["$userDoc.lastName", ""] },
          ],
        },
        guestEmail: { $ifNull: ["$userDoc.email", "$email"] },
        guestPhone: { $ifNull: ["$userDoc.phone", "$phone"] },
        roomNumber: {
          $reduce: {
            input: '$roomsDoc.roomNumber',
            initialValue: '',
            in: {
              $cond: {
                if: { $eq: ['$$value', ''] },
                then: { $toString: '$$this' },
                else: { $concat: ['$$value', ', ', { $toString: '$$this' }] }
              }
            }
          }
        },
        roomType: { $arrayElemAt: ['$roomsDoc.roomType', 0] },
        bedNumber: "$bedDoc.bedNumber",
        bedType: "$bedDoc.bedType",
        checkIn: 1,
        checkOut: 1,
        status: 1,
        createdAt: 1,
        specialRequests: 1,
      },
    },
  ];

  const bookings = await Booking.aggregate(pipeline);

  return {
    guestHouse,
    bookings,
  };
};
