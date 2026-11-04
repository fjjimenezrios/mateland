import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "./global-setup";
import { adminLogin, fixedChallenge, openNaranjas, setGame, solveCorrectly } from "./helpers";

const BLOB_DIR = path.resolve(".data-test", "blob");

function snapshotBlobs(): Record<string, string> {
  const result: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else result[path.relative(BLOB_DIR, full)] = `${statSync(full).mtimeMs}:${readFileSync(full, "utf8").length}`;
    }
  };
  try {
    walk(BLOB_DIR);
  } catch {
    return result;
  }
  return result;
}

async function setAccounts(request: APIRequestContext, value: boolean) {
  await adminLogin(request);
  expect((await request.put("/api/admin/settings", { data: { accountsEnabled: value } })).status()).toBe(200);
}

async function createClass(request: APIRequestContext, name: string, usernames: string) {
  await adminLogin(request);
  const response = await request.post("/api/admin/classes", { data: { name, usernames } });
  expect(response.status()).toBe(201);
  return (await response.json()) as { credentials: { username: string; password: string }[] };
}

async function studentLogin(page: Page, username: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("Nombre de usuario").fill(username);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(`Hola, ${username}`)).toBeVisible();
}

async function newDevice(browser: Browser) {
  const context = await browser.newContext();
  return { context, page: await context.newPage() };
}

test.describe.configure({ mode: "serial" });

test("with accounts disabled there is no login option anywhere", async ({ page, request }) => {
  await setAccounts(request, false);
  await page.goto("/?todos=1");
  await expect(page.getByRole("link", { name: "Mi progreso" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toHaveCount(0);
  await page.goto("/entrar");
  await expect(page.getByText("De momento no hace falta entrar")).toBeVisible();
  await expect(page.getByLabel("Nombre de usuario")).toHaveCount(0);
  const login = await request.post("/api/auth/student", { data: { username: "ana", password: "x" } });
  expect(login.status()).toBe(403);
  expect((await page.request.get("/api/progress")).status()).toBe(401);
});

test("the teacher creates a class from the panel and gets printable cards", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("link", { name: /Alumnos y clases/ }).click();

  const toggle = page.getByLabel("Activado");
  await expect(toggle).not.toBeChecked();
  await expect(page.getByText(/menores de 14 años/)).toBeVisible();

  await page.getByLabel("Nombre de la clase").fill("1.º A");
  await page.getByLabel("Nombres de usuario, uno por línea").fill("Lucía M\npablo-r\nlucia m\nx\nana-g");
  await page.getByRole("button", { name: "Crear clase y contraseñas" }).click();
  await expect(page.getByText("Clase creada con 4 alumnos")).toBeVisible();
  await expect(page.getByText(/No se han podido usar: x/)).toBeVisible();

  const cards = page.locator(".print-area > div");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText("lucia-m");
  await expect(cards.nth(2)).toContainText("lucia-m2");
  await expect(cards.nth(0)).toContainText(/Contraseña: [a-z]+-[a-z]+-[a-z]+-\d{2}/);
  await expect(page.getByText("Solo se muestran ahora")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.locator(".print-area")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /1\.º A/ })).toBeVisible();
  await expect(page.getByText("lucia-m2")).toBeVisible();
  await expect(page.getByText(/Contraseña: /)).toHaveCount(0);
});

