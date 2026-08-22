import {
  listAllowedReportsForUser,
  getReportFilterOptions,
  generateReportPdf,
  getAdminReportPermissions,
  updateAdminReportPermissions,
} from '../services/reportService.js';

export const getReportsList = async (req, res) => {
  try {
    const reports = listAllowedReportsForUser(req.user);
    res.json({ reports });
  } catch (err) {
    console.error("Error listing reports:", err);
    res.status(500).json({ error: err.message || "Unable to list reports" });
  }
};

export const getFilters = async (req, res) => {
  try {
    const { reportName } = req.params;
    const filterOptions = await getReportFilterOptions(reportName, req.user, req.tenantModels);
    res.json(filterOptions);
  } catch (err) {
    console.error("Error getting report filters:", err);
    res.status(400).json({ error: err.message || "Unable to load report filters" });
  }
};

export const generatePdf = async (req, res) => {
  try {
    const { reportName } = req.params;
    const filters = req.body || {};

    const pdfBuffer = await generateReportPdf(reportName, filters, req.user, {
      tenantModels: req.tenantModels,
      tenantDb: req.tenantDb,
    });

    const fileName = `${reportName}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Error generating report PDF:", err);

    if (err.code === 'NO_DATA') {
      return res.status(404).json({ error: err.message });
    }

    res.status(400).json({ error: err.message || "Failed to generate report PDF" });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const user = await getAdminReportPermissions(adminId, req.tenantModels);
    res.json({ user });
  } catch (err) {
    console.error("Error fetching report permissions:", err);
    res.status(400).json({ error: err.message || "Unable to fetch report permissions" });
  }
};

export const updatePermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { allowedReports } = req.body;

    const updatedUser = await updateAdminReportPermissions(
      adminId,
      allowedReports,
      req.user?.email,
      { tenantModels: req.tenantModels, tenantDb: req.tenantDb }
    );

    res.json({
      message: "Report permissions updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating report permissions:", err);
    res.status(400).json({ error: err.message || "Failed to update report permissions" });
  }
};
