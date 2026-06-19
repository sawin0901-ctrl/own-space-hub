import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export function isMailerConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransport();
  if (!t) {
    console.warn("[mailer] SMTP не настроен — письмо не отправлено. To:", opts.to, "Subject:", opts.subject);
    return { ok: false, reason: "smtp_not_configured" as const };
  }
  const from = process.env.SMTP_FROM || `GamePlaza <${process.env.SMTP_USER}>`;
  await t.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
  return { ok: true as const };
}
