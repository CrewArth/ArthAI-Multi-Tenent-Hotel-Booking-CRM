import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeCredentialsEmail = async ({ ownerEmail, ownerName, tenantName, credentials }) => {
  const portalUrl = process.env.TENANT_FRONTEND_URL || 'http://localhost:5173';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1e293b; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Welcome to Hotel Booking Ecosystem</h1>
        <p style="margin: 8px 0 0; color: #94a3b8;">Your Hotel Organization has been Provisioned!</p>
      </div>

      <div style="padding: 24px; color: #334155;">
        <p>Dear <strong>${ownerName}</strong>,</p>
        <p>We are excited to inform you that <strong>${tenantName}</strong> is now registered and active on our platform!</p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0f172a;">🔐 Tenant Super Admin Credentials</h3>
          <p style="margin: 4px 0;"><strong>Email:</strong> <code>${credentials.superAdmin.email}</code></p>
          <p style="margin: 4px 0;"><strong>Password:</strong> <code>${credentials.superAdmin.password}</code></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
          <h3 style="margin-top: 0; color: #0f172a;">🔑 Tenant Admin Credentials</h3>
          <p style="margin: 4px 0;"><strong>Email:</strong> <code>${credentials.admin.email}</code></p>
          <p style="margin: 4px 0;"><strong>Password:</strong> <code>${credentials.admin.password}</code></p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Access Hotel Portal</a>
        </div>

        <p style="font-size: 13px; color: #64748b;">Please change your passwords immediately after your first sign-in.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Hotel Platform" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: `Your Credentials for ${tenantName}`,
      html,
    });
    console.log(`[sa_backend Email] Welcome email dispatched to ${ownerEmail}`);
  } catch (error) {
    console.error(`[sa_backend Email] Failed to send email to ${ownerEmail}:`, error.message);
  }
};
