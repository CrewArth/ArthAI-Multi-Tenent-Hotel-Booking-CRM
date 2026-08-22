export const getAuditLogs = async (req, res) => {
  try {
    const { AuditLog } = req.tenantModels;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;
    const { entityType } = req.body;

    const query = {};
    if (entityType && entityType !== 'all') {
      query.entityType = entityType;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLogs = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / limit);

    return res.json({
      success: true,
      logs,
      totalLogs,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, error: "Server error while fetching logs" });
  }
};

export const exportDailyAuditLogs = async (req, res) => {
  try {
    const { AuditLog } = req.tenantModels;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: "date query parameter is required (YYYY-MM-DD)" });
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const logs = await AuditLog.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Action', 'Entity', 'Performed By', 'Timestamp', 'Details'];
    const escapeValue = (value) => {
      if (value === null || value === undefined) return '""';
      const stringValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log) => [
      escapeValue(log.action),
      escapeValue(log.entityType),
      escapeValue(log.performedBy),
      escapeValue(new Date(log.createdAt).toISOString()),
      escapeValue(log.details),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${date}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return res.status(500).json({ success: false, error: "Server error while exporting logs" });
  }
};
