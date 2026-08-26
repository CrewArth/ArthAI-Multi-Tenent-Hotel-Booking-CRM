// EditUserModal.jsx
import React, { useState, useEffect } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../styles/editUserModel.css";
import { toast } from "react-toastify";
import { readAndCompressImageAsDataUrl } from "../utils/imageUtils";

const EditUserModal = ({ user, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    role: "ADMIN",
    isActive: true,
  });
  const [eSignatureFile, setESignatureFile] = useState(null);
  const [eSignaturePreview, setESignaturePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        role: user.role || "ADMIN",
        isActive: user.isActive ?? true,
      });
      setESignaturePreview(user.eSignatureUrl || "");
      setESignatureFile(null);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = new FormData();
      payload.append("firstName", form.firstName);
      payload.append("lastName", form.lastName);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("address", form.address);
      payload.append("role", form.role);
      payload.append("isActive", String(form.isActive));

      if (eSignatureFile) {
        payload.append("eSignature", eSignatureFile);
      }

      await onSubmit(payload);
    } catch (err) {
      console.error("Edit user submit error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleESignatureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setESignatureFile(null);
      setESignaturePreview(user?.eSignatureUrl || "");
      return;
    }

    try {
      const preview = await readAndCompressImageAsDataUrl(file, {
        maxWidth: 640,
        maxHeight: 220,
        quality: 0.82,
      });
      setESignatureFile(file);
      setESignaturePreview(preview || "");
    } catch (error) {
      toast.error(error.message || "Unable to load ESignature preview.");
      event.target.value = "";
      setESignatureFile(null);
      setESignaturePreview(user?.eSignatureUrl || "");
    }
  };

  if (!user) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Edit Admin Account</h2>
            <p className="subtitle">{user.email}</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="modal-form" onSubmit={handleSubmit}>
          {/* First & Last Name Grid */}
          <div className="form-grid-2">
            <label className="form-label">
              First Name *
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="form-input"
              />
            </label>

            <label className="form-label">
              Last Name *
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className="form-input"
              />
            </label>
          </div>

          {/* Email & Phone Grid */}
          <div className="form-grid-2">
            <label className="form-label">
              Email Address *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </label>

            <label className="form-label">
              Phone Number
              <PhoneInput
                defaultCountry="IN"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(val) => setForm((f) => ({ ...f, phone: val || '' }))}
              />
            </label>
          </div>

          {/* Address & Role */}
          <div className="form-grid-2">
            <label className="form-label">
              Account Role *
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="form-input"
                style={{ background: '#ffffff' }}
              >
                <option value="ADMIN">ADMIN (Guest House Manager)</option>
                <option value="HOTEL_ADMIN">HOTEL_ADMIN (Scoped Hotel Administrator)</option>
              </select>
            </label>

            <label className="form-label">
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows="1"
                className="form-input textarea-input"
              />
            </label>
          </div>

          {/* ESignature Section */}
          <label className="form-label">
            E-Signature Image
            <input
              type="file"
              name="eSignature"
              accept="image/*"
              onChange={handleESignatureChange}
              className="form-input-file"
            />
          </label>

          {eSignaturePreview && (
            <div className="signature-preview-box">
              <span className="signature-label">Current Signature:</span>
              <img
                src={eSignaturePreview}
                alt="ESignature preview"
                className="signature-img"
              />
            </div>
          )}

          {/* Active Status Checkbox */}
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            <span>Active Account</span>
          </label>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button type="button" className="btn cancel" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn confirm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
