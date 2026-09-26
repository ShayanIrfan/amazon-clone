// Splits tall full-page screenshots into readable 1280x~1100 slices.
import { chromium } from "playwright";
import fs from "node:fs";
const [file, sliceH = "1150"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
const data = fs.readFileSync(file).toString("base64");
await page.setContent(`<img id=i src="data:image/png;base64,${data}">`);
const { w, h } = await page.evaluate(() => new Promise((r) => { const i = document.getElementById("i"); const done = () => r({ w: i.naturalWidth, h: i.naturalHeight }); i.complete ? done() : (i.onload = done); }));
await page.setViewportSize({ width: w, height: Number(sliceH) });
let n = 0;
for (let y = 0; y < h; y += Number(sliceH)) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  const out = file.replace(".png", `-part${++n}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y, width: w, height: Math.min(Number(sliceH), h - y) }, fullPage: true });
}
console.log(file, `${w}x${h} ->`, n, "parts");
await browser.close();
