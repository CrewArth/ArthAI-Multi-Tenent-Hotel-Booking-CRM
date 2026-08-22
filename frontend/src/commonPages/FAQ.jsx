import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './commonPages.css';

const FAQ = () => {
  const faqs = [
    {
      question: "How do I book a hotel room?",
      answer: "To book a hotel room, you need to first sign up or log in to your account. Then, browse available hotels, select your preferred dates, choose a room and bed, fill in your details, and submit the booking request. Your booking will be confirmed after administrative approval."
    },
    {
      question: "How long does it take for a booking to be approved?",
      answer: "Booking approval typically takes 24-48 hours. You will receive an email notification once your booking is approved or rejected. You can also check the status in your 'My Bookings' section."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking through the 'My Bookings' section. However, cancellation policies may apply depending on the timing and type of booking. Please refer to our Terms & Policy page for detailed cancellation information."
    },
    {
      question: "What information do I need to provide for booking?",
      answer: "You need to provide your full name, email address, phone number, address, check-in and check-out dates, and select a hotel, room, and bed. You may also include any special requests or requirements."
    },
    {
      question: "Can I modify my booking after submission?",
      answer: "Once a booking is submitted, you cannot modify it directly. If you need to make changes, please contact the administration or cancel the existing booking and create a new one, subject to availability."
    },
    {
      question: "What happens if my booking is rejected?",
      answer: "If your booking is rejected, you will receive an email notification with the reason. You can then submit a new booking request for different dates or accommodations."
    },
    {
      question: "How do I get access to the system?",
      answer: "Accounts are created by a super admin. If you need access, contact the super admin team to have an account created for you."
    },
    {
      question: "I forgot my password. How can I reset it?",
      answer: "Click on 'Forgot Password' on the login page. Enter your email address, and you will receive a password reset link via email. Follow the instructions in the email to reset your password."
    },
    {
      question: "Can I book multiple beds in the same room?",
      answer: "Yes, you can book multiple beds in the same room if they are available. Each bed needs to be booked separately through the booking form."
    },
    {
      question: "What payment methods are accepted?",
      answer: "Currently, the booking system is for request submission only. Payment details and methods will be communicated to you upon booking approval by the administration."
    },
    {
      question: "How do I contact support?",
      answer: "You can contact us via email at sales@rishabhsoft.com or call us at +91 8511122697. You can also visit our Contact Us page for more contact options and office locations."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take data security seriously. Your personal information is encrypted and stored securely. We follow industry-standard security practices to protect your data. Please refer to our Privacy Policy for more details."
    }
  ];

  return (
    <div className="common-page-container">
      <Navbar />
      <div className="common-page-content">
        <div className="common-page-header">
          <h1>Frequently Asked Questions</h1>
          <p>Find answers to common questions about our booking system</p>
        </div>

        <div className="common-section">
          <h2>General Questions</h2>
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <div className="faq-question">Q: {faq.question}</div>
              <div className="faq-answer">A: {faq.answer}</div>
            </div>
          ))}
        </div>

        <div className="highlight-box">
          <h3>Still Have Questions?</h3>
          <p>
            If you couldn't find the answer you're looking for, please don't hesitate to contact us. We're here to help!
          </p>
          <p style={{ marginTop: '1rem' }}>
            <strong>Email:</strong> <a href="mailto:sales@rishabhsoft.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sales@rishabhsoft.com</a><br />
            <strong>Phone:</strong> +91 8511122697
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;
