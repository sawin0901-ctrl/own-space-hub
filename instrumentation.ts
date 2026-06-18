// Запускается Next.js один раз при старте процесса.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureInitialAdmin } = await import("./lib/auth");
  try {
    await ensureInitialAdmin();
  } catch (e) {
    console.error("[instrumentation] ensureInitialAdmin failed", e);
  }
}
