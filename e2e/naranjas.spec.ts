import { expect, test, type Page } from "@playwright/test";
import { adminLogin, fixedChallenge, handle, openNaranjas, orangesIn, setGame, solveCorrectly, zone } from "./helpers";

test.beforeEach(async ({ request }) => {
  await adminLogin(request);
});

const selectedOranges = (page: Page) => page.locator('[data-orange] [data-selected="true"]');
const check = (page: Page) => page.getByRole("button", { name: /Comprobar/ });

test("exact split: 16 oranges in 4 baskets is checked against the real distribution", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(16, 4));
  const { oranges, baskets } = await openNaranjas(page);
  expect([oranges, baskets]).toEqual([16, 4]);

  await check(page).click();
  await expect(page.getByText("Aún te quedan naranjas por colocar")).toBeVisible();

  await solveCorrectly(page, oranges, baskets);
  for (let i = 0; i < 4; i++) await expect(zone(page, i).locator(".count-badge")).toHaveText("4");
  await check(page).click();
  await expect(page.getByText("4 es divisor de 16 porque podemos repartir las 16 naranjas en 4 grupos iguales")).toBeVisible();
  await expect(page.getByText("16 = 4 × 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nuevo desafío/ })).toBeVisible();
});

test("inexact split: 7 oranges in 2 baskets can be solved by leaving the leftover aside", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(7, 2));
  const { oranges, baskets } = await openNaranjas(page);
  expect([oranges, baskets]).toEqual([7, 2]);

  await solveCorrectly(page, oranges, baskets);
  await expect(orangesIn(page, 2)).toHaveCount(1);
  await check(page).click();
  await expect(page.getByText("2 no es divisor de 7 porque")).toBeVisible();
  await expect(page.getByText(/sobra una/).first()).toBeVisible();
  await expect(page.getByText("7 es un número primo")).toBeVisible();
  await expect(page.getByText("7 = 2 × 3 + 1", { exact: true })).toBeVisible();
});

test("composite number with leftovers explains it is not prime because of its divisors", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(9, 2));
  const { oranges, baskets } = await openNaranjas(page);
  await solveCorrectly(page, oranges, baskets);
  await check(page).click();
  await expect(page.getByText("2 no es divisor de 9")).toBeVisible();
  await expect(page.getByText(/9 no es primo porque.*3/)).toBeVisible();
});

test("distinguishes a wrong distribution from an impossible one and never traps the student", async ({ page, request }) => {
  await setGame(request, "naranjas", { ...fixedChallenge(7, 2), hintAttempts: 2 });
  await openNaranjas(page);
  for (const target of [0, 0, 0, 0, 1, 1, 1]) {
    await orangesIn(page, -1).first().click();
    await handle(page, target).click();
  }
  await check(page).click();
  await expect(page.getByText("Los cestos no tienen la misma cantidad")).toBeVisible();
  await check(page).click();
  await expect(page.getByText("Ese reparto es imposible")).toBeVisible();

  await orangesIn(page, 0).first().click();
  await handle(page, 2).click();
  await check(page).click();
  await expect(page.getByText("2 no es divisor de 7")).toBeVisible();
});

test("keeps sharing when leftovers could still be distributed", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(7, 2));
  await openNaranjas(page);
  for (const target of [0, 0, 1, 1, 2, 2, 2]) {
    await orangesIn(page, -1).first().click();
    await handle(page, target).click();
  }
  await check(page).click();
  await expect(page.getByText("Todavía puedes repartir más")).toBeVisible();
});

test("hints appear progressively and the help is offered after failed checks", async ({ page, request }) => {
  await setGame(request, "naranjas", { ...fixedChallenge(12, 3), hintAttempts: 2 });
  await openNaranjas(page);
  const hint = page.getByRole("button", { name: /Pista/ });
  await check(page).click();
  await check(page).click();
  await expect(page.getByText("¿Quieres una pista?")).toBeVisible();
  await hint.click();
  await expect(page.getByText("Intenta que todos los cestos tengan la misma cantidad.")).toBeVisible();
  await hint.click();
  await expect(page.getByText("¿Qué ocurre con las naranjas que no puedes repartir?")).toBeVisible();
  await hint.click();
  await expect(page.getByText(/Al dividir 12 entre 3 salen 4 para cada cesto/)).toBeVisible();
});

