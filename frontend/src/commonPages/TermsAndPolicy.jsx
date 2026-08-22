import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './commonPages.css';

const TermsAndPolicy = () => {
  return (
    <div className="common-page-container">
      <Navbar />
      <div className="common-page-content">
        <div className="common-page-header">
          <h1>Terms & Policy</h1>
          <p>Please read our terms and conditions carefully</p>
        </div>

        <div className="common-section">
          <h2>Terms of Service</h2>
          <div className="info-card">
            <h3>1. Acceptance of Terms</h3>
            <p>
              By accessing and using the Rishabh Hotel Booking System, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div className="info-card">
            <h3>2. Use License</h3>
            <p>
              Permission is granted to temporarily use the Rishabh Hotel Booking System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in the system</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>3. Booking Terms</h3>
            <p>
              All bookings are subject to availability and confirmation. Bookings must be made in advance and are subject to approval by the administration. The system reserves the right to accept or reject any booking request.
            </p>
            <ul>
              <li>Bookings are confirmed only after administrative approval</li>
              <li>Cancellation policies apply as per the hotel rules</li>
              <li>Guests are responsible for providing accurate information during booking</li>
              <li>Any false information may result in cancellation of the booking</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>4. User Account</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </div>
        </div>

        <div className="common-section">
          <h2>Privacy Policy</h2>
          <div className="info-card">
            <h3>Information We Collect</h3>
            <p>
              We collect information that you provide directly to us, including but not limited to:
            </p>
            <ul>
              <li>Personal identification information (name, email, phone number)</li>
              <li>Booking details and preferences</li>
              <li>Account credentials</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>How We Use Your Information</h3>
            <p>
              We use the information we collect to:
            </p>
            <ul>
              <li>Process and manage your bookings</li>
              <li>Send you booking confirmations and updates</li>
              <li>Improve our services</li>
              <li>Communicate with you about your account</li>
            </ul>
          </div>

          <div className="info-card">
            <h3>Data Security</h3>
            <p>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </div>
        </div>

        <div className="common-section">
          <h2>Refund & Cancellation Policy</h2>
          <div className="info-card">
            <h3>Cancellation</h3>
            <p>
              Cancellation requests must be submitted through the system or by contacting the administration. Cancellation policies may vary based on the booking type and timing.
            </p>
          </div>

          <div className="info-card">
            <h3>Refunds</h3>
            <p>
              Refund eligibility and processing will be determined on a case-by-case basis in accordance with our cancellation policy and applicable regulations.
            </p>
          </div>
        </div>

        <div className="common-section">
          <h2>Limitation of Liability</h2>
          <div className="info-card">
            <p>
              Rishabh Software shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </div>
        </div>

        <div className="highlight-box">
          <h3>Contact for Queries</h3>
          <p>
            If you have any questions about these Terms & Policy, please contact us at <strong>sales@rishabhsoft.com</strong> or call us at <strong>+91 8511122697</strong>.
          </p>
          <p style={{ marginTop: '1rem' }}>
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsAndPolicy;
