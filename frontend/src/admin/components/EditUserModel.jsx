import { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/editUserModel.css';
import { toast } from 'react-toastify';
import { readAndCompressImageAsDataUrl } from '../utils/imageUtils';
import { getStoredUser } from '../../utils/auth';
import AdminCredentialFields from './AdminCredentialFields';

export default function EditUserModal({ user, onClose, onSubmit }) {
  const currentUser = getStoredUser();
  const isHotelAdmin = currentUser?.role === 'HOTEL_ADMIN' || currentUser?.role === 'HOTEL-ADMIN';
  const assignedHotel = typeof user?.assignedGuestHouseId === 'object' ? user.assignedGuestHouseId : null;
  const [form, setForm] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    credentialUsername: user?.credentialUsername || '',
    hotelId: assignedHotel?.guestHouseId || assignedHotel?._id || user?.assignedGuestHouseId || '',
    phone: user?.phone || '', address: user?.address || '',
    role: user?.role || 'ADMIN', isActive: user?.isActive ?? true,
  });
  const [eSignatureFile, setESignatureFile] = useState(null);
  const [eSignaturePreview, setESignaturePreview] = useState(user?.eSignatureUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const handleESignatureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { setESignatureFile(null); setESignaturePreview(user?.eSignatureUrl || ''); return; }
    try {
      const preview = await readAndCompressImageAsDataUrl(file, { maxWidth: 640, maxHeight: 220, quality: 0.82 });
      setESignatureFile(file);
      setESignaturePreview(preview || '');
    } catch (error) {
      toast.error(error.message || 'Unable to load signature preview.');
      event.target.value = '';
      setESignatureFile(null);
      setESignaturePreview(user?.eSignatureUrl || '');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.credentialUsername && !form.hotelId) return toast.error('Select a hotel');
    try {
      setIsSaving(true);
      const payload = new FormData();
      for (const field of ['firstName', 'lastName', 'phone', 'address', 'role']) payload.append(field, form[field]);
      if (form.hotelId) payload.append('guestHouseId', form.hotelId);
      if (form.credentialUsername) {
        payload.append('credentialUsername', form.credentialUsername);
      }
      payload.append('isActive', String(form.isActive));
      if (eSignatureFile) payload.append('eSignature', eSignatureFile);
      await onSubmit(payload);
    } catch (error) {
      console.error('Edit admin failed:', error);
    } finally { setIsSaving(false); }
  };

  if (!user) return null;
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card admin-account-modal" role="dialog" aria-modal="true" aria-labelledby="edit-admin-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header"><div><h2 id="edit-admin-title">Edit admin</h2><p className="subtitle">Update account details and credentials.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={onClose}>×</button></div>
      <form className="modal-form" onSubmit={handleSubmit}>
        <section className="admin-modal-section" aria-label="Personal details">
          <div className="admin-modal-section-heading"><h3>Personal details</h3></div>
          <div className="form-grid-2">
            <label className="form-label">First name *<input className="form-input" required value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} disabled={isSaving} /></label>
            <label className="form-label">Last name *<input className="form-input" required value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} disabled={isSaving} /></label>
          </div>
          <div className="form-grid-2">
            <label className="form-label">Phone number *<PhoneInput defaultCountry="IN" value={form.phone} onChange={(value) => setField('phone', value || '')} required disabled={isSaving} /></label>
            <label className="form-label">Account role *<select className="form-input" value={form.role} onChange={(event) => setField('role', event.target.value)} disabled={isSaving || isHotelAdmin}><option value="ADMIN">ADMIN</option><option value="HOTEL_ADMIN">HOTEL_ADMIN</option></select></label>
          </div>
        </section>
        <AdminCredentialFields username={form.credentialUsername} hotelId={form.hotelId} onUsernameChange={(value) => setField('credentialUsername', value)} onHotelChange={(value) => setField('hotelId', value)} isHotelAdmin={isHotelAdmin} fallbackHotel={assignedHotel} existingEmail={user.email} disabled={isSaving} required={Boolean(user.credentialUsername)} />
        {!user.credentialUsername && <p className="admin-modal-hint">Existing email stays unchanged until you enter a credential username.</p>}
        <details className="admin-modal-optional"><summary>Optional details</summary><div className="admin-modal-optional-body">
          <label className="form-label">Address<textarea className="form-input textarea-input" rows={2} value={form.address} onChange={(event) => setField('address', event.target.value)} disabled={isSaving} /></label>
          <label className="form-label">E-signature<input className="form-input-file" type="file" accept="image/*" onChange={handleESignatureChange} disabled={isSaving} /></label>
          {eSignaturePreview && <div className="signature-preview-box"><img className="signature-img" src={eSignaturePreview} alt="Signature preview" /></div>}
        </div></details>
        {!isHotelAdmin && <label className="checkbox-row"><input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} disabled={isSaving} /><span>Active account</span></label>}
        <div className="modal-actions"><button type="button" className="btn cancel" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" className="btn confirm" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </div>
  </div>;
}
