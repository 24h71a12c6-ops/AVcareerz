# AVcareerz Registration System - Comprehensive Technical Deep-Dive Analysis

**Document Date:** June 3, 2026  
**Analysis Scope:** Frontend Form Flow → Backend API → Database → Email Integration

---

## EXECUTIVE SUMMARY

The AVcareerz registration system is a **two-step hybrid architecture**:
- **Frontend:** HTML/JavaScript with Firebase & Firestore integration
- **Backend:** Node.js Express server (production) + PHP API (legacy/fallback)
- **Database:** Google Firestore (primary)
- **Email Service:** Brevo (Sendinblue) with SMTP API fallback

The flow spans `form.html` (Step 1) → `next-form.html` (Step 2) → API submission → Firestore persistence → Email notifications.

---

# 1. FRONTEND FORM FLOW

## 1.1 Primary Form: `next-form.html`

**File Location:** [Frontend/next-form.html](Frontend/next-form.html)

### Form Identification
- **Form ID:** `academicForm` (Line 944)
- **Form Type:** Step 2 registration form (additional academic details)
- **Submission Handler:** `submitNextForm()` function (Line 1539)

### Form HTML Structure
```html
<form id="academicForm">
  <!-- Academic fields: dob, gender, nationality, etc. -->
  <!-- File uploads: resume, transcripts, passportCopy, testScoreCard -->
  <!-- Declaration checkbox required -->
</form>
```

### JavaScript Submission Handler: `submitNextForm()`

