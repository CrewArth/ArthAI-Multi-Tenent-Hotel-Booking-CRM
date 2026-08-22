import React from 'react';
import Logo from './Logo';
import '../styles/footer.css';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="footer-container">
      <div className="company">
        <Logo />
        <p>Arth Hotel</p>
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
