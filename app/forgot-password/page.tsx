import Link from "next/link";
import { requestPasswordReset } from "@/lib/passwordReset";
import { isMailerConfigured } from "@/lib/mailer";
import "../globals.css";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; link?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp.sent === "1";
  const devLink = sp.link;

  async function submit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const { devLink } = await requestPasswordReset(email);
    const qs = new URLSearchParams({ sent: "1" });
    if (devLink) qs.set("link", devLink);
    const { redirect } = await import("next/navigation");
    redirect(`/forgot-password?${qs.toString()}`);
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, background: "var(--surface)", borderRadius: 10 }}>
      <h1>Восстановление пароля</h1>
      {sent ? (
        <>
          <p className="muted">
            Если такой email зарегистрирован, мы отправили на него письмо со ссылкой для сброса
            пароля. Ссылка действует 30 минут.
          </p>
          {devLink && !isMailerConfigured() && (
            <div style={{ background: "#2a1a3a", color: "#e9d5ff", padding: 12, borderRadius: 6, marginTop: 12, fontSize: 13, wordBreak: "break-all" }}>
              <b>SMTP не настроен.</b> Ссылка для сброса (только для админа):
              <br />
              <a href={devLink} style={{ color: "#a855f7" }}>{devLink}</a>
            </div>
          )}
          <p style={{ marginTop: 16 }}>
            <Link href="/admin" style={{ color: "var(--accent)" }}>← Вернуться ко входу</Link>
          </p>
        </>
      ) : (
        <>
          <p className="muted">Укажите email — пришлём ссылку для сброса пароля.</p>
          <form action={submit}>
            <div className="form-row">
              <label>Email</label>
              <input type="email" name="email" required autoComplete="email" />
            </div>
            <button className="btn" type="submit">Отправить</button>
          </form>
          <p style={{ marginTop: 16 }}>
            <Link href="/admin" style={{ color: "var(--accent)" }}>← Назад ко входу</Link>
          </p>
        </>
      )}
    </div>
  );
}
