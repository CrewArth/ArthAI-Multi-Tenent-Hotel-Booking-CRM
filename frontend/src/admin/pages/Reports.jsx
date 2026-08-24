import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { REPORTS, isReportAllowed } from '../../common/reportsConfig';
import { MONTHS } from '../../common/months';
import { PAYMENT_METHODS } from '../../common/paymentMethods';
import { FileText, Download, CheckCircle, Lock } from 'lucide-react';
import { getCurrentMonthDateRange } from '../utils/dateUtils';
import '../styles/reports.css';

const Reports = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const isSuperAdmin = String(currentUser?.role || '').toUpperCase() === 'SUPER_ADMIN';
  const logoUrl = useSelector((state) => state.siteSettings.logoUrl);

  // Resize + compress a base64 data URL down to a small thumbnail for PDF embedding.
  // Keeps the image recognisable while staying well under the request size limit.
  const compressLogo = (dataUrl, maxSize = 120) =>
    new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });

  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'permissions'

  // Allowed reports for current logged in user
  const permittedReports = REPORTS.filter((r) => isReportAllowed(currentUser, r.id));

  // Selected report to generate
  const [selectedReportId, setSelectedReportId] = useState(
    permittedReports[0]?.id || 'bookingByGuestHouse'
  );

  const { fromDate: defaultFrom, toDate: defaultTo } = getCurrentMonthDateRange();

  // Filters state
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [guestHouseId, setGuestHouseId] = useState('');
  const [guestHouses, setGuestHouses] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Payment methods filter (for paymentMethodReport)
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([...PAYMENT_METHODS]);

  // Month / Year filters (for monthlyRevenueByGuestHouse)
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-based
  const [selectedYear,  setSelectedYear]  = useState(currentDate.getFullYear());
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  // Permissions Tab state (Super Admin)
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedReportPermissions, setSelectedReportPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Fetch Guest Houses for filters
  useEffect(() => {
    api
      .post('/api/guesthouses/list')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.guestHouses || [];

        // ADMIN: restrict to their assigned guest house only
        const assignedId = currentUser?.assignedGuestHouseId;
        if (assignedId && String(currentUser?.role).toUpperCase() === 'ADMIN') {
          const assigned = list.filter(
            (gh) => gh.guestHouseId === assignedId || gh._id === assignedId
          );
          setGuestHouses(assigned);
          if (assigned.length > 0) setGuestHouseId(assigned[0].guestHouseId || assigned[0]._id);
        } else {
          setGuestHouses(list);
          if (list.length > 0) setGuestHouseId(list[0].guestHouseId || list[0]._id);
        }
      })
      .catch((err) => console.error('Error fetching guest houses:', err));
  }, [currentUser]);

  // Fetch Admins list for Super Admin permissions tab
  useEffect(() => {
    if (isSuperAdmin && activeTab === 'permissions') {
      api
        .post('/api/admin/users/list', { limit: 1000 })
        .then((res) => {
          const list = res.data?.users || [];
          const adminOnly = list.filter((u) => String(u.role).toUpperCase() === 'ADMIN');
          setAdmins(adminOnly);
          if (adminOnly.length > 0) {
            setSelectedAdminId(adminOnly[0]._id);
          }
        })
        .catch((err) => console.error('Error fetching admins:', err));
    }
  }, [isSuperAdmin, activeTab]);

  // Fetch permissions when selected Admin changes
  useEffect(() => {
    if (isSuperAdmin && activeTab === 'permissions' && selectedAdminId) {
      setLoadingPermissions(true);
      api
        .get(`/api/reports/permissions/${selectedAdminId}`)
        .then((res) => {
          const allowed = res.data?.user?.allowedReports;
          if (allowed === null || allowed === undefined) {
            setSelectedReportPermissions(REPORTS.map((r) => r.id));
          } else {
            setSelectedReportPermissions(Array.isArray(allowed) ? allowed : []);
          }
        })
        .catch((err) => {
          console.error('Error fetching permissions:', err);
          toast.error('Failed to load permissions for selected admin');
        })
        .finally(() => setLoadingPermissions(false));
    }
  }, [isSuperAdmin, activeTab, selectedAdminId]);

  // Handle PDF Generation
  const handleGeneratePdf = async (e) => {
    e.preventDefault();

    if (!selectedReportId) {
      toast.error('Please select a report');
      return;
    }

    if (selectedReportId === 'bookingByGuestHouse' && !guestHouseId) {
      toast.error('Please select a Hotel');
      return;
    }

    if (selectedReportId === 'monthlyRevenueByGuestHouse' && !guestHouseId) {
      toast.error('Please select a Hotel');
      return;
    }

    if (selectedReportId === 'paymentMethodReport' && selectedPaymentMethods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    try {
      setGenerating(true);

      const compressedLogo = await compressLogo(logoUrl);

      // Build filter payload based on what the selected report needs
      const filterPayload = { logoUrl: compressedLogo };
      if (currentReportConfig?.supportedFilters.includes('guestHouseId')) filterPayload.guestHouseId = guestHouseId;

      if (selectedReportId === 'monthlyRevenueByGuestHouse') {
        // Date range takes priority over month/year when both are filled
        if (fromDate && toDate) {
          filterPayload.fromDate = fromDate;
          filterPayload.toDate   = toDate;
        } else {
          filterPayload.month = selectedMonth;
          filterPayload.year  = selectedYear;
        }
      } else if (selectedReportId === 'paymentMethodReport') {
        filterPayload.paymentMethods = selectedPaymentMethods;
        if (fromDate) filterPayload.fromDate = fromDate;
        if (toDate)   filterPayload.toDate   = toDate;
      } else {
        if (currentReportConfig?.supportedFilters.includes('fromDate')) filterPayload.fromDate = fromDate;
        if (currentReportConfig?.supportedFilters.includes('toDate'))   filterPayload.toDate   = toDate;
        if (currentReportConfig?.supportedFilters.includes('month'))    filterPayload.month    = selectedMonth;
        if (currentReportConfig?.supportedFilters.includes('year'))     filterPayload.year     = selectedYear;
      }

      const response = await api.post(
        `/api/reports/${selectedReportId}/generate`,
        filterPayload,
        { responseType: 'blob' }
      );

      // Check if server returned a JSON error instead of a PDF (e.g. no data found)
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        toast.error(json.error || 'No data found for the selected filters.');
        return;
      }

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedReportId}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF report generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);

      // axios responseType:blob wraps error responses as blobs — parse them
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          toast.error(json.error || 'Failed to generate report PDF.');
        } catch {
          toast.error('Failed to generate report PDF.');
        }
      } else {
        toast.error(err.response?.data?.error || 'Failed to generate report PDF.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Toggle report permission checkbox for Super Admin
  const togglePermission = (reportId) => {
    setSelectedReportPermissions((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  // Save report permissions
  const handleSavePermissions = async () => {
    if (!selectedAdminId) {
      toast.error('Select an admin');
      return;
    }

    try {
      setSavingPermissions(true);
      await api.put(`/api/reports/permissions/${selectedAdminId}`, {
        allowedReports: selectedReportPermissions,
      });
      toast.success('Report permissions updated successfully!');
    } catch (err) {
      console.error('Error saving report permissions:', err);
      toast.error(err.response?.data?.error || 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const currentReportConfig = REPORTS.find((r) => r.id === selectedReportId);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1 className="reports-title">Reports Module</h1>
    
      </div>

      {isSuperAdmin && (
        <div className="reports-tabs">
          <button
            className={`reports-tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            Generate Reports
          </button>
          <button
            className={`reports-tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Manage Report Permissions
          </button>
        </div>
      )}

      {/* ── TAB 1: GENERATE REPORTS ── */}
      {activeTab === 'generate' && (
        <>
          <div className="reports-card">
            <h2 className="reports-card-title">Select Report</h2>

            {permittedReports.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                <Lock size={16} style={{ display: 'inline', marginRight: 6 }} />
                No report permissions have been granted to your account.
              </p>
            ) : (
              <div className="reports-filter-field" style={{ maxWidth: 420 }}>
                <select
                  className="reports-filter-select"
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                >
                  {permittedReports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.name}
                    </option>
                  ))}
                </select>
                {currentReportConfig?.description && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, display: 'block' }}>
                    {currentReportConfig.description}
                  </span>
                )}
              </div>
            )}
          </div>

          {currentReportConfig && permittedReports.length > 0 && (
            <div className="reports-card">
              <h2 className="reports-card-title">Report Filters</h2>

              <form onSubmit={handleGeneratePdf} className="reports-filter-form">
                <div className="reports-filter-grid">
                  {currentReportConfig.supportedFilters.includes('paymentMethods') && (
                    <div className="reports-filter-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="reports-filter-label">
                        Payment Methods <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        {PAYMENT_METHODS.map((method) => {
                          const checked = selectedPaymentMethods.includes(method);
                          return (
                            <label
                              key={method}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                padding: '5px 12px', borderRadius: 6, border: `1px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
                                background: checked ? '#eff6ff' : '#f8fafc', fontSize: '0.85rem',
                                color: checked ? '#2563eb' : '#475569', fontWeight: checked ? 600 : 400,
                                userSelect: 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedPaymentMethods((prev) =>
                                    prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
                                  )
                                }
                                style={{ display: 'none' }}
                              />
                              {method}
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <button type="button" style={{ fontSize: '0.78rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setSelectedPaymentMethods([...PAYMENT_METHODS])}>
                          Select All
                        </button>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <button type="button" style={{ fontSize: '0.78rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setSelectedPaymentMethods([])}>
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {currentReportConfig.supportedFilters.includes('fromDate') && (
                    <div className="reports-filter-field">
                      <label className="reports-filter-label">From Date</label>
                      <input
                        type="date"
                        className="reports-filter-input"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                  )}

                  {currentReportConfig.supportedFilters.includes('toDate') && (
                    <div className="reports-filter-field">
                      <label className="reports-filter-label">To Date</label>
                      <input
                        type="date"
                        className="reports-filter-input"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  )}

                  {currentReportConfig.supportedFilters.includes('guestHouseId') && (
                    <div className="reports-filter-field">
                      <label className="reports-filter-label">
                        Hotel <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="reports-filter-select"
                        value={guestHouseId}
                        onChange={(e) => setGuestHouseId(e.target.value)}
                        required
                        disabled={
                          String(currentUser?.role).toUpperCase() === 'ADMIN' &&
                          !!currentUser?.assignedGuestHouseId
                        }
                      >
                        {guestHouses.map((gh) => (
                          <option key={gh._id} value={gh.guestHouseId || gh._id}>
                            {gh.guestHouseName} ({gh.guestHouseId})
                          </option>
                        ))}
                      </select>
                      
                    </div>
                  )}

                  {currentReportConfig.supportedFilters.includes('month') && (
                    <div className="reports-filter-field">
                      <label className="reports-filter-label">
                        Month <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="reports-filter-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        disabled={selectedReportId === 'monthlyRevenueByGuestHouse' && !!(fromDate && toDate)}
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentReportConfig.supportedFilters.includes('year') && (
                    <div className="reports-filter-field">
                      <label className="reports-filter-label">
                        Year <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        className="reports-filter-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        disabled={selectedReportId === 'monthlyRevenueByGuestHouse' && !!(fromDate && toDate)}
                      >
                        {yearOptions.map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Optional date range — only shown for monthlyRevenueByGuestHouse */}
                  {selectedReportId === 'monthlyRevenueByGuestHouse' && (
                    <>
                      <div className="reports-filter-field">
                        <label className="reports-filter-label">
                          From Date
                          <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>(optional — overrides month/year)</span>
                        </label>
                        <input
                          type="date"
                          className="reports-filter-input"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>
                      <div className="reports-filter-field">
                        <label className="reports-filter-label">
                          To Date
                          <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                        </label>
                        <input
                          type="date"
                          className="reports-filter-input"
                          value={toDate}
                          min={fromDate || undefined}
                          onChange={(e) => setToDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <button type="submit" className="reports-generate-btn" disabled={generating}>
                  <Download size={18} />
                  {generating ? 'Generating PDF…' : 'Generate PDF Report'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: MANAGE PERMISSIONS (Super Admin) ── */}
      {isSuperAdmin && activeTab === 'permissions' && (
        <div className="reports-card">
          <h2 className="reports-card-title">Assign Report Permissions</h2>

          {admins.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No Admin accounts found.</p>
          ) : (
            <>
              <label className="reports-filter-label" style={{ marginBottom: 6, display: 'block' }}>
                Select Admin
              </label>
              <select
                className="reports-admin-select"
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
              >
                {admins.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.firstName} {admin.lastName} ({admin.email})
                  </option>
                ))}
              </select>

              {loadingPermissions ? (
                <p style={{ color: '#64748b' }}>Loading permissions…</p>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  <label className="reports-filter-label" style={{ marginBottom: 10, display: 'block' }}>
                    Permitted Reports
                  </label>
                  {REPORTS.map((report) => {
                    const isChecked = selectedReportPermissions.includes(report.id);
                    return (
                      <div
                        key={report.id}
                        className={`reports-permission-item ${isChecked ? 'selected' : ''}`}
                        onClick={() => togglePermission(report.id)}
                      >
                        <input
                          type="checkbox"
                          className="reports-checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by div container click
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                            {report.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {report.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="reports-save-btn"
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                  >
                    {savingPermissions ? 'Saving…' : 'Save Report Access'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
