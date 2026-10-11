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

async function sendTemplateEmail({ email, subject, template, values, attachments }) {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: renderTemplate(`${template}.txt`, values),
    html: renderTemplate(`${template}.html`, values),
    ...(attachments ? { attachments } : {}),
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

async function sendStatementEmail({
  email,
  name,
  accountNumber,
  period,
  count,
  fileName,
  pdf,
}) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank statement (${period})`,
    template: "statement",
    values: { name, accountNumber, period, count },
    attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
  });
}

async function sendBeneficiaryCodeEmail({
  email,
  name,
  beneficiaryName,
  accountNumber,
  action,
  code,
  expiresInMinutes,
}) {
  await sendTemplateEmail({
    email,
    subject: `${code} is your Neuron Bank beneficiary code`,
    template: "beneficiary-code",
    values: { name, beneficiaryName, accountNumber, action, code, expiresInMinutes },
  });
}

async function sendDepositReminderEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank deposit ${values.depositNumber} matures in ${values.daysLeft} days`,
    template: "deposit-reminder",
    values,
  });
}

async function sendDepositMaturedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank deposit ${values.depositNumber} has matured`,
    template: "deposit-matured",
    values,
  });
}

async function sendDepositBookedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank deposit ${values.depositNumber} is open`,
    template: "deposit-booked",
    values,
  });
}

async function sendDepositCloseCodeEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `${values.code} is your Neuron Bank deposit closure code`,
    template: "deposit-close-code",
    values,
  });
}

async function sendRecurringDepositBookedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank recurring deposit ${values.depositNumber} is open`,
    template: "rd-booked",
    values,
  });
}

async function sendInstallmentFailedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Instalment missed on your deposit ${values.depositNumber}`,
    template: "rd-installment-failed",
    values,
  });
}

async function sendLoanApprovedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: `Your Neuron Bank loan of INR ${values.amount} has been approved`,
    template: "loan-approved",
    values,
  });
}

async function sendLoanRejectedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: "An update on your Neuron Bank loan request",
    template: "loan-rejected",
    values,
  });
}

async function sendLoanEmiMissedEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: "Missed loan instalment: your Neuron Bank account is blocked",
    template: "loan-emi-missed",
    values,
  });
}

async function sendLoanRepaidEmail(email, values) {
  await sendTemplateEmail({
    email,
    subject: "Your Neuron Bank loan is fully repaid",
    template: "loan-repaid",
    values,
  });
}

module.exports = {
  sendLoanEmiMissedEmail,
  sendLoanRepaidEmail,
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendRecurringDepositBookedEmail,
  sendInstallmentFailedEmail,
  sendDepositBookedEmail,
  sendDepositCloseCodeEmail,
  sendDepositReminderEmail,
  sendDepositMaturedEmail,
  sendBeneficiaryCodeEmail,
  sendStatementEmail,
  sendRegistrationCodeEmail,
  sendLoginCodeEmail,
  sendAccountPendingEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendCardSettingsCodeEmail,
  sendCardPinResetEmail,
};
