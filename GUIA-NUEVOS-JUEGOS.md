# Guía para crear juegos nuevos

Instrucciones para una IA (o una persona) que vaya a añadir juegos a esta plataforma de Matemáticas de 1.º ESO. Léela entera antes de escribir código. Está pensada para que el juego nuevo parezca hecho por el mismo equipo, funcione en un Chromebook y se pueda configurar desde el panel del profesor.

Para el contexto general del proyecto, mira [README.md](README.md) y [PLAN.md](PLAN.md). Hay siete juegos ya hechos en `src/games/`: úsalos como ejemplo. El más sencillo de seguir es `criba/`; el más completo en interacción es `naranjas/`. `naranjas/` y `caza-divisores/` son anteriores al kit común y llevan su propia copia de las pistas y de la barra de acciones; los cinco posteriores sí usan `_kit/`, y **los juegos nuevos deben seguir a estos últimos**.

## 1. Reglas de oro

1. **Una carpeta por juego**, sin tocar el resto de la plataforma más allá de registrarlo (sección 2).
2. **La matemática va separada de lo visual.** Generador, motor de corrección y textos son TypeScript puro, sin React, y tienen pruebas.
3. **Todo lo que el profesor pueda querer cambiar es un ajuste** validado con Zod y editable en el panel. Nada de números mágicos en el componente.
4. **Cada alumno recibe un desafío distinto**, generado al azar dentro de los límites configurados, sin repetir el anterior si hay alternativas.
5. **La corrección comprueba el estado real**, no una respuesta escrita ni una casilla marcada. Un reparto, una selección o una posición se evalúan sobre lo que el alumno ha hecho de verdad.
6. **Nunca se castiga.** No hay vidas, cuentas atrás ni puntuaciones negativas. Un error se explica; no se penaliza.
7. **Sin servicios ni dependencias nuevas.** Todo corre en Vercel (Global Config y Blob). No añadas fuentes de CDN, analítica, anuncios, bases de datos ni librerías si unas pocas líneas lo resuelven. Si crees que hace falta una, justifícalo antes.
8. **Sin datos personales.** Los juegos no piden ni guardan nombres, correos ni nada del alumno. Los alumnos son menores de 14 años.
9. **Nada de secretos en el cliente** y nada de importar `src/lib/store.ts`, `session.ts`, `students.ts` ni `password.ts` desde un componente de cliente.

## 2. Anatomía de un juego

```
src/games/<slug>/
  config.ts      esquema Zod, valores por defecto y adminFields
  engine.ts      motor: estado y reglas (sin React)
  generator.ts   generador de desafíos (recibe un rng, nunca llama a Math.random)
  texts.ts       mensajes y pistas en español
  index.ts       la definición del juego (GameDefinition): título, tema, ejemplos
  Game.tsx       el componente jugable ("use client")
  Cover.tsx      ilustración de la tarjeta (SVG, viewBox 0 0 340 200)
tests/<slug>.test.ts
```

Para que aparezca en la plataforma hay que registrarlo en **dos sitios**, y nada más:

- `src/games/registry.ts`: añade la definición a la lista `games`. El orden de la lista es el orden de la galería.
- `src/games/ui.ts`: añade `{ Cover, Game }` a `gameUI`.

A partir de ahí aparece solo en la galería, en el panel del profesor (con su formulario de ajustes y su vista previa), en «Mi progreso» y en las estadísticas.

### El contrato (`src/games/types.ts`)

```ts
type GameProps<C> = {
  config: C;                                  // configuración con la que empieza este desafío
  avoidKey?: string;                          // clave del desafío anterior, para no repetirlo
  onResult: (r: { solved: boolean; attempts: number; hintsUsed: number }) => void;
  onNext: (challengeKey: string) => void;     // «nuevo desafío»
};
```

