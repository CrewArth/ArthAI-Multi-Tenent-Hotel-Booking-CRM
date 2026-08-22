import { getBookingByGuestHouseData } from '../aggregations/bookingByGuestHouse.js';
import { getMonthlyRevenueByGuestHouseData } from '../aggregations/monthlyRevenueByGuestHouse.js';
import { getPaymentMethodReportData } from '../aggregations/paymentMethodReport.js';

export const fetchReportData = async (reportId, filters, tenantModels) => {
  switch (reportId) {
    case 'bookingByGuestHouse':
      return await getBookingByGuestHouseData(filters, tenantModels);
    case 'monthlyRevenueByGuestHouse':
      return await getMonthlyRevenueByGuestHouseData(filters, tenantModels);
    case 'paymentMethodReport':
      return await getPaymentMethodReportData(filters, tenantModels);
    default:
      throw new Error(`Aggregation for report '${reportId}' is not implemented.`);
  }
};
