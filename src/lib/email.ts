import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP (free)
// Users need to set SMTP_EMAIL and SMTP_PASSWORD in .env.local
// For Gmail: use an App Password (https://myaccount.google.com/apppasswords)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string
) {
  const mailOptions = {
    from: `"UIU Student Hub" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Verify Your Email - UIU Student Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">UIU Student Hub</h1>
        </div>
        <h2 style="color: #1a1a1a; text-align: center;">Email Verification</h2>
        <p style="color: #4a4a4a; font-size: 16px;">Hi ${name},</p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Please use the following verification code to verify your email address:
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f97316;">
            ${code}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          UIU Student Hub &copy; ${new Date().getFullYear()}
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendAdminNotificationEmail(
  subject: string,
  message: string
) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL;

  const mailOptions = {
    from: `"UIU Student Hub" <${process.env.SMTP_EMAIL}>`,
    to: adminEmail,
    subject: `[Admin] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0;">UIU Student Hub - Admin</h1>
        </div>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 16px 0;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          UIU Student Hub Admin Notification
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send admin notification email:", error);
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