- `GameRunner` pide la configuración al servidor al empezar **cada** desafío y monta `Game` con esa configuración. Un alumno que ya está jugando termina con la que tenía: no leas la configuración tú mismo ni la vuelvas a pedir.
- `Game` genera su desafío con `useState(() => generate(config, mulberry32(semilla), avoidKey))`. Así no hay diferencias entre servidor y cliente: el juego solo se renderiza en el cliente.
- `onNext(challenge.key)` pasa la clave del desafío actual; el ejecutor la devuelve como `avoidKey` en el siguiente.

## 3. Matemática y generador

- **El generador recibe un `Rng`** (`src/lib/rng.ts`: `mulberry32`, `pick`, `shuffle`, `weightedIndex`). Con un rng fijo las pruebas son reproducibles.
- **Reparte por categorías**, no por azar ciego. Si el profesor pide «25 % de números primos y 50 % de repartos exactos», el generador debe respetarlo en promedio. Mira `naranjas/generator.ts`.
- **Evita repetir** el desafío anterior si existe alguna alternativa (`avoidKey`). Solo repites si no hay otra opción.
- **Valida que la combinación de ajustes sea posible** en el `superRefine` del esquema, recorriendo los valores reales. Ejemplos ya cubiertos: no hay números primos entre 24 y 28; en un rango pequeño no cabe un número de burbujas pedido; los porcentajes no pueden sumar más de 100. Si un ajuste deja una categoría vacía, el panel debe avisar con un mensaje claro y bloquear el guardado. El generador **no debe poder lanzar un error** con una configuración que haya pasado la validación.
- **La definición de primo se basa en los divisores** (`src/lib/math.ts`: `divisors`, `isPrime`). Nunca digas que un número es primo solo porque no sea divisible entre los que se muestran. El 1 no es primo ni compuesto.
- **Evita ejercicios matemáticamente incorrectos o triviales** (un reparto donde cabe 1 por cesto, un suelo cuadrado cuyo mcd es el lado, números iguales).
- Limita la cantidad de objetos en pantalla (sección 6).

## 4. Configuración y panel del profesor

En `config.ts`:

```ts
export const miSchema = z.object({ … }).superRefine((config, ctx) => { … });
export type MiConfig = z.infer<typeof miSchema>;
export const miDefaults: MiConfig = { … };
export const miAdminFields: AdminField[] = [ … ];
```

Tipos de campo del panel (`AdminField`):
- `number`: deslizador + campo numérico con `min`, `max`, `step` y `unit` opcionales.
- `multi`: casillas para elegir varios valores de una lista.
- `toggle`: casilla de sí/no.

Reglas que **comprueba automáticamente** `tests/new-games.test.ts` (si fallan, algo está mal en tu juego):
- Los valores por defecto pasan el esquema.
- **Cada clave de `adminFields` existe en los valores por defecto y viceversa.** No dejes ajustes sin campo ni campos sin ajuste.
- Para cada campo `number`, el esquema **rechaza `min − 1` y `max + 1`**: los límites del esquema y los del campo deben coincidir exactamente.
- `previewExamples(config, 5)` devuelve 5 frases. Son los «ejemplos de lo que verían los alumnos» del panel: escríbelos como el profesor los entendería («Suelo de 12 × 15 m → baldosa de 3 m»).

Convenciones:
- Incluye siempre `hintSeconds` (segundos sin actuar antes de ofrecer una pista) y `hintAttempts` (fallos antes de ofrecer ayuda).
- Etiquetas de los campos en español, claras, con unidad y una ayuda si hace falta. Piensa en cómo lo leería un profesor, no un programador.
- Valores por defecto razonables para 1.º ESO: que el juego funcione bien sin tocar nada.

## 5. Pedagogía y mensajes

El público son niños de 11 y 12 años. El juego debe enseñar **por qué**, no solo si acertó.

