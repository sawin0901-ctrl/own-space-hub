import { redirect } from "next/navigation";
import { signIn, getCurrentUser } from "@/lib/auth";
import "../../globals.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  async function doLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const u = await signIn(email, password);
    if (!u) redirect("/admin/login?error=1");
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
            {error && <p style={{ color: "tomato" }}>Неверные данные</p>}
            <button className="btn" type="submit">Войти</button>
          </form>
        </div>
      </body>
    </html>
  );
}
