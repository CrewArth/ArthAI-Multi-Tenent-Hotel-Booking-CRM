// CreateUserModal.jsx
import React, { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../styles/editUserModel.css";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { readAndCompressImageAsDataUrl } from "../utils/imageUtils";

const CreateUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eSignatureFile, setESignatureFile] = useState(null);
  const [eSignaturePreview, setESignaturePreview] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("firstName", form.firstName);
      payload.append("lastName", form.lastName);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("address", form.address);
      payload.append("password", form.password);

      if (eSignatureFile) {
        payload.append("eSignature", eSignatureFile);
      }

      const res = await api.post("/api/admin/users", payload);

      toast.success(res.data.message || "Admin created successfully!");
      onSuccess(); // Refresh users list
      onClose(); // Close modal
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create user. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleESignatureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setESignatureFile(null);
      setESignaturePreview("");
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
      setESignaturePreview("");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Create New Admin</h2>
            <p className="subtitle">
              Set account credentials and contact details.
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="form-grid-2">
            <label className="form-label">
              Email *
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="form-input"
                disabled={isSubmitting}
              />
            </label>

            <label className="form-label">
              Phone Number
              <PhoneInput
                defaultCountry="IN"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(val) => setForm((f) => ({ ...f, phone: val || '' }))}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className="form-label">
            ESignature
            <input
              type="file"
              name="eSignature"
              accept="image/*"
              onChange={handleESignatureChange}
              className="form-input-file"
              disabled={isSubmitting}
            />
          </label>
          {eSignaturePreview ? (
            <div className="signature-preview-box">
              <img
                src={eSignaturePreview}
                alt="ESignature preview"
                className="signature-img"
              />
            </div>
          ) : null}

          <label className="form-label">
            Address
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows="2"
              className="form-input textarea-input"
              disabled={isSubmitting}
            />
          </label>

          <label className="form-label">
            Password *
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="form-input"
              disabled={isSubmitting}
              minLength="6"
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn confirm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