- **Explica con la operación.** «24 ÷ 5 no es exacta: 24 = 5 × 4 + 4», no «incorrecto». Muestra el cálculo con los números del desafío.
- **Distingue el tipo de fallo.** «Los cestos no tienen la misma cantidad» (reparto mal hecho) no es lo mismo que «ese reparto es imposible» (matemáticamente no existe). Un reparto imposible nunca debe dejar al alumno atrapado: debe poder resolver el ejercicio aceptando que no hay solución exacta.
- **Tres niveles de pista, progresivos**, que no regalan la respuesta hasta el último:
  1. una orientación general («intenta que todos los cestos tengan la misma cantidad»);
  2. una pregunta o una herramienta («los divisores van en parejas»);
  3. la ayuda concreta («prueba con lado 6»).
  El botón de pista está siempre disponible; el tiempo (`hintSeconds`) y los fallos (`hintAttempts`) solo hacen que se **ofrezca** solo (el botón late y aparece «¿Quieres una pista?»). Usa `useHints` de `_kit`.
- **Cierre con explicación matemática**, escrita para su nivel. Cuando corresponda, cierra el concepto (qué es un número primo, qué es el mcd, por qué basta con llegar a √n).
- **Sin cuenta atrás ni prisa.** Si hay una animación temporal (luces que parpadean), el alumno controla el tiempo: pausa, avanza, retrocede.
- **Lenguaje:** español de España, frases cortas, segunda persona del singular («toca», «arrastra»), sin jerga. Tono animado pero no infantil: sin «¡Muy bien, campeón!».
- **Ejemplos con nombres:** si un texto necesita nombres de personas, mezcla chicas y chicos y evita estereotipos.

## 6. Diseño visual

La dirección es **«videojuego de móvil premium»**: colorido, con respuesta al tocar, pero sin parecer de Primaria. Cada juego tiene su propio mundo y comparte la base.

### Qué reutilizar (no lo reinventes)

| Pieza | Dónde | Para qué |
|---|---|---|
| `GameShell` | `_kit/GameShell.tsx` | Marco de la pantalla: cabecera con «Juegos», título, sonido y escena de fondo |
| Escenas | `_kit/scenes.tsx` | `orchard`, `ocean`, `space`, `factory`, `forest`, `workshop`, `night` |
| `useHints` | `_kit/useHints.ts` | Nivel de pista, contador de fallos, temporizador de inactividad y «ofrecer ayuda» |
| `ActionBar` | `_kit/ActionBar.tsx` | Barra inferior con Pista, «otro desafío» y tus botones propios |
| `FeedbackCard` | `_kit/Feedback.tsx` | Tarjeta de mensajes (`ok`, `error`, `hint`, `done`) |
| `celebrate()` | `_kit/confetti.ts` | Confeti al terminar |
| `playSound()` | `_kit/sound.ts` | Sonidos sintetizados: `pick`, `drop`, `pop`, `error`, `success` |
| `lasso.ts` | `_kit/lasso.ts` | Selección con lazo (punto dentro de polígono) |

Clases de `globals.css`: `.btn` con `.btn-green`, `.btn-orange` y `.btn-ghost`; `.sheet` (tarjeta clara de mensajes); `.panel`; animaciones `.pop-in`, `.shake`, `.hop`, `.pulse`, `.drift`, `.star`, `.spin`. **Prefija las clases nuevas con el nombre de tu juego** (`.sieve-`, `.tube`…) para no pisar las de otros.

### Tema y escena

Cada juego declara un tema en `index.ts`: `{ from, via, to, accent, ink }`. Es un degradado vertical de tres colores (`from` arriba, `to` abajo), el color de la etiqueta de la tarjeta (`accent` con texto `ink`) y la identidad del juego. **Elige una paleta que no se parezca a las existentes**: naranja (naranjas), azul (caza-divisores), violeta (criba), turquesa (criterios), verde (árbol), rosa (mcd) y azul noche con amarillo (mcm).

Para una escena nueva: añade el componente en `_kit/scenes.tsx`, el nombre en el tipo `SceneName` y en el objeto `SCENES` de `GameShell.tsx`. Las escenas son SVG o divs decorativos con `aria-hidden` y `pointer-events: none`, y deben ser baratas de pintar.

