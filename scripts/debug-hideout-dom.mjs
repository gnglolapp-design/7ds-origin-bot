import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const out = { weapons: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") out.slug = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--weapons") {
      out.weapons = argv.slice(i + 1);
      break;
    }
  }
  return out;
}

function safeName(s) {
  return String(s)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

async function tryClick(page, text) {
  const locators = [
    page.getByRole("button", { name: text, exact: true }),
    page.getByRole("link", { name: text, exact: true }),
    page.getByText(text, { exact: true })
  ];

  for (const loc of locators) {
    const count = await loc.count().catch(() => 0);
    if (count > 0) {
      try {
        await loc.first().click({ force: true, timeout: 3000 });
        return true;
      } catch {}
    }
  }
  return false;
}

async function dismissBanners(page) {
  const candidates = [
    "Accept",
    "I Accept",
    "Accept All",
    "Agree",
    "OK",
    "Got it"
  ];

  for (const text of candidates) {
    try {
      const ok = await tryClick(page, text);
      if (ok) {
        await page.waitForTimeout(500);
        return;
      }
    } catch {}
  }
}

async function saveSnapshot(page, outDir, name) {
  const html = await page.content();
  const text = await page.locator("body").innerText().catch(() => "");
  await writeFile(path.join(outDir, `${safeName(name)}.html`), html);
  await writeFile(path.join(outDir, `${safeName(name)}.txt`), text);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.slug) throw new Error("--slug manquant");
  if (!args.url) throw new Error("--url manquant");
  if (!args.weapons || args.weapons.length === 0) throw new Error("--weapons manquant");

  const outDir = path.join(process.cwd(), "data", "debug", "hideout", args.slug);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  try {
    await page.goto(args.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    await dismissBanners(page);
    await saveSnapshot(page, outDir, "00_loaded");

    const tabs = ["Weapons", "Potentials"];

    for (const tab of tabs) {
      const clickedTab = await tryClick(page, tab);
      await page.waitForTimeout(clickedTab ? 2500 : 1000);
      await saveSnapshot(page, outDir, `10_tab_${tab}`);

      for (const weapon of args.weapons) {
        const clickedWeapon = await tryClick(page, weapon);
        await page.waitForTimeout(clickedWeapon ? 2000 : 1000);
        await saveSnapshot(page, outDir, `20_${tab}_${weapon}`);
      }
    }

    console.log(`OK: snapshots écrits dans ${outDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
