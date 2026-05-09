const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.EMAIL_FROM_NAME || "Brillo"} <${process.env.EMAIL_FROM || "onboarding@resend.dev"}>`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Template helpers ─────────────────────────────────────────────────────────

function baseLayout(content, lang = "en") {
  return `
<!DOCTYPE html>
<html lang="${lang}">
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

const welcomeCopy = {
  en: {
    subject: (firstName) => `Welcome to Brillo, ${firstName}! 🧹`,
    heading: (firstName) => `Welcome to Brillo, ${firstName}! 👋`,
    subtitle: (tenantName) =>
      `Your account for <strong>${tenantName}</strong> is ready. Start managing your cleaning business smarter.`,
    listTitle: "✅ What you can do now:",
    items: [
      "Create and schedule jobs",
      "Add your team members",
      "Manage customers and invoices",
      "Set up recurring cleaning schedules",
    ],
    cta: "Go to Dashboard →",
  },
  es: {
    subject: (firstName) => `¡Bienvenido a Brillo, ${firstName}! 🧹`,
    heading: (firstName) => `¡Bienvenido a Brillo, ${firstName}! 👋`,
    subtitle: (tenantName) =>
      `Tu cuenta para <strong>${tenantName}</strong> está lista. Empieza a gestionar tu negocio de limpieza de forma más inteligente.`,
    listTitle: "✅ Lo que puedes hacer ahora:",
    items: [
      "Crear y programar trabajos",
      "Añadir a tus compañeros de equipo",
      "Gestionar clientes y facturas",
      "Configurar horarios de limpieza recurrentes",
    ],
    cta: "Ir al panel →",
  },
  it: {
    subject: (firstName) => `Benvenuto su Brillo, ${firstName}! 🧹`,
    heading: (firstName) => `Benvenuto su Brillo, ${firstName}! 👋`,
    subtitle: (tenantName) =>
      `Il tuo account per <strong>${tenantName}</strong> è pronto. Inizia a gestire la tua attività di pulizie in modo più intelligente.`,
    listTitle: "✅ Cosa puoi fare adesso:",
    items: [
      "Crea e programma i lavori",
      "Aggiungi i membri del tuo team",
      "Gestisci clienti e fatture",
      "Configura i programmi di pulizia ricorrenti",
    ],
    cta: "Vai alla dashboard →",
  },
};

function welcomeHtml({ firstName, tenantName, lang = "en" }) {
  const t = welcomeCopy[lang] || welcomeCopy.en;
  return baseLayout(
    `
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">${t.heading(firstName)}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">${t.subtitle(tenantName)}</p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
      <tr>
        <td style="background:#F7F6F2;border-radius:12px;padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6B6B6B;">${t.listTitle}</p>
          <ul style="margin:0;padding-left:20px;font-size:14px;color:#1A1A1A;line-height:1.8;">
            ${t.items.map((item) => `<li>${item}</li>`).join("\n            ")}
          </ul>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      <a href="${FRONTEND_URL}/dashboard"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        ${t.cta}
      </a>
    </div>
  `,
    lang,
  );
}

// ─── Email: Reset Password ────────────────────────────────────────────────────

const resetPasswordCopy = {
  en: {
    subject: "Reset your Brillo password",
    heading: "Reset your password 🔒",
    body: (firstName) =>
      `Hi ${firstName}, we received a request to reset your Brillo password. Click the button below — the link expires in <strong>1 hour</strong>.`,
    cta: "Reset Password →",
    warning:
      "⚠️ If you didn't request this, you can safely ignore this email. Your password will not change.",
    orCopy: "Or copy this link into your browser:",
  },
  es: {
    subject: "Restablece tu contraseña de Brillo",
    heading: "Restablece tu contraseña 🔒",
    body: (firstName) =>
      `Hola ${firstName}, recibimos una solicitud para restablecer tu contraseña de Brillo. Haz clic en el botón — el enlace expira en <strong>1 hora</strong>.`,
    cta: "Restablecer contraseña →",
    warning:
      "⚠️ Si no solicitaste esto, puedes ignorar este correo. Tu contraseña no cambiará.",
    orCopy: "O copia este enlace en tu navegador:",
  },
  it: {
    subject: "Reimposta la tua password di Brillo",
    heading: "Reimposta la tua password 🔒",
    body: (firstName) =>
      `Ciao ${firstName}, abbiamo ricevuto una richiesta di reimpostazione della password di Brillo. Clicca il pulsante qui sotto — il link scade tra <strong>1 ora</strong>.`,
    cta: "Reimposta password →",
    warning:
      "⚠️ Se non hai richiesto questa operazione, puoi ignorare questa email. La tua password non verrà modificata.",
    orCopy: "Oppure copia questo link nel tuo browser:",
  },
};

