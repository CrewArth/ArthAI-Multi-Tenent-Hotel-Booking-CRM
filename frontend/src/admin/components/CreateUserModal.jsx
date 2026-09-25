import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/editUserModel.css';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { readAndCompressImageAsDataUrl } from '../utils/imageUtils';
import { getStoredUser } from '../../utils/auth';
import AdminCredentialFields from './AdminCredentialFields';

export default function CreateUserModal({ onClose, onSuccess }) {
  const currentUser = getStoredUser();
  const isHotelAdmin = currentUser?.role === 'HOTEL_ADMIN' || currentUser?.role === 'HOTEL-ADMIN';
  const assignedHotel = typeof currentUser?.assignedGuestHouseId === 'object' ? currentUser.assignedGuestHouseId : null;
  const [form, setForm] = useState({
    firstName: '', lastName: '', credentialUsername: '',
    hotelId: isHotelAdmin ? assignedHotel?.guestHouseId || assignedHotel?._id || currentUser?.assignedGuestHouseId || '' : '',
    phone: '', address: '', password: '', role: 'ADMIN',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eSignatureFile, setESignatureFile] = useState(null);
  const [eSignaturePreview, setESignaturePreview] = useState('');
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleESignatureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { setESignatureFile(null); setESignaturePreview(''); return; }
    try {
      const preview = await readAndCompressImageAsDataUrl(file, { maxWidth: 640, maxHeight: 220, quality: 0.82 });
      setESignatureFile(file);
      setESignaturePreview(preview || '');
    } catch (error) {
      toast.error(error.message || 'Unable to load signature preview.');
      event.target.value = '';
      setESignatureFile(null);
      setESignaturePreview('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.hotelId) return toast.error('Select a hotel');
    try {
      setIsSubmitting(true);
      const payload = new FormData();
      for (const field of ['firstName', 'lastName', 'credentialUsername', 'phone', 'address', 'password', 'role']) payload.append(field, form[field]);
      payload.append('guestHouseId', form.hotelId);
      if (eSignatureFile) payload.append('eSignature', eSignatureFile);
      const response = await api.post('/api/admin/users', payload);
      toast.success(response.data.message || 'Admin created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create admin');
    } finally { setIsSubmitting(false); }
  };

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card admin-account-modal" role="dialog" aria-modal="true" aria-labelledby="create-admin-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><h2 id="create-admin-title">Create admin</h2><p className="subtitle">Add account details and set up hotel credentials.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={onClose}>×</button></div>
      <form className="modal-form" onSubmit={handleSubmit}>
        <section className="admin-modal-section" aria-label="Personal details">
          <div className="admin-modal-section-heading"><h3>Personal details</h3></div>
          <div className="form-grid-2">
            <label className="form-label">First name *<input className="form-input" required value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} disabled={isSubmitting} /></label>
            <label className="form-label">Last name *<input className="form-input" required value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} disabled={isSubmitting} /></label>
          </div>
          <div className="form-grid-2">
            <label className="form-label">Phone number *<PhoneInput defaultCountry="IN" value={form.phone} onChange={(value) => setField('phone', value || '')} required disabled={isSubmitting} /></label>
            <label className="form-label">Account role *<select className="form-input" value={form.role} onChange={(event) => setField('role', event.target.value)} disabled={isSubmitting || isHotelAdmin}><option value="ADMIN">ADMIN</option>{!isHotelAdmin && <option value="HOTEL_ADMIN">HOTEL_ADMIN</option>}</select></label>
          </div>
        </section>
        <AdminCredentialFields username={form.credentialUsername} hotelId={form.hotelId} onUsernameChange={(value) => setField('credentialUsername', value)} onHotelChange={(value) => setField('hotelId', value)} isHotelAdmin={isHotelAdmin} fallbackHotel={assignedHotel} disabled={isSubmitting} />
        <section className="admin-modal-section" aria-label="Security">
          <div className="admin-modal-section-heading"><h3>Security</h3></div>
          <label className="form-label">Password *<input className="form-input" type="password" autoComplete="new-password" minLength={6} required value={form.password} onChange={(event) => setField('password', event.target.value)} disabled={isSubmitting} /></label>
        </section>
        <details className="admin-modal-optional"><summary>Optional details</summary><div className="admin-modal-optional-body">
          <label className="form-label">Address<textarea className="form-input textarea-input" rows={2} value={form.address} onChange={(event) => setField('address', event.target.value)} disabled={isSubmitting} /></label>
          <label className="form-label">E-signature<input className="form-input-file" type="file" accept="image/*" onChange={handleESignatureChange} disabled={isSubmitting} /></label>
          {eSignaturePreview && <div className="signature-preview-box"><img className="signature-img" src={eSignaturePreview} alt="Signature preview" /></div>}
        </div></details>
        <div className="modal-actions"><button type="button" className="btn cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button><button type="submit" className="btn confirm" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create admin'}</button></div>
      </form>
    </div>
  </div>;
}
