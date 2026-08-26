import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import ejs from "ejs";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "";

const isMailerConfigured = () =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);

let transporter = null;

const getTransporter = () => {
  if (!isMailerConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return transporter;
};

const getEmailTemplate = async (template) => {
  const templatePath = path.join(__dirname, "../templates/email", template);

  return fs.readFile(templatePath, "utf8");
};

export const initMailer = async () => {
  const t = getTransporter();
  if (!t) {
    console.warn("Mailer not configured — emails will be skipped");
    return;
  }
  await t.verify();
  console.log("Mailer ready");
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const t = getTransporter();
  if (!t || !to) {
    return {
      sent: false,
      reason: "mailer_not_configured_or_recipient_missing",
    };
  }

  await t.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
};

export const sendTemplateEmail = async ({
  to,
  subject,
  template,
  data = {},
}) => {
  console.log("SMTP CONFIG:", {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS: SMTP_PASS ? "SET" : "NOT SET",
    SMTP_FROM,
    isConfigured: isMailerConfigured(),
  });
  const t = getTransporter();

  if (!t || !to) {
    return {
      sent: false,
      reason: "mailer_not_configured_or_recipient_missing",
    };
  }

  const templateContent = await getEmailTemplate(template);

  const html = ejs.render(templateContent, {
    data,
  });

  const result = await t.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
  });

  return {
    sent: true,
    messageId: result.messageId,
  };
};

export default sendEmail;