### Reglas visuales

- **Tipografías:** Bricolage Grotesque para títulos y cifras (`font-display`) y Nunito para texto. Ya están cargadas desde el propio dominio; no añadas más.
- **Los objetos del juego son el protagonista:** grandes, reconocibles, con brillo y sombra suaves. Mira la naranja (CSS puro), la burbuja, la bola del árbol, la baldosa de cerámica o la bombilla.
- **Cada acción tiene respuesta:** al coger un objeto se destaca; al soltarlo rebota; un acierto celebra; un fallo tiembla (`.shake`) y explica. Sin respuesta visual el juego parece roto.
- **Colores con significado, nunca solos.** Acierto y error van con icono y texto además de color (✅ 🤔, «Necesita apoyo»…). Contraste suficiente: texto sobre fondo degradado en tarjeta `.sheet` o con sombra.
- **Botones grandes:** objetivo táctil de **44 px como mínimo**, con separación suficiente entre ellos.
- **Maqueta responsive:** que funcione a **1366×768** (Chromebook) y a **390 px de ancho** (móvil). Sin scroll horizontal en la página. La barra de acciones es `sticky bottom-2`. Una pantalla de juego no es una página de texto: el juego ocupa la mayor parte del espacio y las instrucciones son 1–2 líneas.
- **Ilustración de la tarjeta (`Cover.tsx`):** SVG a 340×200, legible y con el concepto del juego (cifras reales del juego). Es lo que ve el alumno en la galería y el profesor en el panel.

### Animación, sonido y rendimiento

- **Anima solo `transform` y `opacity`.** No animes `width`, `height`, `top/left` ni sombras de muchos elementos a la vez.
- **Respeta `prefers-reduced-motion`.** Las animaciones CSS ya se desactivan en `globals.css`; si usas `motion`, comprueba `useReducedMotion()`.
- **Sonido apagado por defecto** (hay treinta Chromebooks en una clase). Usa siempre `playSound`, que respeta el interruptor.
- **Confeti con pocas partículas** (`celebrate()` ya está limitado).
- **Presupuesto:** con unos 40 objetos animados y la CPU ralentizada 4× el juego debe seguir fluido (los fotogramas del percentil 95 por debajo de unos 50 ms). Para fondos repetidos (baldosas, tableros) usa `<pattern>` de SVG, no un `div` por pieza. Evita `backdrop-filter` y `filter: blur` grandes.
- **Sin recursos externos:** nada de imágenes, fuentes ni scripts de terceros.

## 7. Interacción

- **Usa Pointer Events**, no eventos de ratón ni el arrastrar de HTML5: funcionan igual con ratón, dedo y lápiz.
- **Arrastrar:** en `pointerdown` haz `setPointerCapture`; empieza el arrastre al superar unos 8 px de movimiento; muestra un «fantasma» con `position: fixed` y `pointer-events: none`; al soltar, detecta el destino con `document.elementsFromPoint(x, y)` buscando un atributo `data-…` (mira `naranjas/Game.tsx` o `criterios/Game.tsx`).
- **`touch-action`:** `none` en lo que se arrastra o dibuja; `pan-y` en el resto para no bloquear el desplazamiento de la página en el móvil.
- **Siempre una alternativa sin arrastrar:** tocar el objeto y después el destino. Es más accesible y más cómodo con el trackpad de un Chromebook.
- **Teclado:** todo lo jugable debe poder hacerse con Tab, Enter y Espacio. Los elementos interactivos tienen `role` y `aria-label` o `aria-pressed`.
- **Zonas de toque generosas.** El área sensible es mayor que el dibujo. No tapes con otros elementos la parte que el alumno tiene que agarrar.
- **No agrandes la zona de destino al pasar por encima** con `scale`: se monta sobre las vecinas. Usa un halo (`box-shadow`).
- **Lazo:** si el juego lo usa, la zona que lo inicia debe ser todo el área de juego (no solo un contenedor pequeño) y bastan 4 puntos de trazo.
- **Una sola lógica para varias formas de manejarlo.** Si ofreces dos modos de interacción, ambos modifican el mismo estado y usan el mismo motor.

