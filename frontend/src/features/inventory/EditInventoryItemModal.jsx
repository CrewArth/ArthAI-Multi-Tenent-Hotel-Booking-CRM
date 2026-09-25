import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { inventoryUnits } from '../../utils/svgutils';

export default function EditInventoryItemModal({ entry, onClose, onSaved }) {
  const nameInput = useRef(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: entry.itemId?.name || '',
    initials: entry.itemId?.initials || '',
    description: entry.itemId?.description || '',
    unit: entry.itemId?.unit || 'piece',
    quantity: String(entry.quantity ?? 0),
    price: entry.itemId?.isChargeable === false ? '0' : String(entry.price ?? 0),
    costPrice: String(entry.costPrice ?? 0),
    isChargeable: entry.itemId?.isChargeable !== false,
  });

  useEffect(() => {
    nameInput.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!/^[A-Z]{1,2}$/.test(form.initials)) return toast.warn('Initials must be one or two capital letters');
    try {
      setSaving(true);
      await api.post(`/api/inventory/items/${entry._id}/update`, {
        ...form,
        quantity: Number(form.quantity),
        price: form.isChargeable ? Number(form.price) : 0,
        costPrice: Number(form.costPrice),
      });
      toast.success('Inventory item updated');
      onSaved();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update inventory item'); }
    finally { setSaving(false); }
  };

  return <div className="inventory-modal-backdrop" onClick={onClose}>
    <form className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="edit-inventory-title" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
      <div className="inventory-modal-header"><h2 id="edit-inventory-title">Edit Inventory Item</h2><button type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <p className="inventory-modal-note">Changes to the item name, initials, unit, and chargeability apply to every stock location.</p>
      <div className="inventory-modal-form">
        <label className="inventory-field inventory-field--wide"><span>Item Name</span><input ref={nameInput} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="inventory-field"><span>Item Initials</span><input required maxLength="2" pattern="[A-Z]{1,2}" value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2) })} /></label>
        <label className="inventory-field inventory-checkbox"><input type="checkbox" checked={form.isChargeable} onChange={(e) => setForm({ ...form, isChargeable: e.target.checked, price: e.target.checked ? '' : '0' })} /><span>Chargeable to hotel</span></label>
        <label className="inventory-field inventory-field--wide"><span>Description <em>Optional</em></span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="inventory-field"><span>Unit</span><select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{inventoryUnits.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></label>
        <label className="inventory-field"><span>Quantity</span><input required min="0" step="1" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
        <label className="inventory-field"><span>Price charged to hotel</span><div className="inventory-currency-input"><span>₹</span><input required min="0" step="0.01" type="number" disabled={!form.isChargeable} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div></label>
        <label className="inventory-field"><span>Cost Price</span><div className="inventory-currency-input"><span>₹</span><input required min="0" step="0.01" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div></label>
        <div className="inventory-field inventory-field--wide"><span>Inventory Location</span><div className="inventory-readonly">{entry.guestHouseId?.guestHouseName || 'Central stock'}</div></div>
      </div>
      <div className="inventory-actions"><button type="button" className="inventory-secondary" onClick={onClose}>Cancel</button><button className="inventory-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
    </form>
  </div>;
}