test("full student journey: anonymous play, login, cross-device progress, reset, deactivation, deletion", async ({ browser, request }) => {
  await setAccounts(request, true);
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  const { credentials } = await createClass(request, "Viaje", "viajera\notra-alumna");
  const [viajera, otra] = credentials;

  const first = await newDevice(browser);
  const page = first.page;
  const { oranges, baskets } = await openNaranjas(page);
  await solveCorrectly(page, oranges, baskets);
  await page.getByRole("button", { name: /Comprobar/ }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();
  await page.goto("/progreso");
  await expect(page.getByText("Este progreso solo se guarda en este dispositivo.")).toBeVisible();

  const before = snapshotBlobs();
  const bad = await page.request.post("/api/auth/student", { data: { username: "viajera", password: "no-es-esta-clave-00" } });
  expect(bad.status()).toBe(401);
  const unknown = await page.request.post("/api/auth/student", { data: { username: "nadie-existe", password: "no-es-esta-clave-00" } });
  expect(unknown.status()).toBe(401);
  expect((await bad.json()).error).toBe((await unknown.json()).error);
  expect(snapshotBlobs()).toEqual(before);

  await studentLogin(page, "viajera", viajera.password);
  await expect.poll(async () => (await (await page.request.get("/api/progress")).json()).progress?.naranjas?.completed).toBe(1);

  await page.goto("/juegos/naranjas");
  await page.waitForSelector("[data-orange]");
  const second = await openNaranjas(page);
  await solveCorrectly(page, second.oranges, second.baskets);
  await page.getByRole("button", { name: /Comprobar/ }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();
  await page.evaluate(() => {
    const key = "mates:progress:v1";
    const data = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...data, lastSync: 0 }));
  });
  await page.reload();
  await page.waitForSelector("[data-orange]");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect.poll(async () => (await (await page.request.get("/api/progress")).json()).progress.naranjas.completed).toBe(2);

  const other = await newDevice(browser);
  await studentLogin(other.page, "viajera", viajera.password);
  await other.page.goto("/progreso");
  await expect(other.page.getByText("Tu progreso se guarda en tu cuenta")).toBeVisible();
  await expect(other.page.locator("li", { hasText: "Las naranjas y los cestos" }).locator("dd").first()).toHaveText("2");

  await adminLogin(request);
  const directory = await (await request.get("/api/admin/students")).json();
  expect(JSON.stringify(directory)).not.toContain("passwordHash");
  const student = directory.students.find((s: { username: string }) => s.username === "viajera");

  const reset = await request.patch(`/api/admin/students/${student.id}`, { data: { action: "reset" } });
  const { credential } = await reset.json();
  expect(credential.password).not.toBe(viajera.password);
  expect((await request.post("/api/auth/student", { data: { username: "viajera", password: viajera.password } })).status()).toBe(401);
  await adminLogin(request);

  await request.patch(`/api/admin/students/${student.id}`, { data: { action: "deactivate" } });
  expect((await other.page.request.post("/api/progress", { data: { naranjas: { completed: 1, solved: 1, hintsUsed: 0, bestStreak: 1 } } })).status()).toBe(401);
  expect((await other.page.request.get("/api/progress")).status()).toBe(401);
  await request.post("/api/auth/logout");
  await adminLogin(request);
  const blocked = await request.post("/api/auth/student", { data: { username: "viajera", password: credential.password } });
  expect(blocked.status()).toBe(401);

  await adminLogin(request);
  const classes = (await (await request.get("/api/admin/students")).json()).classes;
  const viaje = classes.find((c: { name: string }) => c.name === "Viaje");
  expect((await request.delete(`/api/admin/classes/${viaje.id}`)).status()).toBe(200);
  expect((await request.delete(`/api/admin/classes/${viaje.id}`)).status()).toBe(404);
  expect(Object.keys(snapshotBlobs()).filter((file) => file.startsWith("progress/") && file.includes(student.id))).toEqual([]);
  expect((await request.post("/api/auth/student", { data: { username: "otra-alumna", password: otra.password } })).status()).toBe(401);

  await first.context.close();
  await other.context.close();
  await setAccounts(request, false);
});

test("anonymous progress is adopted by the account the first time it is empty", async ({ browser, request }) => {
  await setAccounts(request, true);
  await setGame(request, "naranjas", fixedChallenge(12, 3));
  const { credentials } = await createClass(request, "Adopcion", "adoptada");
  const device = await newDevice(browser);
  const page = device.page;
  const { oranges, baskets } = await openNaranjas(page);
  await solveCorrectly(page, oranges, baskets);
  await page.getByRole("button", { name: /Comprobar/ }).click();
  await expect(page.getByText("¡Correcto!")).toBeVisible();

  await studentLogin(page, "adoptada", credentials[0].password);
  await expect.poll(async () => (await (await page.request.get("/api/progress")).json()).progress?.naranjas?.completed).toBe(1);
  await page.goto("/progreso");
  await expect(page.locator("li", { hasText: "Las naranjas y los cestos" }).locator("dd").first()).toHaveText("1");

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  await page.goto("/progreso");
  await expect(page.locator("li", { hasText: "Las naranjas y los cestos" }).locator("dd").first()).toHaveText("0");
  await device.context.close();
  await setAccounts(request, false);
});

test("closing the account feature immediately blocks existing student sessions", async ({ browser, request }) => {
  await setAccounts(request, true);
  const { credentials } = await createClass(request, "Cierre", "cerrada");
  const device = await newDevice(browser);
  await studentLogin(device.page, "cerrada", credentials[0].password);
  expect((await device.page.request.get("/api/progress")).status()).toBe(200);
  await setAccounts(request, false);
  expect((await device.page.request.get("/api/progress")).status()).toBe(401);
  expect((await (await device.page.request.get("/api/me")).json()).student).toBeNull();
  await device.context.close();
});
