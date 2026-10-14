// Regression check for the journey globe's stop tour on a throttled phone (not part of vitest).
//   npm run build && (npx next start -p 3321 &)
//   PLAYWRIGHT_PATH=$(npm root -g)/playwright/index.mjs node scripts/qa-globe.mjs http://localhost:3321
const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");

const base = process.argv[2] ?? "http://localhost:3000";
// ms, during a fly-to with the CPU throttled 6x. The idle page already shows ~120ms gaps at this throttle
// (clock tickers, CSS animations); the pre-fix globe hit 330–450ms, so 200 catches a regression without flaking.
const MAX_FRAME_GAP = Number(process.env.QA_MAX_GAP ?? 200);
const FLY_MS = 1400; // the stop fly-to
const MAX_SETTLE_GAP = 250; // ms, the one-off frame that swaps in the 50m coastline once the camera has stopped
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(base, { waitUntil: "load" });
const journey = page.locator("#journey-heading");
await journey.scrollIntoViewIfNeeded();
await page.waitForSelector("section[aria-labelledby=journey-heading] svg[role=img]");
const section = page.locator("section[aria-labelledby=journey-heading]");
await page.waitForTimeout(2800); // the opening swing to Nikumaroro

await section.getByRole("button", { name: /Take the tour/ }).click();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

// Longest gap between animation frames, in two windows: during the fly-to, and after it (the settle swap).
await page.evaluate(() => {
  window.__gaps = { fly: 0, settle: 0, t0: 0 };
  let last = performance.now();
  const tick = (t) => {
    const g = window.__gaps;
    if (g.t0) {
      const k = t - g.t0 < window.__flyMs ? "fly" : "settle";
      g[k] = Math.max(g[k], t - last);
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.evaluate((ms) => (window.__flyMs = ms), FLY_MS);

// Context for the numbers below: the page's own tickers and CSS animations already cost frames at 6x, tour or no tour.
const idle = await page.evaluate(
  () =>
    new Promise((done) => {
      let last = performance.now();
      const t0 = last;
      let max = 0;
      const tick = (t) => {
        max = Math.max(max, t - last);
        last = t;
        if (t - t0 < 3000) requestAnimationFrame(tick);
        else done(max);
      };
      requestAnimationFrame(tick);
    }),
);
console.log(`idle max frame gap (no motion, same throttle): ${idle.toFixed(0)}ms`);

const chipCount = await section.locator("button[aria-pressed]").count();
const next = section.getByRole("button", { name: /Next →/ });
const nextY = [];
const gaps = [];

for (let i = 1; i < chipCount; i++) {
  // Windows are timed inside the page (from the click), so Playwright's own round trips can't add gaps.
  await page.evaluate(() => {
    Object.assign(window.__gaps, { fly: 0, settle: 0, t0: 0 });
    document.addEventListener(
      "click",
      () => {
        window.__gaps.t0 = performance.now();
        setTimeout(() => (window.__gaps.t0 = 0), 2000);
      },
      { once: true, capture: true },
    );
  });
  await next.click();
  await page.waitForTimeout(2300);
  gaps.push(await page.evaluate(() => ({ ...window.__gaps })));

  const state = await page.evaluate(() => {
    const sec = document.querySelector("section[aria-labelledby=journey-heading]");
    const pressed = [...sec.querySelectorAll("button[aria-pressed=true]")];
    const chip = pressed[0];
    const h3 = sec.querySelector("h3")?.textContent ?? "";
    const kicker = sec.querySelector("h3")?.previousElementSibling?.textContent ?? "";
    const nextBtn = [...sec.querySelectorAll("button")].find((b) => b.textContent.includes("Next →"));
    return {
      pressed: pressed.length,
      short: chip?.firstChild?.textContent?.trim() ?? "",
      era: chip?.querySelector("span")?.textContent ?? "",
      h3,
      kicker,
      svgTop: sec.querySelector("svg[role=img]").getBoundingClientRect().top,
      nextY: nextBtn.getBoundingClientRect().top + window.scrollY,
    };
  });
  const label = `stop ${i + 1}/${chipCount} ${state.short} ${state.era}`;
  const eraOk = state.kicker.startsWith(state.era);
  check(state.pressed === 1 && state.h3.includes(state.short) && eraOk, `${label}: card "${state.h3}" matches the pressed chip`);
  check(state.svgTop >= 0 && state.svgTop <= 120, `${label}: globe top ${state.svgTop.toFixed(0)}px in [0,120]`);
  nextY.push(state.nextY);
  const g = gaps.at(-1);
  check(g.fly < MAX_FRAME_GAP, `${label}: max frame gap during fly-to ${g.fly.toFixed(0)}ms < ${MAX_FRAME_GAP}ms`);
  check(g.settle < MAX_SETTLE_GAP, `${label}: max frame gap at settle ${g.settle.toFixed(0)}ms < ${MAX_SETTLE_GAP}ms`);
}

const spread = Math.max(...nextY) - Math.min(...nextY);
check(spread <= 1, `Next button y stable across steps (spread ${spread.toFixed(1)}px)`);
console.log(`max frame gap over all steps: fly-to ${Math.max(...gaps.map((g) => g.fly)).toFixed(0)}ms, settle ${Math.max(...gaps.map((g) => g.settle)).toFixed(0)}ms`);
check(errors.length === 0, `no console errors or page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nglobe QA passed");
