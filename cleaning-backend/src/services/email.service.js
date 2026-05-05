const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.EMAIL_FROM_NAME || "Brillo"} <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";

// ─── Template helpers ─────────────────────────────────────────────────────────

function baseLayout(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Brillo</title>
</head>
<body style="margin:0;padding:0;background:#F7F6F2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#00C9AA,#4A90D9);padding:32px 40px;text-align:center;">
            <span style="font-size:28px;">🧹</span>
            <span style="display:inline-block;font-size:24px;font-weight:700;color:#FFFFFF;margin-left:10px;vertical-align:middle;">Brillo</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #E5E3DF;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9B9B9B;">
              © ${new Date().getFullYear()} Brillo · Cleaning Business Management<br/>
              <a href="${FRONTEND_URL}" style="color:#00C9AA;text-decoration:none;">app.brilloclean.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Email: Welcome (dopo registrazione) ─────────────────────────────────────

function welcomeHtml({ firstName, tenantName }) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">Welcome to Brillo, ${firstName}! 👋</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">Your account for <strong>${tenantName}</strong> is ready. Start managing your cleaning business smarter.</p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
      <tr>
        <td style="background:#F7F6F2;border-radius:12px;padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6B6B6B;">✅ What you can do now:</p>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#1A1A1A;line-height:1.8;">
            <li>Create and schedule jobs</li>
            <li>Add your team members</li>
            <li>Manage customers and invoices</li>
            <li>Set up recurring cleaning schedules</li>
          </ul>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        Go to Dashboard →
      </a>
    </div>
  `);
}

// ─── Email: Reset Password ────────────────────────────────────────────────────

function resetPasswordHtml({ firstName, resetUrl }) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">Reset your password 🔒</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">Hi ${firstName}, we received a request to reset your Brillo password. Click the button below — the link expires in <strong>1 hour</strong>.</p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        Reset Password →
      </a>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="background:#FDF0EB;border-radius:10px;padding:16px;">
          <p style="margin:0;font-size:13px;color:#E8602C;">
            ⚠️ If you didn't request this, you can safely ignore this email. Your password will not change.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9B9B9B;">
      Or copy this link into your browser:<br/>
      <span style="color:#00C9AA;word-break:break-all;">${resetUrl}</span>
    </p>
  `);
}

// ─── Email: Verify Email ──────────────────────────────────────────────────────

function verifyEmailHtml({ firstName, verifyUrl }) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">Verify your email ✉️</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">Hi ${firstName}, thank you for signing up to Brillo! Please confirm your email address to activate your account. This link expires in <strong>24 hours</strong>.</p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        Verify my email →
      </a>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="background:#F0FDF9;border-radius:10px;padding:16px;">
          <p style="margin:0;font-size:13px;color:#00C9AA;">
            ✅ Once verified, you can log in and start managing your cleaning business.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9B9B9B;">
      Or copy this link into your browser:<br/>
      <span style="color:#00C9AA;word-break:break-all;">${verifyUrl}</span>
    </p>
  `);
}

// ─── Public send functions ────────────────────────────────────────────────────

/**
 * Send welcome email after registration.
 * @param {Object} params
 * @param {string} params.to        - recipient email
 * @param {string} params.firstName - user first name
 * @param {string} params.tenantName - business name
 */
async function sendWelcomeEmail({ to, firstName, tenantName }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Brillo, ${firstName}! 🧹`,
    html: welcomeHtml({ firstName, tenantName }),
  });
}

/**
 * Send password reset email.
 * @param {Object} params
 * @param {string} params.to         - recipient email
 * @param {string} params.firstName  - user first name
 * @param {string} params.resetToken - raw reset token (goes in URL)
 */
async function sendResetPasswordEmail({ to, firstName, resetToken }) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Brillo password",
    html: resetPasswordHtml({ firstName, resetUrl }),
  });
}

/**
 * Send email verification link after registration.
 * @param {Object} params
 * @param {string} params.to              - recipient email
 * @param {string} params.firstName       - user first name
 * @param {string} params.verificationToken - raw token (goes in URL)
 */
async function sendVerificationEmail({ to, firstName, verificationToken }) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your Brillo email address",
    html: verifyEmailHtml({ firstName, verifyUrl }),
  });
}

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
};
