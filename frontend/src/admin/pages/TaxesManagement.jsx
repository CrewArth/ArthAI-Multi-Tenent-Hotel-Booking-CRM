import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import '../styles/taxesManagement.css';

export default function TaxesManagement() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', percentage: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/taxes/list');
      setTaxes(res.data.taxes || []);
    } catch (err) {
      console.error(err);
      toast.error('Unable to load taxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTaxes(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || form.percentage === '') return toast.warn('Provide name and percentage');
    try {
      setSubmitting(true);
      const res = await api.post('/api/taxes', { name: form.name, percentage: Number(form.percentage) });
      setTaxes((t) => [res.data.tax, ...t]);
      setForm({ name: '', percentage: '' });
      setShowForm(false);
      toast.success('Tax created');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Unable to create tax');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tax?')) return;
    try {
      setDeletingId(id);
      await api.delete(`/api/taxes/${id}`);
      setTaxes((t) => t.filter((tax) => tax._id !== id));
      toast.success('Tax deleted');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Unable to delete tax');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (tax) => {
    try {
      const res = await api.patch(`/api/taxes/${tax._id}`, { isActive: !tax.isActive });
      setTaxes((t) => t.map((x) => x._id === tax._id ? res.data.tax : x));
    } catch (err) {
      console.error(err);
      toast.error('Unable to update tax');
    }
  };

  return (
    <section className="taxes-page-section">
      <div className="taxes-header">
        <h2>Taxes & Management</h2>
        <div className="taxes-actions">
          <button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : 'Add Tax'}</button>
        </div>
      </div>

      {showForm && (
        <div className="taxes-modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="taxes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="taxes-modal-header">
              <h3>Add Tax</h3>
              <button className="taxes-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="taxes-form" onSubmit={handleCreate}>
              <label>
                Tax Name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                Tax Percentage
                <input type="number" min="0" step="0.01" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: e.target.value })} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="taxes-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Percentage</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Active</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((tax) => (
              <tr key={tax._id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{tax.name}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{tax.percentage}%</td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <input type="checkbox" checked={tax.isActive} onChange={() => handleToggleActive(tax)} />
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>
                  <button
                    type="button"
                    className="tax-delete-action"
                    onClick={() => handleDelete(tax._id)}
                    disabled={deletingId === tax._id}
                    aria-label={`Delete ${tax.name} tax`}
                    title={`Delete ${tax.name} tax`}
                  />
                </td>
              </tr>
            ))}
            {taxes.length === 0 && (
              <tr className="empty"><td colSpan={4} style={{ padding: 12 }}>No taxes configured.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
