import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const origin = process.env.GRIM_REVIEW_ORIGIN ?? "http://localhost:3047";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw Error("Review only a local fixture server.");
const output = path.resolve("../../docs/grim-club/screenshots");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
await context.route("**/*", (route) =>
  new URL(route.request().url()).origin === origin
    ? route.continue()
    : route.abort(),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];
for (const [name, url] of [
  ["closed", "/grimmunity"],
  ["offer", "/grimmunity/review?screen=offer"],
  ["account", "/grimmunity/review?screen=account"],
  ["canceled", "/grimmunity/review?screen=canceled"],
  ["staff", "/grimmunity/review?screen=staff"],
]) {
  for (const [size, width, height] of [
    ["desktop", 1440, 1100],
    ["mobile", 390, 844],
    ["tablet", 1024, 900],
  ]) {
    await page.setViewportSize({ width, height });
    const response = await page.goto(origin + url, {
      waitUntil: "networkidle",
    });
    if (response.status() !== 200)
      throw Error(`${name}: HTTP ${response.status()}`);
    await page.locator(".grimmunity h1").waitFor({ state: "visible" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw Error(`${name}/${size}: horizontal overflow`);
    if (size !== "tablet")
      await page.screenshot({
        path: path.join(output, `${name}-${size}.png`),
        fullPage: true,
      });
    if (name === "closed" && size === "desktop")
      await page
        .locator("#membership-tiers")
        .screenshot({ path: path.join(output, "tiers-desktop.png") });
    results.push({
      screen: name,
      size,
      status: response.status(),
      horizontalOverflow: overflow,
    });
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(origin + "/grimmunity/review?screen=join", {
  waitUntil: "networkidle",
});
let checkoutBody;
await page.route("**/api/grimmunity/checkout", (route) => {
  checkoutBody = route.request().postDataJSON();
  return route.fulfill({
    status: 409,
    contentType: "application/json",
    body: JSON.stringify({
      error: "This subscriber edition is full. No payment was taken.",
    }),
  });
});
await page.getByRole("radio").first().waitFor({ state: "visible" });
if ((await page.getByRole("radio").count()) !== 1)
  throw Error("Expected one membership");
if (!(await page.getByRole("radio", { name: "Grim Collector" }).isChecked()))
  throw Error("Collector was not selected");
if (
  !(await page.locator("[aria-live=polite]").textContent()).includes("$25.00")
)
  throw Error("Expected the $25 base price");
if (
  !(await page
    .getByRole("button", { name: "Shipping fee pending · checkout closed" })
    .isDisabled())
)
  throw Error("Undecided shipping must block checkout");
if (checkoutBody) throw Error("The preview must not send a checkout request");
await page.screenshot({
  path: path.join(output, "single-membership-mobile.png"),
  fullPage: true,
});
results.push({
  screen: "join",
  membership: "mid",
  baseAmount: 2500,
  shippingPending: true,
  checkoutDisabled: true,
});
const denied = await context.request.post(origin + "/api/grimmunity/portal", {
  headers: { Origin: origin },
  data: {},
});
if (denied.status() !== 401)
  throw Error(`Anonymous portal returned ${denied.status()}`);
const admin = await context.request.get(origin + "/admin/grimmunity", {
  maxRedirects: 0,
});
if (![302, 307].includes(admin.status()))
  throw Error(`Anonymous admin returned ${admin.status()}`);
results.push({
  anonymousPortal: denied.status(),
  anonymousAdmin: admin.status(),
});
await writeFile(
  path.join(output, "browser-results.json"),
  JSON.stringify({ results, pageErrors: errors }, null, 2),
);
await browser.close();
if (errors.length) throw Error(`Browser errors: ${errors.join("; ")}`);
console.log(
  JSON.stringify({
    screenshots: 12,
    checks: results.length,
    pageErrors: errors.length,
  }),
);
