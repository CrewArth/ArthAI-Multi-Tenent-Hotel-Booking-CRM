import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import useBanquetHotel from './useBanquetHotel';
import "./banquet.css";

const policyOptions = [
  { value: "IN_HOUSE_ONLY", label: "In-house only" },
  { value: "OUTSIDE_ALLOWED", label: "Outside allowed" },
  { value: "APPROVED_VENDORS_ONLY", label: "Approved vendors only" },
];
const djOptions = [
  policyOptions[0],
  policyOptions[1],
  { value: "NOT_ALLOWED", label: "Not allowed" },
];
const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "UNDER_MAINTENANCE", label: "Under maintenance" },
];
const statusLabel = (value) =>
  statuses.find((option) => option.value === value)?.label || value;
const emptyForm = () => ({
  name: "",
  code: "",
  description: "",
  status: "ACTIVE",
  capacities: [{ layout: "", guests: "" }],
  amenities: "",
  allowedEventTypes: "",
  availableFrom: "09:00",
  availableUntil: "23:00",
  minimumBookingDuration: "60",
  timeIncrement: "30",
  setupBufferMinutes: "0",
  cleanupBufferMinutes: "0",
  baseHallRent: "",
  minimumGuaranteedPax: "0",
  cateringPolicy: "IN_HOUSE_ONLY",
  decorationPolicy: "IN_HOUSE_ONLY",
  djPolicy: "IN_HOUSE_ONLY",
});
const toList = (value) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
const toForm = (hall) => ({
  ...hall,
  capacities: hall.capacities.map(({ layout, guests }) => ({
    layout,
    guests: String(guests),
  })),
  amenities: hall.amenities.join(", "),
  allowedEventTypes: hall.allowedEventTypes.join(", "),
});
const toPayload = (form, guestHouseId) => ({
  ...form,
  guestHouseId,
  code: form.code.trim().toUpperCase(),
  capacities: form.capacities.map(({ layout, guests }) => ({
    layout,
    guests: Number(guests),
  })),
  amenities: toList(form.amenities),
  allowedEventTypes: toList(form.allowedEventTypes),
  minimumBookingDuration: Number(form.minimumBookingDuration),
  timeIncrement: Number(form.timeIncrement),
  setupBufferMinutes: Number(form.setupBufferMinutes),
  cleanupBufferMinutes: Number(form.cleanupBufferMinutes),
  baseHallRent: Number(form.baseHallRent),
  minimumGuaranteedPax: Number(form.minimumGuaranteedPax),
});

