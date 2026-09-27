const nodemailer = require("nodemailer");
const renderTemplate = require("./renderTemplate");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS"
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

async function sendTemplateEmail({ email, subject, template, values }) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: renderTemplate(`${template}.txt`, values),
    html: renderTemplate(`${template}.html`, values),
  });
}

async function sendCodeEmail({ email, code, expiresInMinutes, template, subject }) {
  await sendTemplateEmail({
    email,
    subject,
    template,
    values: { code, expiresInMinutes },
  });
}

async function sendRegistrationCodeEmail(email, code, expiresInMinutes) {
  await sendCodeEmail({
    email,
    code,
    expiresInMinutes,
    template: "verification-code",
    subject: `${code} is your Neuron Bank verification code`,
  });
}

async function sendLoginCodeEmail(email, code, expiresInMinutes) {
  await sendCodeEmail({
    email,
    code,
    expiresInMinutes,
    template: "login-code",
    subject: `${code} is your Neuron Bank login code`,
  });
}

// "Tue, 16 Sep 2026 14:32:10 UTC" reads unambiguously wherever the customer is.
function formatSignInTime(date) {
  return date.toUTCString().replace("GMT", "UTC");
}

async function sendAccountPendingEmail(email, name) {
  await sendTemplateEmail({
    email,
    subject: "Your Neuron Bank account request has been received",
    template: "account-pending",
    values: { name },
  });
}

async function sendLoginAlertEmail(email, name, signedInAt = new Date()) {
  await sendTemplateEmail({
    email,
    subject: "New sign-in to your Neuron Bank account",
    template: "login-alert",
    values: { name, signedInAt: formatSignInTime(signedInAt) },
  });
}

async function sendPasswordResetEmail(email, name, resetUrl, expiresInMinutes) {
  await sendTemplateEmail({
    email,
    subject: "Reset your Neuron Bank password",
    template: "password-reset",
    values: { name, resetUrl, expiresInMinutes },
  });
}

async function sendCardSettingsCodeEmail(email, name, last4, code, expiresInMinutes) {
  await sendTemplateEmail({
    email,
    subject: `${code} is your Neuron Bank card confirmation code`,
    template: "card-settings-code",
    values: { name, last4, code, expiresInMinutes },
  });
}

async function sendCardPinResetEmail(email, name, last4, resetUrl, expiresInMinutes) {
  await sendTemplateEmail({
    email,
    subject: "Set the PIN for your Neuron Bank debit card",
    template: "card-pin-reset",
    values: { name, last4, resetUrl, expiresInMinutes },
  });
}

module.exports = {
  sendRegistrationCodeEmail,
  sendLoginCodeEmail,
  sendAccountPendingEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendCardSettingsCodeEmail,
  sendCardPinResetEmail,
};
