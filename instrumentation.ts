// Запускается Next.js один раз при старте процесса.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureInitialAdmin } = await import("./lib/auth");
    await ensureInitialAdmin();
  } catch (e) {
    console.error("[instrumentation] ensureInitialAdmin failed", e);
  }
  try {
    const { seedTaxonomy } = await import("./lib/seed/taxonomy");
    await seedTaxonomy();
  } catch (e) {
    console.error("[instrumentation] seedTaxonomy failed", e);
  }
}
