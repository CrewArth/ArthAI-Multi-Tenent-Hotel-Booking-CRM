import { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { normalizeRole } from '../../utils/auth';
import { BanquetHotelContext } from './banquetHotelContext';

export default function useBanquetHotel() {
  const sharedHotel = useContext(BanquetHotelContext);
  const user = useSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const requestedHotelId = searchParams.get('guestHouseId');
  const role = normalizeRole(user?.role);
  const isHotelAdmin = role === 'HOTEL_ADMIN';
  const assigned = user?.assignedGuestHouseId;
  const assignedId = typeof assigned === 'object' ? assigned?._id || assigned?.guestHouseId : assigned;
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setHotelId] = useState('');
  const hotelId = isHotelAdmin ? assignedId || '' : selectedHotelId;
  const [hotelError, setHotelError] = useState('');

  useEffect(() => {
    if (sharedHotel || role !== 'SUPER_ADMIN') return;
    let active = true;
    api.post('/api/guesthouses/list')
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.guestHouses || [];
        setHotels(list);
        setHotelId((current) => list.find((hotel) => hotel._id === requestedHotelId || hotel.guestHouseId === requestedHotelId)?._id || current || list[0]?._id || '');
      })
      .catch(() => { if (active) setHotelError('Unable to load hotels'); });
    return () => { active = false; };
  }, [role, requestedHotelId, sharedHotel]);

  return sharedHotel || { isHotelAdmin, assigned, hotels, hotelId, setHotelId, hotelError };
}
