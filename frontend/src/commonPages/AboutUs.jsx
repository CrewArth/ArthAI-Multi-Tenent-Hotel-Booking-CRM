import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './commonPages.css';

const AboutUs = () => {
  return (
    <div className="common-page-container">
      <Navbar />
      <div className="common-page-content">
        <div className="common-page-header">
          <h1>About Us</h1>
          <p>Your Trusted Partner in Hotel Management</p>
        </div>

        <div className="common-section">
          <div className="highlight-box">
            <p>
              Established in 2000 by <strong>Mr. Raju Shah</strong>, Rishabh Software began with a vision to deliver exceptional values to our global clients. For over <strong>25 years of experience</strong>, we've helped businesses across <strong>25+ countries</strong> build agile, customer-centric foundations with a focus on trust, transparency, and long-term value.
            </p>
          </div>

          <div className="highlight-box">
            <h3>Our Global Presence</h3>
            <p>
              With a workforce of <strong>800+ professionals</strong> across <strong>08 locations</strong>, we have successfully delivered <strong>1400+ solutions</strong>. Rishabh has diverse business interests in the areas of engineering, IT, Education, BPO, and emerging innovation-led technology businesses. With offices across India—Vadodara (HQ), Ahmedabad, Pune, Hyderabad, and Bengaluru—and a strong presence in the U.S., U.K., and Australia, we help you reimagine your business through a digital lens.
            </p>
          </div>

          <div className="highlight-box">
            <h3>We Care</h3>
            <p>
              At Rishabh Software, <strong>"WE CARE"</strong> about empowering our clients to achieve their goals and unlock new growth opportunities.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Our success is defined by our core values of commitment to clients, ethics, and society through sustained collaboration, honesty, and opportunity-creation partnerships.
            </p>
          </div>

          <div className="highlight-box">
            <h3>Our Mission</h3>
            <p>
              To provide exceptional hotel management solutions that combine cutting-edge technology with personalized service, ensuring a seamless experience for both guests and administrators.
            </p>
          </div>

          <div className="highlight-box">
            <h3>Why Choose Us</h3>
            <ul>
              <li><strong>25+ Years of Experience:</strong> Proven track record in delivering quality solutions</li>
              <li><strong>Global Reach:</strong> Serving clients across 25+ countries</li>
              <li><strong>Innovation-Driven:</strong> Leveraging latest technologies for better solutions</li>
              <li><strong>Customer-Centric:</strong> Your success is our priority</li>
              <li><strong>Trust & Transparency:</strong> Building long-term partnerships based on integrity</li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;
