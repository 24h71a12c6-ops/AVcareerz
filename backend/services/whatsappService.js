
const axios = require('axios');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const ADMINS = process.env.ADMIN_WHATSAPPS;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN || !ADMINS) {
  console.warn('⚠️ WhatsApp ENV variables missing');
}

// Common normalizer for admin + user numbers
function normalizeToNumber(value) {
  let digits = String(value || '').replace(/\D/g, '');
  // If user provided a 10-digit Indian mobile, prefix 91
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

// Send text to all admin numbers
async function sendAdminWhatsApp(message) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN || !ADMINS) {
    console.warn('WhatsApp not sent (missing env).');
    return false;
  }

  const adminNumbers = ADMINS.split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map(normalizeToNumber)
    .filter(Boolean);

  if (adminNumbers.length === 0) {
    console.warn('WhatsApp not sent (no admin numbers configured).');
    return false;
  }

  for (const number of adminNumbers) {
    try {
      const resp = await axios.post(
        `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: number,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const msgId = resp?.data?.messages?.[0]?.id;
      console.log(
        `✅ WhatsApp sent to admin: ${number}${msgId ? ` (id: ${msgId})` : ''}`
      );
    } catch (err) {
      console.error(
        '❌ WhatsApp send failed:',
        err.response?.data || err.message
      );
    }
  }

  return true;
}

// Send template message to all admins (with fallback text)
async function sendAdminWhatsAppTemplate(
  templateName,
  bodyParams = [],
  languageCode = 'en_US'
) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN || !ADMINS) {
    console.warn('WhatsApp template not sent (missing env).');
    return false;
  }

  const adminNumbers = ADMINS.split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map(normalizeToNumber)
    .filter(Boolean);

  if (adminNumbers.length === 0) {
    console.warn('WhatsApp template not sent (no admin numbers configured).');
    return false;
  }

  const parameters = Array.isArray(bodyParams)
    ? bodyParams
        .filter((v) => v !== undefined && v !== null)
        .map((v) => ({ type: 'text', text: String(v) }))
    : [];

  for (const number of adminNumbers) {
    try {
      const resp = await axios.post(
        `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: number,
          type: 'template',
          template: {
            name: String(templateName || ''),
            language: { code: String(languageCode || 'en_US') },
            components: parameters.length
              ? [{ type: 'body', parameters }]
              : [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const msgId = resp?.data?.messages?.[0]?.id;
      console.log(
        `✅ WhatsApp template sent to admin: ${number}${
          msgId ? ` (id: ${msgId})` : ''
        }`
      );
    } catch (err) {
      console.error(
        '❌ WhatsApp template send failed:',
        err.response?.data || err.message
      );

      // Fallback to plain text so admins still get notified
      try {
        const fallbackText = parameters.length
          ? `Template: ${templateName}\n${bodyParams
              .map((p) => String(p))
              .join(' | ')}`
          : `Template: ${templateName}`;
        await axios.post(
          `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            to: number,
            type: 'text',
            text: { body: fallbackText },
          },
          {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (fallbackErr) {
        console.error(
          '❌ WhatsApp fallback text failed:',
          fallbackErr.response?.data || fallbackErr.message
        );
      }
    }
  }

  return true;
}

// NEW: send WhatsApp text to a single user
async function sendUserWhatsApp(userPhone, message) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WhatsApp user message not sent (missing env).');
    return false;
  }

  const number = normalizeToNumber(userPhone);
  if (!number) {
    console.warn('WhatsApp user message not sent (invalid phone):', userPhone);
    return false;
  }

  try {
    const resp = await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: number,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const msgId = resp?.data?.messages?.[0]?.id;
    console.log(
      `✅ WhatsApp sent to user: ${number}${msgId ? ` (id: ${msgId})` : ''}`
    );
    return true;
  } catch (err) {
    console.error(
      '❌ WhatsApp user send failed:',
      err.response?.data || err.message
    );
    return false;
  }
}

// Info about the configured sender
async function getWhatsAppSenderInfo() {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return {
      ok: false,
      error: 'Missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN',
    };
  }

  try {
    const resp = await axios.get(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}`,
      {
        params: {
          fields:
            'display_phone_number,verified_name,quality_rating,code_verification_status',
        },
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );

    return {
      ok: true,
      phoneNumberId: PHONE_NUMBER_ID,
      whatsappBusinessAccountId: WABA_ID || null,
      ...resp.data,
    };
  } catch (err) {
    return {
      ok: false,
      phoneNumberId: PHONE_NUMBER_ID,
      whatsappBusinessAccountId: WABA_ID || null,
      error: err.response?.data || err.message,
    };
  }
}

module.exports = {
  sendAdminWhatsApp,
  sendAdminWhatsAppTemplate,
  getWhatsAppSenderInfo,
  sendUserWhatsApp, // export new helper
};