function resetPasswordHtml({ firstName, resetUrl, lang = "en" }) {
  const t = resetPasswordCopy[lang] || resetPasswordCopy.en;
  return baseLayout(
    `
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">${t.heading}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">${t.body(firstName)}</p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        ${t.cta}
      </a>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="background:#FDF0EB;border-radius:10px;padding:16px;">
          <p style="margin:0;font-size:13px;color:#E8602C;">
            ${t.warning}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9B9B9B;">
      ${t.orCopy}<br/>
      <span style="color:#00C9AA;word-break:break-all;">${resetUrl}</span>
    </p>
  `,
    lang,
  );
}

// ─── Email: Verify Email ──────────────────────────────────────────────────────

const verifyEmailCopy = {
  en: {
    subject: "Verify your Brillo email address",
    heading: "Verify your email ✉️",
    body: (firstName) =>
      `Hi ${firstName}, thank you for signing up to Brillo! Please confirm your email address to activate your account. This link expires in <strong>24 hours</strong>.`,
    cta: "Verify my email →",
    note: "✅ Once verified, you can log in and start managing your cleaning business.",
    orCopy: "Or copy this link into your browser:",
  },
  es: {
    subject: "Verifica tu dirección de correo de Brillo",
    heading: "Verifica tu correo ✉️",
    body: (firstName) =>
      `Hola ${firstName}, ¡gracias por registrarte en Brillo! Por favor confirma tu dirección de correo para activar tu cuenta. Este enlace expira en <strong>24 horas</strong>.`,
    cta: "Verificar mi correo →",
    note: "✅ Una vez verificado, podrás iniciar sesión y comenzar a gestionar tu negocio.",
    orCopy: "O copia este enlace en tu navegador:",
  },
  it: {
    subject: "Verifica il tuo indirizzo email di Brillo",
    heading: "Verifica la tua email ✉️",
    body: (firstName) =>
      `Ciao ${firstName}, grazie per esserti registrato su Brillo! Conferma il tuo indirizzo email per attivare l'account. Il link scade tra <strong>24 ore</strong>.`,
    cta: "Verifica la mia email →",
    note: "✅ Una volta verificato, potrai accedere e iniziare a gestire la tua attività di pulizie.",
    orCopy: "Oppure copia questo link nel tuo browser:",
  },
};

function verifyEmailHtml({ firstName, verifyUrl, lang = "en" }) {
  const t = verifyEmailCopy[lang] || verifyEmailCopy.en;
  return baseLayout(
    `
    <h1 style="margin:0 0 8px;font-size:24px;color:#1A1A1A;">${t.heading}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6B6B6B;">${t.body(firstName)}</p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#00C9AA,#4A90D9);color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;">
        ${t.cta}
      </a>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="background:#F0FDF9;border-radius:10px;padding:16px;">
          <p style="margin:0;font-size:13px;color:#00C9AA;">
            ${t.note}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#9B9B9B;">
      ${t.orCopy}<br/>
      <span style="color:#00C9AA;word-break:break-all;">${verifyUrl}</span>
    </p>
  `,
    lang,
  );
}

// ─── Public send functions ────────────────────────────────────────────────────

/**
 * Send welcome email after registration.
 * @param {Object} params
 * @param {string} params.to        - recipient email
 * @param {string} params.firstName - user first name
 * @param {string} params.tenantName - business name
 * @param {string} [params.lang]    - language code: 'en' | 'es' | 'it'
 */
async function sendWelcomeEmail({ to, firstName, tenantName, lang = "en" }) {
  const t = welcomeCopy[lang] || welcomeCopy.en;
  await resend.emails.send({
    from: FROM,
    to,
    subject: t.subject(firstName),
    html: welcomeHtml({ firstName, tenantName, lang }),
  });
}

/**
 * Send password reset email.
 * @param {Object} params
 * @param {string} params.to         - recipient email
 * @param {string} params.firstName  - user first name
 * @param {string} params.resetToken - raw reset token (goes in URL)
 * @param {string} [params.lang]     - language code: 'en' | 'es' | 'it'
 */
async function sendResetPasswordEmail({
  to,
  firstName,
  resetToken,
  lang = "en",
}) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  const t = resetPasswordCopy[lang] || resetPasswordCopy.en;
  await resend.emails.send({
    from: FROM,
    to,
    subject: t.subject,
    html: resetPasswordHtml({ firstName, resetUrl, lang }),
  });
}

/**
 * Send email verification link after registration.
 * @param {Object} params
 * @param {string} params.to              - recipient email
 * @param {string} params.firstName       - user first name
 * @param {string} params.verificationToken - raw token (goes in URL)
 * @param {string} [params.lang]          - language code: 'en' | 'es' | 'it'
 */
async function sendVerificationEmail({
  to,
  firstName,
  verificationToken,
  lang = "en",
}) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const t = verifyEmailCopy[lang] || verifyEmailCopy.en;
  await resend.emails.send({
    from: FROM,
    to,
    subject: t.subject,
    html: verifyEmailHtml({ firstName, verifyUrl, lang }),
  });
}

module.exports = {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
};
