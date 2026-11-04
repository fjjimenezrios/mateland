# Mates 1.º ESO — plataforma de juegos de Matemáticas

Web para alumnos de 11 y 12 años con juegos visuales e interactivos, y un panel para que el profesor los configure sin tocar código ni volver a desplegar. El plan completo está en [PLAN.md](PLAN.md).

## Qué incluye

- **Siete juegos**, cada uno con su escena, sus ajustes en el panel y sus pistas:
  - **Las naranjas y los cestos** (divisibilidad): repartir naranjas arrastrándolas o rodeándolas con un lazo, con corrección real de la distribución.
  - **Caza-divisores**: tocar las burbujas que son divisores de un número.
  - **Criba de Eratóstenes**: tachar múltiplos hasta que solo queden los primos; con modo guiado opcional.
  - **Criterios de divisibilidad**: mandar cada número a los tubos ÷2, ÷3, ÷5, ÷9, ÷10… (también ÷4, ÷6 y ÷11) y ver por qué.
  - **Árbol de factores**: partir cada número en dos hasta que todas las bolas sean primas.
  - **Baldosas (mcd)**: cubrir un suelo con las baldosas cuadradas más grandes que quepan.
  - **Luces (mcm)**: encontrar cuándo coinciden dos luces que parpadean a su ritmo.
- **Estadísticas para el profesor**: cómo va cada alumno y la clase en conjunto (retos, autonomía sin pistas, pistas, racha, última conexión), con la campana de Gauss, filtros por clase y por juego, y descarga en CSV.
- **Panel del profesor** en `/admin`: activar o desactivar juegos, cambiar sus parámetros con validación y vista previa, gestionar clases y alumnos, cambiar la contraseña.
- **Cuentas de alumno opcionales**: nombre de usuario y contraseña creados por el profesor. Vienen **desactivadas**; ver «Protección de datos».
- **Progreso**: sin cuenta se guarda en el dispositivo; con cuenta, también en el servidor.

Todo funciona solo con servicios de Vercel: Global Config (configuración) y Blob (alumnos y progreso).

## Instalación local

Requisitos: Node.js 20 o superior.

```bash
npm install
npx playwright install chromium     # solo para las pruebas end-to-end
STORE_BACKEND=local npx tsx scripts/create-admin.ts   # crea el profesor y muestra su contraseña
npm run dev                          # http://localhost:3000
```

En desarrollo, sin variables de Vercel, los datos se guardan en archivos dentro de `.data/` (ignorado por git). Abre `/admin` e introduce la contraseña que mostró `create-admin`. Para elegir tú la contraseña: `npx tsx scripts/create-admin.ts "tu-contraseña-larga"`.

### Pruebas

```bash
npm test            # unitarias: matemáticas, generadores, motor, lazo, validación, sesiones, alumnos
npm run test:e2e    # end-to-end con un navegador real (compila la app y la arranca en el puerto 3101)
npm run typecheck
```

## Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (**Add New → Project**). `vercel.json` fija las funciones en Fráncfort (`fra1`).
2. **Blob**: en el proyecto, *Storage → Create → Blob*. Elige acceso **privado** y una región de la UE. Conéctalo al proyecto en todos los entornos.
3. **Global Config**: *Storage → Create → Global Config*. Conéctalo al proyecto; Vercel añade `EDGE_CONFIG`.
4. **Variables de entorno** (*Settings → Environment Variables*, en Production, Preview y Development):
   - `SESSION_SECRET`: genera una con `openssl rand -base64 48`.
   - `VERCEL_API_TOKEN`: un token creado en *Account Settings → Tokens*. Permite al panel escribir en Global Config.
   - `VERCEL_TEAM_ID`: solo si el proyecto está en un equipo.
5. Despliega.
6. **Crear el primer administrador**:
   ```bash
   vercel link
   vercel env pull .env.local
   npx tsx --env-file=.env.local scripts/create-admin.ts
   ```
   Muestra la contraseña del profesor y la guarda en Global Config. Si no puede escribir, imprime un hash para guardarlo como variable `ADMIN_PASSWORD_HASH`. Después, Paco puede cambiarla desde *Mi cuenta*.

