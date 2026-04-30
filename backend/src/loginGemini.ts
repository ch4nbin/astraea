import { chromium } from "playwright";

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(".astraea-profile", {
    headless: false,
    channel: "chrome",
    viewport: { width: 1440, height: 980 },
  });

  const page = await context.newPage();
  await page.goto("https://gemini.google.com/", { waitUntil: "domcontentloaded" });
  console.log("Gemini login bootstrap opened. Log in, then press Ctrl+C.");
}

void main();
