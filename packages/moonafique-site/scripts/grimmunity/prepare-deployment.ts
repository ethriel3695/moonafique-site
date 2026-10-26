// Only Vercel deployments with an explicitly connected Grimmunity database migrate.
// Normal storefront and local builds remain independent of the membership database.
async function main() {
  if (!process.env.GRIM_DATABASE_URL) return;
  if (process.env.VERCEL_ENV === "production") {
    await import("./prepare-production");
  } else if (process.env.VERCEL_ENV === "preview") {
    await import("./prepare-preview");
  }
}
main().catch(() => {
  console.error("Grimmunity deployment preparation failed.");
  process.exitCode = 1;
});