**Location:** [Frontend/next-form.html](Frontend/next-form.html#L1539) (Lines 1539-1673)

**Key Logic Flow:**
1. Validates declaration checkbox is checked (line 1545-1550)
2. Validates form using `reportValidity()` (line 1555-1560)
3. Collects form data into `savedData` object (line 1562-1567)
4. Normalizes email from localStorage/form (line 1568-1573)
5. Saves to localStorage/sessionStorage as backup (line 1575-1579)
6. Prepares file summaries (line 1590-1595)
7. **Direct Firestore save** via `saveFormSubmission()` (line 1597-1605)
8. **Constructs API payload** with form data (line 1607-1613)
9. **POSTs to backend API** at `/api/register` endpoint (line 1615-1620)
10. On success: Sets completion flags + redirects to `congrats.html` (line 1638-1650)

### Critical Code Section

```javascript
async function submitNextForm() {
    // 1. Validation
    if (!declaration.checked) {
        declarationError.style.display = 'block';
        return;
    }
    
    // 2. Collect Form Data
    const formData = new FormData(academicForm);
    const savedData = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        const text = String(value ?? '').trim();
        if (text) savedData[key] = text;
    }
    
    // 3. Get User ID / Email
    const email = String(localStorage.getItem('userEmail') || 
                  savedData.email || '').trim().toLowerCase();
    const currentUserId = String(localStorage.getItem('currentUserId') || 
                         sessionStorage.getItem('currentUserId') || '').trim();
    const submissionId = currentUserId || email;
    
    // 4. Save to Firestore
    await window.saveFormSubmission('applications', submissionId, {
        ...savedData,
        email,
        userId: submissionId,
        stage: 'step2',
        submittedFrom: 'next-form'
    });
    
    // 5. POST to Backend API
    const response = await fetch(apiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
    });
    
    // 6. Handle Response
    const mailResult = await response.json();
    if (!response.ok || !mailResult?.success) {
        throw new Error(mailResult?.error || 'Step 2 email sync failed.');
    }
    
    // 7. Set Completion Flags
    localStorage.setItem('formSubmittedSuccessfully', 'true');
    localStorage.setItem('isApplicationDone', 'true');
    localStorage.setItem('applicationCompleted', '1');
    
    // 8. Redirect to Congrats
    window.location.replace('congrats.html');
}
```

### API URL Construction

**Location:** [Frontend/next-form.html](Frontend/next-form.html#L1336) (Lines 1336-1345)

```javascript
const API_BASE_URL = (() => {
    try {
        const override = String(window.__BACKEND_BASE_URL || '').trim();
        if (override) return override.replace(/\/+$/, '');
    } catch {}
    return 'https://avcareerz.com'; // Production default
})();

const apiUrl = (path) => {
    const p = String(path || '');
    if (!API_BASE_URL) return p;
    return `${API_BASE_URL}${p.startsWith('/') ? p : `/${p}`}`;
};
```

**Default Endpoints:**
- **Production:** `https://avcareerz.com/api/register`
- **Localhost:** `http://127.0.0.1:8010/api/register`

### Form Fields Submitted

| Field Name | Type | Required | Notes |
|---|---|---|---|
| `fullName` | text | ✓ | Full name from Step 1 |
| `dob` | date | ✓ | Date of birth |
| `gender` | select | ✓ | M/F/Other |
| `nationality` | text | ✓ | Country |
| `phone` | tel | ✓ | 10-digit validation |
| `email` | email | ✓ | From localStorage |
| `city` | text | ✓ | City of residence |
| `passportStatus` | select | ✓ | Valid/Applied/None |
| `passport_id` | text | ✗ | If passport is Valid |
| `highestQualification` | select | ✓ | 10th/12th/Bachelor's/Master's |
| `preferredCountry` | select | ✓ | Destination country |
| `visaStatus` | select | ✓ | Valid/Applied/None |
| `visaType` | select | ✗ | Type (if valid) |
| `visaNumber` | text | ✗ | Visa document number |
| `levelOfStudy` | select | ✓ | Bachelor's/Master's/PhD |
| `preferredIntake` | select | ✓ | Fall/Winter/Spring |
| `desiredCourse` | text | ✗ | Course name |
| `declaration` | checkbox | ✓ | Must be checked |

---

# 2. BACKEND SERVER ARCHITECTURE

## 2.1 Node.js/Express Server

**File Location:** [includes/server.js](includes/server.js)

**Server Configuration:**
- **Framework:** Express.js
- **Port:** 10000 (configurable via `PORT` env var)
- **Database:** Google Firestore (admin SDK)
- **CORS:** Dynamic origin mirroring
- **File Upload:** Multer (memory storage)

### Environment Loading

**Location:** [includes/server.js](includes/server.js#L1-L20)

```javascript
const { loadEnv } = require('./utils/loadEnv');
const isRender = Boolean(process.env.RENDER);
const isProduction = process.env.NODE_ENV === 'production';
loadEnv(path.join(__dirname, '.env'), { 
    override: !(isRender || isProduction) 
});
```

**Loaded from:** `.env` file in includes folder

### Firestore Connection

**File Location:** [includes/config/firebaseClient.js](includes/config/firebaseClient.js)

```javascript
const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS env var required');
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
});

const db = admin.firestore();
module.exports = db;
```

**Collections Used:**
- `registrations` - Step 1 registration data
- `next_form` - Step 2 academic data
- `users` - Google Sign-In profiles
- `login_details` - Login audit trail
- `password_reset_codes` - Password reset tokens
- `sign_in_with_google` - Google authentication records

---

## 2.2 API Endpoints

### Complete Endpoint Mapping

| Method | Endpoint | Purpose | Handler |
|--------|----------|---------|---------|
| GET | `/health` | Server status check | Line 211 |
| POST | `/api/register` (Step 1) | Initial registration | Line 221 |
| PUT | `/api/update-registration` | Edit registration data | Line 316 |
| POST | `/api/forgot-password` | Request password reset | Line 401 |
| POST | `/api/register` (Step 2) | Academic data + file uploads | Line 431 |
| POST | `/api/login` | User login | Line 708 |
| POST | `/api/google-signin` | Google authentication | Line 817 |
| GET | `/api/check-application-status` | Check if application complete | Line 960 |
| GET | `/api/check-user-status` | Check registration/application status | Line 975 |
| POST | `/api/verify-reset-code` | Validate password reset code | Line 1017 |
| POST | `/api/partial-lead` | Capture partial form exit data | Line 1045 |
| POST | `/api/reset-password` | Reset password with code | Line 1074 |
| GET | `/*` | Serve static files (frontend) | Line 1154 |

### Registration Endpoints (CRITICAL)

#### Endpoint 1: `/api/register` - Step 1 (Initial Registration)

**Method:** POST  
**Location:** [includes/server.js](includes/server.js#L221-L306)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Registration successful!",
  "userId": "generated_firestore_doc_id"
}
```

**Key Logic:**
1. Validates all 4 required fields (lines 224-227)
2. Normalizes email to lowercase (line 229)
3. **Duplicate check** - queries `email_lc` field (lines 232-240)
4. If duplicate found: returns 409 status with error (line 242)
5. **Firestore insert** with generated doc ID (lines 245-254)
6. **Sends 2 emails:**
   - Admin notification (lines 265-273)
   - User confirmation (lines 276-283)
7. **WhatsApp notification** to admin (lines 285-290)
8. Returns userId for client storage (lines 292-298)

#### Endpoint 2: `/api/register` - Step 2 (Academic Data)

**Method:** POST  
**Location:** [includes/server.js](includes/server.js#L431-L700)

**Request Body:**
```json
{
  "userId": "firestore_doc_id",
  "email": "john@example.com",
  "fullName": "John Doe",
  "dob": "2001-05-15",
  "gender": "M",
  "nationality": "India",
  "phone": "9876543210",
  "city": "Bangalore",
  "passportStatus": "Valid",
  "passport_id": "A12345678",
  "highestQualification": "Bachelor's",
  "preferredCountry": "Australia",
  "visaStatus": "Applied",
  "visaType": "Student Visa",
  "levelOfStudy": "Master's",
  "preferredIntake": "Fall",
  "desiredCourse": "Computer Science",
  "declaration": 1
}
```

**File Uploads (Multipart):**
- `resume` - CV/Resume document
- `transcripts` - Academic transcripts
- `passportCopy` - Passport scan
- `testScoreCard` - IELTS/TOEFL/GRE scores

**Key Logic:**
1. Validates all required fields (lines 459-489)
2. Uses `userId` OR email lookup to find registration record (lines 491-514)
3. Validates duplicate prevention for email changes (lines 527-533)
4. **Inserts into `next_form` collection** (lines 580-598)
5. **Updates `registrations` collection** with `fully_registered` status (lines 601-627)
6. **Sends 2 emails:**
   - Admin detailed notification (lines 655-678)
   - User confirmation (line 689)
7. Returns success (lines 697-702)

**File Handling:**
- Uses Multer for multipart form-data parsing (lines 432-439)
- Files stored in memory (not disk)
- File metadata captured: name, MIME type, size (line 546-551)
- Files converted to buffer for Firestore storage

---

# 3. DATABASE LOGIC - FIRESTORE

## 3.1 The `upsert_registration` Function

**File Location:** [public_html/api/index.php](public_html/api/index.php#L192-L224)

**This is the PHP backend's registration function** - for reference/fallback purposes.

```php
function upsert_registration(array $data, bool $isUpdate = false): array
{
    // 1. Normalize email to lowercase
    $email = normalize_email((string) ($data['email'] ?? ''));
    
    // 2. Build registration record
    $record = [
        'full_name' => (string) ($data['fullName'] ?? $data['full_name'] ?? ''),
        'email' => (string) ($data['email'] ?? ''),
        'email_lc' => $email,  // Lowercase for case-insensitive queries
        'phone' => (string) ($data['phone'] ?? ''),
        'password' => (string) ($data['password'] ?? ''),
        'service' => (string) ($data['service'] ?? $data['preferredCountry'] ?? ''),
        'preferred_country' => (string) ($data['preferredCountry'] ?? 
                               $data['preferred_country'] ?? ''),
        'source' => (string) ($data['source'] ?? 'Website'),
        'registration_status' => (string) ($data['registration_status'] ?? 'step1_completed'),
        'updated_at' => now_iso(),
        'created_at' => (string) ($data['created_at'] ?? now_iso()),
    ];
    
    // 3. Determine document ID
    $documentId = '';
    if ($isUpdate && !empty($data['userId'])) {
        $documentId = trim((string) $data['userId']);
    }
    
    if ($documentId === '') {
        $documentId = $email;  // Use email as fallback ID
    }
    
    if ($documentId === '') {
        $documentId = bin2hex(random_bytes(8));  // Generate random ID
    }
    
    // 4. Store in Firestore (registrations collection)
    return firestore_set_document('registrations', $documentId, $record);
}
```

### Key Points

1. **Email Normalization:** `email_lc` field stores lowercase email for case-insensitive lookups
2. **No __name__ field removal:** The PHP function doesn't explicitly remove `__name__`, but the JavaScript/Node.js code does via `firestore_document_payload()` which filters out fields starting with `__`
3. **Document ID Strategy:**
   - Priority 1: Use provided `userId` (if update)
   - Priority 2: Use email address
   - Priority 3: Generate random 8-byte hex string
4. **Status Tracking:** `registration_status` field marks progress: `step1_completed` or `fully_registered`
5. **Timestamps:** ISO 8601 format UTC

### Firestore Document Structure

**Collection: `registrations`**
```json
{
  "id": "user@example.com",
  "full_name": "John Doe",
  "email": "user@example.com",
  "email_lc": "user@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "service": "Australia",
  "preferred_country": "Australia",
  "source": "Website",
  "registration_status": "fully_registered",
  "updated_at": "2026-06-03T14:30:00Z",
  "created_at": "2026-06-03T10:15:00Z"
}
```

**Collection: `next_form`**
```json
{
  "id": "auto_generated_doc_id",
  "user_id": "user@example.com",
  "fullName": "John Doe",
  "email": "user@example.com",
  "email_lc": "user@example.com",
  "dob": "2001-05-15",
  "gender": "M",
  "nationality": "India",
  "phone": "9876543210",
  "city": "Bangalore",
  "passportStatus": "Valid",
  "passport_id": "A12345678",
  "highestQualification": "Bachelor's",
  "preferredCountry": "Australia",
  "visaStatus": "Applied",
  "visaType": "Student Visa",
  "levelOfStudy": "Master's",
  "preferredIntake": "Fall",
  "desiredCourse": "Computer Science",
  "declaration": 1,
  "uploaded_files": {
    "resume": { "original_name": "john_resume.pdf", "mime_type": "application/pdf", "size": 245678 },
    "transcripts": { "original_name": "transcripts.pdf", "mime_type": "application/pdf", "size": 156234 }
  },
  "created_at": "2026-06-03T14:35:00Z",
  "updated_at": "2026-06-03T14:35:00Z"
}
```

---

# 4. EMAIL INTEGRATION - BREVO (CRITICAL)

## 4.1 Email Service Overview

**File Location:** [includes/services/emailService.js](includes/services/emailService.js)

**Primary Email Provider:** Brevo (formerly Sendinblue) via SMTP API

### Brevo Configuration

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L1-L50)

```javascript
const DEFAULT_BREVO_SENDER_EMAIL = 'info@avcareerz.com';
const DEFAULT_LOGO_URL = 'https://avcareerz.com/images/logonew.png';

function getEnvString(name) {
  return String(process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

// Primary Email Function - Uses Brevo
const sendEmail = async ({ to, subject, html }) => {
  const brevoKey = getEnvString('BREVO_API_KEY');
  const brevoSender = getEnvString('BREVO_SENDER_EMAIL') || 
                      DEFAULT_BREVO_SENDER_EMAIL;
  
  if (!brevoKey || !brevoSender) {
    throw new Error('Brevo not configured; set BREVO_API_KEY and BREVO_SENDER_EMAIL');
  }
  
  return sendBrevoEmail({ to, subject, html });
};
```

### Brevo SMTP API Call

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L23-L68)

```javascript
const sendBrevoEmail = async ({ to, subject, html }) => {
  const apiKey = getEnvString('BREVO_API_KEY');
  const senderEmail = getEnvString('BREVO_SENDER_EMAIL') || DEFAULT_BREVO_SENDER_EMAIL;
  const senderName = getEnvString('BREVO_SENDER_NAME') || 'avcareerz';
  
  if (!apiKey || !senderEmail) {
    throw new Error('Missing BREVO_API_KEY or BREVO_SENDER_EMAIL');
  }
  
  const payload = {
    sender: { 
      email: senderEmail, 
      name: senderName 
    },
    to: Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }],
    subject,
    htmlContent: html
  };
  
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    return response.data;
    
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('Brevo send error:', { status, data, message: err?.message });
    throw err;
  }
};
```

**Brevo Endpoint:** `https://api.brevo.com/v3/smtp/email`

**API Key Location:** Environment variable `BREVO_API_KEY`

---

## 4.2 Email Functions

### Function 1: `sendConfirmationEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L137-L217)

**Purpose:** Send registration confirmation to user

**Called From:**
- Step 1 registration: [server.js line 282](includes/server.js#L282)
- Step 2 registration: [server.js line 689](includes/server.js#L689)
- Login confirmation: [server.js line 781](includes/server.js#L781)

**Key Logic:**
```javascript
const sendConfirmationEmail = async (userEmail, userName, 
                                     customMessage, extra = {}) => {
  // Skip if email is an admin address
  const adminList = getAdminEmailList();
  if (adminList.includes(String(userEmail || '').trim())) {
    console.log('Confirmation email skipped for admin address');
    return true;
  }
  
  // Build HTML with personalization
  const safeName = escapeHtml(userName || '');
  const safeMessage = customMessage ? escapeHtml(customMessage) : '';
  const safePreferredCountry = extra?.preferredCountry ? 
                               escapeHtml(extra.preferredCountry) : '';
  
  const html = `<!DOCTYPE html>...`; // HTML template
  
  await sendEmail({
    to: userEmail,
    subject: 'AVcareerz - Registration Successful',
    html
  });
  
  return true;
};
```

**Email Template Features:**
- AVcareerz logo header
- Personalized greeting
- Success message
- Dream destination (if provided)
- Desired course (if provided)
- Next steps section
- Footer with branding

### Function 2: `sendAdminEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L291-L371)

**Purpose:** Notify admins of new registrations/applications

**Called From:**
- Step 1 registration: [server.js line 267](includes/server.js#L267)
- Step 2 registration: [server.js line 657](includes/server.js#L657)
- Google Sign-In: [server.js line 857](includes/server.js#L857)

**Key Logic:**
```javascript
const sendAdminEmail = async (user, customSubject = null) => {
  const rows = [];
  
  // Build dynamic table from all user properties
  Object.entries(user || {}).forEach(([key, value]) => {
    if (!key) return;
    const keyLower = String(key).toLowerCase();
    
    // Skip passwords
    if (keyLower.includes('password')) return;
    if (value === null || value === undefined) return;
    
    // Build table row
    rows.push(`<tr>
      <td>${escapeHtml(titleize(key))}</td>
      <td>${escapeHtml(String(value))}</td>
    </tr>`);
  });
  
  const html = `<!DOCTYPE html>...<table>${rows.join()}</table>...`;
  
  const adminList = getAdminEmailList();
  const adminTo = adminList.length > 0 ? adminList : 'info@avcareerz.com';
  
  return sendEmail({
    to: adminTo,
    subject: customSubject || `New Registration: ${user?.fullName || 'New Lead'}`,
    html
  });
};
```

**Admin Recipients:**
- Primary: `ADMIN_EMAIL` env var
- Secondary: `ADMIN_EMAILS` env var (comma-separated)
- Fallback: `info@avcareerz.com`

### Function 3: `sendLeadNotificationEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L86-L136)

**Purpose:** Send quick notifications for partial lead captures (form exits)

**HTML Template:** Shows lead details in formatted table

### Function 4: `sendPasswordResetCodeEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L373-L388)

**Purpose:** Send password reset code (6-digit)

**Template:** Large highlighted code display + 5-minute expiry notice

### Function 5: `sendGoogleSignInSuccessEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L219-L289)

**Purpose:** Confirm Google Sign-In authentication

**Template:** Welcome message + sign-in details + next steps

### Function 6: `sendPasswordChangedEmail()`

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L390-L410)

**Purpose:** Confirm password change

**Template:** Simple confirmation + security notice

---

## 4.3 Email Module Exports

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L441-L448)

```javascript
module.exports = {
  sendEmail,
  sendConfirmationEmail,
  sendGoogleSignInSuccessEmail,
  sendAdminEmail,
  sendPasswordResetCodeEmail,
  sendPasswordChangedEmail,
  sendLoginCodeEmail,
  sendLeadNotificationEmail,
};
```

---

# 5. CONFIGURATION & API KEYS

## 5.1 Environment Configuration

**Location:** [includes/.env.example](includes/.env.example)

### Brevo Configuration
```env
# Brevo (Sendinblue) API key and verified sender
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=info@avcareerz.com
BREVO_SENDER_NAME="AVcareerz"

# Optional public logo URL used in emails
EMAIL_LOGO_URL=https://avcareerz.com/images/logonew.png
```

### Admin Configuration
```env
# Admin receiving email(s) - comma separated
ADMIN_EMAIL=info@avcareerz.com
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Legacy Gmail SMTP fallback
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=yourgmailapppassword
```

### Server Configuration
```env
PORT=10000
FRONTEND_URL=https://avcareerz.com
NODE_ENV=production
```

### Firebase/Firestore
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### Password Reset
```env
RESET_PASSWORD_PEPPER=secret
RESET_CODE_TTL_MINUTES=15
```

### WhatsApp Notifications
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
ADMIN_WHATSAPPS=+917036777567
```

---

## 5.2 How Brevo API Key is Accessed

**At Runtime:**

```javascript
// From emailService.js
function getEnvString(name) {
  return String(process.env[name] || '').trim().replace(/^['"]|['"]$/g, '');
}

// When sending email:
const apiKey = getEnvString('BREVO_API_KEY');

// In Axios call:
headers: {
  'api-key': process.env.BREVO_API_KEY,
  'Content-Type': 'application/json'
}
```

---

# 6. ERROR HANDLING

## 6.1 Frontend Error Handling

### Form Submission Errors (next-form.html)

**Location:** [Frontend/next-form.html](Frontend/next-form.html#L1539-L1673)

```javascript
try {
    // ... Form submission
    const response = await fetch(apiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
    });
    
    const mailResult = await response.json().catch(() => ({}));
    
    if (!response.ok || !mailResult?.success) {
        throw new Error(mailResult?.error || 'Step 2 email sync failed.');
    }
    
} catch (error) {
    console.warn('Could not save next-form data:', error);
    
    successMessage.textContent = 'Submit failed. Please try again.';
    successMessage.style.color = '#ef4444';
    successMessage.style.display = 'block';
    
    if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
    return;
}
```

**Error Display:**
- Red error message in `#successMessage` element
- Submit button re-enabled for retry
- Original button text restored

### Validation Errors

1. **Declaration Checkbox:** Line 1545-1550
   - Error div: `#declarationError`
   - Message: "Please confirm the declaration"

2. **Required Fields:** Line 1555-1560
   - Uses HTML5 `reportValidity()`
   - Native browser validation messages

---

## 6.2 Backend Error Handling

### Step 1 Registration Errors (server.js)

**Location:** [includes/server.js](includes/server.js#L221-L306)

```javascript
try {
    const { fullName, email, phone, password } = req.body;
    
    // 1. Field validation
    if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'All fields are required' 
        });
    }
    
    // 2. Email validation
    const emailLc = String(email).trim().toLowerCase();
    
    // 3. Duplicate check
    let existing = await db.collection('registrations')
        .where('email_lc', '==', emailLc)
        .limit(1)
        .get();
    
    if (!existing.empty) {
        return res.status(409).json({ 
            success: false, 
            error: 'This email is already registered' 
        });
    }
    
    // 4. Database operation
    const ref = await db.collection('registrations').add({ ... });
    
} catch (error) {
    console.error('Reg Error:', error);
    return res.status(500).json({ 
        success: false, 
        error: 'Registration failed: ' + error.message 
    });
}
```

**HTTP Status Codes:**
- `400`: Bad Request (missing fields)
- `409`: Conflict (duplicate email)
- `500`: Server Error

### Email Service Error Handling

**Location:** [includes/services/emailService.js](includes/services/emailService.js#L23-L68)

```javascript
try {
    const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        payload,
        {
            headers: { 'api-key': process.env.BREVO_API_KEY, ... },
            timeout: 15000
        }
    );
    
    return response.data;
    
} catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    
    console.error('Brevo send error:', {
        status,
        data,
        message: err?.message
    });
    
    throw err;
}
```

**Errors Logged:**
- HTTP status code
- Response body from Brevo
- Error message

**Non-Fatal:** Email failures in registration don't block the registration response - they're wrapped in try-catch (server.js line 264-274)

---

## 6.3 Partial Lead Capture (Graceful Degradation)

**Location:** [includes/server.js](includes/server.js#L1045-L1070)

```javascript
app.post('/api/partial-lead', express.text({ type: '*/*' }), async (req, res) => {
    try {
        let data = {};
        if (typeof req.body === 'string') {
            try {
                data = JSON.parse(req.body || '{}');
            } catch {
                data = {};
            }
        }
        
        sendInstantAlert('partial', {
            fullName: data.fullName || data.name,
            phone: data.phone,
            email: data.email,
            source: data.source || 'User Exit',
            url: data.url
        });
        
        return res.sendStatus(200);
        
    } catch (error) {
        console.error('Error processing lead:', error?.message);
        return res.sendStatus(500);
    }
});
```

**Purpose:** Capture incomplete form data when user exits without submitting

---

# 7. CONNECTION MAP - REQUEST/RESPONSE FLOW

## 7.1 Step 1 Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (form.html)                       │
│                                                               │
│  User fills: fullName, email, phone, password               │
│  Clicks "Register" → submitForm() handler                   │
│  fetch(apiUrl('/api/register'), POST, JSON)                │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST
                      │ Body: {fullName, email, phone, password}
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS SERVER (server.js:221)                  │
│                                                               │
│  app.post('/api/register')                                  │
│  ├─ Validate fields                                          │
│  ├─ Normalize email_lc                                       │
│  ├─ Check duplicate in DB                                   │
│  ├─ INSERT into Firestore('registrations')                  │
│  ├─ Send admin email (emailService.js)                      │
│  ├─ Send user confirmation email                            │
│  └─ Send WhatsApp alert                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 201 JSON
                      │ {success: true, userId: "xxx"}
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (form.html)                       │
│                                                               │
│  Response handler:                                           │
│  ├─ Store userId in localStorage                            │
│  ├─ Store email in localStorage                             │
│  ├─ Redirect to next-form.html                              │
│  └─ Trigger partial-lead capture (if not submitted)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.2 Step 2 Registration + Email Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  BROWSER (next-form.html)                    │
│                                                               │
│  User fills academic data + uploads files                   │
│  Clicks "Submit" → submitNextForm()                         │
│  ├─ Validate declaration checkbox                           │
│  ├─ Save to localStorage (backup)                           │
│  ├─ Save directly to Firestore('applications')              │
│  └─ fetch(apiUrl('/api/register'), POST, JSON)             │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP POST
                      │ Body: {userId, email, fullName, dob, ...}
                      │       (FormData with files)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         EXPRESS SERVER MULTIPART (server.js:431)             │
│                                                               │
│  app.post('/api/register', upload.fields([...]))            │
│  ├─ Parse multipart form-data (Multer)                      │
│  ├─ Validate all required fields                            │
│  ├─ File metadata extraction                                │
│  ├─ INSERT into Firestore('next_form')                      │
│  ├─ UPDATE Firestore('registrations')                       │
│  │   registration_status = 'fully_registered'               │
│  ├─ Send admin email (all details)                          │
│  ├─ Send user confirmation email                            │
│  └─ Return {success: true}                                  │
│                                                               │
│  Email Trigger 1: sendAdminEmail()                          │
│  ├─ Connect to Brevo API                                    │
│  ├─ Build HTML table from all fields                        │
│  ├─ POST to https://api.brevo.com/v3/smtp/email             │
│  └─ Return success/error                                    │
│                                                               │
│  Email Trigger 2: sendConfirmationEmail()                   │
│  ├─ Check if user is admin → skip if yes                    │
│  ├─ Build personalized HTML                                 │
│  ├─ POST to Brevo API                                       │
│  └─ Return true (success)                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP 200 JSON
                      │ {success: true, message: "Step 2 completed"}
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  BROWSER (next-form.html)                    │
│                                                               │
│  Response handler:                                           │
│  ├─ Set completion flags in localStorage                    │
│  ├─ Clear pending step markers                              │
│  └─ Redirect to congrats.html                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.3 Brevo Email Sending Details

```
┌─────────────────────────────────────────┐
│   Node.js sendAdminEmail() Function      │
│                                           │
│  ├─ Get BREVO_API_KEY from env           │
│  ├─ Get BREVO_SENDER_EMAIL from env      │
│  ├─ Build JSON payload                   │
│  │   {                                    │
│  │     sender: {email, name},             │
│  │     to: [{email: recipient}],          │
│  │     subject: "...",                    │
│  │     htmlContent: "<html>..."           │
│  │   }                                    │
│  └─ Call sendBrevoEmail()                │
└──────────────┬──────────────────────────┘
               │ HTTPS POST
               │ Headers:
               │   - api-key: BREVO_API_KEY
               │   - Content-Type: application/json
               │
               ▼
┌──────────────────────────────────────────────────────┐
│     BREVO API: https://api.brevo.com/v3/smtp/email   │
│                                                       │
│  Authentication: API Key in header                  │
│  Method: POST                                        │
│  Timeout: 15 seconds                                 │
│                                                       │
│  Response: HTTP 200 + JSON                          │
│  {                                                   │
│    "messageId": "uuid-string",                       │
│    "code": "success",                                │
│    "body": "Email queued"                            │
│  }                                                   │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼ (Email sent via Brevo infrastructure)
              INBOX
```

---

# 8. SUMMARY TABLE

| Component | Location | Status |
|-----------|----------|--------|
| **Frontend Step 1** | [Frontend/form.html](Frontend/form.html) | Active |
| **Frontend Step 2** | [Frontend/next-form.html](Frontend/next-form.html) | Active |
| **API - Node.js** | [includes/server.js](includes/server.js) | **PRIMARY** |
| **API - PHP** | [public_html/api/index.php](public_html/api/index.php) | Fallback |
| **Database** | Google Firestore | Active |
| **Email Service** | [includes/services/emailService.js](includes/services/emailService.js) | Brevo API |
| **Config** | [includes/.env.example](includes/.env.example) | Template |
| **Firestore Client** | [includes/config/firebaseClient.js](includes/config/firebaseClient.js) | Active |

---

# 9. CRITICAL FINDINGS

## ✅ Strengths

1. **Dual Backend Support:** Both Node.js (primary) and PHP (fallback) backends
2. **Brevo Integration:** Industry-standard transactional email service
3. **Two-Step Validation:** Form + declaration checkbox + server validation
4. **Firestore Backup:** Client-side save before API submission
5. **Error Recovery:** Try-catch blocks with graceful degradation
6. **Admin Notifications:** Real-time alerts on new registrations
7. **Case-Insensitive Lookups:** `email_lc` field prevents duplicate accounts

## ⚠️ Areas to Monitor

1. **API Key Exposure:** BREVO_API_KEY must never be committed to version control
2. **Email Failure Handling:** Non-fatal in registration flow but should be monitored
3. **File Upload Size:** No explicit max size limits in current code
4. **Partial Lead Capture:** Relies on `navigator.sendBeacon()` which is best-effort
5. **Password Storage:** Verify if passwords are hashed before Firestore storage

## 🔒 Security Considerations

1. **CORS:** Dynamic origin mirroring (permissive)
2. **Password Reset:** 6-digit codes with 15-minute expiry
3. **Email Validation:** Basic FILTER_VALIDATE_EMAIL in PHP
4. **Admin Email Filtering:** Password fields never shown in admin emails
5. **SQLi/XSS:** Minimal risk (using Firestore, not SQL; HTML escaping in place)

---

# 10. GLOSSARY

- **Brevo:** Email service provider (formerly Sendinblue)
- **Firestore:** Google Cloud document database (NoSQL)
- **Multer:** Express middleware for file uploads
- **sendBeacon:** Browser API for reliable background HTTP requests
- **CORS:** Cross-Origin Resource Sharing (headers)
- **Render:** Cloud hosting platform (detects via process.env.RENDER)
- **email_lc:** Lowercase email field for case-insensitive queries
- **registration_status:** Enum marking progress: step1_completed / fully_registered

---

**End of Document**  
**Generated:** June 3, 2026  
**Author:** Technical Analysis System
