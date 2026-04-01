# Email Service Configuration Guide

**Date:** April 1, 2026
**Purpose:** Enable password reset emails for the Facility Survey App

---

## 📋 Overview

The Facility Survey App backend has a complete password reset system, but **email sending is not yet configured**. This guide shows you how to set up email service using different providers.

**Current Status:**
- ✅ Password reset backend logic implemented
- ✅ Email templates exist (`EmailService.sendPasswordResetEmail()`)
- ❌ **SMTP credentials NOT configured**

**What Happens Without Email:**
- Users can request password reset
- Reset tokens are generated
- **BUT emails are never sent** (password reset won't work)

---

## 🚀 Quick Start (Recommended: SendGrid)

SendGrid offers **100 emails/day FREE** - perfect for your use case.

###Step 1: Create SendGrid Account

1. Go to https://signup.sendgrid.com/
2. Sign up for free account
3. Verify your email address
4. Complete sender verification (required by SendGrid)

### Step 2: Create API Key

1. Go to https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: "Facility Survey App"
4. Permissions: "Full Access" (or "Mail Send" only)
5. Click "Create & View"
6. **COPY THE API KEY** (you'll only see it once!)

### Step 3: Configure Backend

Edit `backend/.env`:

```bash
# Email Configuration (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Paste your API key here
SMTP_FROM=noreply@cit-operations.com  # Use your verified sender email
```

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

### Step 5: Test Password Reset

1. Go to login screen
2. Click "Forgot Password?"
3. Enter your email
4. **Check your inbox** for reset email

**✅ Done! Password reset emails will now be sent.**

---

## 🔧 Alternative Providers

### Option 2: AWS SES (Production-Grade)

**Pros:** Very cheap ($0.10 per 1,000 emails), highly scalable, reliable
**Cons:** Requires AWS account, slightly more setup

#### Configuration:

```bash
# .env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Change region as needed
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE  # Your AWS SES SMTP username
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY  # Your AWS SES SMTP password
SMTP_FROM=noreply@cit-operations.com  # Must be verified in SES
```

#### Setup Steps:

1. **Create AWS Account:** https://aws.amazon.com/
2. **Verify Email Address:**
   - Go to SES Console → Email Addresses
   - Click "Verify a New Email Address"
   - Enter: `noreply@cit-operations.com`
   - Click verification link in email

3. **Create SMTP Credentials:**
   - Go to SES Console → SMTP Settings
   - Click "Create My SMTP Credentials"
   - Copy username and password

4. **Request Production Access:**
   - By default, SES is in "sandbox mode" (can only send to verified emails)
   - Go to SES Console → Account Dashboard
   - Click "Request Production Access"
   - Fill out form (usually approved in 24 hours)

---

### Option 3: Gmail SMTP (Development/Testing Only)

**⚠️ WARNING:** Gmail SMTP is **NOT recommended for production**. Use for testing only.

**Pros:** Easy setup, free
**Cons:** Low sending limits (500/day), may be blocked, not reliable

#### Configuration:

```bash
# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password  # NOT your regular Gmail password
SMTP_FROM=your.email@gmail.com
```

#### Setup Steps:

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" (enter "Facility Survey App")
   - Click "Generate"
   - **Copy the 16-character password**

3. **Update .env:**
   - Paste the app password (no spaces) in `SMTP_PASS`

**⚠️ Limitations:**
- Max 500 emails/day
- Google may block sending if suspicious activity detected
- Not suitable for production use

---

### Option 4: Microsoft 365 / Outlook SMTP

**Pros:** Good if you already have Microsoft 365
**Cons:** Requires Microsoft 365 subscription

#### Configuration:

```bash
# .env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your.email@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=your.email@yourdomain.com
```

#### Setup Steps:

1. Ensure you have Microsoft 365 mailbox
2. Enable SMTP AUTH:
   - Admin Center → Active Users → Select user
   - Mail → Manage email apps
   - Enable "Authenticated SMTP"

---

## 🧪 Testing Email Service

### Method 1: Test via API

```bash
# Start backend
cd backend
npm run dev

# In another terminal, send test request
curl -X POST http://localhost:3000/socsurvey/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your.email@example.com"}'
```

**Expected Response:**
```json
{
  "message": "If a user with that email exists, a password reset link has been sent."
}
```

**Check:** Your inbox for password reset email.

---

### Method 2: Test via Frontend

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd FacilitySurveyApp
   npm start
   ```

3. **Trigger Password Reset:**
   - Open app in browser/emulator
   - Click "Forgot Password?"
   - Enter registered email address
   - Click "Send Reset Link"

4. **Check Inbox:**
   - You should receive email within 1-2 minutes
   - Email subject: "Password Reset Request"
   - Contains 64-character reset token

---

### Method 3: Check Backend Logs

If emails aren't sending, check backend console for errors:

```bash
# Backend logs will show:
✅ Email service configured successfully
✅ Sending password reset email to: user@example.com
✅ Email sent successfully

# OR errors:
❌ Email service not configured
❌ SMTP connection failed: Invalid credentials
❌ Failed to send email: Connection timeout
```

---

## 🐛 Troubleshooting

### Problem: "Email service not configured"

**Cause:** SMTP environment variables missing or invalid

**Solution:**
1. Check `backend/.env` file exists
2. Verify all SMTP variables are set:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=SG.xxxx
   SMTP_FROM=noreply@example.com
   ```
3. Restart backend server

---

### Problem: "Connection timeout" or "ECONNREFUSED"

**Cause:** Firewall blocking SMTP port 587

**Solution:**
1. Check firewall allows outbound connections on port 587
2. Try port 465 (SSL) or 2525 (alternative)
3. Update `.env`:
   ```bash
   SMTP_PORT=465  # Try SSL port instead
   ```

---

### Problem: "Authentication failed"

**Cause:** Wrong SMTP username or password

**Solution:**

**For SendGrid:**
- Username must be exactly `apikey` (not your email!)
- Password must be your SendGrid API key (starts with `SG.`)

**For Gmail:**
- Use App Password (16 chars), NOT your regular password
- Ensure 2-Step Verification is enabled

**For AWS SES:**
- Use SMTP credentials (different from AWS access keys)
- Check region matches SMTP host

---

### Problem: Emails going to spam

**Cause:** Sender email not verified or reputation issues

**Solution:**
1. **Verify sender email** with your SMTP provider
2. **Add SPF record** to your domain DNS:
   ```
   v=spf1 include:sendgrid.net ~all
   ```
3. **Add DKIM record** (provided by SendGrid/SES)
4. Use professional from address (e.g., `noreply@cit-operations.com`)
5. Avoid spam trigger words in email content

---

### Problem: Emails not received (no errors in logs)

**Cause:** Email blocked by recipient server or delivered to spam

**Solution:**
1. **Check spam folder**
2. **Check email logs** in SMTP provider dashboard:
   - SendGrid: https://app.sendgrid.com/email_activity
   - AWS SES: CloudWatch Logs
3. **Verify recipient email** exists and is active
4. **Test with different email** (Gmail, Outlook, etc.)

---

## 📧 Email Template Customization

The email templates are defined in `backend/src/services/email.service.ts`.

### Password Reset Email Template

**Location:** `backend/src/services/email.service.ts` (line 40-60)

**Current Template:**
```typescript
const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password
            </a>
        </p>
        <p>Or copy and paste this link: <br><code>${resetUrl}</code></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </div>
`;
```

**Customization Ideas:**
- Add company logo
- Change colors to match brand
- Add footer with contact info
- Multi-language support

**Example Custom Template:**
```typescript
const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7F1D1D; padding: 20px; text-align: center; }
            .logo { max-width: 150px; }
            .content { background: #fff; padding: 30px; }
            .button { background: #7F1D1D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://cit-operations.com/logo.png" alt="CIT Operations" class="logo">
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your CIT Operations Survey App account.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" class="button">Reset Your Password</a>
                </p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
                <p>© 2026 CIT Group Ltd · Gulaid Holding</p>
                <p>For support, contact: support@cit-operations.com</p>
            </div>
        </div>
    </body>
    </html>
`;
```

---

## 🔒 Security Best Practices

### 1. Never Commit .env File

**Add to `.gitignore`:**
```bash
# .gitignore
.env
.env.local
.env.production
```

### 2. Use Environment Variables

**DO NOT hardcode credentials:**
```typescript
// ❌ BAD
const transporter = nodemailer.createTransporter({
    host: 'smtp.sendgrid.net',
    auth: { user: 'apikey', pass: 'SG.hardcoded_key_here' }
});

// ✅ GOOD
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
```

### 3. Rotate API Keys Regularly

- Change SendGrid API keys every 90 days
- Immediately rotate if key is exposed
- Use separate keys for dev/staging/production

### 4. Monitor Email Activity

- Check SendGrid/SES dashboard weekly
- Set up alerts for high bounce rates
- Review spam complaints

---

## 📊 Production Deployment Checklist

Before deploying to production:

- [ ] **SMTP credentials configured** in production `.env`
- [ ] **Sender email verified** with SMTP provider
- [ ] **SPF record added** to domain DNS
- [ ] **DKIM record added** to domain DNS
- [ ] **Test password reset** in production environment
- [ ] **Email templates customized** with branding
- [ ] **Monitoring enabled** in SMTP provider dashboard
- [ ] **Backup SMTP provider** configured (failover)
- [ ] **Email sending limits** understood and monitored
- [ ] **Support email** added to footer

---

## 🎯 Recommended Setup (Summary)

**For Development/Testing:**
```bash
Provider: SendGrid Free Tier
Daily Limit: 100 emails
Cost: FREE
Setup Time: 15 minutes
```

**For Production:**
```bash
Provider: AWS SES
Daily Limit: Unlimited (pay as you go)
Cost: $0.10 per 1,000 emails
Reliability: 99.9% uptime
Setup Time: 30 minutes
```

---

## 📞 Support Resources

**SendGrid:**
- Docs: https://docs.sendgrid.com/
- Support: https://support.sendgrid.com/
- Status: https://status.sendgrid.com/

**AWS SES:**
- Docs: https://docs.aws.amazon.com/ses/
- Support: AWS Support Console
- Status: https://status.aws.amazon.com/

**Gmail SMTP:**
- Help: https://support.google.com/mail/answer/7126229

---

## ✅ Next Steps

1. **Choose email provider** (recommend SendGrid for quick start)
2. **Follow setup steps** above
3. **Configure backend `.env`** with SMTP credentials
4. **Restart backend server**
5. **Test password reset** via frontend
6. **Verify email received**
7. **Customize email template** (optional)
8. **Deploy to production**

**Estimated Time:** 15-30 minutes

---

**Guide Created:** April 1, 2026
**Author:** Claude (Anthropic)
**Project:** Facility Survey App - Email Service Configuration
