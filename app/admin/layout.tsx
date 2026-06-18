import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, signIn, signOut } from "@/lib/auth";
import "../globals.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    async function doLogin(formData: FormData) {
      "use server";
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const u = await signIn(email, password);
      if (!u) redirect("/admin?error=1");
      redirect("/admin");
    }
    return (
      <html lang="ru">
        <body>
          <div style={{ maxWidth: 380, margin: "80px auto", padding: 24, background: "var(--surface)", borderRadius: 10 }}>
            <h1>Вход в админку</h1>
            <form action={doLogin}>
              <div className="form-row">
                <label>Email</label>
                <input type="email" name="email" required />
              </div>
              <div className="form-row">
                <label>Пароль</label>
                <input type="password" name="password" required />
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
