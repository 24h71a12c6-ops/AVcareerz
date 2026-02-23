

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { exec } = require('child_process');

const { loadEnv } = require('./utils/loadEnv');

// Env loading logic
loadEnv(path.join(__dirname, '.env'), { override: true });
const supabase = require('./config/supabaseClient');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage() });

// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
  try {
    // Check if registrations table exists by trying a simple query
    const { error } = await supabase
      .from('registrations')
      .select('count')
      .limit(1);

    if (!error) {
      console.log('✅ Database tables already initialized');
    } else {
      console.log('⚠️  Note: Create tables manually in Supabase dashboard or via migration tool');
    }
  } catch (error) {
    console.error('⚠️  Database check:', error.message);
  }
}

// Initialize DB immediately
initializeDatabase();

// --- MIDDLEWARES ---
app.use(cors());
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
    const { error } = await supabase.from('registrations').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ ok: true, status: 'Live', db: 'Connected', timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ ok: false, status: 'Live', db: 'Disconnected', error: err.message, timestamp: new Date() });
  }
});

// Registration API
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([{
        full_name: fullName,
        email: email,
        phone: phone,
        password: password
      }])
      .select();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({ success: false, error: 'This email is already registered. Please log in.' });
      }
      throw error;
    }

    res.status(201).json({ success: true, message: 'Registration successful!', userId: data[0].id });
  } catch (error) {
    console.error('Reg Error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
});

// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  try {
    // Check if user exists
    const { data: users, error: findError } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (findError || !users || users.length === 0) {
      return res.status(404).json({ success: false, error: 'Email not registered. Please sign up first.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 DEBUG: Password reset code for ${email}: ${code}`);

    const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000).toISOString(); // 1 minute

    const { error: insertError } = await supabase
      .from('password_reset_codes')
      .insert([{
        email: email,
        code_hash: codeHash,
        expires_at: expiresAt
      }]);

    if (insertError) throw insertError;

    // Send email
    const { sendLoginCodeEmail } = require('./services/emailService');
    await sendLoginCodeEmail(email, code);
    
    return res.json({ success: true, message: 'Code sent successfully via email.' });
  } catch (error) {
    console.error('Forgot password error details:', error.message, error.stack);
    return res.status(500).json({ success: false, error: 'Server error during password reset: ' + error.message });
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
        levelOfStudy,
        coaching,
        preferredIntake,
        desiredCourse,
        budgetRange,
        fundingSource,
        loanStatus,
        declaration
      } = req.body || {};

      // If userId is missing but email is provided, look up userId
      if (!userId && email) {
        const { data: users, error: lookupError } = await supabase
          .from('registrations')
          .select('id')
          .eq('email', email)
          .limit(1);

        if (!lookupError && users && users.length > 0) {
          userId = users[0].id;
        }
      }

      if (
        !userId ||
        !fullName ||
        !dob ||
        !gender ||
        !nationality ||
        !phone ||
        !email ||
        !city ||
        !passportStatus ||
        !passport_id ||
        !highestQualification ||
        !preferredCountry ||
        !levelOfStudy ||
        !preferredIntake ||
        !desiredCourse ||
        !declaration
      ) {
        return res.status(400).json({
          success: false,
          error: 'Missing required academic details'
        });
      }

      const files = req.files || {};
      const mapFile = (field) =>
        files[field] && files[field][0] ? files[field][0].buffer : null;

      const declarationFlag = ['1', 'true', 'on', 'yes'].includes(
        String(declaration).toLowerCase()
      ) ? 1 : 0;

      const { error } = await supabase
        .from('next_form')
        .insert([{
          user_id: userId,
          fullName,
          dob,
          gender,
          nationality,
          phone,
          email,
          city,
          passportStatus,
          passport_id: passport_id,
          highestQualification,
          currentCourse: currentCourse || null,
          specialization: specialization || null,
          collegeName: collegeName || null,
          yearOfPassing: yearOfPassing || null,
          cgpa: cgpa || null,
          preferredCountry,
          levelOfStudy,
          coaching: coaching || null,
          preferredIntake,
          desiredCourse,
          budgetRange: budgetRange || null,
          fundingSource: fundingSource || null,
          loanStatus: loanStatus || null,
          declaration: declarationFlag
        }]);

      if (error) throw error;

      try {
        const { sendAdminEmail } = require('./services/emailService');
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
          passport_id,
          highestQualification,
          currentCourse,
          specialization,
          collegeName,
          yearOfPassing,
          cgpa,
          preferredCountry,
          levelOfStudy,
          coaching,
          preferredIntake,
          desiredCourse,
          budgetRange,
          fundingSource,
          loanStatus,
          declaration: declarationFlag ? 'Yes' : 'No'
        });
      } catch (emailError) {
        console.error('Admin email error (step2):', emailError);
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

    const { data: rows, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Account not found. Please register first.' });
    }

    const isMatch = password === rows[0].password;
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    res.json({
      success: true,
      userId: rows[0].id,
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

// Verify Reset Code
app.post('/api/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');

    const { data: rows, error } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error || !rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired code' });
    }

    res.json({ success: true, message: 'Code verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');

    // Verify code
    const { data: codes, error: codeError } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid code or already used' });
    }

    // Check if user exists
    const { data: users, error: userError } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found for this email' });
    }

    // Update password (plain text)
    const { error: updateError } = await supabase
      .from('registrations')
      .update({ password: newPassword })
      .eq('email', email);

    if (updateError) throw updateError;

    // Mark code as used
    const { error: markError } = await supabase
      .from('password_reset_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codes[0].id);

    if (markError) throw markError;

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Reset failed' });
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