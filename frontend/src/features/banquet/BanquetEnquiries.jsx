import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, FilePlus2, Pencil, Plus, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import useBanquetHotel from './useBanquetHotel';
import BanquetConflictDetails from './BanquetConflictDetails';
import './banquet.css';
import './banquetEnquiries.css';

const emptyForm = () => ({
  customerName: '', mobileNo: '', email: '', companyName: '', eventType: '',
  eventDate: '', preferredStartTime: '', preferredEndTime: '', expectedGuests: '',
  vegGuests: '', nonVegGuests: '', jainGuests: '', noOnionNoGarlicGuests: '',
  budgetRange: '', leadSource: '', requirements: '', notes: '', assignedTo: '',
});
const countFields = ['expectedGuests', 'vegGuests', 'nonVegGuests', 'jainGuests', 'noOnionNoGarlicGuests'];
const label = (value) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const dateLabel = (value) => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export default function BanquetEnquiries({ embedded = false }) {
  const { isHotelAdmin, assigned, hotels, hotelId, setHotelId, hotelError } = useBanquetHotel();
  const [enquiries, setEnquiries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [availabilityTarget, setAvailabilityTarget] = useState(null);
  const [layout, setLayout] = useState('');
  const [layoutOptions, setLayoutOptions] = useState([]);
  const [availabilityResults, setAvailabilityResults] = useState(null);
  const [checking, setChecking] = useState(false);
  const [options, setOptions] = useState({ statuses: [], leadSources: [], lostReasons: [] });
  const [assignees, setAssignees] = useState([]);

  const loadEnquiries = useCallback(async () => {
    if (!hotelId) { setEnquiries([]); setTotal(0); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/banquet/enquiries', { params: { guestHouseId: hotelId, page, status: statusFilter, search } });
      setEnquiries(data.enquiries || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load enquiries');
    } finally { setLoading(false); }
  }, [hotelId, page, statusFilter, search]);

  useEffect(() => { loadEnquiries(); }, [loadEnquiries]);
  useEffect(() => {
    api.get('/api/banquet/enquiries/options').then(({ data }) => setOptions(data)).catch(() => toast.error('Unable to load enquiry options'));
  }, []);
  useEffect(() => {
    if (!hotelId) { setAssignees([]); return; }
    let active = true;
    api.get('/api/banquet/enquiries/assignees', { params: { guestHouseId: hotelId } })
      .then(({ data }) => { if (active) setAssignees(data.users || []); })
      .catch(() => { if (active) setAssignees([]); });
    return () => { active = false; };
  }, [hotelId]);
  useEffect(() => { if (!embedded && hotelError) toast.error(hotelError); }, [embedded, hotelError]);
  useEffect(() => { setPage(1); setForm(null); setAvailabilityTarget(null); }, [hotelId]);

  const openForm = (enquiry = null) => {
    setEditingId(enquiry?._id || null);
    setForm(enquiry ? Object.fromEntries(Object.keys(emptyForm()).map((key) => [key, enquiry[key] ?? ''])) : emptyForm());
  };
  const saveEnquiry = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, guestHouseId: hotelId };
      countFields.forEach((field) => { payload[field] = field === 'expectedGuests' || form[field] !== '' ? Number(form[field]) : 0; });
      if (editingId) await api.put(`/api/banquet/enquiries/${editingId}`, payload);
      else await api.post('/api/banquet/enquiries', payload);
      toast.success(editingId ? 'Enquiry updated' : 'Enquiry created');
      setForm(null);
      if (page !== 1) setPage(1);
      else await loadEnquiries();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to save enquiry'); }
    finally { setSaving(false); }
  };
  const openStatus = (enquiry) => {
    setStatusTarget(enquiry);
    setNextStatus(enquiry.nextStatuses?.[0] || '');
    setLostReason('');
  };
  const saveStatus = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/banquet/enquiries/${statusTarget._id}/status`, { guestHouseId: hotelId, status: nextStatus, lostReason });
      toast.success('Status updated');
      setStatusTarget(null);
      await loadEnquiries();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update status'); }
    finally { setSaving(false); }
  };
  const convert = async (enquiry) => {
    setSaving(true);
    try {
      await api.post(`/api/banquet/enquiries/${enquiry._id}/quotation`, { guestHouseId: hotelId });
      toast.success('Quotation draft created');
      await loadEnquiries();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to create quotation draft'); }
    finally { setSaving(false); }
  };
  const openAvailability = async (enquiry) => {
    setAvailabilityTarget(enquiry);
    setAvailabilityResults(null);
    setLayout('');
    setLayoutOptions([]);
    try {
      const { data } = await api.get('/api/banquet/calendar', { params: { guestHouseId: hotelId, startDate: enquiry.eventDate, endDate: enquiry.eventDate } });
      setLayoutOptions([...new Set((data.halls || []).flatMap((hall) => hall.capacities.map((capacity) => capacity.layout)))]);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load hall layouts'); }
  };
  const checkAvailability = async (event) => {
    event.preventDefault();
    setChecking(true);
    try {
      const enquiry = availabilityTarget;
      const { data } = await api.post('/api/banquet/availability/check', {
        guestHouseId: hotelId, eventDate: enquiry.eventDate,
        startTime: enquiry.preferredStartTime, endTime: enquiry.preferredEndTime,
        eventType: enquiry.eventType, expectedGuests: enquiry.expectedGuests, layout,
      });
      setAvailabilityResults(data.results || []);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to check availability'); }
    finally { setChecking(false); }
  };

  return (
    <section className="banquet-page banquet-enquiries-page">
      <header className="banquet-header">
        <div><p className="banquet-eyebrow">Banquet Hall · Sales</p><h1>Enquiries</h1></div>
        <button className="banquet-primary" type="button" disabled={!hotelId} onClick={() => openForm()}><Plus size={17} /> New enquiry</button>
      </header>
      <div className="banquet-enquiries-toolbar">
        {!embedded && <label>Hotel {isHotelAdmin ? <strong>{assigned?.guestHouseName || 'Assigned hotel'}</strong> : <select value={hotelId} onChange={(event) => setHotelId(event.target.value)}>{hotels.map((hotel) => <option key={hotel._id} value={hotel._id}>{hotel.guestHouseName}</option>)}</select>}</label>}
        <label>Status <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{options.statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <form className="banquet-enquiries-search" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}><input aria-label="Search enquiries" placeholder="Name, mobile, or enquiry no." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button type="submit" aria-label="Search"><Search size={17} /></button></form>
      </div>
      <div className="banquet-table-wrap"><table className="banquet-table banquet-enquiries-table"><thead><tr><th>Enquiry</th><th>Customer</th><th>Event</th><th>Guests</th><th>Lead source</th><th>Status</th><th>Quotation</th><th>Actions</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="8" className="banquet-empty">Loading enquiries…</td></tr> : enquiries.length ? enquiries.map((enquiry) => <tr key={enquiry._id}>
          <td><strong>{enquiry.enquiryNo}</strong><small>{dateLabel(enquiry.createdAt?.slice(0, 10))}</small></td>
          <td><strong>{enquiry.customerName}</strong><small>{enquiry.mobileNo}</small></td>
          <td><strong>{enquiry.eventType}</strong><small>{dateLabel(enquiry.eventDate)} · {enquiry.preferredStartTime}–{enquiry.preferredEndTime}</small></td>
          <td>{enquiry.expectedGuests}</td><td>{enquiry.leadSource}</td>
          <td><span className={`banquet-enquiry-status banquet-enquiry-status--${enquiry.status.toLowerCase()}`}>{label(enquiry.status)}</span>{enquiry.lostReason && <small>{enquiry.lostReason}</small>}</td>
          <td>{enquiry.quotation ? <span className="banquet-quote-tag">{label(enquiry.quotation.status)}</span> : '—'}</td>
          <td><div className="banquet-enquiries-actions"><button type="button" title="Edit enquiry" aria-label={`Edit ${enquiry.enquiryNo}`} onClick={() => openForm(enquiry)}><Pencil size={16} /></button><button type="button" title="Check availability" aria-label={`Check availability for ${enquiry.enquiryNo}`} onClick={() => openAvailability(enquiry)}><CalendarCheck size={16} /></button>{enquiry.nextStatuses?.length > 0 && <button type="button" title="Change status" onClick={() => openStatus(enquiry)}>Status</button>}{!enquiry.quotation && enquiry.nextStatuses?.length > 0 && <button type="button" title="Create quotation draft" aria-label={`Create quotation draft for ${enquiry.enquiryNo}`} disabled={saving} onClick={() => convert(enquiry)}><FilePlus2 size={16} /></button>}</div></td>
        </tr>) : <tr><td colSpan="8" className="banquet-empty">No enquiries found for this hotel.</td></tr>}
      </tbody></table></div>
      {total > 20 && <div className="banquet-enquiries-pagination"><span>{total} enquiries · Page {page} of {Math.ceil(total / 20)}</span><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next</button></div>}

      {form && <div className="banquet-enquiries-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}><form className="banquet-enquiries-dialog" onSubmit={saveEnquiry} aria-label={editingId ? 'Edit enquiry' : 'New enquiry'}>
        <div className="banquet-enquiries-dialog-head"><div><p className="banquet-eyebrow">Banquet enquiry</p><h2>{editingId ? 'Edit enquiry' : 'New enquiry'}</h2></div><button type="button" aria-label="Close" onClick={() => setForm(null)}><X size={20} /></button></div>
        <div className="banquet-enquiries-dialog-body">
          <h3>Customer</h3><div className="banquet-enquiries-grid">
            <label>Customer name *<input required maxLength="120" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
            <label>Mobile number *<input required type="tel" maxLength="20" value={form.mobileNo} onChange={(event) => setForm({ ...form, mobileNo: event.target.value })} /></label>
            <label>Email<input type="email" maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Company<input maxLength="120" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></label>
          </div><h3>Event</h3><div className="banquet-enquiries-grid">
            <label>Event type *<input required maxLength="80" value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })} /></label>
            <label>Event date *<input required type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
            <label>Start time *<input required type="time" value={form.preferredStartTime} onChange={(event) => setForm({ ...form, preferredStartTime: event.target.value })} /></label>
            <label>End time *<input required type="time" value={form.preferredEndTime} onChange={(event) => setForm({ ...form, preferredEndTime: event.target.value })} /></label>
            <label>Expected guests *<input required type="number" min="1" value={form.expectedGuests} onChange={(event) => setForm({ ...form, expectedGuests: event.target.value })} /></label>
            <label>Budget range<input maxLength="100" placeholder="e.g. ₹2–3 lakh" value={form.budgetRange} onChange={(event) => setForm({ ...form, budgetRange: event.target.value })} /></label>
          </div><h3>Guest preferences</h3><div className="banquet-enquiries-grid banquet-enquiries-grid--four">{[['vegGuests', 'Veg'], ['nonVegGuests', 'Non-veg'], ['jainGuests', 'Jain'], ['noOnionNoGarlicGuests', 'No onion / garlic']].map(([key, caption]) => <label key={key}>{caption}<input type="number" min="0" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
          <h3>Lead details</h3><div className="banquet-enquiries-grid">
            <label>Lead source *<select required value={form.leadSource} onChange={(event) => setForm({ ...form, leadSource: event.target.value })}><option value="">Select source</option>{options.leadSources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
            <label>Assigned to<select value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}><option value="">Unassigned</option>{assignees.map((user) => <option key={user._id} value={user._id}>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</option>)}</select></label>
            <label className="banquet-enquiries-span">Requirements<textarea maxLength="2000" rows="2" value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} /></label>
            <label className="banquet-enquiries-span">Notes<textarea maxLength="2000" rows="2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          </div>
        </div><div className="banquet-enquiries-dialog-foot"><button type="button" className="banquet-secondary" onClick={() => setForm(null)}>Cancel</button><button type="submit" className="banquet-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create enquiry'}</button></div>
      </form></div>}

      {statusTarget && <div className="banquet-enquiries-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setStatusTarget(null); }}><form className="banquet-enquiries-dialog banquet-enquiries-dialog--small" onSubmit={saveStatus} aria-label="Change enquiry status"><div className="banquet-enquiries-dialog-head"><div><p className="banquet-eyebrow">{statusTarget.enquiryNo}</p><h2>Change status</h2></div><button type="button" aria-label="Close" onClick={() => setStatusTarget(null)}><X size={20} /></button></div><div className="banquet-enquiries-dialog-body"><label>Next status<select required value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{statusTarget.nextStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>{nextStatus === 'LOST' && <label>Lost reason<select required value={lostReason} onChange={(event) => setLostReason(event.target.value)}><option value="">Select reason</option>{options.lostReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>}</div><div className="banquet-enquiries-dialog-foot"><button type="button" className="banquet-secondary" onClick={() => setStatusTarget(null)}>Cancel</button><button type="submit" className="banquet-primary" disabled={saving}>Update status</button></div></form></div>}

      {availabilityTarget && <div className="banquet-enquiries-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAvailabilityTarget(null); }}><div className="banquet-enquiries-dialog banquet-enquiries-dialog--small" role="dialog" aria-label="Check availability"><div className="banquet-enquiries-dialog-head"><div><p className="banquet-eyebrow">{availabilityTarget.enquiryNo}</p><h2>Check availability</h2></div><button type="button" aria-label="Close" onClick={() => setAvailabilityTarget(null)}><X size={20} /></button></div><div className="banquet-enquiries-dialog-body"><p className="banquet-enquiries-summary">{dateLabel(availabilityTarget.eventDate)} · {availabilityTarget.preferredStartTime}–{availabilityTarget.preferredEndTime} · {availabilityTarget.expectedGuests} guests</p>{!layoutOptions.length && <p className="banquet-enquiries-summary">No hall layouts are configured for this hotel.</p>}<form onSubmit={checkAvailability}><label>Layout<select required value={layout} onChange={(event) => setLayout(event.target.value)}><option value="">Select layout</option>{layoutOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><button type="submit" className="banquet-primary" disabled={checking || !layout}>{checking ? 'Checking…' : 'Check halls'}</button></form>{availabilityResults && <ul className="banquet-enquiries-results">{availabilityResults.map((result) => <li key={result.hallId}><div><strong>{result.name}</strong><span className={result.available ? 'is-available' : 'is-unavailable'}>{result.available ? 'Available' : result.conflicts?.length ? 'Reserved at this time' : result.reason}</span></div><BanquetConflictDetails conflicts={result.conflicts} /></li>)}</ul>}</div></div></div>}
    </section>
  );
}
