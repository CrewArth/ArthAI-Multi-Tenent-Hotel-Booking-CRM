import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaFileExcel } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "../../utils/api";
import editIcon from "../../assets/edit.svg";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
};

const LIMIT = 10;

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [error, setError]                     = useState("");
  const [selected, setSelected]               = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [exportDate, setExportDate]           = useState(() => new Date().toISOString().slice(0, 10));
  const [isExporting, setIsExporting]         = useState(false);

  // Filter state (pending until Apply)
  const [statusInput, setStatusInput]   = useState("all");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput]     = useState("");

  // Applied filters + pagination
  const [appliedFilters, setAppliedFilters] = useState({ status: "all", startDate: "", endDate: "" });
  const [currentPage, setCurrentPage]       = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [totalCount, setTotalCount]         = useState(0);

  const fetchBookings = useCallback(async (page = 1, filters = appliedFilters, silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      const params = {
        page,
        limit: LIMIT,
        ...(filters.status !== "all"  && { status:    filters.status }),
        ...(filters.startDate         && { startDate:  filters.startDate }),
        ...(filters.endDate           && { endDate:    filters.endDate }),
      };

      const res = await api.post("/api/bookings/list", params);
      setBookings(Array.isArray(res.data.bookings) ? res.data.bookings : []);
      setTotalPages(res.data.totalPages  || 1);
      setCurrentPage(res.data.currentPage || page);
      setTotalCount(res.data.totalCount  || 0);
    } catch (err) {
      setError("Failed to load bookings");
      setBookings([]);
      toast.error("Failed to load bookings");
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }, [appliedFilters]);

  // Refetch when page or applied filters change
  useEffect(() => {
    fetchBookings(currentPage, appliedFilters);
  }, [currentPage, appliedFilters]);

  // Auto-refresh every 12 s when no modal/action is open
  useEffect(() => {
    const id = setInterval(() => {
      if (!selected && !actionLoadingId) fetchBookings(currentPage, appliedFilters, true);
    }, 12000);
    return () => clearInterval(id);
  }, [selected, actionLoadingId, currentPage, appliedFilters]);

  const applyFilter = () => {
    const next = { status: statusInput, startDate: startDateInput, endDate: endDateInput };
    setCurrentPage(1);
    setAppliedFilters(next);
  };

  const resetFilter = () => {
    setStatusInput("all");
    setStartDateInput("");
    setEndDateInput("");
    setCurrentPage(1);
    setAppliedFilters({ status: "all", startDate: "", endDate: "" });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await api.post("/api/bookings/export/daily", { date: exportDate }, { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `bookings-${exportDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } catch { toast.error("Export failed"); }
    finally  { setIsExporting(false); }
  };

  const handleAction = async (id, action, currentStatus) => {
    if (currentStatus !== "pending") return toast.info("Already processed.");
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} this booking?`)) return;
    try {
      setActionLoadingId(id);
      await api.patch(`/api/bookings/${id}/${action}`);
      toast.success(`Booking ${action === "approve" ? "approved" : "rejected"}`);
      fetchBookings(currentPage, appliedFilters);
    } catch { toast.error("Action failed"); }
    finally  { setActionLoadingId(null); }
  };

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(totalPages, p)));

  if (loading) return <div className="page-root"><p style={{ color: "#64748b" }}>Loading bookings…</p></div>;
  if (error)   return <div className="page-root"><p style={{ color: "#dc2626" }}>{error}</p></div>;

  return (
    <div className="page-root bookings-root">

      {/* ── Header ── */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Bookings</h1>
        </div>
        <div className="export-row">
          <input
            type="date"
            className="export-date-input"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
          />
          <button
            className="btn-action export"
            onClick={handleExport}
            disabled={isExporting || !exportDate}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "0.875rem" }}
          >
            <FaFileExcel />
            {isExporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="toolbar-row">
        <span className="toolbar-label">Status:</span>
        <select className="toolbar-select" value={statusInput} onChange={(e) => setStatusInput(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <span className="toolbar-label" style={{ marginLeft: 8 }}>From:</span>
        <input
          type="date"
          className="toolbar-select"
          style={{ padding: "6px 10px" }}
          value={startDateInput}
          onChange={(e) => setStartDateInput(e.target.value)}
        />

        <span className="toolbar-label">To:</span>
        <input
          type="date"
          className="toolbar-select"
          style={{ padding: "6px 10px" }}
          value={endDateInput}
          min={startDateInput}
          onChange={(e) => setEndDateInput(e.target.value)}
        />

        <button className="btn-action view" onClick={applyFilter}>Apply</button>
        <button className="btn-action reject" onClick={resetFilter}>Reset</button>

        {refreshing && <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Refreshing…</span>}
      </div>

      {/* ── Table — fixed height so pagination never goes off-screen ── */}
      <div className="table-scroll bookings-table-scroll">
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th className="center">#</th>
              <th>Hotel</th>
              <th>Guest</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Room</th>
              <th>Bed</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="9" className="table-empty">No bookings found</td></tr>
            ) : (
              bookings.map((b, i) => {
                const index = (currentPage - 1) * LIMIT + i + 1;
                const isEditDisabled = Boolean(b.isCheckedOut || b.status === "cancelled");

                return (
                  <tr key={b._id}>
                    <td className="center">{index}</td>
                    <td>{b.guestHouseId?.guestHouseName || "—"}</td>
                    <td>
                      {b.userId?.firstName || "—"}
                      {b.userId?.lastName ? ` ${b.userId.lastName}` : ""}
                      {b.userId?.email && (
                        <><br /><span style={{ color: "#64748b", fontSize: "0.78rem" }}>{b.userId.email}</span></>
                      )}
                    </td>
                    <td>{formatDate(b.checkIn)}</td>
                    <td>{formatDate(b.checkOut)}</td>
                    <td>{b.roomId?.roomNumber ? `Room ${b.roomId.roomNumber}` : "—"}</td>
                    <td>{b.bedId?.bedNumber ? `Bed ${b.bedId.bedNumber}` : "—"}</td>
                    <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                    <td>
                      <div className="actions-cell">
                        {b.status === "pending" && (
                          <>
                            <button
                              className="btn-action approve"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleAction(b._id, "approve", b.status)}
                            >
                              {actionLoadingId === b._id ? "…" : "Approve"}
                            </button>
                            <button
                              className="btn-action reject"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleAction(b._id, "reject", b.status)}
                            >
                              {actionLoadingId === b._id ? "…" : "Reject"}
                            </button>
                          </>
                        )}
                        <button
                          className="btn-action edit"
                          disabled={isEditDisabled}
                          onClick={() => {
                            if (isEditDisabled) return;
                            navigate("/admin/book-room", { state: { bookingId: b._id } });
                          }}
                          title={b.isCheckedOut ? "Cannot edit a checked-out booking" : b.status === "cancelled" ? "Cannot edit a cancelled booking" : "Edit booking"}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                            padding: '4px',
                            opacity: isEditDisabled ? 0.35 : 1,
                            cursor: isEditDisabled ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <img src={editIcon} alt="Edit" style={{ width: 16, height: 16 }} />
                        </button>
                        <button className="btn-action view" onClick={() => setSelected(b)}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalCount > 0 && (
        <div className="pagination-row">
          <button disabled={currentPage === 1} onClick={() => goToPage(1)}>« First</button>
          <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>← Prev</button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
            <span style={{ marginLeft: 14, color: "#94a3b8" }}>
              ({(currentPage - 1) * LIMIT + 1}–{Math.min(currentPage * LIMIT, totalCount)} of {totalCount})
            </span>
          </span>

          <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next →</button>
          <button disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>Last »</button>
        </div>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <div className="page-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="page-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-modal-header">
              <h3>Booking Details</h3>
              <button className="page-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="page-modal-body">
              <div className="modal-detail-grid">
                <p><strong>Guest</strong>{selected.userId?.firstName || selected.fullName || "—"} {selected.userId?.lastName || ""}</p>
                <p><strong>Email</strong>{selected.userId?.email || selected.email || "—"}</p>
                <p><strong>Phone</strong>{selected.userId?.phone || selected.phone || "—"}</p>
                <p><strong>Hotel</strong>{selected.guestHouseId?.guestHouseName || "—"}</p>
                <p><strong>Room</strong>{selected.roomId?.roomNumber ? `Room ${selected.roomId.roomNumber}` : "—"}</p>
                <p><strong>Bed</strong>{selected.bedId?.bedNumber ? `Bed ${selected.bedId.bedNumber} (${selected.bedId.bedType})` : "—"}</p>
                <p><strong>Check-In</strong>{formatDate(selected.checkIn)}</p>
                <p><strong>Check-Out</strong>{formatDate(selected.checkOut)}</p>
                <p><strong>Status</strong><span className={`badge ${selected.status}`}>{selected.status}</span></p>
                <p><strong>Applied On</strong>{formatDate(selected.createdAt)}</p>
                {selected.specialRequests && <p className="full"><strong>Special Requests</strong>{selected.specialRequests}</p>}
              </div>
            </div>
            <div className="page-modal-footer">
              <button className="btn-action view" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
