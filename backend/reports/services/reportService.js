import { REPORTS, getReportById, isReportAllowed } from '../constants/reportsRegistry.js';
import { fetchReportData } from '../repositories/reportRepository.js';
import { generateBookingByGuestHousePdf } from '../pdf/templates/bookingByGuestHousePdf.js';
import { generateMonthlyRevenueByGuestHousePdf } from '../pdf/templates/monthlyRevenueByGuestHousePdf.js';
import { generateInvoicePdf } from '../pdf/templates/invoicePdf.js';
import { generatePaymentMethodReportPdf } from '../pdf/templates/paymentMethodReportPdf.js';
import { logAction } from '../../utils/auditLogger.js';

export const listAllowedReportsForUser = (user) => {
  return REPORTS.filter((report) => isReportAllowed(user, report.id));
};

export const getReportFilterOptions = async (reportId, user, tenantModels) => {
  const reportConfig = getReportById(reportId);
  if (!reportConfig) {
    throw new Error(`Report '${reportId}' not found`);
  }

  if (!isReportAllowed(user, reportId)) {
    throw new Error(`Permission denied for report '${reportId}'`);
  }

  const { GuestHouse } = tenantModels;
  const guestHouses = await GuestHouse.find({ maintenance: false }, "guestHouseId guestHouseName location").lean();

  return {
    report: reportConfig,
    guestHouses,
  };
};

export const generateReportPdf = async (reportId, filters, user, reqContext = {}) => {
  const { tenantModels, tenantDb } = reqContext;
  const reportConfig = getReportById(reportId);
  if (!reportConfig) {
    throw new Error(`Report '${reportId}' not found`);
  }

  if (!isReportAllowed(user, reportId)) {
    throw new Error(`Access denied for report '${reportId}'`);
  }

  let { logoUrl, ...reportFilters } = filters;

  if (!logoUrl) {
    try {
      const { connectMasterDb } = await import('../../config/dbManager.js');
      const tenantSchema = (await import('../../models/centralModels/Tenant.js')).default;
      const master = await connectMasterDb();
      const Tenant = master.models.Tenant || master.model('Tenant', tenantSchema);
      const dbName = tenantDb?.name || user?.dbName;
      if (dbName) {
        const tenantDoc = await Tenant.findOne({ dbName }).select('config.logoUrl hotelDetails.hotelLogo').lean();
        logoUrl = tenantDoc?.config?.logoUrl || tenantDoc?.hotelDetails?.hotelLogo || null;
      }
    } catch (err) {
      console.warn('Failed to resolve tenant logo from DB:', err.message);
    }
  }

  if (user.role === 'ADMIN' && user.assignedGuestHouseId) {
    const assignedId = typeof user.assignedGuestHouseId === 'object'
      ? user.assignedGuestHouseId.guestHouseId
      : user.assignedGuestHouseId;

    if (assignedId && reportFilters.guestHouseId && reportFilters.guestHouseId !== assignedId) {
      throw new Error(`You are only permitted to generate reports for your assigned guest house.`);
    }

    if (assignedId && !reportFilters.guestHouseId) {
      reportFilters.guestHouseId = assignedId;
    }
  }

  let data = {};
  if (reportId !== 'invoice') {
    data = await fetchReportData(reportId, reportFilters, tenantModels);

    const rowCount = data?.bookings?.length ?? data?.rows?.length ?? 0;
    if (rowCount === 0) {
      const noDataError = new Error('No data found for the selected filters.');
      noDataError.code = 'NO_DATA';
      throw noDataError;
    }
  }

  const performerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Admin';

  let pdfBuffer;
  switch (reportId) {
    case 'bookingByGuestHouse':
      pdfBuffer = await generateBookingByGuestHousePdf(data, reportFilters, {
        createdBy: performerName,
        logoUrl: logoUrl || null,
        eSignatureUrl: user.eSignatureUrl || null,
      });
      break;
    case 'monthlyRevenueByGuestHouse':
      pdfBuffer = await generateMonthlyRevenueByGuestHousePdf(data, reportFilters, {
        createdBy: performerName,
        logoUrl: logoUrl || null,
        eSignatureUrl: user.eSignatureUrl || null,
      });
      break;
    case 'paymentMethodReport':
      pdfBuffer = await generatePaymentMethodReportPdf(data, reportFilters, {
        createdBy: performerName,
        logoUrl: logoUrl || null,
        eSignatureUrl: user.eSignatureUrl || null,
      });
      break;
    case 'invoice': {
      const invoice = reportFilters.invoice;
      if (!invoice) {
        throw new Error('Invoice payload is required to generate invoice PDF.');
      }
      pdfBuffer = await generateInvoicePdf(invoice, {
        createdBy: performerName,
        logoUrl: logoUrl || null,
        eSignatureUrl: user.eSignatureUrl || null,
      });
      break;
    }
    default:
      throw new Error(`PDF generation template for report '${reportId}' is not implemented.`);
  }

  logAction({
    action: "REPORT_GENERATED",
    entityType: "Report",
    entityId: reportId,
    performedBy: user.email || "Admin",
    details: { reportId, filters: reportFilters },
  }, tenantDb).catch((err) => console.error("Report generation audit log error:", err));

  return pdfBuffer;
};

export const getAdminReportPermissions = async (adminId, tenantModels) => {
  const { User } = tenantModels;
  const user = await User.findById(adminId, "firstName lastName email role allowedReports");
  if (!user) {
    throw new Error("Admin not found");
  }
  return user;
};

export const updateAdminReportPermissions = async (adminId, allowedReports, performerEmail, tenantContext = {}) => {
  const { tenantModels, tenantDb } = tenantContext;
  if (allowedReports !== null && !Array.isArray(allowedReports)) {
    throw new Error("allowedReports must be an array of report IDs or null");
  }

  const { User } = tenantModels;
  const user = await User.findById(adminId);
  if (!user) {
    throw new Error("Admin not found");
  }

  user.allowedReports = allowedReports;
  await user.save();

  logAction({
    action: "REPORT_PERMISSIONS_UPDATED",
    entityType: "User",
    entityId: user._id,
    performedBy: performerEmail || "SuperAdmin",
    details: { allowedReports },
  }, tenantDb).catch((err) => console.error("Audit log error:", err));

  return user;
};
