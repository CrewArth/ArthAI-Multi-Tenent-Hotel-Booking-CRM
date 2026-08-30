import { useSelector } from 'react-redux';
import fallbackLogo from '../assets/logo.png';
import '../styles/navbar-logo.css';

const sanitizeClientLogo = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('file:///')) {
    const normalized = trimmed.replace(/\\/g, '/');
    const match = normalized.match(/(?:RishabhGuestHouseImages|images)\/(.+)$/i);
    if (match) {
      return `/images/${match[1]}`;
    }
    return trimmed.replace(/^file:\/\/\/?([a-zA-Z]:)?/, '/images');
  }
  return trimmed;
};

const Logo = () => {
  const logoUrl = useSelector((state) => state.siteSettings.logoUrl);
  const cleanLogoUrl = sanitizeClientLogo(logoUrl);

  return (
    <div className='navbar-logo'>
      <a href="/">
        <img
          src={cleanLogoUrl || fallbackLogo}
          alt="Site Logo"
          id='nav-logo'
          draggable='false'
          onError={(e) => {
            if (e.target.src !== fallbackLogo) {
              e.target.onerror = null;
              e.target.src = fallbackLogo;
            }
          }}
        />
      </a>
    </div>
  );
};

export default Logo;