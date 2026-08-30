import { configureStore } from '@reduxjs/toolkit';
import guestHousesReducer from './guestHouseSlice';
import siteSettingsReducer from './siteSettingsSlice';
import authReducer from './authSlice';
import hotelAdminReducer from './hotelAdminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    guestHouses: guestHousesReducer,
    siteSettings: siteSettingsReducer,
    hotelAdmin: hotelAdminReducer,
  },
});
