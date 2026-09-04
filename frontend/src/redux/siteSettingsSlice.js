import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'siteSettings';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (settings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage quota exceeded — silently ignore
  }
};

const defaults = {
  siteName: 'Neuvera',
  logoUrl: null, // null → use the bundled logo.png fallback
};

const storedSettings = loadFromStorage();
const initialSiteName = (!storedSettings?.siteName || storedSettings?.siteName === 'Arth Hotel')
  ? defaults.siteName
  : storedSettings.siteName;

const initialState = {
  siteName: initialSiteName,
  logoUrl: storedSettings?.logoUrl ?? defaults.logoUrl,
};

const siteSettingsSlice = createSlice({
  name: 'siteSettings',
  initialState,
  reducers: {
    updateSiteSettings(state, action) {
      const { siteName, logoUrl } = action.payload;

      if (siteName !== undefined) state.siteName = siteName;
      if (logoUrl !== undefined) state.logoUrl = logoUrl;

      saveToStorage({ siteName: state.siteName, logoUrl: state.logoUrl });
    },
    resetSiteSettings(state) {
      state.siteName = defaults.siteName;
      state.logoUrl = defaults.logoUrl;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { updateSiteSettings, resetSiteSettings } = siteSettingsSlice.actions;
export default siteSettingsSlice.reducer;
