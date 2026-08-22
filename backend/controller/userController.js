import { logAction } from "../utils/auditLogger.js";

const getTrackedDetails = (payload = {}) => {
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "role",
    "isActive",
    "allowedWidgets",
    "allowedReports",
    "eSignatureUrl",
  ];

  return allowedFields.reduce((acc, field) => {
    if (payload[field] !== undefined) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
};

const performer = (req) => req.user?.email || "Admin";
const hasSuperAdminRole = (req) => req.user?.role === "SUPER_ADMIN";

export const updateUser = async (req, res) => {
  try {
    const { User } = req.tenantModels;
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const isSameUser = String(req.user?._id || "") === String(id);

    if (!isSuperAdmin && !isSameUser) {
      return res.status(403).json({ message: "You are not allowed to update this user." });
    }

    if (!isSuperAdmin && req.eSignatureUrl) {
      return res.status(403).json({ message: "Only SUPER_ADMIN can upload ESignature." });
    }

    const forbiddenForNonSuperAdmin = [
      "role",
      "isActive",
      "allowedWidgets",
      "allowedReports",
      "assignedGuestHouseId",
      "eSignatureUrl",
    ];

    const updatedData = { ...req.body };
    if (!isSuperAdmin) {
      forbiddenForNonSuperAdmin.forEach((field) => {
        delete updatedData[field];
      });
    }

    if (updatedData.isActive === "true") {
      updatedData.isActive = true;
    } else if (updatedData.isActive === "false") {
      updatedData.isActive = false;
    }

    if (req.eSignatureUrl) {
      updatedData.eSignatureUrl = req.eSignatureUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not Found!" });
    }

    await logAction({
      action: "USER_UPDATED",
      entityType: "User",
      entityId: updatedUser._id,
      performedBy: performer(req),
      details: getTrackedDetails(updatedData),
    }, req.tenantDb);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Update User Error: ", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      let message = `${field} is already taken`;
      if (field === 'phone') {
        message = "Phone number is already taken. Please use a different phone number.";
      } else if (field === 'email') {
        message = "Email is already taken. Please use a different email address.";
      }
      return res.status(400).json({ message });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: validationErrors.join(', ') || "Validation error occurred"
      });
    }

    res.status(500).json({ message: error.message || "Server error while updating user." });
  }
};

export const deleteUser = async (req, res) => {
  if (!hasSuperAdminRole(req)) {
    return res.status(403).json({ message: "Only SUPER_ADMIN can delete users." });
  }

  try {
    const { User } = req.tenantModels;
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    await logAction({
      action: "USER_DELETED",
      entityType: "User",
      entityId: deleted._id,
      performedBy: performer(req),
      details: {
        email: deleted.email,
        name: `${deleted.firstName} ${deleted.lastName}`.trim(),
      },
    }, req.tenantDb);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

export const deactivateUser = async (req, res) => {
  if (!hasSuperAdminRole(req)) {
    return res.status(403).json({ message: "Only SUPER_ADMIN can deactivate users." });
  }

  try {
    const { User } = req.tenantModels;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    await logAction({
      action: "USER_DEACTIVATED",
      entityType: "User",
      entityId: user._id,
      performedBy: performer(req),
      details: { isActive: user.isActive },
    }, req.tenantDb);

    res.json({ message: "User deactivated successfully", user });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  if (!hasSuperAdminRole(req)) {
    return res.status(403).json({ message: "Only SUPER_ADMIN can change user status." });
  }

  try {
    const { User } = req.tenantModels;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    await logAction({
      action: user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: user._id,
      performedBy: performer(req),
      details: { isActive: user.isActive },
    }, req.tenantDb);

    res.json({
      message: user.isActive ? "User activated" : "User deactivated",
      user,
    });
  } catch (error) {
    console.error("Error toggling user:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};