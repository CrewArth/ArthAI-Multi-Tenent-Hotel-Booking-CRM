import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { inventoryUnits } from '../../utils/svgutils';
import './inventory.css';

const INITIAL_FORM = { name: '', description: '', unit: 'piece', quantity: '', price: '', costPrice: '', scope: 'central', guestHouseId: '' };

export default function SuperAdminInventoryPage() {
  const [tab, setTab] = useState('inventory');
  const [showForm, setShowForm] = useState(false);
  const [reviewAction, setReviewAction] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [inventoryPages, setInventoryPages] = useState(1);
  const [requestPages, setRequestPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const loadInventory = useCallback(async (page = inventoryPage, searchValue = activeSearch) => {
    setLoading(true);
    try {
      const response = await api.post('/api/inventory/list', { page, search: searchValue });
      setInventory(response.data?.inventory || []);
      setInventoryPage(response.data?.currentPage || page);
      setInventoryPages(response.data?.totalPages || 1);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to load inventory'); }
    finally { setLoading(false); }
  }, [inventoryPage, activeSearch]);

  const loadRequests = useCallback(async (page = requestPage) => {
    setLoading(true);
    try {
      const response = await api.post('/api/inventory/requests/list', { page });
      setRequests(response.data?.requests || []);
      setRequestPage(response.data?.currentPage || page);
      setRequestPages(response.data?.totalPages || 1);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to load requests'); }
    finally { setLoading(false); }
  }, [requestPage]);

  useEffect(() => { api.post('/api/guesthouses/list').then((response) => setHotels(Array.isArray(response.data) ? response.data : [])).catch(() => toast.error('Failed to load hotels')); }, []);
  useEffect(() => { if (tab === 'inventory') loadInventory(1); else loadRequests(1); }, [tab]);

  const submitItem = async (event) => {
    event.preventDefault();
    if (form.scope === 'hotel' && !form.guestHouseId) return toast.warn('Select a hotel');
    try {
      setSubmitting(true);
      await api.post('/api/inventory/items/add', { ...form, quantity: Number(form.quantity), price: Number(form.price), costPrice: Number(form.costPrice), guestHouseId: form.scope === 'hotel' ? form.guestHouseId : undefined });
      setForm(INITIAL_FORM);
      setShowForm(false);
      toast.success('Inventory added');
      loadInventory(1);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to add inventory'); }
    finally { setSubmitting(false); }
  };

  const reviewRequest = async () => {
    if (!reviewAction) return;
    const { requestId, action } = reviewAction;
    try {
      await api.post(`/api/inventory/requests/${requestId}/${action}`);
      toast.success(`Request ${action === 'cancel' ? 'cancelled' : 'approved'}`);
      setReviewAction(null);
      loadRequests(requestPage);
      loadInventory(1);
    } catch (error) { toast.error(error.response?.data?.message || `Failed to ${action} request`); }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setActiveSearch(nextSearch);
    loadInventory(1, nextSearch);
  };

  return <section className="inventory-page">
    <div className="inventory-heading"><h1>Inventory Management</h1>{tab === 'inventory' && <button className="inventory-primary" onClick={() => setShowForm(true)}>Add Item</button>}</div>
    <div className="inventory-tabs"><button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>Inventory</button><button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Item Requests</button></div>
    {tab === 'inventory' && <form className="inventory-search" role="search" onSubmit={submitSearch}><input type="search" aria-label="Search inventory" placeholder="Search by item name or description" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit">Search</button></form>}
    {tab === 'inventory' && <InventoryTable inventory={inventory} loading={loading} page={inventoryPage} pages={inventoryPages} onPage={loadInventory} showHotel showCostPrice />}
    {tab === 'requests' && <RequestTable requests={requests} loading={loading} page={requestPage} pages={requestPages} onPage={loadRequests} onReview={(requestId, action) => setReviewAction({ requestId, action })} />}
    {showForm && <div className="inventory-modal-backdrop" onClick={() => setShowForm(false)}><form className="inventory-modal" onSubmit={submitItem} onClick={(event) => event.stopPropagation()}>
      <div className="inventory-modal-header"><h2>Add Item</h2><button type="button" onClick={() => setShowForm(false)}>×</button></div>
      <div className="inventory-modal-form">
        <label className="inventory-field inventory-field--wide"><span>Item Name</span><input required placeholder="e.g. Bath Towel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="inventory-field inventory-field--wide"><span>Description <em>Optional</em></span><input placeholder="Add a short item description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="inventory-field"><span>Unit</span><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{inventoryUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
        <label className="inventory-field"><span>Quantity</span><input required min="0" step="1" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <label className="inventory-field"><span>Price</span><div className="inventory-currency-input"><span>₹</span><input required min="0" step="0.01" type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div></label>
        <label className="inventory-field"><span>Cost Price</span><div className="inventory-currency-input"><span>₹</span><input required min="0" step="0.01" type="number" placeholder="0.00" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div></label>
        <label className="inventory-field inventory-field--wide"><span>Inventory Location</span><select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, guestHouseId: '' })}><option value="central">Central stock</option><option value="hotel">Specific hotel</option></select></label>
        {form.scope === 'hotel' && <label className="inventory-field inventory-field--wide"><span>Hotel</span><select required value={form.guestHouseId} onChange={(e) => setForm({ ...form, guestHouseId: e.target.value })}><option value="">Select hotel</option>{hotels.map((hotel) => <option key={hotel._id} value={hotel._id}>{hotel.guestHouseName}</option>)}</select></label>}
      </div>
      <div className="inventory-actions"><button type="button" className="inventory-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="inventory-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Item'}</button></div>
    </form></div>}
    {reviewAction && <div className="inventory-modal-backdrop" onClick={() => setReviewAction(null)}><div className="inventory-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-confirm-title" onClick={(event) => event.stopPropagation()}>
      <div className={`inventory-confirm-icon ${reviewAction.action}`}>{reviewAction.action === 'approve' ? '✓' : '!'}</div>
      <h2 id="inventory-confirm-title">{reviewAction.action === 'approve' ? 'Approve Item Request?' : 'Cancel Item Request?'}</h2>
      <div className="inventory-confirm-copy">{reviewAction.action === 'approve' ? 'The requested inventory will be issued to the hotel.' : 'This request will be cancelled and will not be issued.'}</div>
      <div className="inventory-confirm-actions"><button className="inventory-secondary" type="button" onClick={() => setReviewAction(null)}>Go Back</button><button className={reviewAction.action === 'approve' ? 'inventory-primary' : 'inventory-danger'} type="button" onClick={reviewRequest}>{reviewAction.action === 'approve' ? 'Approve Request' : 'Cancel Request'}</button></div>
    </div></div>}
  </section>;
}

export function InventoryTable({ inventory, loading, page, pages, onPage, showHotel = false, showCostPrice = false, selectable = false, selection = {}, onSelect }) {
  const columns = 4 + Number(showHotel) + Number(showCostPrice) + Number(selectable);
  return <div className="inventory-card"><div className="inventory-table-wrap"><table><thead><tr>{selectable && <th>Select</th>}<th>Item</th><th>Available</th><th>Unit</th>{showHotel && <th>Location</th>}<th>Price</th>{showCostPrice && <th>Cost Price</th>}</tr></thead><tbody>
    {loading ? <tr><td colSpan={columns}>Loading...</td></tr> : inventory.length === 0 ? <tr><td colSpan={columns}>No inventory found.</td></tr> : inventory.map((entry) => <tr key={entry._id}>{selectable && <td><input type="checkbox" checked={Boolean(selection[entry.itemId?._id])} onChange={(event) => onSelect(entry, event.target.checked)} /></td>}<td>{entry.itemId?.name || 'Deleted item'}</td><td>{entry.quantity}</td><td>{entry.itemId?.unit || '-'}</td>{showHotel && <td>{entry.guestHouseId?.guestHouseName || 'Central'}</td>}<td>{Number(entry.price || 0).toFixed(2)}</td>{showCostPrice && <td>{Number(entry.costPrice || 0).toFixed(2)}</td>}</tr>)}</tbody></table></div><Pagination page={page} pages={pages} onPage={onPage} /></div>;
}

function RequestTable({ requests, loading, page, pages, onPage, onReview }) {
  return <div className="inventory-card"><div className="inventory-table-wrap"><table><thead><tr><th>Hotel</th><th>Items</th><th>Requested By</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading...</td></tr> : requests.length === 0 ? <tr><td colSpan="5">No item requests found.</td></tr> : requests.map((request) => <tr key={request._id}><td>{request.guestHouseId?.guestHouseName || '-'}</td><td>{request.items.map((item) => `${item.itemId?.name || 'Item'} × ${item.quantity} @ ${Number(item.price).toFixed(2)}`).join(', ')}</td><td>{`${request.requestedBy?.firstName || ''} ${request.requestedBy?.lastName || ''}`.trim() || request.requestedBy?.email || '-'}</td><td><span className={`inventory-status ${request.status.toLowerCase()}`}>{request.status}</span></td><td>{request.status === 'PENDING' && <><button className="inventory-approve" onClick={() => onReview(request._id, 'approve')}>Approve</button><button className="inventory-decline" onClick={() => onReview(request._id, 'cancel')}>Cancel</button></>}</td></tr>)}</tbody></table></div><Pagination page={page} pages={pages} onPage={onPage} /></div>;
}

export function Pagination({ page, pages, onPage }) { return <div className="inventory-pagination"><button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div>; }
