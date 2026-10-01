import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import useBanquetHotel from "./useBanquetHotel";
import BanquetConflictDetails from "./BanquetConflictDetails";
import "./banquet.css";
import "./banquetCalendar.css";
const DAY_MS = 86400000;
const dateValue = (date) => date.toISOString().slice(0, 10);
const atDate = (value) => new Date(`${value}T00:00:00.000Z`);
const addDays = (value, days) =>
  dateValue(new Date(atDate(value).valueOf() + days * DAY_MS));
const clockMinutes = (value) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const clockLabel = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const readableDate = (
  value,
  options = {
    day: "numeric",
    month: "short",
  },
) =>
  atDate(value).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    ...options,
  });
const localDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.valueOf() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const defaultDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const statusLabel = {
  HOLD: "Hold",
  CONFIRMED: "Confirmed",
  BLOCKED: "Blocked",
};
function getRange(selectedDate) {
  const date = atDate(selectedDate);
  const first = dateValue(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
  );
  const last = dateValue(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
  );
  const startDate = addDays(first, -((atDate(first).getUTCDay() + 6) % 7));
  const endDate = addDays(last, 6 - ((atDate(last).getUTCDay() + 6) % 7));
  const count = Math.round((atDate(endDate) - atDate(startDate)) / DAY_MS) + 1;
  return {
    startDate,
    endDate,
    days: Array.from(
      {
        length: count,
      },
      (_, index) => addDays(startDate, index),
    ),
  };
}
export default function BanquetCalendar({ embedded = false }) {
  const { hotelId, hotelError } = useBanquetHotel();
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [halls, setHalls] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({
    eventDate: defaultDate(),
    startTime: "",
    endTime: "",
    layout: "",
    expectedGuests: "",
    eventType: "",
  });
  const [availabilityResults, setAvailabilityResults] = useState(null);
  const [checking, setChecking] = useState(false);
  const updateAvailability = (field, value) => {
    setAvailability((current) => ({ ...current, [field]: value }));
    setAvailabilityResults(null);
  };
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const range = useMemo(() => getRange(selectedDate), [selectedDate]);
  useEffect(() => {
    if (!embedded && hotelError) toast.error(hotelError);
  }, [embedded, hotelError]);
  useEffect(() => {
    setAvailabilityResults(null);
  }, [hotelId]);
  const loadCalendar = useCallback(async () => {
    if (!hotelId) {
      setHalls([]);
      setOccupancies([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/api/banquet/calendar", {
        params: {
          guestHouseId: hotelId,
          startDate: range.startDate,
          endDate: range.endDate,
        },
      });
      setHalls(data.halls || []);
      setOccupancies(data.occupancies || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to load banquet calendar",
      );
    } finally {
      setLoading(false);
    }
  }, [hotelId, range.startDate, range.endDate]);
  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);
  const layouts = useMemo(
    () => [
      ...new Set(
        halls.flatMap((hall) => hall.capacities.map((entry) => entry.layout)),
      ),
    ],
    [halls],
  );
  const eventTypes = useMemo(
    () => [...new Set(halls.flatMap((hall) => hall.allowedEventTypes))],
    [halls],
  );
  const checkAvailability = async (event) => {
    event.preventDefault();
    if (!hotelId) return;
    setChecking(true);
    try {
      const { data } = await api.post("/api/banquet/availability/check", {
        ...availability,
        guestHouseId: hotelId,
      });
      setSelectedDate(availability.eventDate);
      setAvailabilityResults(data.results || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to check availability",
      );
    } finally {
      setChecking(false);
    }
  };
  const openCreate = (hall, source = availability) => {
    const chosen =
      hall || halls.find((entry) => entry.status === "ACTIVE");
    if (!chosen) return toast.info("Configure an active hall first");
    const startTime = source.startTime || chosen.availableFrom;
    const endTime =
      source.endTime ||
      clockLabel(
        Math.min(
          clockMinutes(chosen.availableUntil),
          clockMinutes(startTime) + chosen.minimumBookingDuration,
        ),
      );
    setEditingId(null);
    setForm({
      hallId: chosen._id,
      eventName: "",
      eventType: source.eventType || "",
      eventDate: source.eventDate || selectedDate,
      startTime,
      endTime,
      layout: source.layout || "",
      expectedGuests: source.expectedGuests || "",
      status: "HOLD",
      holdUntil: "",
      notes: "",
    });
  };
  const openEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      ...entry,
      holdUntil: localDateTime(entry.holdUntil),
      expectedGuests: entry.expectedGuests ?? "",
    });
  };
  const saveReservation = async (event) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        guestHouseId: hotelId,
        expectedGuests:
          form.expectedGuests === "" ? null : Number(form.expectedGuests),
        holdUntil:
          form.status === "HOLD"
            ? new Date(form.holdUntil).toISOString()
            : null,
      };
      if (editingId)
        await api.put(`/api/banquet/occupancies/${editingId}`, payload);
      else await api.post("/api/banquet/occupancies", payload);
      toast.success(editingId ? "Reservation updated" : "Time reserved");
      setForm(null);
      setAvailabilityResults(null);
      await loadCalendar();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to save reservation",
      );
    } finally {
      setSaving(false);
    }
  };
  const releaseReservation = async () => {
    if (!editingId || !window.confirm("Release this hold or block?")) return;
    setSaving(true);
    try {
      await api.patch(`/api/banquet/occupancies/${editingId}/release`, {
        guestHouseId: hotelId,
      });
      toast.success("Time released");
      setForm(null);
      await loadCalendar();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to release time");
    } finally {
      setSaving(false);
    }
  };
  const navigateDate = (step) => {
    const date = atDate(selectedDate);
    const nextDate = dateValue(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + step, 1)));
    setSelectedDate(nextDate);
    updateAvailability("eventDate", nextDate);
  };
  return (
    <section className="banquet-page banquet-calendar-page">
      <header className="banquet-header">
        <div>
          <p className="banquet-eyebrow">Banquet Hall · Operations</p>
          <h1>Availability calendar</h1>
        </div>
        <button
          className="banquet-primary"
          type="button"
          disabled={!hotelId || !halls.some((hall) => hall.status === "ACTIVE")}
          onClick={() =>
            openCreate(null, {
              eventDate: selectedDate,
            })
          }
        >
          <Plus size={17} /> Reserve time
        </button>
      </header>
      <details className="banquet-availability" onToggle={(event) => {
        if (event.currentTarget.open) {
          updateAvailability("eventDate", selectedDate);
        }
      }}>
        <summary className="banquet-availability-title">
          <Search size={16} />
          <strong>Find a free hall</strong>
          <span>Check a date and time before reserving</span>
        </summary>
        <form onSubmit={checkAvailability}>
        <div className="banquet-availability-fields">
          <label>
            Date
            <input
              required
              type="date"
              value={availability.eventDate}
              onChange={(event) => updateAvailability("eventDate", event.target.value)}
            />
          </label>
          <label>
            Start
            <input
              required
              type="time"
              value={availability.startTime}
              onChange={(event) => updateAvailability("startTime", event.target.value)}
            />
          </label>
          <label>
            End
            <input
              required
              type="time"
              value={availability.endTime}
              onChange={(event) => updateAvailability("endTime", event.target.value)}
            />
          </label>
          <label>
            Seating layout
            <select
              required={Boolean(availability.expectedGuests)}
              value={availability.layout}
              onChange={(event) => updateAvailability("layout", event.target.value)}
            >
              <option value="">Any layout</option>
              {layouts.map((layout) => (
                <option key={layout}>{layout}</option>
              ))}
            </select>
          </label>
          <label>
            Guests
            <input
              type="number"
              min="1"
              step="1"
              value={availability.expectedGuests}
              onChange={(event) => updateAvailability("expectedGuests", event.target.value)}
            />
          </label>
          <label>
            Event type
            <select
              value={availability.eventType}
              onChange={(event) => updateAvailability("eventType", event.target.value)}
            >
              <option value="">Any type</option>
              {eventTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <button
            className="banquet-primary"
            type="submit"
            disabled={!hotelId || checking}
          >
            {checking ? "Checking…" : "Check"}
          </button>
        </div>
        {availabilityResults && (
          <div className="banquet-availability-results">
            {!availabilityResults.length ? (
              <span>No halls configured.</span>
            ) : (
              availabilityResults.map((result) => (
                <div
                  key={result.hallId}
                  className={result.available ? "available" : `unavailable${result.conflicts?.length ? " has-conflicts" : ""}`}
                >
                  <span>
                    <strong>{result.name}</strong>
                    <small>
                      {result.available ? "Available" : result.conflicts?.length ? "Reserved at this time" : result.reason}
                    </small>
                  </span>
                  <BanquetConflictDetails conflicts={result.conflicts} />
                  {result.available && (
                    <button
                      type="button"
                      onClick={() =>
                        openCreate(
                          halls.find((hall) => hall._id === result.hallId),
                          availability,
                        )
                      }
                    >
                      Reserve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        </form>
      </details>
      <div className="banquet-calendar-surface">
        <div className="banquet-calendar-heading">
          <CalendarDays size={17} />
          <strong>{readableDate(selectedDate, { month: "long", year: "numeric" })}</strong>
          <span>
            {loading ? "Loading…" : `${occupancies.length} reservations`}
          </span>
          <div className="banquet-calendar-month-nav">
            <button type="button" aria-label="Previous month" onClick={() => navigateDate(-1)}><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Next month" onClick={() => navigateDate(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        {!hotelId || !halls.length ? (
          <div className="banquet-empty">
            No banquet halls available for this hotel.
          </div>
        ) : (
          <div className="banquet-days banquet-days--month">
            {range.days.map((date) => {
              const events = occupancies.filter(
                (entry) => entry.eventDate === date,
              );
              return (
                <div
                  key={date}
                  className={`banquet-day-card${date === defaultDate() ? " today" : ""}${date.slice(0, 7) !== selectedDate.slice(0, 7) ? " outside" : ""}`}
                >
                  <div className="banquet-day-label">
                    <span>
                      {readableDate(date, {
                        weekday: "short",
                      })}
                    </span>
                    <strong>{readableDate(date)}</strong>
                  </div>
                  {events.length ? (
                    events.map((entry) => (
                      <button
                        type="button"
                        key={entry._id}
                        className={`banquet-event-chip banquet-event-chip--${entry.status.toLowerCase()}`}
                        onClick={() => openEdit(entry)}
                        title={`${entry.startTime}–${entry.endTime} · ${entry.eventName}`}
                      >
                        <time>{entry.startTime}</time>
                        <span>{entry.eventName}</span>
                        <small>
                          {
                            halls.find((hall) => hall._id === entry.hallId)
                              ?.name
                          }
                        </small>
                      </button>
                    ))
                  ) : (
                    <span className="banquet-day-empty">Available</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {form && (
        <div
          className="banquet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setForm(null);
          }}
        >
          <form
            className="banquet-dialog banquet-reservation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="banquet-reservation-title"
            onSubmit={saveReservation}
          >
            <div className="banquet-dialog-header">
              <div>
                <p className="banquet-eyebrow">Calendar reservation</p>
                <h2 id="banquet-reservation-title">
                  {editingId ? "Edit reserved time" : "Reserve hall time"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                title="Close"
                onClick={() => setForm(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="banquet-dialog-body">
              <div className="banquet-grid">
                <label className="banquet-field">
                  <span>Event name</span>
                  <input
                    required
                    maxLength="120"
                    value={form.eventName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eventName: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="banquet-field">
                  <span>Hall</span>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.hallId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        hallId: event.target.value,
                        eventType: "",
                        layout: "",
                      })
                    }
                  >
                    {halls
                      .filter(
                        (hall) =>
                          hall.status === "ACTIVE" || hall._id === form.hallId,
                      )
                      .map((hall) => (
                        <option key={hall._id} value={hall._id}>
                          {hall.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="banquet-grid banquet-grid--three">
                <label className="banquet-field">
                  <span>Date</span>
                  <input
                    required
                    type="date"
                    value={form.eventDate}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eventDate: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="banquet-field">
                  <span>Start</span>
                  <input
                    required
                    type="time"
                    step={
                      (halls.find((hall) => hall._id === form.hallId)
                        ?.timeIncrement || 30) * 60
                    }
                    value={form.startTime}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        startTime: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="banquet-field">
                  <span>End</span>
                  <input
                    required
                    type="time"
                    step={
                      (halls.find((hall) => hall._id === form.hallId)
                        ?.timeIncrement || 30) * 60
                    }
                    value={form.endTime}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        endTime: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="banquet-grid banquet-grid--three">
                <label className="banquet-field">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value,
                      })
                    }
                  >
                    {Object.entries(statusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="banquet-field">
                  <span>Event type</span>
                  <select
                    required={form.status !== "BLOCKED"}
                    value={form.eventType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        eventType: event.target.value,
                      })
                    }
                  >
                    <option value="">Select event type</option>
                    {halls
                      .find((hall) => hall._id === form.hallId)
                      ?.allowedEventTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                  </select>
                </label>
                <label className="banquet-field">
                  <span>Layout</span>
                  <select
                    value={form.layout}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        layout: event.target.value,
                      })
                    }
                  >
                    <option value="">Select layout</option>
                    {halls
                      .find((hall) => hall._id === form.hallId)
                      ?.capacities.map((entry) => (
                        <option key={entry.layout}>{entry.layout}</option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="banquet-grid">
                <label className="banquet-field">
                  <span>Expected guests</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.expectedGuests}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        expectedGuests: event.target.value,
                      })
                    }
                  />
                </label>
                {form.status === "HOLD" && (
                  <label className="banquet-field">
                    <span>Hold until</span>
                    <input
                      required
                      type="datetime-local"
                      value={form.holdUntil}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          holdUntil: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </div>
              <label className="banquet-field">
                <span>Notes</span>
                <textarea
                  maxLength="1000"
                  rows="3"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
              <p className="banquet-buffer-note">
                Setup and cleanup buffers are applied automatically from the
                hall configuration.
              </p>
            </div>
            <footer className="banquet-dialog-footer">
              {editingId && ["HOLD", "BLOCKED"].includes(form.status) && (
                <button
                  className="banquet-release"
                  type="button"
                  disabled={saving}
                  onClick={releaseReservation}
                >
                  Release time
                </button>
              )}
              <button
                className="banquet-secondary"
                type="button"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button
                className="banquet-primary"
                type="submit"
                disabled={saving}
              >
                <Pencil size={15} />
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Reserve time"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
