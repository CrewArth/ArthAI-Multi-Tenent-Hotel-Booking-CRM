import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import EditUserModal from "../components/EditUserModel";
import CreateUserModal from "../components/CreateUserModal";
import AssignGuestHouseModal from "../components/AssignGuestHouseModal";
import ChangePasswordModal from "../components/ChangePasswordModal";

const UsersList = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [err, setErr]                   = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [subUsage, setSubUsage]         = useState(null);

  // Modals
  const [isEditOpen, setIsEditOpen]         = useState(false);
  const [isCreateOpen, setIsCreateOpen]     = useState(false);
  const [isAssignOpen, setIsAssignOpen]     = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  // Pagination & filter
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setErr("");
      const res = await api.post("/api/admin/users/list", { page, limit: 10 });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error(e);
      setErr("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubUsage = async () => {
    try {
      const res = await api.post("/api/subscription/usage");
      setSubUsage(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
    fetchSubUsage();
  }, [currentPage]);

  const planName = subUsage?.plan || 'BASIC';
  const maxAdmins = subUsage?.limits?.maxAdminsPerHotel ?? 1;
  const currentAdmins = subUsage?.usage?.admins?.current ?? users.filter(u => u.role === 'ADMIN').length;
  const isAdminLimitReached = currentAdmins >= maxAdmins;
  const adminHoverMessage = isAdminLimitReached
    ? `Subscription limit reached: Your ${planName} plan allows a maximum of ${maxAdmins} admin account(s). Please upgrade your plan.`
    : '';

  const filtered = users.filter((u) => {
    if (u.role === "SUPER_ADMIN") return false;
    if (statusFilter === "active")   return u.isActive === true;
    if (statusFilter === "inactive") return u.isActive === false;
    return true;
  });

  if (loading) return <div className="page-root"><p style={{ color: "#64748b" }}>Loading users…</p></div>;
  if (err)     return <div className="page-root"><p style={{ color: "#dc2626" }}>{err}</p></div>;

  const handleUpdate = async (formData) => {
    try {
      await api.put(`/api/users/${selectedUser._id}`, formData);
      toast.success("Admin details updated successfully!");
      setIsEditOpen(false);
      fetchUsers(currentPage);
      fetchSubUsage();
    } catch (error) {
      console.error("Update admin error:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Failed to update admin. Please try again.";
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Admin Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {subUsage && (
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '500' }}>
              Plan: <strong style={{ color: '#1e293b' }}>{planName}</strong> ({currentAdmins}/{maxAdmins} Admins)
            </span>
          )}
          <button
            className="btn-primary-cta"
            disabled={isAdminLimitReached}
            title={adminHoverMessage}
            style={isAdminLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            onClick={() => setIsCreateOpen(true)}
          >
            + Create New Admin {isAdminLimitReached && `(${currentAdmins}/${maxAdmins})`}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-row">
        <span className="toolbar-label">Filter:</span>
        <select
          className="toolbar-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Admins</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">#</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Assigned Hotel</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="table-empty">No admins found</td></tr>
            ) : (
              filtered.map((u, i) => (
                <tr key={u._id}>
                  <td className="center">{(currentPage - 1) * 10 + i + 1}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    {typeof u.assignedGuestHouseId === 'object' && u.assignedGuestHouseId
                      ? u.assignedGuestHouseId.guestHouseName
                      : u.assignedGuestHouseId || "None"}
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? "active" : "inactive"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn-action edit"
                        onClick={() => { setSelectedUser(u); setIsEditOpen(true); }}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-action view"
                        onClick={() => { setSelectedUser(u); setIsAssignOpen(true); }}
                      >
                        Assign
                      </button>

                      <button
                        className="btn-action toggle"
                        onClick={() => { setSelectedUser(u); setIsPasswordOpen(true); }}
                      >
                        Password
                      </button>
                    </div>
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

      {isEditOpen && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleUpdate}
        />
      )}
      {isCreateOpen && (
        <CreateUserModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => { fetchUsers(currentPage); fetchSubUsage(); setIsCreateOpen(false); }}
        />
      )}
      {isAssignOpen && selectedUser && (
        <AssignGuestHouseModal
          user={selectedUser}
          onClose={() => { setIsAssignOpen(false); setSelectedUser(null); }}
          onSuccess={() => fetchUsers(currentPage)}
        />
      )}
      {isPasswordOpen && selectedUser && (
        <ChangePasswordModal
          user={selectedUser}
          onClose={() => { setIsPasswordOpen(false); setSelectedUser(null); }}
          onSuccess={() => fetchUsers(currentPage)}
        />
      )}
    </div>
  );
};

export default UsersList;
