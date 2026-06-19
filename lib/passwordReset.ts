import { randomBytes, createHash } from "crypto";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";
import { sendMail, isMailerConfigured } from "./mailer";

const TOKEN_TTL_MIN = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Создаёт токен, сохраняет hash + срок, отправляет письмо. Всегда возвращает ok (анти-енумерация). */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { devLink: null as string | null };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // не раскрываем, что такого юзера нет
    return { devLink: null };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
  });

  const link = `${getBaseUrl()}/reset-password?token=${token}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <h2>Сброс пароля GamePlaza</h2>
      <p>Кто-то (надеемся, вы) запросил сброс пароля для <b>${email}</b>.</p>
      <p>Перейдите по ссылке, чтобы задать новый пароль. Ссылка действует ${TOKEN_TTL_MIN} минут:</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#7c3aed;color:#fff;border-radius:6px;text-decoration:none">Сбросить пароль</a></p>
      <p style="color:#666;font-size:12px">Или скопируйте ссылку: ${link}</p>
      <p style="color:#666;font-size:12px">Если это были не вы — просто проигнорируйте письмо.</p>
    </div>`;

  const res = await sendMail({
    to: email,
    subject: "Сброс пароля — GamePlaza",
    html,
    text: `Сброс пароля: ${link} (действует ${TOKEN_TTL_MIN} минут)`,
  });

  // В dev (SMTP не настроен) — возвращаем ссылку, чтобы показать админу прямо на странице.
  return { devLink: !res.ok && !isMailerConfigured() ? link : null };
}

export async function findUserByResetToken(token: string) {
  if (!token) return null;
  const hash = hashToken(token);
  const user = await prisma.user.findUnique({ where: { passwordResetTokenHash: hash } });
  if (!user || !user.passwordResetExpiresAt) return null;
  if (user.passwordResetExpiresAt.getTime() < Date.now()) return null;
  return user;
}

export async function consumePasswordReset(token: string, newPassword: string) {
  const user = await findUserByResetToken(token);
  if (!user) return { ok: false as const, reason: "invalid_or_expired" as const };
  if (newPassword.length < 8) return { ok: false as const, reason: "weak_password" as const };
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
  return { ok: true as const };
}
