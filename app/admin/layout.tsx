import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, signIn, signOut } from "@/lib/auth";
import "../globals.css";

export const dynamic = "force-dynamic";

const FLASH = "gp_login_err";

export default async function AdminLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    const sp = searchParams ? await searchParams : undefined;
    const jar = await cookies();
    const loginError = sp?.error === "1" || jar.get(FLASH)?.value === "1";
    if (jar.get(FLASH)?.value === "1") {
      jar.delete(FLASH);
    }

    async function doLogin(formData: FormData) {
      "use server";
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      let ok = false;
      try {
        const u = await signIn(email, password);
        ok = !!u;
      } catch (e) {
        console.error("[admin/login] failed", e);
      }
      if (!ok) {
        redirect("/admin?error=1");
      }
      redirect("/admin");
    }
    return (
      <html lang="ru">
        <body>
          <div style={{ maxWidth: 380, margin: "80px auto", padding: 24, background: "var(--surface)", borderRadius: 10 }}>
            <h1>Вход в админку</h1>
            {loginError && (
              <div style={{ background: "#3a1212", color: "#ffb4b4", padding: "10px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14 }}>
                Неверный логин или пароль
              </div>
            )}
            <form action={doLogin}>
              <div className="form-row">
                <label>Email</label>
                <input type="email" name="email" required autoComplete="username" defaultValue="" />
              </div>
              <div className="form-row">
                <label>Пароль</label>
                <input type="password" name="password" required autoComplete="current-password" />
              </div>
              <button className="btn" type="submit">Войти</button>
            </form>
          </div>
        </body>
      </html>
    );
  }


  async function doSignOut() {
    "use server";
    await signOut();
    redirect("/admin");
  }

  return (
    <html lang="ru">
      <body>
        <div className="admin-shell">
          <aside className="admin-side">
            <h2>GamePlaza Admin</h2>
            <Link href="/admin">Дашборд</Link>
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/categories">Категории</Link>
            <Link href="/admin/import">Автоимпорт</Link>
            <Link href="/admin/analytics">Аналитика</Link>
            <Link href="/admin/settings">Настройки</Link>
            <form action={doSignOut} style={{ marginTop: 24 }}>
              <button className="btn btn-secondary" type="submit">Выйти</button>
            </form>
            <p className="muted" style={{ fontSize: ".8rem", marginTop: 16 }}>{user.email}</p>
          </aside>
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