## 8. Accesibilidad

- Mensajes del juego en una región `aria-live="polite"` (`FeedbackCard` ya lo hace).
- Foco visible en todo (hay un estilo global; no lo quites). Si un elemento SVG enfocable muestra un rectángulo de foco feo, quítalo y dibuja tú un anillo.
- El color nunca es la única señal.
- Alternativas de texto para lo que solo es visual: `aria-label` en piezas, `role="img"` con descripción en dibujos que dan información (el suelo cubierto de baldosas, la línea de tiempo).
- Contraste suficiente en texto y en controles.

## 9. Progreso y estadísticas

El juego avisa **una sola vez por desafío terminado**:

```ts
onResult({ solved: true, attempts: fallos, hintsUsed: nivelesDePistaUsados });
```

- Llámalo **solo al completar** el desafío; no al abandonarlo ni al pedir «otro desafío».
- `attempts` son los fallos cometidos; `hintsUsed` es el nivel máximo de pista que se mostró (0 a 3). `useHints` te da `fails` y `level`.
- Con eso la plataforma guarda sola, por juego: retos completados, retos sin pistas, pistas usadas y mejor racha sin pistas. El profesor lo ve en **Estadísticas** (por alumno y de toda la clase, con la campana de Gauss). **No guardes nada tú** y no uses `localStorage` para el progreso.
- Ten en cuenta cómo se interpreta: «autonomía» es el porcentaje de retos completados sin ninguna pista. Si tu juego hace que las pistas se muestren solas, o que sean imposibles de evitar, falsea esa métrica.

## 10. Trampas en las que ya hemos caído

1. **`transform` de CSS contra `transform` de SVG.** Una animación CSS con `transform` sobre un `<g transform="translate(...)">` sustituye la posición y **amontona todos los elementos en la esquina**. Anima un `<g>` interior y deja la posición en el exterior.
2. **Elementos con animación infinita no se pueden pulsar desde Playwright** (espera a que se detengan). En las pruebas end-to-end activa `reducedMotion`; el CSS ya lo respeta.
3. **Solapar un elemento sobre la parte agarrable** (el borde del cesto sobre las naranjas) deja objetos casi imposibles de coger. Deja siempre libre la mitad superior.
4. **Escalar la zona de destino** al pasar el objeto por encima la monta sobre las vecinas.
5. **El lazo solo arrancaba dentro de un contenedor pequeño** y no se activaba con trazos rápidos. Ya está resuelto en `lasso.ts` y en `naranjas/Game.tsx`; cópialo.
6. **Una configuración válida en el formulario pero imposible de generar.** Valida siempre con el recorrido real de los valores (sección 3).
7. **Textos acabados en «…»+«.»** y mensajes largos: léelos en voz alta antes de dar el juego por bueno.
8. **El almacenamiento no es una base de datos.** Cada escritura en Blob cuenta contra un límite gratuito. Si tu juego necesitara guardar algo propio, habla antes con el equipo: no escribas desde el juego.
9. **Next.js 16 no es el que conoces.** `params` y `cookies()` son asíncronos y hay cambios en el modelo de caché. Antes de tocar rutas o datos, lee la documentación en `node_modules/next/dist/docs/` (lo indica `AGENTS.md`).
10. **No inicies el desafío durante el renderizado en el servidor.** `Game` solo se renderiza en cliente tras cargar la configuración; no uses `Math.random()` en componentes que también se rendericen en servidor.

## 11. Convenciones de código