test("dragging one orange with the mouse moves it, and it can be returned", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  await openNaranjas(page);
  const source = await orangesIn(page, -1).first().boundingBox();
  const target = await handle(page, 1).boundingBox();
  await page.mouse.move(source!.x + 20, source!.y + 20);
  await page.mouse.down();
  await page.mouse.move(source!.x + 60, source!.y + 60, { steps: 4 });
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 4, { steps: 10 });
  await page.mouse.up();
  await expect(orangesIn(page, 1)).toHaveCount(1);
  await expect(orangesIn(page, -1)).toHaveCount(11);
  await page.waitForTimeout(700);

  const back = await orangesIn(page, 1).first().boundingBox();
  const pile = await zone(page, -1).boundingBox();
  await page.mouse.move(back!.x + 12, back!.y + 12);
  await page.mouse.down();
  await page.mouse.move(back!.x + 40, back!.y - 40, { steps: 4 });
  await page.mouse.move(pile!.x + 30, pile!.y + 10, { steps: 10 });
  await page.mouse.up();
  await expect(orangesIn(page, 1)).toHaveCount(0);
  await expect(orangesIn(page, -1)).toHaveCount(12);
});

async function lassoAround(page: Page, indexes: number[], pad = 28) {
  const boxes = await Promise.all(indexes.map((i) => orangesIn(page, -1).nth(i).boundingBox()));
  const left = Math.min(...boxes.map((b) => b!.x)) - pad;
  const right = Math.max(...boxes.map((b) => b!.x + b!.width)) + pad;
  const top = Math.min(...boxes.map((b) => b!.y)) - pad;
  const bottom = Math.max(...boxes.map((b) => b!.y + b!.height)) + pad;
  const points = [[left, top], [right, top], [right, bottom], [left, bottom], [left, top - 2]];
  await page.mouse.move(points[0][0], points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

test("grouping mode: a lasso selects exactly the oranges it contains, then a basket receives them", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  await openNaranjas(page);
  await page.getByRole("radio", { name: "Agrupar" }).click();
  await lassoAround(page, [0, 1, 2, 3]);
  await expect(selectedOranges(page)).toHaveCount(4);
  await expect(page.getByText("4 seleccionadas")).toBeVisible();
  await handle(page, 2).click();
  await expect(orangesIn(page, 2)).toHaveCount(4);
  await expect(zone(page, 2).locator(".count-badge")).toHaveText("4");
  await expect(orangesIn(page, -1)).toHaveCount(8);
});

test("grouping mode: a lasso around nothing selects nothing, and a tight lasso excludes the oranges outside it", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  await openNaranjas(page);
  await page.getByRole("radio", { name: "Agrupar" }).click();
  await lassoAround(page, [0, 1], 10);
  await expect(selectedOranges(page)).toHaveCount(2);
  await handle(page, 0).click();
  await expect(orangesIn(page, 0)).toHaveCount(2);

  const empty = await zone(page, 2).boundingBox();
  const startX = empty!.x + 20;
  const startY = empty!.y - 60;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (const [dx, dy] of [[80, 0], [80, 40], [0, 40], [0, -2]]) await page.mouse.move(startX + dx, startY + dy, { steps: 6 });
  await page.mouse.up();
  await expect(selectedOranges(page)).toHaveCount(0);
});

