import Link from "next/link";
import { redirect } from "next/navigation";
import { consumePasswordReset, findUserByResetToken } from "@/lib/passwordReset";
import "../globals.css";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; err?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";
  const ok = sp.ok === "1";
  const err = sp.err;

  if (ok) {
    return (
      <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, background: "var(--surface)", borderRadius: 10 }}>
        <h1>Пароль обновлён</h1>
        <p className="muted">Теперь можно войти с новым паролем.</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/admin" className="btn">Войти</Link>
        </p>
      </div>
    );
  }

  const user = token ? await findUserByResetToken(token) : null;

  async function submit(formData: FormData) {
    "use server";
    const t = String(formData.get("token") ?? "");
    const p1 = String(formData.get("password") ?? "");
    const p2 = String(formData.get("password2") ?? "");
    if (p1 !== p2) redirect(`/reset-password?token=${encodeURIComponent(t)}&err=mismatch`);
    const res = await consumePasswordReset(t, p1);
    if (!res.ok) redirect(`/reset-password?token=${encodeURIComponent(t)}&err=${res.reason}`);
    redirect("/reset-password?ok=1");
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, background: "var(--surface)", borderRadius: 10 }}>
      <h1>Новый пароль</h1>
      {!user ? (
        <>
          <div style={{ background: "#3a1212", color: "#ffb4b4", padding: 12, borderRadius: 6, fontSize: 14 }}>
            Ссылка недействительна или истекла. Запросите сброс заново.
          </div>
          <p style={{ marginTop: 16 }}>
            <Link href="/forgot-password" style={{ color: "var(--accent)" }}>← Запросить новую ссылку</Link>
          </p>
        </>
      ) : (
        <>
          {err && (
            <div style={{ background: "#3a1212", color: "#ffb4b4", padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
              {err === "mismatch" && "Пароли не совпадают"}
              {err === "weak_password" && "Пароль должен быть не короче 8 символов"}
              {err === "invalid_or_expired" && "Ссылка недействительна или истекла"}
            </div>
          )}
          <form action={submit}>
            <input type="hidden" name="token" value={token} />
            <div className="form-row">
              <label>Новый пароль (мин. 8 символов)</label>
              <input type="password" name="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="form-row">
              <label>Повторите пароль</label>
              <input type="password" name="password2" required minLength={8} autoComplete="new-password" />
            </div>
            <button className="btn" type="submit">Сохранить</button>
          </form>
        </>
      )}
    </div>
  );
}
