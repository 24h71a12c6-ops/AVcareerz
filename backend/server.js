const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const { exec } = require('child_process');

const { loadEnv } = require('./utils/loadEnv');

// Env loading logic
loadEnv(path.join(__dirname, '.env'), { override: true });
const pool = require('./config/db');
const { sendConfirmationEmail, sendAdminEmail, sendPasswordResetCodeEmail, sendPasswordChangedEmail } = require('./services/emailService');
const { sendAdminWhatsApp } = require('./services/whatsappService');

const app = express();

const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage() });


// --- DATABASE INITIALIZATION ---
async function initializeDatabase() {
    try {
        const createRegistrationsTable = `
            CREATE TABLE IF NOT EXISTS registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(15) NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_created_at (created_at)
            );
        `;
        await pool.query(createRegistrationsTable);

        const createLoginsTable = `
            CREATE TABLE IF NOT EXISTS logins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(150) DEFAULT NULL,
                password VARCHAR(255) NOT NULL,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES registrations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await pool.query(createLoginsTable);

        const createResetTable = `
            CREATE TABLE IF NOT EXISTS password_reset_codes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                code_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_prc_email (email),
                INDEX idx_prc_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await pool.query(createResetTable);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    }
}

// Initialize DB immediately
initializeDatabase();


// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DYNAMIC PATH RESOLUTION (FIX FOR RENDER) ---
// Ikkada server ki Frontend folder ekkada undo clear ga cheptham
const frontendPath = fs.existsSync(path.join(__dirname, 'Frontend')) 
    ? path.join(__dirname, 'Frontend') 
    : path.join(__dirname, '..', 'Frontend');

console.log('✓ Frontend path resolved to:', frontendPath);

// --- STATIC FILES (ORDER MATTERS!) ---
// 1. First, specifically serve images
app.use('/images', express.static(path.join(frontendPath, 'images')));

// 2. Then serve the rest of the frontend (HTML, CSS, JS)
app.use(express.static(frontendPath));


// --- API ROUTES ---

// Health Check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
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

        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await pool.query(
            'INSERT INTO registrations (full_name, email, phone, password) VALUES (?, ?, ?, ?)',
            [fullName, email, phone, hashedPassword]
        );

        const userId = result.insertId;
            // WhatsApp admin notification
            try {
                await sendAdminWhatsApp(`New registration: ${fullName} (${email}, ${phone})`);
            } catch (err) {
                console.warn('WhatsApp admin notification failed:', err);
            }
            res.status(201).json({ success: true, message: 'Registration successful!', userId });
    } catch (error) {
        console.error('Reg Error:', error);
        // Handle duplicate email error
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
            return res.status(409).json({ success: false, error: 'This email is already registered. Please log in.' });
        }
        res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
    }
});
// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 DEBUG: Password reset code for ${email}: ${code}`); // Log code to console for debugging

    const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
        await pool.query(
            'INSERT INTO password_reset_codes (email, code_hash, expires_at) VALUES (?, ?, ?)',
            [email, codeHash, expiresAt]
        );

        const sentResult = await sendPasswordResetCodeEmail(email, code);
        if (sentResult && sentResult.success) {
            return res.json({ success: true, message: 'If your email exists, a code has been sent.' });
        }
        
        console.error('Email sending result:', sentResult);
        const errorMsg = sentResult?.error || 'Unknown email service error';
        return res.status(500).json({ success: false, error: 'Email service failed: ' + errorMsg });
    } catch (error) {
        console.error('Forgot password error details:', error.message, error.stack);
        return res.status(500).json({ success: false, error: 'Server error during password reset: ' + error.message });
    }
});
// Step 2: Additional academic data + uploads
app.post('/api/register-step2', upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'transcripts', maxCount: 1 },
    { name: 'passportCopy', maxCount: 1 },
    { name: 'testScoreCard', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
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

        if (!userId || !fullName || !dob || !gender || !nationality || !phone || !email || !city || !passportStatus || !passport_id || !highestQualification || !preferredCountry || !levelOfStudy || !preferredIntake || !desiredCourse || !declaration) {
            return res.status(400).json({ success: false, error: 'Missing required academic details' });
        }

        const files = req.files || {};
        const mapFile = (field) => (files[field] && files[field][0] ? files[field][0].buffer : null);
        const resumeBuffer = mapFile('resume');
        const transcriptsBuffer = mapFile('transcripts');
        const passportCopyBuffer = mapFile('passportCopy');
        const testScoreCardBuffer = mapFile('testScoreCard');
        const declarationFlag = ['1', 'true', 'on', 'yes'].includes(String(declaration).toLowerCase()) ? 1 : 0;

        await pool.query(
            `INSERT INTO next_form (
                registration_id,
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
                declaration,
                resume,
                transcripts,
                passportCopy,
                testScoreCard
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
                currentCourse || null,
                specialization || null,
                collegeName || null,
                yearOfPassing || null,
                cgpa || null,
                preferredCountry,
                levelOfStudy,
                coaching || null,
                preferredIntake,
                desiredCourse,
                budgetRange || null,
                fundingSource || null,
                loanStatus || null,
                declarationFlag,
                resumeBuffer,
                transcriptsBuffer,
                passportCopyBuffer,
                testScoreCardBuffer
            ]
        );

            // WhatsApp admin notification
            try {
                await sendAdminWhatsApp(`Step 2 completed for: ${fullName} (${email}, ${phone})`);
            } catch (err) {
                console.warn('WhatsApp admin notification failed:', err);
            }
            res.status(200).json({ success: true, message: 'Step 2 completed' });
    } catch (error) {
        console.error('Step 2 Error:', error);
        res.status(500).json({ success: false, error: 'Failed to process step 2 data' });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const [rows] = await pool.query('SELECT * FROM registrations WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Account not found. Please register first.' });
        }

        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid password' });
        }

        res.json({ 
            success: true, 
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
                        
        // Check if code exists and is valid (not expired)
        const [rows] = await pool.query(
            'SELECT * FROM password_reset_codes WHERE email = ? AND code_hash = ? AND expires_at > NOW() AND used_at IS NULL', 
            [email, codeHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid or expired code' });
        }

        res.json({ success: true, message: 'Code verified' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Verification failed' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const codeHash = crypto.createHash('sha256').update(code + process.env.RESET_PASSWORD_PEPPER).digest('hex');

        // 1. Verify code again
        const [codes] = await pool.query(
            'SELECT * FROM password_reset_codes WHERE email = ? AND code_hash = ? AND expires_at > NOW() AND used_at IS NULL', 
            [email, codeHash]
        );
        if (codes.length === 0) return res.status(400).json({ success: false, error: 'Invalid code' });

        // 2. Check if user exists
        const [users] = await pool.query('SELECT * FROM registrations WHERE email = ?', [email]);
        if (users.length === 0) {
             return res.status(404).json({ success: false, error: 'No account found for this email' });
        }

        // 3. Update password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE registrations SET password = ? WHERE email = ?', [hashedPassword, email]);

        // 4. Mark code as used
        await pool.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [codes[0].id]);

        // 5. Send confirmation email (optional)
        try {
             await sendPasswordChangedEmail(email, users[0].full_name);
        } catch(e) { console.warn('Pwd change email failed', e); }

        res.json({ success: true, message: 'Password reset successful' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Reset failed' });
    }
});

// --- CATCH-ALL ROUTE (Mothaniki kindha undali idi) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});