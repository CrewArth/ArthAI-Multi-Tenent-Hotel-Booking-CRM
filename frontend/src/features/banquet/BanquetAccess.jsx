import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../utils/api';
import Loader from '../../components/Loader';
import { getRedirectPathForRole } from '../../utils/auth';
import { BanquetAccessContext, useBanquetAccess } from './banquetAccessContext';

export function BanquetAccessProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refreshAccess = () => {
      api.get('/api/banquet/access')
        .then(({ data }) => { if (active) setEnabled(data?.enabled === true); })
        .catch(() => { if (active) setEnabled(false); })
        .finally(() => { if (active) setLoading(false); });
    };
    refreshAccess();
    window.addEventListener('focus', refreshAccess);
    return () => { active = false; window.removeEventListener('focus', refreshAccess); };
  }, []);

  return <BanquetAccessContext.Provider value={{ enabled, loading }}>{children}</BanquetAccessContext.Provider>;
}

export function BanquetAccessGuard({ children }) {
  const { enabled, loading } = useBanquetAccess();
  const role = useSelector((state) => state.auth.user?.role);
  if (loading) return <Loader />;
  if (!enabled) return <Navigate to={getRedirectPathForRole(role)} replace />;
  return children;
}
