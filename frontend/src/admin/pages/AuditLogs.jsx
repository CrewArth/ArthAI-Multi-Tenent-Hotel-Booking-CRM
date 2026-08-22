import React, { useEffect, useState } from 'react';
import { FaFileExcel } from 'react-icons/fa';
import api from '../../utils/api';

const formatDate = (ts) =>
  new Date(ts).toLocaleString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// Colour map for action badges
const ACTION_COLORS = {
  GUESTHOUSE_CREATED: '#16a34a', ROOM_CREATED: '#16a34a', BED_CREATED: '#16a34a', USER_REGISTERED: '#16a34a',
  BOOKING_CREATED: '#16a34a', BOOKING_APPROVED: '#0284c7',
  GUESTHOUSE_UPDATED: '#d97706', ROOM_UPDATED: '#d97706', BED_UPDATED: '#d97706', USER_UPDATED: '#d97706',
  GUESTHOUSE_DELETED: '#dc2626', ROOM_DELETED: '#dc2626', BED_DELETED: '#dc2626', USER_DELETED: '#dc2626',
  BOOKING_REJECTED: '#dc2626',
  MAINTENANCE_TOGGLED: '#6b7280', ROOM_AVAILABILITY_TOGGLED: '#6b7280', BED_AVAILABILITY_TOGGLED: '#6b7280',
  USER_DEACTIVATED: '#6b7280', USER_ACTIVATED: '#16a34a',
};

const AuditLogs = () => {
  const [logs, setLogs]               = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDate, setExportDate]   = useState(() => new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType]   = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);
  const limit = 10;

  const fetchLogs = async () => {
    try {
      const res = await api.post('/api/audit-logs/list', { page: currentPage, limit, entityType: filterType });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchLogs(); }, [currentPage, filterType]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await api.post('/api/audit-logs/export/daily', { date: exportDate }, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${exportDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    finally { setIsExporting(false); }
  };

  const renderDetails = (log) => {
    const d = log.details || {};
    if (log.entityType === 'GuestHouse') return (<>{d.guestHouseName && <p><strong>Name:</strong> {d.guestHouseName}</p>}{d.location && <p><strong>Location:</strong> {d.location}</p>}</>);
    if (log.entityType === 'Room')       return (<>{d.guestHouseName && <p><strong>Hotel:</strong> {d.guestHouseName}</p>}{d.roomNumber && <p><strong>Room:</strong> {d.roomNumber}</p>}{d.roomType && <p><strong>Type:</strong> {d.roomType}</p>}</>);
    if (log.entityType === 'Bed')        return (<>{d.guestHouseName && <p><strong>Hotel:</strong> {d.guestHouseName}</p>}{d.roomNumber && <p><strong>Room:</strong> {d.roomNumber}</p>}{d.bedNumber && <p><strong>Bed:</strong> {d.bedNumber}</p>}{d.bedType && <p><strong>Type:</strong> {d.bedType}</p>}</>);
    if (log.entityType === 'Booking')    return (<>{d.user && <><p><strong>User:</strong> {d.user.name}</p><p><strong>Email:</strong> {d.user.email}</p></>}{d.guestHouse && <p><strong>Hotel:</strong> {d.guestHouse}</p>}{d.checkIn && <p><strong>Check-in:</strong> {new Date(d.checkIn).toLocaleDateString()}</p>}{d.checkOut && <p><strong>Check-out:</strong> {new Date(d.checkOut).toLocaleDateString()}</p>}{d.status && <p><strong>Status:</strong> {d.status}</p>}</>);
    if (log.entityType === 'User' && d.userDetails) return (<><p><strong>Name:</strong> {d.userDetails.name}</p><p><strong>Email:</strong> {d.userDetails.email}</p><p><strong>Active:</strong> {d.userDetails.isActive ? 'Yes' : 'No'}</p></>);
    return <pre style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(d, null, 2)}</pre>;
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Audit Logs</h1>
        </div>
        <div className="export-row">
          <input type="date" className="export-date-input" value={exportDate} onChange={(e) => setExportDate(e.target.value)} />
          <button
            className="btn-action export"
            onClick={handleExport}
            disabled={isExporting || !exportDate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.875rem' }}
          >
            <FaFileExcel /> {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="toolbar-row">
        <span className="toolbar-label">Entity:</span>
        <select className="toolbar-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
          <option value="all">All</option>
          <option value="GuestHouse">Hotel</option>
          <option value="Room">Room</option>
          <option value="Bed">Bed</option>
          <option value="User">User</option>
          <option value="Booking">Booking</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Performed By</th>
              <th>Timestamp</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="5" className="table-empty">No logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                      fontSize: '0.76rem', fontWeight: 600, color: '#fff',
                      background: ACTION_COLORS[log.action] || '#64748b',
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>{log.entityType}</td>
                  <td>{log.performedBy}</td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                  <td>
                    <button className="btn-action view" onClick={() => setSelectedLog(log)}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-row">
        <button disabled={currentPage === 1}         onClick={() => setCurrentPage((p) => p - 1)}>← Prev</button>
        <span className="pagination-info">Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next →</button>
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <div className="page-modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="page-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-modal-header">
              <h3>Log Details</h3>
              <button className="page-modal-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div className="page-modal-body">
              <p><strong>Action:</strong> {selectedLog.action}</p>
              <p><strong>Entity:</strong> {selectedLog.entityType}</p>
              <p><strong>Performed By:</strong> {selectedLog.performedBy}</p>
              <p><strong>Timestamp:</strong> {formatDate(selectedLog.createdAt)}</p>
              <div style={{ marginTop: '0.75rem', background: '#f8fafc', borderRadius: 8, padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                <strong>Details:</strong>
                <div style={{ marginTop: '0.5rem' }}>{renderDetails(selectedLog)}</div>
              </div>
            </div>
            <div className="page-modal-footer">
              <button className="btn-action view" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
