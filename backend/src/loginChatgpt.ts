import { chromium } from "playwright";

async function main(): Promise<void> {
  const context = await chromium.launchPersistentContext(".astraea-profile", {
    headless: false,
    channel: "chrome",
    viewport: { width: 1440, height: 980 },
  });

  const page = await context.newPage();
  await page.goto("https://chatgpt.com/", { waitUntil: "domcontentloaded" });
  console.log("Login bootstrap opened. Log into ChatGPT in this window, then press Ctrl+C in terminal.");
}

void main();
