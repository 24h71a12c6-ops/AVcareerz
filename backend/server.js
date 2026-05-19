

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { exec } = require('child_process');

const { loadEnv } = require('./utils/loadEnv');

// Env loading logic
// Do not override Render/production env vars with local .env values.
const isRender = Boolean(process.env.RENDER);
const isProduction = process.env.NODE_ENV === 'production';
loadEnv(path.join(__dirname, '.env'), { override: !(isRender || isProduction) });

// Firestore client instead of Supabase
const db = require('./config/firebaseClient');
const { sendLeadNotificationEmail } = require('./services/emailService');

const corsOptions = {
  origin: (origin, callback) => {
    // Dynamically mirror the requesting origin to satisfy credentialed requests
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage() });

const RESET_CODE_TTL_MINUTES = Number(process.env.RESET_CODE_TTL_MINUTES || 5);
const RESET_PASSWORD_PEPPER = process.env.RESET_PASSWORD_PEPPER || 'dev-pepper-change-me';

const isStrongPassword = (password) => {
  const p = String(password || '');
  return (
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)
  );
};

// Common instant alert utility (Email-only)
const sendInstantAlert = async (type, payload = {}) => {
  try {
    const { sendEmail } = require('./services/emailService');

    const data = (payload && typeof payload === 'object') ? payload : {};
    const adminTo = String(process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'info@avcareerz.com').trim() || 'info@avcareerz.com';

    let emoji = '🔔';
    let statusText = 'Notification';
    if (type === 'partial') {
      emoji = '⚠️';
      statusText = 'PARTIAL LEAD (Exit)';
    } else if (type === 'signup') {
      emoji = '🚀';
      statusText = 'NEW REGISTRATION (Success)';
    } else if (type === 'login') {
      emoji = '🔑';
      statusText = 'USER LOGIN';
    }

    const fullName = data.fullName || data.name || 'N/A';
    const phone = data.phone || 'N/A';
    const email = data.email || 'N/A';
    const source = data.source || 'Website';

    const headerColor = type === 'partial' ? '#eab308' : '#0D4B75';

    let alertDescription = 'An alert has been triggered from the system. Details are provided below:';
    if (type === 'partial') {
      alertDescription = '<span style="color: #d97706; font-weight: 700; font-size: 16px; display: block; margin-bottom: 8px;">⚠️ Note to Counselor:</span> This student started filling in their details on the registration form but **exited or closed the page WITHOUT clicking the final submit button**. Please follow up with them on WhatsApp or call to help them complete their application.';
    } else if (type === 'login') {
      alertDescription = 'An existing student has logged back into their account.';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
          .header { background: ${headerColor}; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
          .content { padding: 32px 24px; }
          .table-wrapper { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          tr { border-bottom: 1px solid #e2e8f0; }
          tr:last-child { border-bottom: none; }
          td { padding: 12px 16px; vertical-align: top; }
          .label { font-weight: 600; color: #4a5568; width: 35%; }
          .value { color: #1a202c; }
          .footer { background: #f7fafc; padding: 16px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} ${statusText}</h1>
          </div>
          <div class="content">
            <p style="margin-top: 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
              ${alertDescription}
            </p>
            <div class="table-wrapper">
              <table>
                <tbody>
                  <tr>
                    <td class="label">Name</td>
                    <td class="value">${fullName}</td>
                  </tr>
                  <tr>
                    <td class="label">Phone</td>
                    <td class="value">${phone}</td>
                  </tr>
                  <tr>
                    <td class="label">Email</td>
                    <td class="value">${email}</td>
                  </tr>
                  <tr>
                    <td class="label">Source</td>
                    <td class="value">${source}</td>
                  </tr>
                  ${data.url ? `
                  <tr>
                    <td class="label">Page URL</td>
                    <td class="value"><a href="${data.url}" style="color:#3b82f6;text-decoration:none;">${data.url}</a></td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>
          </div>
          <div class="footer">
            Abroad Vision Careerz Alert System &bull; Guiding Futures Beyond Borders
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: adminTo,
      subject: `${emoji} ${statusText}: ${fullName || 'User'}`,
      html
    });
  } catch (err) {
    console.error('Alert Error:', err?.message || err);
  }
};

// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
  try {
    // simple check: list one document from registrations
    const snap = await db.collection('registrations').limit(1).get();
    if (!snap.empty) {
      console.log('✅ Database collections already initialized');
    } else {
      console.log('⚠️  No registrations documents found; ensure you created collections in Firestore');
    }
  } catch (error) {
    console.error('⚠️  Database check:', error.message);
  }
}

// Initialize DB immediately
initializeDatabase();

// --- MIDDLEWARES ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DYNAMIC PATH RESOLUTION (FIX FOR RENDER) ---
const frontendPath = fs.existsSync(path.join(__dirname, 'Frontend'))
  ? path.join(__dirname, 'Frontend')
  : path.join(__dirname, '..', 'Frontend');

console.log('✓ Frontend path resolved to:', frontendPath);

// --- STATIC FILES (ORDER MATTERS!) ---
app.use('/images', express.static(path.join(frontendPath, 'images')));
app.use(express.static(frontendPath));

// --- API ROUTES ---

// Health Check
app.get('/health', async (req, res) => {
  try {
    const snap = await db.collection('registrations').get();
    res.json({ ok: true, status: 'Live', db: 'Connected', count: snap.size, timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ ok: false, status: 'Live', db: 'Disconnected', error: err.message, timestamp: new Date() });
  }
});

// Registration API - FIXED
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const emailLc = String(email).trim().toLowerCase();

    // 1. Duplicate check
    let existing = await db.collection('registrations')
      .where('email_lc', '==', emailLc)
      .limit(1)
      .get();

    // Backward-compatible fallback for older records
    if (existing.empty) {
      existing = await db.collection('registrations')
        .where('email', '==', String(email).trim())
        .limit(1)
        .get();
    }
      
    if (!existing.empty) {
      return res.status(409).json({ success: false, error: 'This email is already registered. Please log in.' });
    }

    // 2. Firestore insert
    const ref = await db.collection('registrations').add({
      full_name: fullName,
      email: String(email).trim(),
      email_lc: emailLc,
      phone: phone,
      password: password,
      created_at: new Date().toISOString()
    });

    // FIXED: data ni object ga access cheyalasindhi (No [0])
    const userId = ref.id; 

    // 3. Send Emails
    try {
      const { sendAdminEmail, sendConfirmationEmail } = require('./services/emailService');

      await sendAdminEmail({
        userId,
        fullName,
        email,
        phone
      }, 'New Registration Lead - Step 1');
      
      // send confirmation only to non-admin addresses
      const adminPrimary = String(process.env.ADMIN_EMAIL || '').trim();
      const adminCsv = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
      const adminList = [...new Set([adminPrimary, ...adminCsv].filter(Boolean))];
      if (!adminList.includes(String(email).trim())) {
        await sendConfirmationEmail(email, fullName);
      } else {
        console.log('Registration email is an admin address; confirmation email suppressed');
      }
    } catch (emailError) {
      console.error('Email error (signup):', emailError);
    }

    // FIXED: userId: userId ani pampali (data[0].id kadu)
    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful!', 
      userId: userId 
    });

  } catch (error) {
    console.error('Reg Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Registration failed: ' + error.message 
    });
  }
});

// Update registration API (used by edit mode in the frontend)
app.put('/api/update-registration', async (req, res) => {
  try {
    const { fullName, email, phone, password, userId } = req.body || {};

    const cleanFullName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanPassword = String(password || '').trim();
    const emailLc = cleanEmail.toLowerCase();
    const cleanUserId = String(userId || '').trim();

    if (!cleanFullName || !cleanEmail || !cleanPhone) {
      return res.status(400).json({ success: false, error: 'Full name, email, and phone are required' });
    }

    let targetDoc = null;

    if (cleanUserId) {
      const doc = await db.collection('registrations').doc(cleanUserId).get();
      if (doc.exists) targetDoc = doc;
    }

    if (!targetDoc) {
      let snap = await db.collection('registrations')
        .where('email_lc', '==', emailLc)
        .limit(1)
        .get();

      if (snap.empty) {
        snap = await db.collection('registrations')
          .where('email', '==', cleanEmail)
          .limit(1)
          .get();
      }

      if (!snap.empty) {
        targetDoc = snap.docs[0];
      }
    }

    if (!targetDoc) {
      return res.status(404).json({ success: false, error: 'Registration record not found' });
    }

    // Prevent accidental duplicate emails if the user changes their address during edit.
    const currentDocId = targetDoc.id;
    const duplicateSnap = await db.collection('registrations')
      .where('email_lc', '==', emailLc)
      .limit(2)
      .get();

    const duplicateExists = duplicateSnap.docs.some((doc) => doc.id !== currentDocId);
    if (duplicateExists) {
      return res.status(409).json({ success: false, error: 'This email is already registered. Please use a different email.' });
    }

    const updates = {
      full_name: cleanFullName,
      email: cleanEmail,
      email_lc: emailLc,
      phone: cleanPhone,
      updated_at: new Date().toISOString()
    };

    if (cleanPassword) {
      updates.password = cleanPassword;
    }

    await db.collection('registrations').doc(currentDocId).update(updates);

    return res.json({
      success: true,
      message: 'Registration updated successfully',
      userId: currentDocId
    });
  } catch (error) {
    console.error('Update registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration update failed: ' + error.message
    });
  }
});

// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const snap = await db.collection('registrations').where('email', '==', email).limit(1).get();
    if (snap.empty) return res.status(404).json({ success: false, error: 'Email not registered.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // We are saving 'code' directly now, NOT 'code_hash'
    await db.collection('password_reset_codes').add({ 
      email, 
      code, 
      expires_at: expiresAt, 
      used_at: null 
    });

    const { sendPasswordResetCodeEmail } = require('./services/emailService');
    const ok = await sendPasswordResetCodeEmail(email, code, 15);
    
    if (!ok) return res.status(502).json({ success: false, error: 'Email failed to send.' });

    return res.json({ success: true, message: 'Code sent successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});
// Step 2: Additional academic data + uploads
app.post(
  '/api/register-step2',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'transcripts', maxCount: 1 },
    { name: 'passportCopy', maxCount: 1 },
    { name: 'testScoreCard', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      let {
        userId,
        fullName,
        dob,
        gender,
        nationality,
        phone,
        email,
        city,
        passportStatus,
        passport_id,
        highestQualification,
        currentCourse,
        specialization,
        collegeName,
        yearOfPassing,
        cgpa,
        preferredCountry,
        visaStatus,
        visaType,
        visaNumber,
        levelOfStudy,
        coaching,
        preferredIntake,
        desiredCourse,
        budgetRange,
        fundingSource,
        loanStatus,
        declaration
      } = req.body || {};

      const asText = (v) => String(v ?? '').trim();
      const asEmailLc = (v) => asText(v).toLowerCase();

      // Normalize common fields (prevents subtle "looks filled" but actually whitespace)
      userId = asText(userId);
      fullName = asText(fullName);
      dob = asText(dob);
      gender = asText(gender);
      nationality = asText(nationality);
      phone = asText(phone);
      email = asEmailLc(email);
      city = asText(city);
      passportStatus = asText(passportStatus);
      passport_id = asText(passport_id);
      highestQualification = asText(highestQualification);
      preferredCountry = asText(preferredCountry);
      visaStatus = asText(visaStatus);
      visaType = asText(visaType);
      levelOfStudy = asText(levelOfStudy);
      preferredIntake = asText(preferredIntake);
      desiredCourse = asText(desiredCourse);

      // If userId is missing but email is provided, look up userId
      if (!userId && email) {
        // Prefer case-insensitive lookup via a normalized field if available.
        let lookupSnap = await db.collection('registrations')
          .where('email_lc', '==', email)
          .limit(1)
          .get();

        // Backward-compatible fallback for older records.
        if (lookupSnap.empty) {
          lookupSnap = await db.collection('registrations')
            .where('email', '==', email)
            .limit(1)
            .get();
        }

        if (!lookupSnap.empty) {
          userId = lookupSnap.docs[0].id;
          // Self-heal: store normalized email for future lookups.
          try {
            await db.collection('registrations').doc(userId).update({ email_lc: email });
          } catch {
            // ignore
          }
        }
      }

      const declarationFlag = ['1', 'true', 'on', 'yes'].includes(
        String(declaration).toLowerCase()
      ) ? 1 : 0;

      // Allow step2 to proceed even when userId isn't available (older sessions),
      // as long as we have a usable email. We'll store email as the identifier.
      const userIdentifier = userId || email;

      const missingFields = [];
      if (!userIdentifier) missingFields.push('userId/email');
      if (!fullName) missingFields.push('fullName');
      if (!dob) missingFields.push('dob');
      if (!gender) missingFields.push('gender');
      if (!nationality) missingFields.push('nationality');
      if (!phone) missingFields.push('phone');
      if (!email) missingFields.push('email');
      if (!city) missingFields.push('city');
      if (!passportStatus) missingFields.push('passportStatus');
      if (passportStatus === 'Valid' && !passport_id) missingFields.push('passport_id');
      if (!highestQualification) missingFields.push('highestQualification');
      if (!preferredCountry) missingFields.push('preferredCountry');
      if (!visaStatus) missingFields.push('visaStatus');
      if (visaStatus === 'Valid' && !visaNumber) missingFields.push('visaNumber');
      if (visaStatus === 'Valid' && !visaType) missingFields.push('visaType');
      if (!levelOfStudy) missingFields.push('levelOfStudy');
      if (!preferredIntake) missingFields.push('preferredIntake');
      if (!declarationFlag) missingFields.push('declaration');

      if (missingFields.length) {
        return res.status(400).json({
          success: false,
          error: 'Missing required academic details',
          missingFields
        });
      }

      const files = req.files || {};
      const mapFile = (field) =>
        files[field] && files[field][0] ? files[field][0].buffer : null;

      const fileMeta = (field) => {
        const file = files[field] && files[field][0] ? files[field][0] : null;
        if (!file) return null;
        return {
          original_name: file.originalname || null,
          mime_type: file.mimetype || null,
          size: file.size || null
        };
      };

      const uploadedFiles = {
        resume: fileMeta('resume'),
        transcripts: fileMeta('transcripts'),
        passportCopy: fileMeta('passportCopy'),
        testScoreCard: fileMeta('testScoreCard')
      };

      // insert document into next_form collection
      await db.collection('next_form').add({
        user_id: userIdentifier,
        fullName,
        dob,
        gender,
        nationality,
        phone,
        email,
        city,
        passportStatus,
        passport_id: passportStatus === 'Valid' ? passport_id : null,
        highestQualification,
        currentCourse: currentCourse || null,
        specialization: specialization || null,
        collegeName: collegeName || null,
        yearOfPassing: yearOfPassing || null,
        cgpa: cgpa || null,
        preferredCountry,
        visaStatus,
        visaType,
        visaNumber: visaStatus === 'Valid' ? visaNumber : null,
        levelOfStudy,
        coaching: coaching || null,
        preferredIntake,
        desiredCourse: desiredCourse || null,
        budgetRange: budgetRange || null,
        fundingSource: fundingSource || null,
        loanStatus: loanStatus || null,
        declaration: declarationFlag,
        uploaded_files: uploadedFiles,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      try {
        const { sendAdminEmail, sendConfirmationEmail } = require('./services/emailService');
        // notify admins about the completed second form with ALL details
        await sendAdminEmail({
          userId,
          fullName,
          dob,
          gender,
          nationality,
          phone,
          email,
          city,
          passportStatus,
          passportNumber: passportStatus === 'Valid' ? passport_id : 'Not Available / Applied',
          highestQualification,
          currentCourse,
          specialization,
          collegeName,
          yearOfPassing,
          cgpa,
          preferredCountry,
          visaStatus,
          visaType,
          visaNumber: visaStatus === 'Valid' ? visaNumber : 'Not Available / Applied',
          levelOfStudy,
          coaching,
          preferredIntake,
          budgetRange,
          fundingSource,
          loanStatus,
          declaration: declarationFlag ? 'Yes' : 'No'
        }, 'New Application Detail - Step 2');

        // send confirmation to the user as well
        const customMsg = 'Thank you for submitting your academic and personal details. Our team will review your application and be in touch soon.';
        await sendConfirmationEmail(email, fullName, customMsg);
      } catch (emailError) {
        console.error('Email error (step2):', emailError);
      }

      res.status(200).json({
        success: true,
        message: 'Step 2 completed'
      });
    } catch (error) {
      console.error('Step 2 Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process step 2 data'
      });
    }
  }
);
// Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const emailLc = String(email).trim().toLowerCase();

    let snap = await db.collection('registrations')
      .where('email_lc', '==', emailLc)
      .limit(1)
      .get();

    // Backward-compatible fallback
    if (snap.empty) {
      snap = await db.collection('registrations')
        .where('email', '==', String(email).trim())
        .limit(1)
        .get();
    }
    if (snap.empty) {
      return res.status(401).json({ success: false, error: 'Account not found. Please register first.' });
    }
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Self-heal: store normalized email on first successful login
    try {
      const docId = rows[0]?.id;
      if (docId && !rows[0]?.email_lc) {
        await db.collection('registrations').doc(docId).update({ email_lc: emailLc });
      }
    } catch {
      // ignore
    }

    const isMatch = password === rows[0].password;
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    // Store successful login details in Firebase (Firestore)
    // Note: Do NOT store raw passwords.
    try {
      const forwardedFor = String(req.headers['x-forwarded-for'] || '').trim();
      const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || null);
      const userAgent = String(req.headers['user-agent'] || '').trim() || null;

      await db.collection('login_details').add({
        user_id: rows[0].id,
        full_name: rows[0].full_name || null,
        email: rows[0].email,
        phone: rows[0].phone || null,
        login_at: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
        source: 'web'
      });
    } catch (loginLogError) {
      // Login should still succeed even if audit logging fails
      console.error('Login audit log error:', loginLogError?.message || loginLogError);
    }

    // Instant sync alert for successful login
    sendInstantAlert('login', {
      fullName: rows[0].full_name,
      email: rows[0].email,
      phone: rows[0].phone,
      source: 'Login Success'
    });

    // Check if the user has completed step 2 application
    const nextFormSnap = await db.collection('next_form')
      .where('email', '==', emailLc)
      .limit(1)
      .get();

    res.json({
      success: true,
      userId: rows[0].id,
      isApplicationCompleted: !nextFormSnap.empty,
      data: {
        fullName: rows[0].full_name,
        email: rows[0].email,
        phone: rows[0].phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed due to server error' });
  }
});

// Check Application Completion Status API
app.get('/api/check-application-status', async (req, res) => {
  try {
    const email = String(req.query?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }

    const nextFormSnap = await db.collection('next_form')
      .where('email', '==', email)
      .limit(1)
      .get();

    return res.json({
      success: true,
      completed: !nextFormSnap.empty
    });
  } catch (error) {
    console.error('Check application status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify application status' });
  }
});

// Verify Reset Code
app.post('/api/verify-reset-code', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    // Direct comparison: checking if this email and code exist together
    const codeSnap = await db.collection('password_reset_codes')
      .where('email', '==', email)
      .where('code', '==', code) 
      .where('used_at', '==', null)
      .get();

    if (codeSnap.empty) {
      return res.status(400).json({ success: false, error: 'Invalid code.' });
    }

    const data = codeSnap.docs[0].data();
    if (data.expires_at < new Date().toISOString()) {
      return res.status(400).json({ success: false, error: 'Code expired.' });
    }

    return res.json({ success: true, message: 'Verified!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Partial lead capture: silently store key fields before full form submit
app.post('/api/partial-lead', express.text({ type: '*/*' }), async (req, res) => {
  try {
    let data = {};
    if (typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body || '{}');
      } catch {
        data = {};
      }
    } else if (req.body && typeof req.body === 'object') {
      data = req.body;
    }

    sendInstantAlert('partial', {
      fullName: data.fullName || data.name,
      phone: data.phone,
      email: data.email,
      source: data.source || data.page || 'User Exit',
      url: data.url
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error processing lead:', error?.message || error);
    return res.sendStatus(500);
  }
});

// Reset Password - Cleaned and Fixed Syntax
app.post('/api/reset-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();

    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: 'Invalid code format' });
    if (!newPassword) return res.status(400).json({ success: false, error: 'New password is required' });

    // Password strength check
    if (typeof isStrongPassword === 'function' && !isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
      });
    }

    const nowIso = new Date().toISOString();

    // 1. Check if the plain-text code matches
    const codeSnap2 = await db.collection('password_reset_codes')
      .where('email', '==', email)
      .where('code', '==', code)
      .where('used_at', '==', null)
      .get();

    if (codeSnap2.empty) {
      return res.status(400).json({ success: false, error: 'Code is invalid or already used.' });
    }

    const matchDoc = codeSnap2.docs[0];
    const matchData = matchDoc.data();

    if (matchData.expires_at < nowIso) {
      return res.status(400).json({ success: false, error: 'Code has expired.' });
    }

    // 2. Find and update the user
    const userSnap = await db.collection('registrations')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (userSnap.empty) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const userDoc = userSnap.docs[0];
    const userDocId = userDoc.id;
    const userData = userDoc.data();

    // Update password
    await db.collection('registrations').doc(userDocId).update({
      password: newPassword,
      updated_at: nowIso
    });

    // 3. Mark code as used
    await db.collection('password_reset_codes').doc(matchDoc.id).update({
      used_at: nowIso
    });

    // 4. Send Confirmation Email (Optional)
    try {
      const { sendPasswordChangedEmail } = require('./services/emailService');
      await sendPasswordChangedEmail(email, userData.full_name || 'User');
    } catch (mailErr) {
      console.error('Email error:', mailErr.message);
    }

    return res.json({ success: true, message: 'Password reset successful! Please login now.' });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, error: 'Server error during password reset.' });
  }
});

// --- CATCH-ALL ROUTE ---
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});