- TypeScript estricto y sin `any`. Los únicos atajos de tipos son los casts del registro y de `ui.ts`, que existen porque cada juego tiene su propio tipo de configuración.
- Todos los `import` al principio del archivo, nunca dentro de funciones. Sin renombrar imports salvo colisión.
- Nada de código comentado, `console.log` ni `TODO` sin ticket.
- Comenta solo el **porqué** cuando no sea evidente; los nombres de funciones y variables explican el **qué**. Nada de docstrings que repitan lo que hace la función.
- Prefiere `map`/`filter`/`Set` a bucles manuales que solo acumulan.
- La lógica vive en `engine.ts` y `generator.ts`, no dentro del componente.
- Los textos que ve el alumno viven en `texts.ts`, no repartidos por el JSX.
- Sin dependencias nuevas sin una buena razón.

## 12. Lista de comprobación antes de dar el juego por terminado

- [ ] `npm run typecheck` sin errores.
- [ ] `npm test` en verde, con pruebas propias de generador, motor, validación y textos (incluidos los casos límite: rangos mínimos, configuración con una sola categoría posible, el caso «sin solución exacta»).
- [ ] Registrado en `registry.ts` y en `ui.ts`; aparece en la galería, en el panel con su formulario y su vista previa, y en «Mi progreso».
- [ ] Los ajustes inválidos muestran un mensaje claro en el panel y no se pueden guardar.
- [ ] Capturas a **1366×768** y a **390 px** de ancho: sin solapamientos, sin scroll horizontal, cabe lo esencial.
- [ ] Jugable solo con teclado y solo con toque.
- [ ] Con `prefers-reduced-motion` activado sigue siendo comprensible.
- [ ] Rendimiento con el máximo de objetos y la CPU ralentizada 4×.
- [ ] Un reparto o ejercicio sin solución exacta (si tu juego puede tenerlo) se puede resolver y se explica bien.
- [ ] Revisados los textos en voz alta: claros para un alumno de 11 años, sin faltas, sin ejemplos solo de chicos o solo de chicas.
- [ ] `onResult` se llama una vez por desafío terminado y solo entonces.
- [ ] No has añadido dependencias, recursos externos, secretos ni datos personales.

Las pruebas end-to-end (`npm run test:e2e`) compilan la app y tardan unos minutos: ejecútalas cuando termines o cuando te lo pidan, no tras cada cambio.

## 13. Siguientes juegos propuestos

| Juego | Bloque | Interacción | Cuidado con |
|---|---|---|---|
| **Pizzas** | Fracciones | Repartir y comparar porciones | Que la fracción equivalente se vea, no solo se calcule |
| **Submarino** | Enteros | Recta vertical y desplazamientos | Sumar y restar con signo sin dar «trucos» |
| **Orden de operaciones** | Jerarquía | Tocar la operación que se resuelve primero | Mostrar el resultado paso a paso |
| **Geoplano** | Perímetro y área | Construir figuras en una cuadrícula | Que perímetro y área no se confundan |
| **Recetas** | Proporcionalidad | Adaptar cantidades a más o menos personas | Evitar la regla de tres como receta sin sentido |
| **Balanza** | Ecuaciones sencillas | Equilibrar con pesas y una incógnita | La incógnita visible como «caja», no como letra desde el principio |

## 14. Plantilla para pedir un juego a la IA

Pega esto y rellena lo que va entre corchetes:

```
Lee GUIA-NUEVOS-JUEGOS.md, README.md y los juegos src/games/criba y src/games/naranjas.

Crea el juego «[nombre]» sobre [concepto de 1.º ESO].
- Qué hace el alumno: [interacción en una o dos frases].
- Cómo se corrige: [qué estado real se comprueba].
- Ajustes para el profesor: [lista de ajustes con mínimos y máximos].
- Pistas: [tres niveles].
- Tema visual: [colores y escena; evita repetir los existentes].

Sigue la guía: matemática separada de lo visual, generador con rng y sin repetir, esquema Zod que rechace
combinaciones imposibles, pruebas unitarias, mensajes que expliquen el porqué, funcionamiento con ratón,
táctil y teclado, y fluidez en Chromebook. Al terminar, pasa la lista de comprobación de la sección 12 y
dime qué no has podido verificar.
```
