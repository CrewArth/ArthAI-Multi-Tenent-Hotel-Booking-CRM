import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchAssignedHotel = createAsyncThunk(
  'hotelAdmin/fetchAssignedHotel',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/hotel-admin/hotel');
      return res.data?.guestHouse || res.data || null;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || 'Failed to fetch assigned hotel'
      );
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'hotelAdmin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/hotel-admin/dashboard-stats');
      return res.data || {};
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || 'Failed to fetch dashboard stats'
      );
    }
  }
);

const initialState = {
  hotel: null,
  hotelLoading: false,
  hotelError: null,
  dashboardData: null,
  dashboardLoading: false,
  dashboardError: null,
};

const hotelAdminSlice = createSlice({
  name: 'hotelAdmin',
  initialState,
  reducers: {
    setHotelData(state, action) {
      state.hotel = action.payload;
    },
    clearHotelAdminState(state) {
      state.hotel = null;
      state.dashboardData = null;
      state.hotelError = null;
      state.dashboardError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAssignedHotel
      .addCase(fetchAssignedHotel.pending, (state) => {
        state.hotelLoading = true;
        state.hotelError = null;
      })
      .addCase(fetchAssignedHotel.fulfilled, (state, action) => {
        state.hotelLoading = false;
        state.hotel = action.payload;
      })
      .addCase(fetchAssignedHotel.rejected, (state, action) => {
        state.hotelLoading = false;
        state.hotelError = action.payload;
      })
      // fetchDashboardStats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardData = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      });
  },
});

export const { setHotelData, clearHotelAdminState } = hotelAdminSlice.actions;
export default hotelAdminSlice.reducer;
