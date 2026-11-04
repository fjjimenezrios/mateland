import { expect, test, type Page } from "@playwright/test";
import { adminLogin, setGame } from "./helpers";

const cazaConfig = (n: number, bubbles = 10) => ({ minNumber: n, maxNumber: n, bubbles, primePct: 0, hintSeconds: 30, hintAttempts: 2 });
const primeConfig = (n: number) => ({ ...cazaConfig(n), primePct: 100 });

const divisorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const bubble = (page: Page, value: number) => page.getByRole("button", { name: `Burbuja ${value}`, exact: true });

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/juegos/caza-divisores");
  await page.waitForSelector(".bubble");
  const label = await page.getByLabel(/^Número \d+$/).getAttribute("aria-label");
  const n = Number(label!.replace("Número ", ""));
  const values = await page.locator(".bubble").evaluateAll((nodes) => nodes.map((node) => Number(node.textContent)));
  return { n, values };
}

test.beforeEach(async ({ request }) => {
  await adminLogin(request);
});

test("finding every divisor of a composite number finishes the challenge and explains why it is not prime", async ({ page, request }) => {
  await setGame(request, "caza-divisores", cazaConfig(12));
  const { n, values } = await open(page);
  expect(n).toBe(12);
  expect(values).toHaveLength(10);
  for (const d of divisorsOf(12)) expect(values).toContain(d);

  for (const d of divisorsOf(12)) await bubble(page, d).click();
  await expect(page.getByText("Los divisores de 12 son 1, 2, 3, 4, 6, 12")).toBeVisible();
  await expect(page.getByText("12 no es primo")).toBeVisible();
  await expect(page.getByRole("list", { name: "Divisores encontrados" }).getByText("12 = 3 × 4")).toBeVisible();
  await expect(page.getByRole("button", { name: /Nuevo desafío/ })).toBeVisible();
});

test("a wrong bubble is explained with the division and does not count as found", async ({ page, request }) => {
  await setGame(request, "caza-divisores", cazaConfig(12));
  const { values } = await open(page);
  const wrong = values.find((v) => 12 % v !== 0)!;
  await bubble(page, wrong).click();
  await expect(page.getByText(wrong > 12 ? new RegExp(`${wrong} es mayor que 12`) : new RegExp(`12 ÷ ${wrong} no es exacta`))).toBeVisible();
  await expect(bubble(page, wrong)).toHaveAttribute("data-state", "wrong");
  await expect(page.getByText(/Has encontrado\s*0\s*de\s*6/)).toBeVisible();

  await bubble(page, 4).click();
  await expect(bubble(page, 4)).toHaveAttribute("data-state", "found");
  await expect(page.getByText("¡Sí! 12 = 4 × 3")).toBeVisible();
});

test("a prime number is identified by its two divisors", async ({ page, request }) => {
  await setGame(request, "caza-divisores", primeConfig(13));
  const { n } = await open(page);
  expect(n).toBe(13);
  await bubble(page, 1).click();
  await bubble(page, 13).click();
  await expect(page.getByText(/Solo tiene dos divisores.*13 es un número primo/)).toBeVisible();
});

test("hints are progressive and the last one highlights a pending divisor", async ({ page, request }) => {
  await setGame(request, "caza-divisores", cazaConfig(12));
  await open(page);
  const hint = page.getByRole("button", { name: /Pista/ });
  await hint.click();
  await expect(page.getByText("Prueba a dividir 12")).toBeVisible();
  await hint.click();
  await expect(page.getByText(/divisores van en parejas/)).toBeVisible();
  await hint.click();
  await expect(page.getByText(/Mira la burbuja que brilla/)).toBeVisible();
  await expect(page.locator('.bubble[data-glow="true"]')).toHaveCount(1);
});

test("the numbers always respect the configured range and prime frequency", async ({ page, request }) => {
  await setGame(request, "caza-divisores", { minNumber: 20, maxNumber: 30, bubbles: 12, primePct: 0, hintSeconds: 30, hintAttempts: 2 });
  for (let i = 0; i < 6; i++) {
    const { n } = await open(page);
    expect(n).toBeGreaterThanOrEqual(20);
    expect(n).toBeLessThanOrEqual(30);
    expect([23, 29]).not.toContain(n);
  }
});

test("a range that cannot produce exercises is rejected by the server", async ({ request }) => {
  const response = await request.put("/api/admin/games/caza-divisores", {
    data: { enabled: true, config: { minNumber: 24, maxNumber: 28, bubbles: 12, primePct: 20, hintSeconds: 30, hintAttempts: 2 } },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).errors.primePct).toContain("primo");
});
