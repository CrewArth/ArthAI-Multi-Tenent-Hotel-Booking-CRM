import { createContext, useContext } from 'react';

export const BanquetAccessContext = createContext({ enabled: false, loading: true });
export const useBanquetAccess = () => useContext(BanquetAccessContext);
