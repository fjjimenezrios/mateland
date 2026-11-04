import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "./global-setup";
import { adminLogin, fixedChallenge, handle, NARANJAS_DEFAULTS, openNaranjas, orangesIn, setGame } from "./helpers";

async function uiLogin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Juegos", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Las naranjas y los cestos" })).toBeVisible();
}

async function openGameSettings(page: Page, title: string) {
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("navigation", { name: "Migas de pan" })).toContainText(title);
  await expect(page.getByRole("heading", { name: title, level: 2 })).toBeVisible();
}

const card = (page: Page, title: string) => page.locator("section", { has: page.getByRole("heading", { name: title }) });
const field = (page: Page, label: string) => card(page, "Las naranjas y los cestos").getByLabel(label, { exact: true }).last();

test.describe("access control", () => {
  test("anonymous visitors see only the login form at /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Panel del profesor" })).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Las naranjas y los cestos" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
  });

  test("every admin endpoint refuses requests without an admin session", async ({ request }) => {
    const body = { enabled: true, config: NARANJAS_DEFAULTS };
    const calls = [
      request.get("/api/admin/games/naranjas"),
      request.put("/api/admin/games/naranjas", { data: body }),
      request.get("/api/admin/settings"),
      request.put("/api/admin/settings", { data: { accountsEnabled: true } }),
      request.post("/api/admin/password", { data: { current: "x", next: "una-clave-nueva-larga" } }),
      request.get("/api/admin/students"),
      request.post("/api/admin/classes", { data: { name: "x", usernames: "ana" } }),
      request.delete("/api/admin/classes/abc"),
      request.patch("/api/admin/students/abc", { data: { action: "reset" } }),
    ];
    for (const response of await Promise.all(calls)) expect(response.status()).toBe(401);
  });

  test("a student session cannot use admin endpoints either", async ({ request }) => {
    await adminLogin(request);
    await request.put("/api/admin/settings", { data: { accountsEnabled: true } });
    const created = await request.post("/api/admin/classes", { data: { name: "Acceso", usernames: "intruso" } });
    const { credentials } = await created.json();
    await request.post("/api/auth/logout");
    const login = await request.post("/api/auth/student", { data: { username: "intruso", password: credentials[0].password } });
    expect(login.status()).toBe(200);
    expect((await request.put("/api/admin/games/naranjas", { data: { enabled: true, config: NARANJAS_DEFAULTS } })).status()).toBe(401);
    expect((await request.get("/api/admin/students")).status()).toBe(401);
    await adminLogin(request);
    await request.put("/api/admin/settings", { data: { accountsEnabled: false } });
  });

  test("forged and tampered session cookies are rejected", async ({ browser }) => {
    const context = await browser.newContext();
    const forged = Buffer.from(JSON.stringify({ role: "admin", sub: "admin", exp: 9999999999 })).toString("base64url");
    await context.addCookies([{ name: "mates_session", value: `${forged}.firmafalsa`, url: "http://localhost:3101" }]);
    expect((await context.request.get("/api/admin/students")).status()).toBe(401);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await context.close();
  });

  test("cross-origin writes are refused and the session cookie is HttpOnly", async ({ request, context }) => {
    await adminLogin(request);
    const cookie = (await context.cookies()).find((c) => c.name === "mates_session") ?? (await request.storageState()).cookies.find((c) => c.name === "mates_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    const evil = await request.put("/api/admin/games/naranjas", {
      data: { enabled: true, config: NARANJAS_DEFAULTS },
      headers: { Origin: "https://evil.example" },
    });
    expect(evil.status()).toBe(403);
    const noJson = await request.fetch("/api/admin/settings", { method: "PUT", data: "accountsEnabled=true", headers: { "Content-Type": "text/plain" } });
    expect(noJson.status()).toBe(415);
  });

  test("wrong password is refused and the right one opens the panel", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Contraseña").fill("incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Contraseña incorrecta")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Las naranjas y los cestos" })).toHaveCount(0);
    await uiLogin(page);
  });

  test("the public config endpoint exposes only that game's settings", async ({ request }) => {
    const body = await (await request.get("/api/config/naranjas")).text();
    expect(body).not.toMatch(/passwordHash|salt|admin|session/i);
    expect((await request.get("/api/config/otro-juego")).status()).toBe(404);
    expect((await request.get("/api/config/naranjas")).headers()["cache-control"]).toBe("no-store");
  });
});

