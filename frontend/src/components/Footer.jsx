import React from 'react';
import { useSelector } from 'react-redux';
import Logo from './Logo';
import '../styles/footer.css';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const siteName = useSelector((state) => state.siteSettings?.siteName) || 'Arth.AI';

  return (
    <footer className="footer-container">
      <div className="company">
        <Logo />
        <p>{siteName}</p>
      </div>

      <div className="contactus">
        <ul>
          <li onClick={() => navigate('/about')}>About Us</li>
          <li onClick={() => navigate('/contact')}>Contact Us</li>
          <li onClick={() => navigate('/terms')}>Terms & Policy</li>
          <li onClick={() => navigate('/faq')}>FAQ</li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
