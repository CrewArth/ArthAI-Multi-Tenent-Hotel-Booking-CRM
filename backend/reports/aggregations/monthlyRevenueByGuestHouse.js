import { isObjectId } from '../../utils/isObjectId.js';

export const getMonthlyRevenueByGuestHouseData = async ({ guestHouseId, month, year, fromDate, toDate }, tenantModels) => {
  if (!guestHouseId) throw new Error('Guest House is required for this report');

  const { Booking, GuestHouse, Room, Bed, User } = tenantModels;

  const hasDateRange = fromDate && toDate;
  const hasMonthYear = month && year;

  if (!hasDateRange && !hasMonthYear) {
    throw new Error('Either Month + Year or From Date + To Date is required');
  }

  let periodStart, periodEnd, monthNum, yearNum, mode;

  if (hasDateRange) {
    periodStart = new Date(`${fromDate}T00:00:00.000Z`);
    periodEnd   = new Date(`${toDate}T23:59:59.999Z`);
    if (isNaN(periodStart) || isNaN(periodEnd)) throw new Error('Invalid date range');
    if (periodEnd <= periodStart) throw new Error('To Date must be after From Date');
    mode = 'range';
    monthNum = periodStart.getUTCMonth() + 1;
    yearNum  = periodStart.getUTCFullYear();
  } else {
    monthNum = parseInt(month, 10);
    yearNum  = parseInt(year,  10);
    if (monthNum < 1 || monthNum > 12 || isNaN(monthNum)) throw new Error('Invalid month value');
    if (yearNum < 2000 || yearNum > 2100 || isNaN(yearNum)) throw new Error('Invalid year value');
    periodStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    periodEnd   = new Date(Date.UTC(yearNum, monthNum, 1));
    mode = 'monthly';
  }

  const isObjId = isObjectId(guestHouseId);
  const guestHouse = await GuestHouse.findOne({
    $or: [
      { guestHouseId },
      ...(isObjId ? [{ _id: guestHouseId }] : []),
    ],
  }).lean();

  if (!guestHouse) throw new Error('Selected guest house not found');

  const matchStage = {
    guestHouseId: guestHouse._id,
    status: 'approved',
    checkIn:  { $lt: periodEnd   },
    checkOut: { $gt: periodStart },
  };

  const pipeline = [
    { $match: matchStage },
    { $sort: { checkIn: 1 } },

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
        localField: 'bedId',
        foreignField: '_id',
        as: 'bedDoc',
      },
    },
    { $unwind: { path: '$bedDoc', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: User.collection.name,
        localField: 'userId',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        bookingNo: { $substr: [{ $toString: '$_id' }, 18, 6] },
        guestName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$userDoc.firstName', { $ifNull: ['$fullName', ''] }] },
                ' ',
                { $ifNull: ['$userDoc.lastName', ''] },
              ],
            },
          },
        },
        guestPhone: { $ifNull: ['$userDoc.phone', '$phone'] },
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
        roomType:   { $arrayElemAt: ['$roomsDoc.roomType', 0] },
        bedNumber:  '$bedDoc.bedNumber',
        originalPrice: { $sum: '$roomsDoc.price' },
        discountPercentage: { $ifNull: [{ $arrayElemAt: ['$roomsDoc.discountPercentage', 0] }, 0] },
        pricePerNight: {
          $let: {
            vars: {
              p: { $sum: '$roomsDoc.price' },
              d: { $ifNull: [{ $arrayElemAt: ['$roomsDoc.discountPercentage', 0] }, 0] },
            },
            in: {
              $subtract: [
                '$$p',
                { $divide: [{ $multiply: ['$$p', '$$d'] }, 100] },
              ],
            },
          },
        },
        checkIn:  1,
        checkOut: 1,
        status:   1,
        effectiveCheckIn:  { $max: ['$checkIn',  new Date(periodStart)] },
        effectiveCheckOut: { $min: ['$checkOut', new Date(periodEnd)]   },
      },
    },

    {
      $addFields: {
        nights: {
          $max: [
            0,
            {
              $divide: [
                { $subtract: ['$effectiveCheckOut', '$effectiveCheckIn'] },
                1000 * 60 * 60 * 24,
              ],
            },
          ],
        },
      },
    },
    { $addFields: { revenue: { $multiply: ['$pricePerNight', '$nights'] } } },
    { $match: { nights: { $gt: 0 } } },
  ];

  const rows = await Booking.aggregate(pipeline);

  const totalRevenue  = rows.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalNights   = rows.reduce((sum, r) => sum + (r.nights  || 0), 0);
  const totalBookings = rows.length;

  return {
    guestHouse,
    month: monthNum,
    year: yearNum,
    mode,
    fromDate: hasDateRange ? fromDate : null,
    toDate:   hasDateRange ? toDate   : null,
    rows,
    totalRevenue,
    totalNights,
    totalBookings,
  };
};
