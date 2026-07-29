import { chromium } from "playwright";
import path from "node:path";

const shotDir = "C:\\Users\\sangkyu.kim\\AppData\\Local\\Temp\\claude\\C--Users-sangkyu-kim-OneDrive---Daedong-USA--Inc-Kioti-Tractor-Division-Desktop-salary-rank\\70b4a778-fcce-44e3-9233-1929d7ca7604\\scratchpad";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

async function shot(name) {
  await page.screenshot({ path: path.join(shotDir, name), fullPage: false });
  console.log("screenshot:", name);
}

console.log("nav /us");
await page.goto("http://localhost:3000/us", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await shot("01-us-home.png");

const svgPaths = page.locator("[data-us-map] svg path");
const count = await svgPaths.count();
console.log("state path count:", count);
if (count > 0) {
  await svgPaths.nth(20).hover();
  await page.waitForTimeout(400);
  await shot("02-us-home-hover.png");

  await svgPaths.nth(20).click();
  await page.waitForURL(/\/us\/[a-z]{2}(\?|$)/, { timeout: 10000 }).catch((e) => console.log("state nav wait failed", e.message));
  console.log("url after state click:", page.url());
  await page.waitForTimeout(500);
  await shot("03-us-state.png");

  const countyPaths = page.locator("[data-us-map] svg path");
  const countyCount = await countyPaths.count();
  console.log("county path count:", countyCount);
  if (countyCount > 0) {
    await countyPaths.nth(Math.min(5, countyCount - 1)).click();
    await page.waitForURL(/\/us\/[a-z]{2}\/\d{5}/, { timeout: 10000 }).catch((e) => console.log("county nav wait failed", e.message));
    console.log("url after county click:", page.url());
    await page.waitForTimeout(500);
    await shot("04-us-county.png");
  }
}

console.log("nav directly to a known CA county + place scaffold");
await page.goto("http://localhost:3000/us/ca/06037", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await shot("05-us-ca-06037.png");

await page.goto("http://localhost:3000/us/ca/06037/anytown", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await shot("06-us-place-scaffold.png");

console.log("CONSOLE_ERRORS_START");
console.log(JSON.stringify(errors, null, 2));
console.log("CONSOLE_ERRORS_END");

await browser.close();
