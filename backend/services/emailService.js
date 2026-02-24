
require('dotenv').config();
const axios = require('axios');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const sendBrevoEmail = async ({ to, subject, html }) => {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || 'Abroad Vision Carrerz').trim();

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
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json'
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
  return sendBrevoEmail({
    to: userEmail,
    subject: 'Your Login Verification Code',
    html
  });
};

// User confirmation email
const sendConfirmationEmail = async (userEmail, userName, customMessage, extra = {}) => {
  try {
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

    const html = `
      <h2>Welcome ${safeName}! ✨</h2>
      <p>Thank you for registering with <strong>Abroad Vision Carrerz</strong>.</p>
      ${introLine}
      ${destinationBlock}
      ${courseBlock}
      <p>Our team will review your details and get back to you shortly.</p>
      <hr>
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Our counselors will contact you on WhatsApp</li>
        <li>Schedule your free consultation</li>
        <li>Get personalized guidance for your study abroad journey</li>
      </ul>
      <p>Best regards,<br><strong>Abroad Vision Carrerz Team</strong></p>
      <p style="color: #666; font-size: 12px;">Guiding Futures Beyond Borders</p>
    `;

    await sendBrevoEmail({
      to: userEmail,
      subject: 'Abroad Vision Carrerz - Registration Successful',
      html
    });
    return true;
  } catch (error) {
    console.error('Confirmation email error:', error);
    return false;
  }
};

// Admin notification email
const sendAdminEmail = async (user) => {
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
      rows.push(`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(v)}</p>`);
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
      <h2>New Student Submission</h2>
      ${rows.length ? rows.join('\n') : '<p>(No details provided)</p>'}
      <hr>
      <p>Please follow up with this student.</p>
    `;

    const adminList =
      process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) ||
      ['admin@example.com'];

    await sendBrevoEmail({
      to: adminList,
      subject: `New Registration: ${user?.fullName || user?.email || 'New Lead'}`,
      html
    });
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
    await sendBrevoEmail({
      to: userEmail,
      subject: 'Abroad Vision Carrerz - Password Reset Code',
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
    <p>Regards,<br><strong>Abroad Vision Carrerz Team</strong></p>
    <p style="color: #666; font-size: 12px;">Guiding Futures Beyond Borders</p>
  `;

  try {
    await sendBrevoEmail({
      to: userEmail,
      subject: 'Abroad Vision Carrerz - Password Changed',
      html
    });
    return true;
  } catch (error) {
    console.error('Password changed email error:', error);
    return false;
  }
};

module.exports = {
  sendConfirmationEmail,
  sendAdminEmail,
  sendPasswordResetCodeEmail,
  sendPasswordChangedEmail,
  sendLoginCodeEmail,
};