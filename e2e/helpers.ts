import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "./global-setup";

export async function adminLogin(request: APIRequestContext) {
  const response = await request.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } });
  expect(response.ok()).toBe(true);
}

export async function setGame(request: APIRequestContext, slug: string, config: Record<string, unknown>, enabled = true) {
  const response = await request.put(`/api/admin/games/${slug}`, { data: { enabled, config } });
  expect(response.status(), await response.text()).toBe(200);
}

export const NARANJAS_DEFAULTS = {
  minOranges: 6, maxOranges: 30, minBaskets: 2, maxBaskets: 8, primePct: 25, exactPct: 50, hintSeconds: 30, hintAttempts: 2, modes: ["drag", "group"],
};

const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);

export function fixedChallenge(oranges: number, baskets: number) {
  const prime = isPrime(oranges);
  const exact = !prime && oranges % baskets === 0;
  return {
    ...NARANJAS_DEFAULTS,
    minOranges: oranges, maxOranges: oranges, minBaskets: baskets, maxBaskets: baskets,
    primePct: prime ? 100 : 0, exactPct: exact ? 100 : 0,
  };
}

export async function openNaranjas(page: Page) {
  await page.goto("/juegos/naranjas");
  await page.waitForSelector("[data-orange]");
  const text = (await page.locator("p", { hasText: /Reparte \d+ naranjas/ }).first().innerText()).replace(/\s+/g, " ");
  const [, oranges, baskets] = text.match(/Reparte (\d+) naranjas entre (\d+) cestos/)!;
  return { oranges: Number(oranges), baskets: Number(baskets) };
}

export const zone = (page: Page, id: number) => page.locator(`[data-zone="${id}"]`);
export const orangesIn = (page: Page, id: number) => zone(page, id).locator("[data-orange]");

export const handle = (page: Page, id: number) => zone(page, id).locator(".basket-front, > p").first();

export async function placeCount(page: Page, count: number, target: number) {
  for (let i = 0; i < count; i++) {
    await orangesIn(page, -1).first().click();
    await handle(page, target).click();
  }
}

export async function solveCorrectly(page: Page, oranges: number, baskets: number) {
  const each = Math.floor(oranges / baskets);
  for (let basket = 0; basket < baskets; basket++) await placeCount(page, each, basket);
  await placeCount(page, oranges - each * baskets, baskets);
}