export default function BanquetHalls({ embedded = false }) {
  const { isHotelAdmin, assigned, hotels, hotelId, setHotelId, hotelError } = useBanquetHotel();
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);

  useEffect(() => { if (!embedded && hotelError) toast.error(hotelError); }, [embedded, hotelError]);

  const loadHalls = useCallback(async () => {
    if (!hotelId) {
      setHalls([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/api/banquet/halls", {
        params: { guestHouseId: hotelId },
      });
      setHalls(data.halls || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load banquet halls",
      );
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    loadHalls();
  }, [loadHalls]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
  };
  const openEdit = (hall) => {
    setEditingId(hall._id);
    setForm(toForm(hall));
  };
  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const setCapacity = (index, field, value) =>
    setForm((current) => ({
      ...current,
      capacities: current.capacities.map((entry, row) =>
        row === index ? { ...entry, [field]: value } : entry,
      ),
    }));

  const saveHall = async (event) => {
    event.preventDefault();
    if (
      !form.capacities.every(
        ({ layout, guests }) => layout.trim() && Number(guests) > 0,
      )
    )
      return toast.warn("Enter every layout and capacity");
    if (!toList(form.allowedEventTypes).length)
      return toast.warn("Enter at least one event type");
    setSaving(true);
    try {
      const payload = toPayload(form, hotelId);
      if (editingId) await api.put(`/api/banquet/halls/${editingId}`, payload);
      else await api.post("/api/banquet/halls", payload);
      toast.success(editingId ? "Hall updated" : "Hall created");
      setForm(null);
      await loadHalls();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save hall");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (hall, status) => {
    setChangingId(hall._id);
    try {
      await api.patch(`/api/banquet/halls/${hall._id}/status`, {
        guestHouseId: hotelId,
        status,
      });
      setHalls((current) =>
        current.map((entry) =>
          entry._id === hall._id ? { ...entry, status } : entry,
        ),
      );
      toast.success(`Hall set to ${statusLabel(status).toLowerCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update status");
    } finally {
      setChangingId(null);
    }
  };

  return (
    <section className="banquet-page">
      <header className="banquet-header">
        <div>
          <p className="banquet-eyebrow">Banquet Hall · {isHotelAdmin ? "Overview" : "Setup"}</p>
          <h1>Hall management</h1>
        </div>
        {!isHotelAdmin && <button
          className="banquet-primary"
          type="button"
          disabled={!hotelId}
          onClick={openCreate}
        >
          <Plus size={17} /> Add hall
        </button>}
      </header>
      <div className="banquet-toolbar">
        {!embedded && <><label htmlFor="banquet-hotel">Hotel</label>
        {isHotelAdmin ? <strong id="banquet-hotel">{assigned?.guestHouseName || "Assigned hotel"}</strong> : <select
          id="banquet-hotel"
          value={hotelId}
          onChange={(event) => setHotelId(event.target.value)}
        >
          {!hotels.length && <option value="">No hotels available</option>}
          {hotels.map((hotel) => (
            <option key={hotel._id} value={hotel._id}>
              {hotel.guestHouseName}
            </option>
          ))}
        </select>}</>}
        <span>
          {halls.length} {halls.length === 1 ? "hall" : "halls"}
        </span>
      </div>
      <div className="banquet-table-wrap">
        <table className="banquet-table">
          <thead>
            <tr>
              <th>Hall</th>
              <th>Capacity</th>
              <th>Hours</th>
              <th>Base rent</th>
              <th>Status</th>
              {!isHotelAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isHotelAdmin ? 5 : 6} className="banquet-empty">
                  Loading halls…
                </td>
              </tr>
            ) : !halls.length ? (
              <tr>
                <td colSpan={isHotelAdmin ? 5 : 6} className="banquet-empty">
                  {isHotelAdmin ? "No banquet halls have been configured for your hotel." : "No halls configured for this hotel. Add a hall to get started."}
                </td>
              </tr>
            ) : (
              halls.map((hall) => (
                <tr key={hall._id}>
                  <td>
                    <strong>{hall.name}</strong>
                    <small>{hall.code}</small>
                  </td>
                  <td>
                    {hall.capacities
                      .map(({ layout, guests }) => `${layout}: ${guests}`)
                      .join(" · ")}
                  </td>
                  <td>
                    {hall.availableFrom}–{hall.availableUntil}
                  </td>
                  <td>₹{hall.baseHallRent.toLocaleString("en-IN")}</td>
                  <td>
                    <span
                      className={`banquet-status banquet-status--${hall.status.toLowerCase()}`}
                    >
                      {statusLabel(hall.status)}
                    </span>
                  </td>
                  {!isHotelAdmin && <td>
                    <div className="banquet-actions">
                      <button
                        type="button"
                        title="Edit hall"
                        aria-label={`Edit ${hall.name}`}
                        onClick={() => openEdit(hall)}
                      >
                        <Pencil size={16} />
                      </button>
                      <select
                        aria-label={`Change status of ${hall.name}`}
                        title="Change hall status"
                        value={hall.status}
                        disabled={changingId === hall._id}
                        onChange={(event) =>
                          changeStatus(hall, event.target.value)
                        }
                      >
                        {statuses.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {form && (
        <div
          className="banquet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setForm(null);
          }}
        >
          <form
            className="banquet-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="banquet-dialog-title"
            onSubmit={saveHall}
          >
            <div className="banquet-dialog-header">
              <div>
                <p className="banquet-eyebrow">
                  {
                    hotels.find((hotel) => hotel._id === hotelId)
                      ?.guestHouseName
                  }
                </p>
                <h2 id="banquet-dialog-title">
                  {editingId ? "Edit hall" : "Add hall"}
                </h2>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onClick={() => setForm(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="banquet-dialog-body">
              <div className="banquet-grid">
                <Field
                  label="Hall name"
                  required
                  value={form.name}
                  onChange={(value) => setField("name", value)}
                />
                <Field
                  label="Hall code"
                  required
                  value={form.code}
                  maxLength={24}
                  pattern="[A-Za-z0-9_-]{2,24}"
                  onChange={(value) => setField("code", value.toUpperCase())}
                />
              </div>
              <Field
                label="Description"
                value={form.description}
                maxLength={1000}
                onChange={(value) => setField("description", value)}
              />
              <h3>Capacity by layout</h3>
              <div className="banquet-capacities">
                {form.capacities.map((entry, index) => (
                  <div className="banquet-capacity" key={index}>
                    <Field
                      label="Layout"
                      required
                      value={entry.layout}
                      onChange={(value) => setCapacity(index, "layout", value)}
                    />
                    <Field
                      label="Guests"
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={entry.guests}
                      onChange={(value) => setCapacity(index, "guests", value)}
                    />
                    <button
                      type="button"
                      title="Remove layout"
                      aria-label="Remove layout"
                      disabled={form.capacities.length === 1}
                      onClick={() =>
                        setField(
                          "capacities",
                          form.capacities.filter((_, row) => row !== index),
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="banquet-link"
                type="button"
                onClick={() =>
                  setField("capacities", [
                    ...form.capacities,
                    { layout: "", guests: "" },
                  ])
                }
              >
                + Add layout
              </button>
              <div className="banquet-grid">
                <Field
                  label="Amenities (comma separated)"
                  value={form.amenities}
                  onChange={(value) => setField("amenities", value)}
                />
                <Field
                  label="Allowed event types (comma separated)"
                  required
                  value={form.allowedEventTypes}
                  onChange={(value) => setField("allowedEventTypes", value)}
                />
              </div>
              <h3>Operating rules</h3>
              <div className="banquet-grid banquet-grid--three">
                <Field
                  label="Available from"
                  required
                  type="time"
                  value={form.availableFrom}
                  onChange={(value) => setField("availableFrom", value)}
                />
                <Field
                  label="Available until"
                  required
                  type="time"
                  value={form.availableUntil}
                  onChange={(value) => setField("availableUntil", value)}
                />
                <SelectField
                  label="Time increment"
                  value={form.timeIncrement}
                  options={[15, 30, 60].map((value) => ({
                    value,
                    label: `${value} minutes`,
                  }))}
                  onChange={(value) => setField("timeIncrement", value)}
                />
                <Field
                  label="Minimum duration (minutes)"
                  required
                  type="number"
                  min="15"
                  step="1"
                  value={form.minimumBookingDuration}
                  onChange={(value) =>
                    setField("minimumBookingDuration", value)
                  }
                />
                <Field
                  label="Setup buffer (minutes)"
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.setupBufferMinutes}
                  onChange={(value) => setField("setupBufferMinutes", value)}
                />
                <Field
                  label="Cleanup buffer (minutes)"
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.cleanupBufferMinutes}
                  onChange={(value) => setField("cleanupBufferMinutes", value)}
                />
              </div>
              <h3>Pricing & policies</h3>
              <div className="banquet-grid banquet-grid--three">
                <Field
                  label="Base hall rent (₹)"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseHallRent}
                  onChange={(value) => setField("baseHallRent", value)}
                />
                <Field
                  label="Minimum guaranteed pax"
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.minimumGuaranteedPax}
                  onChange={(value) => setField("minimumGuaranteedPax", value)}
                />
                <SelectField
                  label="Status"
                  value={form.status}
                  options={statuses}
                  onChange={(value) => setField("status", value)}
                />
                <SelectField
                  label="Catering"
                  value={form.cateringPolicy}
                  options={policyOptions}
                  onChange={(value) => setField("cateringPolicy", value)}
                />
                <SelectField
                  label="Decoration"
                  value={form.decorationPolicy}
                  options={policyOptions}
                  onChange={(value) => setField("decorationPolicy", value)}
                />
                <SelectField
                  label="DJ"
                  value={form.djPolicy}
                  options={djOptions}
                  onChange={(value) => setField("djPolicy", value)}
                />
              </div>
            </div>
            <footer className="banquet-dialog-footer">
              <button
                type="button"
                className="banquet-secondary"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="banquet-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create hall"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="banquet-field">
      <span>{label}</span>
      <input {...props} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
function SelectField({ label, options, onChange, ...props }) {
  return (
    <label className="banquet-field">
      <span>{label}</span>
      <select {...props} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
