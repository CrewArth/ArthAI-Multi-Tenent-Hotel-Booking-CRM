import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { InventoryTable } from './SuperAdminInventoryPage';
import './inventory.css';

const toItems = (selection) => Object.entries(selection).map(([itemId, item]) => ({ itemId, quantity: Number(item.quantity), price: Number(item.price) }));

export default function HotelAdminInventoryPage() {
  const [tab, setTab] = useState('direct');
  const [hotelInventory, setHotelInventory] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [directSelection, setDirectSelection] = useState({});
  const [requestSelection, setRequestSelection] = useState({});
  const [directNote, setDirectNote] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [directPage, setDirectPage] = useState(1);
  const [availablePage, setAvailablePage] = useState(1);
  const [directPages, setDirectPages] = useState(1);
  const [availablePages, setAvailablePages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allowPriceChange, setAllowPriceChange] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  useEffect(() => {
    api.post('/api/inventory/hotel/config')
      .then((response) => setAllowPriceChange(response.data?.allowHotelPriceChange !== false))
      .catch((error) => console.error('Failed to load inventory permissions:', error));
  }, []);

  const loadHotelInventory = useCallback(async (page = directPage, searchValue = activeSearch) => {
    setLoading(true);
    try {
      const response = await api.post('/api/inventory/hotel/list', { page, search: searchValue });
      setHotelInventory(response.data?.inventory || []);
      setDirectPage(response.data?.currentPage || page);
      setDirectPages(response.data?.totalPages || 1);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to load hotel inventory'); }
    finally { setLoading(false); }
  }, [directPage, activeSearch]);

  const loadAvailableItems = useCallback(async (page = availablePage, searchValue = activeSearch) => {
    setLoading(true);
    try {
      const response = await api.post('/api/inventory/hotel/available-items', { page, search: searchValue });
      setAvailableItems(response.data?.inventory || []);
      setAvailablePage(response.data?.currentPage || page);
      setAvailablePages(response.data?.totalPages || 1);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to load available items'); }
    finally { setLoading(false); }
  }, [availablePage, activeSearch]);

  useEffect(() => { if (tab === 'direct') loadHotelInventory(1); else loadAvailableItems(1); }, [tab]);

  const selectItem = (setSelection, selection, entry, checked) => {
    const itemId = entry.itemId?._id;
    if (!itemId) return;
    if (!checked) return setSelection(Object.fromEntries(Object.entries(selection).filter(([key]) => key !== itemId)));
    setSelection({ ...selection, [itemId]: { item: entry, quantity: 1, price: Number(entry.price || 0) } });
  };

  const updateSelected = (setSelection, selection, itemId, field, value) => {
    const selected = selection[itemId];
    if (!selected) return;
    const maximum = selected.item.quantity;
    if (field === 'price' && (!allowPriceChange || selected.item.itemId?.isChargeable === false)) return;
    const nextValue = field === 'quantity' ? Math.min(maximum, Math.max(1, Number(value) || 1)) : Math.max(0, Number(value) || 0);
    setSelection({ ...selection, [itemId]: { ...selected, [field]: nextValue } });
  };

  const submit = async (kind) => {
    const selection = kind === 'direct' ? directSelection : requestSelection;
    const note = kind === 'direct' ? directNote : requestNote;
    const items = toItems(selection);
    if (!items.length) return toast.warn('Select at least one item');
    try {
      setSubmitting(true);
      await api.post(kind === 'direct' ? '/api/inventory/hotel/direct-issue' : '/api/inventory/hotel/requests', { items, note });
      if (kind === 'direct') { setDirectSelection({}); setDirectNote(''); loadHotelInventory(directPage); toast.success('Items issued'); }
      else { setRequestSelection({}); setRequestNote(''); toast.success('Item request sent'); }
    } catch (error) { toast.error(error.response?.data?.message || `Failed to ${kind === 'direct' ? 'issue items' : 'send request'}`); }
    finally { setSubmitting(false); }
  };

  const selectedItems = tab === 'direct' ? directSelection : requestSelection;
  const setSelectedItems = tab === 'direct' ? setDirectSelection : setRequestSelection;
  const note = tab === 'direct' ? directNote : requestNote;
  const setNote = tab === 'direct' ? setDirectNote : setRequestNote;
  const sourceInventory = tab === 'direct' ? hotelInventory : availableItems;
  const page = tab === 'direct' ? directPage : availablePage;
  const pages = tab === 'direct' ? directPages : availablePages;
  const onPage = tab === 'direct' ? loadHotelInventory : loadAvailableItems;

  const submitSearch = (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setActiveSearch(nextSearch);
    onPage(1, nextSearch);
  };

  return <section className="inventory-page">
    <div className="inventory-heading"><h1>Inventory Management</h1></div>
    <div className="inventory-tabs"><button className={tab === 'direct' ? 'active' : ''} onClick={() => setTab('direct')}>Direct Issue</button><button className={tab === 'request' ? 'active' : ''} onClick={() => setTab('request')}>Item Request</button><form className="inventory-search" role="search" onSubmit={submitSearch}><input type="search" aria-label="Search inventory" placeholder="Search by item name or description" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="submit">Search</button></form></div>
    <InventoryTable inventory={sourceInventory} loading={loading} page={page} pages={pages} onPage={onPage} selectable selection={selectedItems} onSelect={(entry, checked) => selectItem(setSelectedItems, selectedItems, entry, checked)} />
    <SelectedItemsTable selection={selectedItems} note={note} allowPriceChange={allowPriceChange} onNoteChange={setNote} onUpdate={(itemId, field, value) => updateSelected(setSelectedItems, selectedItems, itemId, field, value)} />
    <div className="inventory-actions"><button className="inventory-primary" disabled={submitting || Object.keys(selectedItems).length === 0} onClick={() => submit(tab)}>{submitting ? 'Saving...' : tab === 'direct' ? 'Directly Issue Items' : 'Send Item Request'}</button></div>
  </section>;
}

function SelectedItemsTable({ selection, note, allowPriceChange, onNoteChange, onUpdate }) {
  const selectedItems = Object.entries(selection);
  return <div className="inventory-card"><h2 className="inventory-card-title">Selected Items</h2><div className="inventory-table-wrap"><table><thead><tr><th>Item</th><th>Available</th><th>Unit</th><th>Quantity</th><th>Price</th></tr></thead><tbody>
    {selectedItems.length === 0 ? <tr><td colSpan="5">No items selected.</td></tr> : selectedItems.map(([itemId, selected]) => <tr key={itemId}><td>{selected.item.itemId?.name || 'Item'}</td><td>{selected.item.quantity}</td><td>{selected.item.itemId?.unit || '-'}</td><td><input min="1" max={selected.item.quantity} type="number" value={selected.quantity} onChange={(event) => onUpdate(itemId, 'quantity', event.target.value)} /></td><td><input min="0" step="0.01" type="number" disabled={!allowPriceChange || selected.item.itemId?.isChargeable === false} title={selected.item.itemId?.isChargeable === false ? 'This item is free' : undefined} value={selected.item.itemId?.isChargeable === false ? 0 : selected.price} onChange={(event) => onUpdate(itemId, 'price', event.target.value)} /></td></tr>)}</tbody></table></div><label className="inventory-notes"><span>Notes</span><textarea value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Add notes for this issue or request" rows="3" /></label></div>;
}
