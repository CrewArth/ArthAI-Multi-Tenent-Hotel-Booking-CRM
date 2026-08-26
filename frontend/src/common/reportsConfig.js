/**
 * Centralized Frontend Reports Configuration & Metadata
 */

export const REPORTS = [
  {
    id: "bookingByGuestHouse",
    name: "Booking Report",
    description: "",
    defaultEnabled: true,
    supportedFilters: ["fromDate", "toDate", "guestHouseId"],
  },
  {
    id: "monthlyRevenueByGuestHouse",
    name: "Monthly Revenue Report",
    description: "",
    defaultEnabled: true,
    supportedFilters: ["month", "year", "guestHouseId"],
  },
  {
    id: "paymentMethodReport",
    name: "Payment Method Wise Report",
    description: "",
    defaultEnabled: true,
    supportedFilters: ["paymentMethods", "fromDate", "toDate"],
  },
];

export const getAllReportIds = () => REPORTS.map((r) => r.id);

export const isReportAllowed = (user, reportId) => {
  if (!user) return true;
  const userRole = String(user.role || '').toUpperCase();
  if (userRole === 'SUPER_ADMIN' || userRole === 'HOTEL_ADMIN' || userRole === 'HOTEL-ADMIN') return true;

  const allowed = user.allowedReports;
  if (allowed === null || allowed === undefined) return true;
  if (Array.isArray(allowed)) return allowed.includes(reportId);
  return false;
};
