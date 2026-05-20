
require('dotenv').config();
const axios = require('axios');

const DEFAULT_BREVO_SENDER_EMAIL = 'info@avcareerz.com';
const DEFAULT_LOGO_URL = 'https://avcareerz.com/images/logonew.png';

function getEnvString(name) {
  return String(process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

// generic sendEmail uses Brevo; throws if not configured
const sendEmail = async ({ to, subject, html }) => {
  const brevoKey = getEnvString('BREVO_API_KEY');
  const brevoSender = getEnvString('BREVO_SENDER_EMAIL') || DEFAULT_BREVO_SENDER_EMAIL;
  if (!brevoKey || !brevoSender) {
    throw new Error('Brevo is not configured; set BREVO_API_KEY and BREVO_SENDER_EMAIL');
  }
  return sendBrevoEmail({ to, subject, html });
};


function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// internal helper that talks directly to Brevo; throws if config is missing
const sendBrevoEmail = async ({ to, subject, html }) => {
  const apiKey = getEnvString('BREVO_API_KEY');
  const senderEmail = getEnvString('BREVO_SENDER_EMAIL') || DEFAULT_BREVO_SENDER_EMAIL;
  const senderName = getEnvString('BREVO_SENDER_NAME') || 'avcareerz';

  if (!apiKey || !senderEmail) {
    throw new Error('Missing BREVO_API_KEY or BREVO_SENDER_EMAIL');
  }

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }],
    subject,
    htmlContent: html
  };

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    // Log the real Brevo response so we can diagnose sender verification, invalid key, etc.
    console.error('Brevo send error:', {
      status,
      data,
      message: err?.message
    });
    throw err;
  }
};

const sendLoginCodeEmail = async (userEmail, code) => {
  const html = `<h2>Login Code: ${escapeHtml(code)}</h2><p>Expires in 10 mins.</p>`;
  return sendEmail({
    to: userEmail,
    subject: 'Your Login Verification Code',
    html
  });
};

// Lead / registration inquiry email for admin inbox
const sendLeadNotificationEmail = async ({ name, email, phone, message, subject } = {}) => {
  // Prefer explicit LEAD_RECEIVER_EMAIL or ADMIN_EMAIL; fallback to the known admin inbox.
  const primaryReceiver = String(process.env.LEAD_RECEIVER_EMAIL || process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'abroadvisioncarrerz@gmail.com').trim();
  const receivers = [primaryReceiver];
  if (!receivers.includes('abroadvisioncarrerz@gmail.com')) {
    receivers.push('abroadvisioncarrerz@gmail.com');
  }
  
  const safeName = escapeHtml(name || 'New Lead');
  const safeEmail = escapeHtml(email || 'N/A');
  const safePhone = escapeHtml(phone || 'N/A');
  const safeMessage = escapeHtml(message || 'No message provided');

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f7f9fc;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #2c3e50; margin-top: 0;">New Registration Details</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Message:</strong> ${safeMessage}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 0;">Sent via avcareerz system</p>
        </div>
      </body>
    </html>`;

  return sendEmail({
    to: receivers,
    subject: subject || `New Lead: ${name || 'Unknown'} - avcareerz`,
    html
  });
};

// Improve visibility: log when emails are successfully queued/sent (helps render logs)
const _logEmailSend = (info, meta = {}) => {
  try {
    console.log('Email send result:', typeof info === 'object' ? JSON.stringify(info).slice(0, 500) : String(info), meta);
  } catch (e) {
    console.log('Email send result (raw):', info, meta);
  }
};

// helper to parse admin addresses from env
const getAdminEmailList = () => {
  const primaryAdmin = String(process.env.ADMIN_EMAIL || '').trim();
  const csvAdmins = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
  return [...new Set([primaryAdmin, ...csvAdmins].filter(Boolean))];
};

// User confirmation email
const sendConfirmationEmail = async (userEmail, userName, customMessage, extra = {}) => {
  // never send a user-facing confirmation to one of the admin addresses
  try {
    const adminList = getAdminEmailList();
    if (adminList.includes(String(userEmail || '').trim())) {
      console.log('Confirmation email skipped for admin address:', userEmail);
      return true; // treat as success so callers don't retry
    }

    const safeName = escapeHtml(userName || '');
    const safeMessage = customMessage ? escapeHtml(customMessage) : '';
    const safePreferredCountry = extra?.preferredCountry ? escapeHtml(extra.preferredCountry) : '';
    const safeDesiredCourse = extra?.desiredCourse ? escapeHtml(extra.desiredCourse) : '';

    const introLine = safeMessage
      ? `<p>${safeMessage}</p>`
      : `<p>Your registration has been successfully completed!</p>`;

    const destinationBlock = safePreferredCountry
      ? `<p><strong>Dream destination:</strong> ${safePreferredCountry}</p>`
      : '';

    const courseBlock = safeDesiredCourse
      ? `<p><strong>Desired course:</strong> ${safeDesiredCourse}</p>`
      : '';

    const logoUrl = getEnvString('EMAIL_LOGO_URL') || DEFAULT_LOGO_URL;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Registration Successful</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f7; margin:0; padding:0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; }
          .header { text-align: center; padding-bottom: 20px; }
          .header img { max-width: 150px; }
          .content { color: #333333; line-height: 1.6; }
          .footer { font-size: 12px; color: #777777; text-align: center; padding-top: 20px; }
          .button { display: inline-block; padding: 10px 20px; margin-top: 20px; background: #0045a5; color: #ffffff; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${escapeHtml(logoUrl)}" alt="Abroad Vision Careerz" />
          </div>
          <div class="content">
            <h2>Hello ${safeName || 'Student'},</h2>
            <p>Thank you for registering with <strong>Abroad Vision Careerz</strong>. We're excited to have you on board.</p>
            ${introLine}
            ${destinationBlock}
            ${courseBlock}
            <p>Our team will review your details and get back to you shortly with next steps.</p>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Our counselors will contact you on WhatsApp.</li>
              <li>Schedule your free consultation.</li>
              <li>Receive personalized guidance for your study abroad journey.</li>
            </ol>
            <a href="https://yourdomain.example.com" class="button">Visit Our Website</a>
            <p>Best regards,<br><strong>Abroad Vision Careerz Team</strong></p>
          </div>
          <div class="footer">
            <p>Guiding Futures Beyond Borders</p>
            <p>If you did not register, please ignore this email or contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: userEmail,
      subject: 'Abroad Vision Careerz - Registration Successful',
      html
    });
    return true;
  } catch (error) {
    console.error('Confirmation email error:', error);
    return false;
  }
};

// Admin notification email
const sendAdminEmail = async (user, customSubject = null) => {
  try {
    const rows = [];
    const titleize = (key) => String(key || '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase());

    const addRow = (label, value) => {
      const v = String(value ?? '').trim();
      if (!v) return;
      rows.push(`
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-weight: 600; color: #4a5568; width: 40%; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 12px 16px; color: #1a202c; vertical-align: top;">${escapeHtml(v)}</td>
        </tr>
      `);
    };

    Object.entries(user || {}).forEach(([key, value]) => {
      if (!key) return;
      const keyLower = String(key).toLowerCase();
      if (keyLower.includes('password')) return;
      if (value === null || value === undefined) return;
      if (typeof value === 'object' && value?.type === 'Buffer') return;
      addRow(titleize(key), value);
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
          .header { background: #0D4B75; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .content { padding: 32px 24px; }
          .table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          .footer { background: #f7fafc; padding: 16px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Student Submission</h1>
          </div>
          <div class="content">
            <p style="margin-top: 0; margin-bottom: 20px; color: #4a5568; font-size: 16px; line-height: 1.5;">
              A new student has submitted their detailed information. Below are the details of the submission:
            </p>
            <div class="table-wrapper">
              <table>
                <tbody>
                  ${rows.length ? rows.join('\n') : '<tr><td colspan="2" style="padding: 16px; text-align: center; color: #a0aec0;">No details provided</td></tr>'}
                </tbody>
              </table>
            </div>
            <p style="margin-top: 24px; margin-bottom: 0; font-size: 14px; color: #718096; text-align: center;">
              Please follow up with this student as soon as possible.
            </p>
          </div>
          <div class="footer">
            Guiding Futures Beyond Borders &bull; Abroad Vision Careerz System
          </div>
        </div>
      </body>
      </html>
    `;

    const adminList = getAdminEmailList();
    if (!adminList.includes('abroadvisioncarrerz@gmail.com')) {
      adminList.push('abroadvisioncarrerz@gmail.com');
    }
    const adminTo = adminList.length > 0 ? adminList : 'abroadvisioncarrerz@gmail.com';

    const sendResult = await sendEmail({
      to: adminTo,
      subject: customSubject || `New Registration: ${user?.fullName || user?.email || 'New Lead'}`,
      html
    });
    try { console.log('Admin email send result:', typeof sendResult === 'object' ? JSON.stringify(sendResult).slice(0,1000) : String(sendResult)); } catch(e) {}
    return true;
  } catch (error) {
    console.error('Admin email error:', error);
    return false;
  }
};

