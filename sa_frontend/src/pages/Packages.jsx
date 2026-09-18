import { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { saPackageApi } from '../api/saApi';

const emptyForm = {
  planName: '',
  maxHotels: '',
  maxRooms: '',
  maxAdmins: '',
};

export const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPackages = async () => {
    try {
      const response = await saPackageApi.list();
      setPackages(response.data.packages || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saPackageApi.create({
        planName: form.planName,
        maxHotels: Number(form.maxHotels),
        maxRooms: Number(form.maxRooms),
        maxAdmins: Number(form.maxAdmins),
      });
      setForm(emptyForm);
      await loadPackages();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="packages-page">
      <header className="packages-header">
        <div>
          <h1>Dynamic Packages</h1>
        </div>
      </header>

      {error && <div className="packages-error">{error}</div>}

      <section className="panel-card packages-form-card">
        <h2><PackagePlus size={20} /> Create Package</h2>
        <form className="packages-form" onSubmit={handleSubmit}>
          <label>
            Plan Name
            <input name="planName" value={form.planName} onChange={updateField} required />
          </label>
          <label>
            Max Hotels
            <input name="maxHotels" type="number" min="1" step="1" value={form.maxHotels} onChange={updateField} required />
          </label>
          <label>
            Max Rooms
            <input name="maxRooms" type="number" min="1" step="1" value={form.maxRooms} onChange={updateField} required />
          </label>
          <label>
            Max Admins
            <input name="maxAdmins" type="number" min="1" step="1" value={form.maxAdmins} onChange={updateField} required />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Package'}
          </button>
        </form>
      </section>

      <section className="panel-card packages-list-card">
        <h2>Available Packages</h2>
        {loading ? (
          <p className="packages-muted">Loading packages…</p>
        ) : (
          <div className="packages-table-wrap">
            <table className="packages-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Max Hotels</th>
                  <th>Max Rooms</th>
                  <th>Max Admins</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg._id || pkg.slug}>
                    <td>{pkg.planName}</td>
                    <td>{pkg.maxHotels}</td>
                    <td>{pkg.maxRooms}</td>
                    <td>{pkg.maxAdmins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
