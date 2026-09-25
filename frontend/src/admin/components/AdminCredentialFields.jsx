import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const hotelDomain = (name) => String(name || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 63);

export default function AdminCredentialFields({ username, hotelId, onUsernameChange, onHotelChange, isHotelAdmin, fallbackHotel, existingEmail, disabled, required = true }) {
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    api.post('/api/guesthouses/list')
      .then((response) => setHotels(Array.isArray(response.data) ? response.data : response.data?.guestHouses || []))
      .catch(() => toast.error('Unable to load hotels'));
  }, []);

  const selectedHotel = hotels.find((hotel) => String(hotel.guestHouseId || hotel._id) === String(hotelId))
    || (fallbackHotel && String(fallbackHotel.guestHouseId || fallbackHotel._id) === String(hotelId) ? fallbackHotel : null);
  const domain = hotelDomain(selectedHotel?.guestHouseName);
  const preview = username && domain ? `${username}@${domain}.in` : existingEmail || 'Select a hotel and enter a username';

  return <section className="admin-modal-section" aria-label="Credentials">
    <div className="admin-modal-section-heading"><h3>Credentials</h3><p>The login email is generated from the selected hotel.</p></div>
    <div className="form-grid-2">
      <label className="form-label">Hotel *
        <select className="form-input" value={hotelId} onChange={(event) => onHotelChange(event.target.value)} required={required || Boolean(username)} disabled={disabled || isHotelAdmin}>
          <option value="">Select hotel</option>
          {hotels.map((hotel) => <option key={hotel._id} value={hotel.guestHouseId || hotel._id}>{hotel.guestHouseName}</option>)}
        </select>
      </label>
      <label className="form-label">Credential Username {required ? '*' : ''}
        <input className="form-input" type="text" autoComplete="off" value={username} onChange={(event) => onUsernameChange(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32))} required={required} minLength={3} maxLength={32} pattern="[a-z][a-z0-9]{2,31}" placeholder="crmhotel" disabled={disabled} />
      </label>
    </div>
    <div className="admin-credential-preview"><span>Credential email</span><strong>{preview}</strong></div>
  </section>;
}
