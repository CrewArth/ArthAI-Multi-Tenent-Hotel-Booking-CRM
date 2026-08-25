import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../utils/api";
import editIcon from "../../assets/edit.svg";
import { getCurrentMonthDateRange } from "../utils/dateUtils";
import CaptureSessionModal from "../components/CaptureSessionModal";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
};

const GuestHouseBookings = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth?.user);
  const assignedGuestHouse = currentUser?.assignedGuestHouseId;
  const { startDate: defaultStart, endDate: defaultEnd } = getCurrentMonthDateRange();

  const [bookings, setBookings] = useState([]);
  const [guestHousesList, setGuestHousesList] = useState([]);
  const [selectedGuestHouseId, setSelectedGuestHouseId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [captureBookingId, setCaptureBookingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [appliedFilters, setAppliedFilters] = useState({
    status: "all",
    startDate: defaultStart,
    endDate: defaultEnd,
    guestHouseId: "all",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  const getAssignedGuestHouseId = () => {
    if (!assignedGuestHouse) return null;
    return typeof assignedGuestHouse === "object"
      ? assignedGuestHouse.guestHouseId
      : assignedGuestHouse;
  };

  useEffect(() => {
    const fetchGuestHouses = async () => {
      if (!assignedGuestHouse) {
        try {
          const res = await api.post("/api/guesthouses/list");
          const list = Array.isArray(res.data?.guestHouses)
            ? res.data.guestHouses
            : Array.isArray(res.data)
            ? res.data
            : [];
          setGuestHousesList(list);
        } catch (err) {
          console.warn("Could not fetch guest houses list:", err);
        }
      }
    };
    fetchGuestHouses();
  }, [assignedGuestHouse]);

  const fetchBookings = async (page = 1, silent = false) => {
    try {
      !silent ? setLoading(true) : setRefreshing(true);
      setError("");

      const activeGhId = getAssignedGuestHouseId() || (appliedFilters.guestHouseId !== "all" ? appliedFilters.guestHouseId : null);

      const params = {
        page,
        limit,
        ...(activeGhId && { guestHouseId: activeGhId }),
        ...(appliedFilters.status !== "all" && { status: appliedFilters.status }),
        ...(appliedFilters.startDate && { startDate: appliedFilters.startDate }),
        ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
      };

      const res = await api.post("/api/bookings/list", params);
      setBookings(Array.isArray(res.data?.bookings) ? res.data.bookings : []);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(res.data.currentPage || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error("Error fetching hotel bookings:", err);
      setError("Failed to load bookings");
      setBookings([]);
      toast.error("Failed to load bookings");
    } finally {
      !silent ? setLoading(false) : setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage, appliedFilters]);

  const applyFilter = () => {
    setCurrentPage(1);
    setAppliedFilters({
      status: statusFilter,
      startDate,
      endDate,
      guestHouseId: selectedGuestHouseId,
    });
  };

  const resetFilter = () => {
    const { startDate: defaultStart, endDate: defaultEnd } = getCurrentMonthDateRange();
    setStatusFilter("all");
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSelectedGuestHouseId("all");
    setCurrentPage(1);
    setAppliedFilters({
      status: "all",
      startDate: defaultStart,
      endDate: defaultEnd,
      guestHouseId: "all",
    });
  };

  const handleRefresh = () => fetchBookings(currentPage, true);

  if (loading) return <div className="page-root"><p style={{ color: "#64748b" }}>Loading bookings…</p></div>;
  if (error && !refreshing) return <div className="page-root"><p style={{ color: "#dc2626" }}>{error}</p></div>;

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Hotel Bookings</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn-action view" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="toolbar-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
        {!assignedGuestHouse && guestHousesList.length > 0 && (
          <>
            <span className="toolbar-label">Hotel:</span>
            <select
              className="toolbar-select"
              value={selectedGuestHouseId}
              onChange={(e) => setSelectedGuestHouseId(e.target.value)}
            >
              <option value="all">All Hotels</option>
              {guestHousesList.map((gh) => (
                <option key={gh._id} value={gh.guestHouseId || gh._id}>
                  {gh.guestHouseName}
                </option>
              ))}
            </select>
          </>
        )}

        <span className="toolbar-label">Status:</span>
        <select
          className="toolbar-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <span className="toolbar-label" style={{ marginLeft: 8 }}>From:</span>
        <input
          type="date"
          className="toolbar-select"
          style={{ padding: "6px 10px" }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <span className="toolbar-label">To:</span>
        <input
          type="date"
          className="toolbar-select"
          style={{ padding: "6px 10px" }}
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <button className="btn-action view" onClick={applyFilter}>Apply</button>
        <button className="btn-action reject" onClick={resetFilter}>Reset</button>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th className="center">#</th>
              <th>Hotel</th>
              <th>Guest</th>
              <th>Phone</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Room / Bed</th>
              <th>Status</th>
              <th>Booked On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="10" className="table-empty">No bookings found</td></tr>
            ) : (
              bookings.map((b, i) => {
                const index = (currentPage - 1) * limit + i + 1;
                const isEditDisabled = Boolean(b.isCheckedOut || b.status === "cancelled");

                return (
                  <tr key={b._id}>
                    <td className="center">{index}</td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>
                        {b.guestHouseId?.guestHouseName || "—"}
                      </strong>
                    </td>
                    <td>
                      {b.userId?.firstName || "—"}
                      {b.userId?.lastName ? ` ${b.userId.lastName}` : ""}
                    </td>
                    <td>{b.userId?.phone || "—"}</td>
                    <td>{formatDate(b.checkIn)}</td>
                    <td>{formatDate(b.checkOut)}</td>
                    <td>
                      {Array.isArray(b.roomIds) && b.roomIds.length ? b.roomIds.map(r => r?.roomNumber ? `Room ${r.roomNumber}` : '').filter(Boolean).join(', ') || '—' : '—'}
                      {b.bedId?.bedNumber ? ` / Bed ${b.bedId.bedNumber}` : ""}
                      {b.bedId?.bedType ? ` (${b.bedId.bedType})` : ""}
                    </td>
                    <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
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
                        <button
                          className="btn-action"
                          style={{
                            background: '#f0f9ff',
                            color: '#0284c7',
                            border: '1px solid #bae6fd',
                            padding: '3px 7px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                          onClick={() => setCaptureBookingId(b._id)}
                          title="Capture verification documents via phone QR"
                        >
                          <span>📱</span> QR
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="pagination-row">
          <button disabled={currentPage === 1} onClick={() => goToPage(1)}>« First</button>
          <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>← Prev</button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
            <span style={{ marginLeft: 14, color: "#94a3b8" }}>
              ({(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalCount)} of {totalCount})
            </span>
          </span>

          <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next →</button>
          <button disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>Last »</button>
        </div>
      )}

      {/* Mobile QR Capture Modal */}
      <CaptureSessionModal
        bookingId={captureBookingId}
        isOpen={Boolean(captureBookingId)}
        onClose={() => setCaptureBookingId(null)}
        onSessionUpdated={() => fetchBookings(currentPage, true)}
      />
    </div>
  );
};

export default GuestHouseBookings;
