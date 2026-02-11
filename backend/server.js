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
app.get('/health', (req, res) => {
    res.json({ ok: true, status: 'Live', timestamp: new Date() });
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
        res.status(201).json({ success: true, message: 'Registration successful!', userId });
    } catch (error) {
        console.error('Reg Error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
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
        const [rows] = await pool.query('SELECT * FROM registrations WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ success: false, error: 'User not found' });

        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Wrong password' });

        res.json({ success: true, user: { fullName: rows[0].full_name, email: rows[0].email } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Login failed' });
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