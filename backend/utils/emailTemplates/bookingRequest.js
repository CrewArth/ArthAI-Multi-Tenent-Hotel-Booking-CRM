// utils/emailTemplates/bookingRequest.js
import { baseTemplate } from "./baseTemplate.js";

export const bookingRequest = (user, booking, guestHouse) => {
  const guestHouseName = guestHouse?.guestHouseName || 'your selected property';
  const guestName = user?.firstName || 'Guest';
  const heading = `${guestHouseName} booking confirmed`;

  return baseTemplate(
    heading,
    `
    <p style="margin: 0 0 16px 0; color: #2a2a2a;">Hi <strong style="color: #0B1957;">${guestName}</strong>,</p>

    <p style="margin: 0 0 24px 0; color: #2a2a2a;">
      Your booking at <strong>${guestHouseName}</strong> was completed successfully.
    </p>

    <div style="
      background: linear-gradient(135deg, #F8F3EA 0%, #f5efe0 100%);
      padding: 24px;
      border-radius: 12px;
      margin: 24px 0;
      border-left: 4px solid #0B1957;
    ">
      <h3 style="
        color: #0B1957;
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 700;
      ">Booking Details</h3>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #0B1957; width: 140px; vertical-align: top;">Guest House:</td>
          <td style="padding: 10px 0; color: #2a2a2a; font-weight: 500;">${guestHouseName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #0B1957; vertical-align: top;">Room / Bed:</td>
          <td style="padding: 10px 0; color: #2a2a2a; font-weight: 500;">${Array.isArray(booking.roomIds) && booking.roomIds.length ? booking.roomIds.map(r => r?.roomNumber ? `Room ${r.roomNumber}` : '').filter(Boolean).join(', ') : 'Room details available'}${booking.bedId?.bedNumber ? ` / Bed ${booking.bedId.bedNumber}` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #0B1957; vertical-align: top;">Check-in:</td>
          <td style="padding: 10px 0; color: #2a2a2a;">${new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600; color: #0B1957; vertical-align: top;">Check-out:</td>
          <td style="padding: 10px 0; color: #2a2a2a;">${new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 24px 0 16px 0; color: #2a2a2a;">
      If you have any questions or need assistance, please contact our support team.
    </p>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #F8F3EA;">
      <p style="margin: 0 0 8px 0; color: #2a2a2a;">
        <strong style="color: #0B1957;">Best regards,</strong>
      </p>
      <p style="margin: 0; color: #4a4a4a; font-size: 15px;">
        <strong>${guestHouseName} Team</strong>
      </p>
    </div>
    `
  , guestHouseName);
};