test.describe("configuration", () => {
  test.beforeEach(async ({ request }) => {
    await adminLogin(request);
    await setGame(request, "naranjas", { ...NARANJAS_DEFAULTS, maxOranges: 20 });
  });

  test("success scenario: the teacher raises the maximum from 20 to 30 and new students receive it", async ({ page, browser }) => {
    await uiLogin(page);
    await openGameSettings(page, "Las naranjas y los cestos");
    await expect(field(page, "Máximo de naranjas")).toHaveValue("20");
    await field(page, "Mínimo de naranjas").fill("28");
    await field(page, "Máximo de naranjas").fill("30");
    await field(page, "Frecuencia de números primos").fill("0");
    await card(page, "Las naranjas y los cestos").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Guardado\./)).toBeVisible();

    const student = await browser.newContext();
    const studentPage = await student.newPage();
    const seen = new Set<number>();
    for (let i = 0; i < 6; i++) {
      const { oranges } = await openNaranjas(studentPage);
      expect(oranges).toBeGreaterThanOrEqual(28);
      expect(oranges).toBeLessThanOrEqual(30);
      seen.add(oranges);
    }
    expect(seen.size).toBeGreaterThan(1);
    await student.close();
  });

  test("two students on different devices get their own independent exercise", async ({ browser, request }) => {
    await setGame(request, "naranjas", { ...NARANJAS_DEFAULTS, minOranges: 6, maxOranges: 30 });
    const pairs = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const { oranges, baskets } = await openNaranjas(page);
      pairs.add(`${oranges}x${baskets}`);
      await context.close();
    }
    expect(pairs.size).toBeGreaterThan(1);
  });

  test("invalid combinations show clear messages and block saving", async ({ page }) => {
    await uiLogin(page);
    await openGameSettings(page, "Las naranjas y los cestos");
    const naranjas = card(page, "Las naranjas y los cestos");
    const save = naranjas.getByRole("button", { name: "Guardar" });

    await field(page, "Mínimo de naranjas").fill("25");
    await field(page, "Máximo de naranjas").fill("10");
    await expect(naranjas.getByText("El mínimo de naranjas no puede superar al máximo")).toBeVisible();
    await expect(save).toBeDisabled();

    await field(page, "Mínimo de naranjas").fill("6");
    await field(page, "Máximo de naranjas").fill("30");
    await field(page, "Frecuencia de números primos").fill("60");
    await field(page, "Frecuencia de repartos exactos").fill("50");
    await expect(naranjas.getByText("Primos y repartos exactos no pueden sumar más de 100 %")).toBeVisible();
    await expect(save).toBeDisabled();

    await field(page, "Frecuencia de números primos").fill("25");
    await field(page, "Frecuencia de repartos exactos").fill("50");
    await field(page, "Mínimo de naranjas").fill("24");
    await field(page, "Máximo de naranjas").fill("28");
    await expect(naranjas.getByText(/No hay ningún número primo/)).toBeVisible();
    await expect(save).toBeDisabled();

    await field(page, "Mínimo de naranjas").fill("6");
    await field(page, "Máximo de naranjas").fill("90");
    await expect(naranjas.getByText("Debe ser un número entre 3 y 40")).toBeVisible();
    await expect(save).toBeDisabled();

    await field(page, "Máximo de naranjas").fill("30");
    await naranjas.getByLabel("Arrastrar").uncheck();
    await naranjas.getByLabel("Agrupar").uncheck();
    await expect(naranjas.getByText("Activa al menos una modalidad")).toBeVisible();
    await expect(save).toBeDisabled();
    await naranjas.getByLabel("Agrupar").check();
    await expect(save).toBeEnabled();
  });

  test("the server also rejects invalid configs even when the UI is bypassed", async ({ request }) => {
    const bad = [
      { ...NARANJAS_DEFAULTS, primePct: 80, exactPct: 80 },
      { ...NARANJAS_DEFAULTS, minOranges: 30, maxOranges: 6 },
      { ...NARANJAS_DEFAULTS, maxOranges: 500 },
      { ...NARANJAS_DEFAULTS, modes: [] },
      { ...NARANJAS_DEFAULTS, modes: ["volar"] },
      { ...NARANJAS_DEFAULTS, minOranges: 24, maxOranges: 28 },
      { ...NARANJAS_DEFAULTS, hintSeconds: "rápido" },
    ];
    for (const config of bad) {
      const response = await request.put("/api/admin/games/naranjas", { data: { enabled: true, config } });
      expect(response.status(), JSON.stringify(config)).toBe(400);
    }
    expect((await (await request.get("/api/admin/games/naranjas")).json()).config.maxOranges).toBe(20);
  });

  test("the preview shows examples that respect the limits", async ({ page }) => {
    await uiLogin(page);
    await openGameSettings(page, "Las naranjas y los cestos");
    const naranjas = card(page, "Las naranjas y los cestos");
    await expect(naranjas.getByText("Ejemplos de lo que verían los alumnos")).toBeVisible();
    const lines = await naranjas.locator("ul li").allInnerTexts();
    expect(lines).toHaveLength(5);
    for (const line of lines) {
      const oranges = Number(line.match(/(\d+) naranjas/)![1]);
      expect(oranges).toBeLessThanOrEqual(20);
    }
  });

  test("a student who already started finishes with the config they started with", async ({ page, request }) => {
    await setGame(request, "naranjas", fixedChallenge(12, 3));
    const first = await openNaranjas(page);
    expect([first.oranges, first.baskets]).toEqual([12, 3]);

    await setGame(request, "naranjas", fixedChallenge(20, 4));
    await orangesIn(page, -1).first().click();
    await handle(page, 0).click();
    await expect(orangesIn(page, -1)).toHaveCount(11);
    await expect(page.getByText(/Reparte\s*12\s*naranjas entre\s*3\s*cestos/)).toBeVisible();

    await page.getByRole("button", { name: "Otro desafío" }).click();
    await expect(page.getByText(/Reparte\s*20\s*naranjas entre\s*4\s*cestos/)).toBeVisible();
  });

  test("a disabled game disappears from the gallery and cannot be played", async ({ page, request }) => {
    await setGame(request, "caza-divisores", { minNumber: 6, maxNumber: 48, bubbles: 12, primePct: 20, hintSeconds: 30, hintAttempts: 2 }, false);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Las naranjas y los cestos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Caza-divisores" })).toHaveCount(0);
    await page.goto("/juegos/caza-divisores");
    await expect(page.getByText("Este juego no está disponible ahora")).toBeVisible();
    await setGame(request, "caza-divisores", { minNumber: 6, maxNumber: 48, bubbles: 12, primePct: 20, hintSeconds: 30, hintAttempts: 2 }, true);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Caza-divisores" })).toBeVisible();
  });

  test("the teacher can change their password and the old one stops working", async ({ page, request }) => {
    await uiLogin(page);
    await page.getByRole("link", { name: /Mi cuenta/ }).click();
    await page.getByLabel("Contraseña actual").fill(ADMIN_PASSWORD);
    await page.getByLabel(/Contraseña nueva/).fill("corta");
    await page.getByLabel("Repite la contraseña nueva").fill("corta");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    expect(await page.getByLabel(/Contraseña nueva/).evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(false);

    await page.getByLabel(/Contraseña nueva/).fill("nueva-clave-del-profe-2026");
    await page.getByLabel("Repite la contraseña nueva").fill("nueva-clave-del-profe-2026");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Contraseña cambiada")).toBeVisible();

    const old = await request.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } });
    expect(old.status()).toBe(401);
    const fresh = await request.post("/api/admin/login", { data: { password: "nueva-clave-del-profe-2026" } });
    expect(fresh.status()).toBe(200);
    await request.post("/api/admin/password", { data: { current: "nueva-clave-del-profe-2026", next: ADMIN_PASSWORD } });
    expect((await request.post("/api/admin/login", { data: { password: ADMIN_PASSWORD } })).status()).toBe(200);
  });
});