test("grouping mode works with a touch screen (lasso drawn with touch events)", async ({ browser, request }) => {
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  const context = await browser.newContext({ viewport: { width: 820, height: 1000 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/juegos/naranjas");
  await page.waitForSelector("[data-orange]");
  await page.getByRole("radio", { name: "Agrupar" }).tap();
  const boxes = await Promise.all([0, 1, 2].map((i) => orangesIn(page, -1).nth(i).boundingBox()));
  const left = Math.min(...boxes.map((b) => b!.x)) - 22;
  const right = Math.max(...boxes.map((b) => b!.x + b!.width)) + 22;
  const top = Math.min(...boxes.map((b) => b!.y)) - 22;
  const bottom = Math.max(...boxes.map((b) => b!.y + b!.height)) + 22;
  const cdp = await context.newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", left, top);
  let [fromX, fromY] = [left, top];
  for (const [x, y] of [[right, top], [right, bottom], [left, bottom], [left, top - 2]]) {
    for (let step = 1; step <= 8; step++) await touch("touchMove", fromX + ((x - fromX) * step) / 8, fromY + ((y - fromY) * step) / 8);
    [fromX, fromY] = [x, y];
  }
  await touch("touchEnd", left, top);
  await expect(selectedOranges(page)).toHaveCount(3);
  await handle(page, 1).tap();
  await expect(orangesIn(page, 1)).toHaveCount(3);
  await context.close();
});

test("keyboard: select an orange with Space and place it with Enter on a basket", async ({ page, request }) => {
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  await openNaranjas(page);
  await orangesIn(page, -1).first().focus();
  await page.keyboard.press("Space");
  await expect(selectedOranges(page)).toHaveCount(1);
  await zone(page, 0).focus();
  await page.keyboard.press("Enter");
  await expect(orangesIn(page, 0)).toHaveCount(1);
});

test("a single configured mode hides the selector", async ({ page, request }) => {
  await setGame(request, "naranjas", { ...fixedChallenge(12, 3), modes: ["group"] });
  await openNaranjas(page);
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  await expect(page.getByText(/Rodea varias naranjas/)).toBeVisible();
});

test("new challenge never repeats the previous one when alternatives exist", async ({ page, request }) => {
  await setGame(request, "naranjas", { ...fixedChallenge(12, 3), minOranges: 10, maxOranges: 14, minBaskets: 2, maxBaskets: 4, primePct: 20, exactPct: 50 });
  let previous = await openNaranjas(page);
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Otro desafío" }).click();
    await page.waitForSelector("[data-orange]");
    const text = (await page.locator("p", { hasText: /Reparte \d+ naranjas/ }).first().innerText()).replace(/\s+/g, " ");
    const [, o, b] = text.match(/Reparte (\d+) naranjas entre (\d+) cestos/)!;
    expect(`${o}x${b}`).not.toBe(`${previous.oranges}x${previous.baskets}`);
    previous = { oranges: Number(o), baskets: Number(b) };
  }
});

test("with the config service failing the game still works with the default limits", async ({ page }) => {
  await page.route("**/api/config/**", (route) => route.abort());
  const { oranges, baskets } = await openNaranjas(page);
  expect(oranges).toBeGreaterThanOrEqual(6);
  expect(oranges).toBeLessThanOrEqual(30);
  expect(baskets).toBeGreaterThanOrEqual(2);
  expect(baskets).toBeLessThanOrEqual(8);
});

test("40 oranges stay responsive on a throttled CPU", async ({ page, request }) => {
  await setGame(request, "naranjas", { ...fixedChallenge(40, 5), maxOranges: 40, minOranges: 40 });
  await openNaranjas(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const frames: number[] = [];
    (window as unknown as { __frames: number[] }).__frames = frames;
    let last = performance.now();
    const tick = (now: number) => {
      frames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  for (let i = 0; i < 8; i++) {
    await orangesIn(page, -1).first().click();
    await handle(page, i % 5).click();
  }
  await page.waitForTimeout(700);
  const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames);
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`40 oranges, CPU x4: ${frames.length} frames, p95 frame ${p95.toFixed(1)} ms`);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  expect(p95).toBeLessThan(80);
  await expect(page.locator("[data-orange]")).toHaveCount(40);
});