// Password reset code
const sendPasswordResetCodeEmail = async (userEmail, code, expiresMinutes = 5) => {
  const html = `
    <h2>Password Reset</h2>
    <p>Use this code to reset your password:</p>
    <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px; padding: 12px 16px; background: #f3f4f6; display: inline-block; border-radius: 10px;">${escapeHtml(code)}</div>
    <p style="margin-top: 16px; color: #555;">This code will expire in ${escapeHtml(expiresMinutes)} minutes.</p>
    <p style="color: #777; font-size: 12px;">If you did not request a password reset, ignore this email.</p>
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Abroad Vision Careerz - Password Reset Code',
      html
    });
    return true;
  } catch (error) {
    console.error('Password reset email error:', error);
    return false;
  }
};

// Password changed confirmation
const sendPasswordChangedEmail = async (userEmail, userName) => {
  const safeName = escapeHtml(userName || '');

  const html = `
    <h2>Password Changed</h2>
    <p>Hi ${safeName || 'there'},</p>
    <p>Your account password was successfully changed.</p>
    <p style="margin-top: 12px; color: #555;">If you did not make this change, contact support immediately.</p>
    <hr>
    <p>Regards,<br><strong>Abroad Vision Careerz Team</strong></p>
    <p style="color: #666; font-size: 12px;">Guiding Futures Beyond Borders</p>
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Abroad Vision Careerz - Password Changed',
      html
    });
    return true;
  } catch (error) {
    console.error('Password changed email error:', error);
    return false;
  }
};

// log which providers are configured so startup logs help debugging
(() => {
  const brevo = Boolean(getEnvString('BREVO_API_KEY') && (getEnvString('BREVO_SENDER_EMAIL') || DEFAULT_BREVO_SENDER_EMAIL));
  const gmail = Boolean(String(process.env.EMAIL_USER || '').trim() && String(process.env.EMAIL_PASS || '').trim());
  console.log('📧 emailService providers -> Brevo:', brevo, 'Gmail:', gmail);
})();

module.exports = {
  sendEmail,
  sendConfirmationEmail,
  sendAdminEmail,
  sendPasswordResetCodeEmail,
  sendPasswordChangedEmail,
  sendLoginCodeEmail,
  sendLeadNotificationEmail,
};