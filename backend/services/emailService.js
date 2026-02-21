require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configure Brevo API key
const brevoApiKey = process.env.BREVO_API_KEY;
SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = brevoApiKey;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


const sendLoginCodeEmail = async (userEmail, code) => {
  const sendSmtpEmail = {
    to: [{ email: userEmail }],
    sender: { email: 'abroadvisioncarrerz@gmail.com', name: 'Abroad Vision Carrerz' },
    subject: 'Your Login Verification Code',
    htmlContent: `<h2>Login Code: ${escapeHtml(code)}</h2><p>Expires in 10 mins.</p>`
  };
  try {
    const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Brevo Email sent:', info);
    return info;
  } catch (error) {
    console.error('❌ Brevo Email Error:', error);
    throw error;
  }
};

module.exports = { sendLoginCodeEmail };

// Line 43 daggara 
const sendEmail = transporter.sendMail.bind(transporter);

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

    // Send via Brevo
    const sendSmtpEmail = {
      to: [{ email: userEmail }],
      sender: { email: 'your_verified_sender@abroadvisioncarrerzdomain.com', name: 'Abroad Vision Carrerz' },
      subject: 'Abroad Vision Carrerz - Registration Successful',
      htmlContent: html
    };
    try {
      const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Brevo Confirmation Email sent:', info);
      return info;
    } catch (error) {
      console.error('❌ Brevo Confirmation Email Error:', error);
      return false;
    }
  } catch (error) {
    console.error('Confirmation email error:', error);
    return false;
  }
};

// Admin notification email
const sendAdminEmail = async (user) => {
  try {
    const rows = [];
    const addRow = (label, value) => {
      const v = String(value ?? '').trim();
      if (!v) return;
      rows.push(`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(v)}</p>`);
    };

    addRow('Name', user?.fullName);
    addRow('Email', user?.email);
    addRow('Phone', user?.phone);
    addRow('Country', user?.country);
    addRow('Preferred Country', user?.preferredCountry);
    addRow('Desired Course', user?.desiredCourse);
    addRow('Level Of Study', user?.levelOfStudy);
    addRow('City', user?.city);

    const html = `
      <h2>New User Registration</h2>
      ${rows.length ? rows.join('\n') : '<p>(No details provided)</p>'}
      <hr>
      <p>Please follow up with this student.</p>
    `;

    const adminList =
      process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) ||
      ['admin@example.com'];

    // Send via Brevo
    const sendSmtpEmail = {
      to: adminList.map(email => ({ email })),
      sender: { email: 'your_verified_sender@abroadvisioncarrerzdomain.com', name: 'Abroad Vision Carrerz' },
      subject: `New Registration: ${user?.fullName || user?.email || 'New Lead'}`,
      htmlContent: html
    };
    try {
      const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Brevo Admin Email sent:', info);
      return info;
    } catch (error) {
      console.error('❌ Brevo Admin Email Error:', error);
      return false;
    }
  } catch (error) {
    console.error('Admin email error:', error);
    return false;
  }
};

// Password reset code
const sendPasswordResetCodeEmail = async (userEmail, code) => {
  const html = `
    <h2>Password Reset</h2>
    <p>Use this code to reset your password:</p>
    <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px; padding: 12px 16px; background: #f3f4f6; display: inline-block; border-radius: 10px;">${escapeHtml(code)}</div>
    <p style="margin-top: 16px; color: #555;">This code will expire in 10 minutes.</p>
    <p style="color: #777; font-size: 12px;">If you did not request a password reset, ignore this email.</p>
  `;

  // Send via Brevo
  const sendSmtpEmail = {
    to: [{ email: userEmail }],
    sender: { email: 'your_verified_sender@abroadvisioncarrerzdomain.com', name: 'Abroad Vision Carrerz' },
    subject: 'Abroad Vision Carrerz - Password Reset Code',
    htmlContent: html
  };
  try {
    const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Brevo Password Reset Email sent:', info);
    return info;
  } catch (error) {
    console.error('❌ Brevo Password Reset Email Error:', error);
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

  // Send via Brevo
  const sendSmtpEmail = {
    to: [{ email: userEmail }],
    sender: { email: 'your_verified_sender@abroadvisioncarrerzdomain.com', name: 'Abroad Vision Carrerz' },
    subject: 'Abroad Vision Carrerz - Password Changed',
    htmlContent: html
  };
  try {
    const info = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Brevo Password Changed Email sent:', info);
    return info;
  } catch (error) {
    console.error('❌ Brevo Password Changed Email Error:', error);
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