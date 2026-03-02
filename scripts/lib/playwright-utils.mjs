import { chromium } from "playwright";

const DEFAULT_TIMEOUT = 45_000;

export async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 1600 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT);
    return await fn(page, context);
  } finally {
    await browser.close();
  }
}

export async function openPage(page, url, waitMs = 1200) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(waitMs);
  return extractPageState(page, url);
}

export async function extractPageState(page, url) {
  return page.evaluate((currentUrl) => {
    const text = document.body?.innerText || "";
    const title = document.querySelector("h1")?.textContent?.trim() || document.title || "";
    const ogImage = document.querySelector('meta[property="og:image"]')?.content || null;
    const ogDescription = document.querySelector('meta[property="og:description"]')?.content || null;
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({
      href: a.href,
      text: (a.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    const imgAlts = [...document.querySelectorAll('img[alt]')]
      .map((img) => img.alt?.trim())
      .filter(Boolean);
    return {
      url: currentUrl,
      title,
      text,
      html: document.documentElement.outerHTML,
      ogImage,
      ogDescription,
      links,
      imgAlts,
    };
  }, url);
}

export async function safeOpen(page, url, waitMs = 1200) {
  try {
    return await openPage(page, url, waitMs);
  } catch (error) {
    return {
      url,
      error: String(error?.message || error),
      title: "",
      text: "",
      html: "",
      ogImage: null,
      ogDescription: null,
      links: [],
      imgAlts: [],
    };
  }
}
