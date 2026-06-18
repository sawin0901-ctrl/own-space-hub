import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  async function doSignOut() {
    "use server";
    await signOut();
    redirect("/admin/login");
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
