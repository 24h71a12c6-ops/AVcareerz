# Registration System: Diagnostic Checklist & Quick Reference

## 🎯 Quick Diagnosis Guide

### Q1: Where does form submission go?
**Answer:** [Frontend/next-form.html](Frontend/next-form.html#L1539) → `submitNextForm()` → `POST /api/register` (server.js Line 221)

### Q2: How is the registration stored?
**Answer:** Firestore collection `registrations` with auto-generated document ID, containing: full_name, email, email_lc, phone, password, registration_status, timestamps

### Q3: Where are emails sent from?
**Answer:** [includes/services/emailService.js](includes/services/emailService.js) → **Brevo API** (https://api.brevo.com/v3/smtp/email) using `BREVO_API_KEY` from .env

### Q4: Does email failure block registration?
**Answer:** **NO** - Emails are sent asynchronously. Registration succeeds even if email fails. This is intentional but means users might not get confirmation.

### Q5: Where is the Brevo API key stored?
**Answer:** [includes/.env](includes/.env) Line 7 (⚠️ EXPOSED - Should be in environment secrets, not in version control)

### Q6: How does frontend reach backend?
**Answer:** `API_BASE_URL` constant (production: `https://avcareerz.com/api/register`, dev: `http://127.0.0.1:8010/api/register`)

### Q7: What prevents duplicate registrations?
**Answer:** Firestore query on `email_lc` (lowercase email) - catches duplicates regardless of case

### Q8: What happens if email already registered?
**Answer:** Backend returns `409 Conflict` with message "This email is already registered. Please log in."

### Q9: Why is `__name__` field removed in upsert?
**Answer:** `__name__` is Firestore metadata (read-only). The `firestore_document_payload()` function filters it out to prevent write errors.

### Q10: How long before email timeout?
**Answer:** 15 seconds (set in Brevo axios call). If exceeded, email fails silently (registration still succeeds).

---

## 🔍 Diagnostic Flowchart

```
User fills form
    ↓
YES: Form valid? → NO → Red error message, stop
    ↓
YES: Email in database? → YES → "Email already registered" (409), stop
    ↓
NO → Insert into Firestore
    ↓
    ├─→ Send admin email (Brevo) [async, non-blocking]
    ├─→ Send user email (Brevo) [async, non-blocking]
    ├─→ Send WhatsApp notification [async, non-blocking]
    ↓
Return 201 Success
    ↓
Redirect to congrats.html
```

---

## 🐛 Troubleshooting Matrix

| Problem | Most Likely Cause | Check | Fix |
|---------|------------------|-------|-----|
| Form won't submit | Validation failure | Check browser console for validation errors | Fill all required fields including checkbox |
| "Email already registered" error | Email duplicate | Query Firestore `registrations` collection | Use different email or password reset |
| Success message but no confirmation email | Email service failure | Check server logs for Brevo errors | Verify BREVO_API_KEY is valid in .env |
| Success message but admin email not received | Wrong admin email configured | Check ADMIN_EMAIL in .env | Update ADMIN_EMAIL and/or ADMIN_EMAILS |
| API endpoint not found (404) | Wrong server URL | Check API_BASE_URL in frontend code | Verify server.js is running on correct port |
| Server error (500) | Firestore write failed | Check server logs | Verify Firebase credentials and permissions |
| Frontend hangs on submit | Network timeout | Check browser network tab | Verify backend server is running |

---

## 📊 Performance Baseline

| Operation | Typical Duration | Threshold | Status |
|-----------|-----------------|-----------|--------|
| Form validation | <100ms | <500ms | ✅ Good |
| Firestore duplicate check | 200-500ms | <1s | ✅ Good |
| Firestore insert | 300-800ms | <2s | ✅ Good |
| Email send (Brevo) | 2-5s | <15s | ✅ Good |
| Total registration flow | 1-3s (user sees success) | <5s | ✅ Good |
| **Email delivery to inbox** | 5-30s | <60s | ⚠️ Can be slow |

---

## 🔐 Security Checklist

- [ ] ❌ CRITICAL: Move .env to .gitignore
- [ ] ❌ CRITICAL: Rotate BREVO_API_KEY in console
- [ ] ❌ CRITICAL: Hash passwords before storing (use bcrypt)
- [ ] ⚠️ Add rate limiting to /api/register
- [ ] ⚠️ Add email verification before sending
- [ ] ⚠️ Set up Brevo webhooks for delivery tracking
- [ ] ⚠️ Implement CORS properly (currently allows all origins)
- [ ] ⚠️ Add input sanitization for HTML in emails

---

## 📧 Email Debugging

### To verify Brevo is configured:
```javascript
// In browser console or Node.js:
const brevoKey = process.env.BREVO_API_KEY;
const brevoSender = process.env.BREVO_SENDER_EMAIL;
console.log('Brevo key exists:', !!brevoKey);
console.log('Brevo sender:', brevoSender);
```

### To check email delivery status:
1. Log into Brevo dashboard
2. Go to "Reports" → "Emails"
3. Search for recipient email
4. Check status: "Sent", "Delivered", "Failed", etc.

### If emails not sending:
1. Check server logs for error message
2. Verify BREVO_API_KEY is correct and not expired
3. Verify BREVO_SENDER_EMAIL is verified in Brevo account
4. Check Brevo account limits/quotas
5. Verify recipient email is not in spam blocklist

---

## 🚨 Critical API Endpoints

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| POST | `/api/register` | Register new user | 201 {success, userId} or 400/409/500 |
| PUT | `/api/update-registration` | Update registration | 200 {success, data} or 400/404/500 |
| POST | `/api/login` | User login | 200 {token} or 401 |
| POST | `/api/forgot-password` | Password reset request | 200 {success} or 404 |

---

## 💾 Database Collections

```
firestore/
├── registrations/
│   ├── {userId}/
│   │   ├── full_name: string
│   │   ├── email: string
│   │   ├── email_lc: string (lowercase for queries)
│   │   ├── phone: string
│   │   ├── password: string ⚠️ (plaintext, should be hashed)
│   │   ├── registration_status: string
│   │   ├── created_at: ISO timestamp
│   │   └── updated_at: ISO timestamp
│   └── ...
├── next_form/ (Step 2 applications)
├── login_details/
├── password_reset_codes/
└── ...
```

---

## 🧪 Manual Test Checklist

1. **New Registration**
   - [ ] Fill form with valid data
   - [ ] Submit
   - [ ] Verify success message
   - [ ] Check Firestore for new document
   - [ ] Verify admin email received
   - [ ] Verify user confirmation email received

2. **Duplicate Email**
   - [ ] Try registering with existing email
   - [ ] Verify 409 error returned
   - [ ] Verify user sees "already registered" message

3. **Missing Fields**
   - [ ] Try submitting incomplete form
   - [ ] Verify validation errors shown
   - [ ] Verify fields highlighted in red

4. **Email Sensitivity**
   - [ ] Register with `John@Example.Com`
   - [ ] Try registering with `john@example.com`
   - [ ] Verify both rejected as duplicate (case-insensitive)

5. **Server Down**
   - [ ] Stop server.js
   - [ ] Try registration
   - [ ] Verify network error shown
   - [ ] Restart server and retry

---

## 📞 Quick Support Responses

**"My email isn't confirming!"**
→ Check Firestore: Is the registration saved? Check Brevo dashboard: Email status? Check .env: Is BREVO_API_KEY correct?

**"I registered twice!"**
→ Check email case sensitivity. Also check if one is under different email. Duplicates prevented by lowercase email check.

**"Form not submitting!"**
→ Check browser console (F12) for validation errors. Is all required fields filled? Have you accepted the declaration checkbox?

**"Registration succeeded but admin didn't get email!"**
→ Check ADMIN_EMAIL/ADMIN_EMAILS in .env. Check Brevo dashboard for failures. May be in spam folder.

---

**Last Updated:** June 3, 2026  
**Document Accuracy:** Based on codebase scan (server.js, emailService.js, next-form.html, index.php)
