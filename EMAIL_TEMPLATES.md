# AVcareerz Email Templates - Complete Guide

## 📧 Email Workflow Overview

### Admin Emails
- **Step 1 (Register Form)**: Shows "Step 1 - Initial Registration" with student's basic info
- **Step 2 (Next-Form)**: Shows "Step 2 - Complete Application" with all 27 fields

### User Emails
- **Step 1 Signup**: Registration successful confirmation
- **Step 2 Completion**: Application submitted confirmation
- **Login**: Verification code or login success
- **Google Sign-In**: Welcome email with next steps

---

## 1️⃣ STEP 1 - Registration Form (Initial Sign-Up)

### Admin Email
**Subject**: `New Step 1 Registration`

**Header**: Blue banner - "New Student Submission - Step 1 - Initial Registration"

**Content**:
```
From: AVcareerz
To: abroadvisioncarrerz@gmail.com, info@avcareerz.com

Table showing:
- Full Name
- Email
- Phone
- Preferred Country (if provided)
- Service/Source
- IP Address
- User Agent
```

**Footer**: "Please follow up with this student as soon as possible."

---

### User Email
**Subject**: `AVcareerz - Registration Successful`

**To**: User's email address

**Format**:
```
Logo: AVcareerz

Hello [Student Name],

Thank you for registering with AVcareerz.

Your registration has been successfully completed!

[Dream destination: Country] (if provided)
[Desired course: Course Name] (if provided)

Our team will review your details and get back to you 
shortly with next steps.

Best regards,
AVcareerz Team
```

---

## 2️⃣ STEP 2 - Next-Form Submission (Complete Application)

### Admin Email
**Subject**: `New Step 2 Application: Complete Details`

**Header**: Dark blue banner - "New Student Submission - Step 2 - Complete Application"

**Content**: Detailed table with ALL 27 FIELDS:
```
Personal Information:
- Full Name
- Date of Birth
- Gender
- Nationality
- Phone
- Email
- City
- Passport Status
- Passport Number

Academic Details:
- Highest Qualification
- Current Course
- Specialization
- College Name
- Year Of Passing
- CGPA

Study Abroad Preferences:
- Preferred Country
- Preferred University
- Preferred Course
- Visa Status
- Visa Type
- Visa Number
- Level Of Study
- Coaching
- Preferred Intake
- Budget Range
- Funding Source
- Loan Status
- Declaration (Yes/No)

Metadata:
- Source
- Submitted At
- IP Address
- User Agent
```

**Footer**: "Please follow up with this student as soon as possible."

---

### User Email
**Subject**: `AVcareerz - Application Complete! 🎓`

**To**: User's email address

**Format**:
```
Logo: AVcareerz

Hello [Student Name],

Thank you for submitting your detailed application information!

✅ Your application has been successfully completed.

Dream Destination: [Country]
Preferred University: [University]
Desired Course: [Course]

Next Steps:
1. Our counselors will contact you on WhatsApp to discuss 
   your application
2. We'll schedule a free consultation call with our study 
   abroad experts
3. You'll receive personalized guidance for your study 
   abroad journey

Need Help? Feel free to reach out to us anytime. 
Our team is here to support you!

Best regards,
AVcareerz Team

---
Guiding Futures Beyond Borders • Abroad Vision Careerz System
```

---

## 3️⃣ LOGIN / VERIFICATION

### Login Code Email
**Subject**: `Your Login Verification Code`

**To**: User's email address

**Format**:
```
Your login code is: [6-digit code]

This code expires in 10 minutes.
```

---

## 4️⃣ GOOGLE SIGN-IN

### Google Sign-In Success Email
**Subject**: (varies)

**To**: User's email address

**Format**:
```
Logo: AVcareerz

Welcome [Student Name],

You have successfully signed in with Google at AVcareerz.

Email: [user@email.com]

Signed in at: [timestamp]

[Personalized next steps]

Please complete the application form to continue your 
study abroad journey.

Best regards,
AVcareerz Team
```

---

## 🔧 Configuration

### Admin Email Recipients
From `.env` file:
```
ADMIN_EMAIL = abroadvisioncarrerz@gmail.com
ADMIN_EMAILS = abroadvisioncarrerz@gmail.com,info@avcareerz.com
EMAIL_USER = info@avcareerz.com (fallback)
```

### Email Service
- **Service**: Brevo (Sendinblue) API
- **Endpoint**: https://api.brevo.com/v3/smtp/email
- **Authentication**: API Key in header
- **Status**: ✅ Working (IP whitelisted)

---

## 📝 Implementation Details

### Admin Email Function
```php
send_admin_email($user, $customSubject, $step)
// $step = '1' for Step 1, '2' for Step 2
// Automatically adds "Step 1" or "Step 2" to email subject/header
```

### User Email Functions
```php
// Step 1 (Registration)
send_confirmation_email($email, $name, $message, $extra)

// Step 2 (Application)
send_step2_completion_email($email, $name, $applicationData)

// Google Sign-In
send_google_sign_in_success_email($email, $name, $extra)

// Login Code
send_login_code_email($email, $code)
```

---

## ✅ Email Status

| Email Type | Status | Recipients |
|-----------|--------|-----------|
| Step 1 - Admin | ✅ Sending | abroadvisioncarrerz@gmail.com, info@avcareerz.com |
| Step 1 - User | ✅ Sending | User's email |
| Step 2 - Admin | ✅ Sending | abroadvisioncarrerz@gmail.com, info@avcareerz.com |
| Step 2 - User | ✅ Sending | User's email |
| Login Code | ✅ Sending | User's email |
| Google Sign-In | ✅ Sending | User's email |

---

## 🎯 Next Actions

1. ✅ Admin receives Step 1 email when user registers
2. ✅ User receives Step 1 confirmation email
3. ✅ User fills next-form (all 27 fields)
4. ✅ Admin receives Step 2 email with all details
5. ✅ User receives Step 2 completion email with next steps
6. ✅ Admin follows up via WhatsApp/phone
7. ✅ Free consultation scheduled

---

**Last Updated**: 2024
**Email System**: Active and Verified ✅
