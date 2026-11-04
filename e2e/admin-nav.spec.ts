import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "./global-setup";
import { adminLogin, setGame, NARANJAS_DEFAULTS } from "./helpers";

const CAZA = { minNumber: 6, maxNumber: 48, bubbles: 12, primePct: 20, hintSeconds: 30, hintAttempts: 2 };
const crumbs = (page: Page) => page.getByRole("navigation", { name: "Migas de pan" });

async function login(page: Page, path = "/admin") {
  await page.goto(path);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.beforeEach(async ({ request }) => {
  await adminLogin(request);
  await setGame(request, "naranjas", NARANJAS_DEFAULTS);
  await setGame(request, "caza-divisores", CAZA);
});

test("the panel opens with the same game cards the students see, plus their state", async ({ page, request }) => {
  await setGame(request, "caza-divisores", CAZA, false);
  await login(page);
  await expect(page.getByRole("heading", { name: "Juegos", level: 1 })).toBeVisible();
  const naranjas = page.getByRole("link", { name: /Las naranjas y los cestos/ });
  const caza = page.getByRole("link", { name: /Caza-divisores/ });
  await expect(naranjas.locator("svg")).toBeVisible();
  await expect(caza.locator("svg")).toBeVisible();
  await expect(naranjas.getByText("Divisibilidad")).toBeVisible();
  await expect(naranjas.getByText("Visible")).toBeVisible();
  await expect(caza.getByText("Oculto")).toBeVisible();
  await expect(page.getByRole("link", { name: /Alumnos y clases/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mi cuenta/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  await expect(crumbs(page)).toContainText("Panel");
});

test("a game card leads to its settings with a breadcrumb back to the panel", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Caza-divisores/ }).click();
  await expect(page).toHaveURL(/\/admin\/juegos\/caza-divisores$/);
  await expect(crumbs(page).getByRole("link", { name: "Panel" })).toBeVisible();
  await expect(crumbs(page).getByText("Caza-divisores")).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Número máximo", { exact: true }).last()).toHaveValue("48");
  await expect(page.getByRole("link", { name: /Ver como alumno/ })).toHaveAttribute("href", "/juegos/caza-divisores");

  await crumbs(page).getByRole("link", { name: "Panel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Juegos", level: 1 })).toBeVisible();
});

test("students and account pages have their own breadcrumb", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Alumnos y clases/ }).click();
  await expect(page).toHaveURL(/\/admin\/alumnos$/);
  await expect(crumbs(page)).toContainText("Panel");
  await expect(crumbs(page).getByText("Alumnos y clases")).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Acceso con cuenta" })).toBeVisible();

  await crumbs(page).getByRole("link", { name: "Panel" }).click();
  await page.getByRole("link", { name: /Mi cuenta/ }).click();
  await expect(page).toHaveURL(/\/admin\/cuenta$/);
  await expect(crumbs(page).getByText("Mi cuenta")).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Cambiar contraseña" })).toBeVisible();
});

test("every admin page asks for the password when there is no session", async ({ page }) => {
  for (const path of ["/admin", "/admin/juegos/naranjas", "/admin/alumnos", "/admin/cuenta"]) {
    await page.goto(path);
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Migas de pan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  }
});

test("logging in from a deep link lands on that page, and an unknown game is a 404", async ({ page }) => {
  await login(page, "/admin/juegos/naranjas");
  await expect(page).toHaveURL(/\/admin\/juegos\/naranjas$/);
  await expect(page.getByRole("heading", { name: "Las naranjas y los cestos", level: 2 })).toBeVisible();
  expect((await page.request.get("/admin/juegos/inventado")).status()).toBe(404);
});

test("settings saved in a game page show up on the panel home as visibility", async ({ page }) => {
  await login(page, "/admin/juegos/caza-divisores");
  await page.getByLabel("Visible para los alumnos").uncheck();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/Guardado\./)).toBeVisible();
  await crumbs(page).getByRole("link", { name: "Panel" }).click();
  await expect(page.getByRole("link", { name: /Caza-divisores/ }).getByText("Oculto")).toBeVisible();
});

test("the panel is usable on a phone: cards stack and the breadcrumb stays visible", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await login(page, "/admin/juegos/naranjas");
  await expect(crumbs(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await context.close();
});