### Límites a vigilar (plan gratuito)

- **Blob**: 2.000 operaciones de escritura y 10.000 lecturas sin caché al mes. Con unos 30 alumnos el uso previsto es de unas 480 escrituras y 240 lecturas. **Si se supera un límite, Blob queda inaccesible hasta 30 días**; los juegos siguen funcionando, pero no se puede iniciar sesión. No navegues por el almacén desde el panel de Vercel sin necesidad: también cuenta.
- **Global Config**: 100 escrituras gratuitas al mes. Cada «Guardar» del profesor y cada cambio de estado cuenta una. Un cambio tarda hasta 10 segundos en llegar a todos los alumnos.
- Antes de usarlo con el centro, consulta a Vercel si este uso cabe en el plan *Hobby* (solo uso personal no comercial) y comprueba que la red del centro permite `vercel.app`.

## Cómo añadir un juego nuevo

La guía completa de diseño, interacción, pedagogía y comprobaciones está en [GUIA-NUEVOS-JUEGOS.md](GUIA-NUEVOS-JUEGOS.md); es lo que debe leer cualquiera (o cualquier IA) antes de añadir un juego. Resumen:

1. Crea `src/games/<slug>/` con:
   - `config.ts`: esquema Zod, valores por defecto y `adminFields` (los campos del formulario del panel).
   - La lógica matemática en archivos TypeScript sin React (generador, motor), con sus pruebas en `tests/`.
   - `Game.tsx` (componente que recibe `config`, `avoidKey`, `onResult` y `onNext`) y `Cover.tsx` (ilustración de la tarjeta).
   - `index.ts`: la definición del juego (`GameDefinition`), con título, tema y ejemplos de vista previa.
2. Regístralo en `src/games/registry.ts` (datos) y en `src/games/ui.ts` (componentes y escena de fondo).
3. Despliega. Aparece solo en la galería, en el panel con su formulario, y su progreso se guarda sin más código.

El contrato está en `src/games/types.ts`. Los componentes comunes (pistas, barra de acciones, mensajes, escenas, confeti y sonido) están en `src/games/_kit/`; `Criba de Eratóstenes` es un buen ejemplo de partida.

## Cómo funciona

- Cada desafío pide su configuración a `/api/config/<juego>` (sin caché) al empezar y la conserva hasta terminar. Si la lectura falla, se usan los valores por defecto del código.
- El generador separa la matemática de la vista: elige una categoría (primo, reparto exacto o inexacto) según los porcentajes y un par válido dentro de los límites, evitando repetir el anterior. Los rangos imposibles se rechazan al guardar.
- La corrección comprueba dónde está cada naranja (montón, cesto o «Sobran»), no una respuesta escrita. Un reparto inexacto se resuelve dejando las sobrantes aparte.
- Las escrituras en Blob usan `ifMatch` (control de concurrencia) y el progreso se envía como máximo cada 15 minutos y al salir de la página, para no agotar las operaciones gratuitas.

## Protección de datos

Las cuentas de alumno están **desactivadas por defecto** y no deben activarse con alumnos reales sin la aprobación escrita del centro. Un nombre de usuario ligado al progreso de un menor es un dato personal, y los menores de 14 años necesitan el consentimiento de sus tutores salvo que el tratamiento forme parte de la función docente. Usa apodos o iniciales, nunca nombre y apellidos completos. Sin cuentas no se guarda ningún dato personal; Vercel puede registrar direcciones IP en sus registros. Esto no es asesoramiento legal.

## Lo que no está implementado

- Puntos, niveles, insignias y estadísticas de clase para el profesor.
- Recuperación de contraseña por correo: la restablece el profesor (alumnos) o se vuelve a ejecutar `create-admin` (profesor).
- Contador de intentos fallidos de acceso: no hay base de datos para llevarlo. La defensa son las contraseñas generadas, difíciles de adivinar, y una pausa en cada fallo. Conviene activar una regla de límite de peticiones en Vercel Firewall si el plan lo permite.
- Crear tipos de juego desde el panel: un juego nuevo se programa y se despliega.
