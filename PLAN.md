# Plan: plataforma de juegos de Matemáticas (1.º ESO)

Última revisión: 4 de noviembre de 2026.

## 1. Objetivo

Una web muy atractiva para alumnos de 11 y 12 años, donde aprenden Matemáticas manipulando objetos. Paco configura los juegos desde un panel, sin tocar código ni redesplegar.

Esta versión incluye:

- Dos juegos: **Las naranjas y los cestos** y **Caza-divisores**.
- Una plataforma a la que se pueden añadir más juegos.
- Juego libre, sin registro, con progreso guardado en el dispositivo.
- Inicio de sesión opcional para conservar el progreso entre dispositivos. Se entrega **desactivado** hasta que el centro lo apruebe (sección 9).
- Panel de administración protegido para Paco.

Queda fuera de esta versión:

- Puntos, niveles e insignias.
- Estadísticas de clase para Paco.
- Crear tipos de juego desde el panel: un juego nuevo se programa y se despliega.

## 2. Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Framework | Next.js con App Router y TypeScript | Permite autorizar en servidor y encaja con Vercel |
| Estilos | Tailwind | Lo pide la especificación |
| Animación | Motion y `canvas-confetti` | La experiencia visual es prioritaria |
| Arrastre y lazo | Pointer Events nativos | Cubren ratón, táctil y lazo con un solo sistema |
| Lazo | Trazo libre | Es lo que se pidió: «rodear» las naranjas |
| Validación | Zod | Valida al guardar y al leer |
| Hosting | Vercel | Plataforma elegida |
| Configuración | Vercel Global Config | Se lee mucho y cambia poco; si Blob se bloquea, los juegos siguen funcionando |
| Alumnos y progreso | Vercel Blob privado, con archivos JSON en región UE | Solo servicios de Vercel, sin base de datos externa |
| Acceso de Paco | Contraseña con hash y cookie firmada | Sin correo ni servicio externo |
| Acceso de alumnos | Nombre de usuario y contraseña, creados por Paco | Sin registro ni correo: el alumno solo entra |

Blob no es una base de datos: no hay consultas ni contadores atómicos, y las escrituras gratuitas son pocas. Basta para este proyecto si se respetan los límites de la sección 8. Para estadísticas de clase o muchos más alumnos, habría que añadir una base de datos.

## 3. Estructura

```
src/
  app/
    page.tsx                  galería de juegos
    juegos/[slug]/            pantalla de juego
    progreso/                 progreso del alumno
    entrar/                   acceso con nombre y contraseña
    admin/                    panel de Paco
    api/config/[slug]/        configuración pública, sin caché
  games/
    registry.ts
    _kit/                     marco de juego, pistas, resultado, sonido, confeti, arrastre, lazo
    naranjas/                 motor, generador, pistas, config, juego
    caza-divisores/           motor, generador, pistas, config, juego
  lib/
    math.ts                   divisores y primos
    store.ts                  Blob en producción, archivos locales en desarrollo y pruebas
    session.ts
    progress.ts               progreso local o en servidor
```

## 4. Contrato de juegos

```ts
type GameResult = { solved: boolean; attempts: number; hintsUsed: number }

type GameDefinition<C> = {
  slug: string
  title: string
  topic: string
  cover: ComponentType
  theme: GameTheme
  configSchema: z.ZodType<C>
  defaults: C
  adminFields: AdminField[]
  Game: ComponentType<{ config: C; onResult: (result: GameResult) => void }>
}
```

Para añadir un juego:

1. Crear su carpeta en `src/games/`.
2. Implementar el contrato.
3. Registrarlo en `registry.ts` y desplegar.

El juego aparece entonces en la galería, y en el panel con un formulario generado a partir de `adminFields`. Su progreso se guarda sin más código.

Reglas de la plataforma:

- Cada desafío conserva la configuración con la que empezó.
- La configuración se pide de nuevo al iniciar cada desafío.
- Si la lectura falla o no es válida, se usan los valores por defecto del código.
- Si solo hay un juego activo, la galería lleva directamente a él.

## 5. Juego 1: Las naranjas y los cestos

### Interacción

Los dos modos cambian el mismo estado: dónde está cada naranja (montón, un cesto o «Sobran»).

- **Arrastrar:** mover las naranjas una a una, con posibilidad de devolverlas.
- **Agrupar:** rodear varias naranjas con un lazo y tocar el cesto de destino. Una naranja está seleccionada si su centro queda dentro del trazo.
- **Alternativa accesible:** tocar una naranja y después un cesto; también con teclado.

### Corrección

Con `n` naranjas y `c` cestos, la solución es `n ÷ c` por cesto (división entera) y `n mod c` sobrantes.

| Estado | Mensaje |
|---|---|
| Quedan naranjas sin colocar | «Aún te quedan naranjas por colocar» |
| Cestos desiguales | «Los cestos no tienen la misma cantidad» |
| Iguales, pero sobrantes ≥ `c` | «Aún puedes repartir más» |
| Iguales y sin sobrantes | Correcto: `c` es divisor de `n` |
| Iguales y sobrantes < `c` | Correcto: `c` no es divisor de `n` |

Si el reparto no es exacto, resolverlo consiste en dejar las sobrantes en su zona. Las explicaciones sobre primos se calculan con los divisores de `n`, nunca a partir de los cestos mostrados.

### Generador

Elige primero una categoría y después un par válido:

- Primo: siempre inexacto, porque se exige `n > c`.
- Compuesto con reparto exacto.
- Compuesto con reparto inexacto.

No repite de inmediato el mismo desafío si hay alternativas. Recibe el generador aleatorio como parámetro, para que las pruebas sean reproducibles.

### Configuración

| Ajuste | Por defecto |
|---|---|
| Naranjas (mínimo y máximo) | 6 a 30 |
| Cestos (mínimo y máximo) | 2 a 8 |
| Primos | 25 % |
| Repartos exactos | 50 % |
| Segundos hasta ofrecer una pista | 30 |
| Intentos hasta ofrecer ayuda | 2 |
| Modos disponibles | Arrastrar y agrupar |

La validación rechaza:

- Primos + exactos > 100 %.
- Mínimos mayores que máximos.
- Ningún modo activo.
- Cantidades por encima del tope visual.
- Rangos en los que una categoría pedida no tiene ningún par posible. Por ejemplo, entre 24 y 28 naranjas no hay primos.

### Pistas

El botón de ayuda está siempre disponible. El tiempo y los intentos hacen que la ayuda se ofrezca sola.

1. «Intenta que todos los cestos tengan la misma cantidad».
2. «¿Qué ocurre con las naranjas que no puedes repartir?».
3. Explicación matemática completa.

## 6. Juego 2: Caza-divisores

Aparece un número y varias burbujas flotando. El alumno toca las que sean divisores de ese número. Termina cuando las ha encontrado todas.

- **Correcto:** la burbuja estalla y se muestra la multiplicación, por ejemplo `24 = 4 × 6`.
- **Incorrecto:** la burbuja tiembla y se explica con la división, por ejemplo «24 ÷ 5 no es exacta».
- **Primos:** si solo hay dos divisores, el juego explica por qué ese número es primo.
- **Pistas:** primero «prueba a dividir», después «los divisores van en parejas» y al final se resalta un divisor pendiente.
- **Sin cuenta atrás:** evita que el juego premie la rapidez sobre la comprensión.

**Configuración:** número mínimo y máximo, cantidad de burbujas, frecuencia de primos y si se incluyen o no 1 y el propio número.

Este juego usa otra interacción y otra lógica de corrección, de modo que comprueba que el contrato sirve para más que repartir objetos. Debe poder añadirse sin cambiar la plataforma; si hace falta, se corrige el contrato.

## 7. Diseño visual

Dirección: videojuego de móvil premium. Colorido y con mucha respuesta al tocar, pero sin parecer de Primaria.

- **Base común:** tipografías Bricolage Grotesque y Nunito, servidas desde el propio dominio. Cada juego tiene su color y fondo.
- **Galería:** tarjetas ilustradas y animadas para cada juego.
- **Naranjas:** huerto al atardecer con naranjas en SVG, con brillo y hoja. Se aplastan al cogerlas y rebotan al caer.
- **Cestos:** de mimbre, de colores distintos y con un contador animado.
- **Lazo:** trazo luminoso; las naranjas que quedan dentro se iluminan al dibujarlo.
- **Caza-divisores:** fondo submarino con burbujas translúcidas que flotan y estallan.
- **Celebración:** los cestos saltan en cadena, aparece la operación y hay confeti.
- **Reparto inexacto:** las sobrantes ruedan a su zona, aparece `7 = 2 × 3 + 1` y se presenta como un descubrimiento.
- **Sonido:** generado con Web Audio y desactivado por defecto, porque habrá muchos dispositivos en la misma clase.

Requisitos que no se negocian:

- Se animan solo `transform` y `opacity`.
- Fluido con el máximo de objetos a 1366×768 y la CPU ralentizada 4×.
- Se respeta `prefers-reduced-motion`.
- Buen contraste, y el color nunca es la única señal.
- Uso completo con ratón, táctil y teclado.

El panel de Paco es limpio y sobrio, con sliders, validación en directo y una vista previa de ejercicios de ejemplo.

## 8. Datos y sesiones

```
Global Config
  game_<slug>        { enabled, config }
  admin              { passwordHash }
  accounts_enabled   true | false

Blob privado (región UE)
  students.json              lista de clases y alumnos: id, clase, usuario, hash, activo
  progress/<studentId>.json  totales por juego: completados, resueltos, pistas, mejor racha
```

### Límites de Blob en Hobby

| Recurso | Incluido | Previsión con 30 alumnos y 8 sesiones al mes |
|---|---|---|
| Escrituras | 2.000 | Unas 480, con 2 por sesión |
| Lecturas sin caché | 10.000 | Unas 240, al iniciar sesión |
| Almacenamiento | 1 GB | Menos de 1 MB |

**Si se supera un límite, Blob queda inaccesible hasta 30 días.** Las cifras anteriores son una estimación, y navegar por el almacén desde el panel de Vercel también consume operaciones. Por eso:

- El progreso no se escribe en cada desafío. Se acumula en `localStorage` y se envía como máximo cada 15 minutos y al salir.
- Lo que no se haya podido enviar se reintenta en la siguiente visita.
- Los intentos de acceso fallidos no escriben nada.
- Los accesos leen `students.json` a través de la caché, así que muchos intentos no consumen lecturas.
- Si Blob se bloquea, se puede jugar igualmente y el progreso se queda en el dispositivo.

Si un mismo alumno usa dos dispositivos a la vez, prevalece la última escritura. Altas, bajas y nuevas contraseñas tardan hasta 60 segundos en hacerse efectivas.

### Progreso

| Situación | Dónde se guarda | Limitación |
|---|---|---|
| Sin iniciar sesión | `localStorage` | Solo en ese navegador; se pierde si se borran los datos |
| Con sesión | Blob, con copia en `localStorage` | Disponible en cualquier dispositivo |

Al entrar por primera vez, el progreso local pasa a la cuenta si esta está vacía. Se guardan solo totales por juego, nunca un historial de cada intento.

### Cuentas de alumnos

No hay registro, correo ni recuperación automática.

1. Paco crea una clase y pega una lista de nombres de usuario, uno por línea.
2. El sistema genera una contraseña fácil de teclear para cada alumno, por ejemplo `naranja-cesto-sol-47`, y añade un número si un nombre se repite.
3. Paco imprime las tarjetas. Las contraseñas se muestran solo en ese momento.
4. El alumno entra con su nombre y contraseña y sigue jugando. Si la olvida, Paco genera otra desde el panel.

Se recomienda usar un nombre de pila con inicial o un apodo (`lucia-m`), nunca nombre y apellidos completos.

Solo se guarda el hash de la contraseña (scrypt). Sin una base de datos no hay un contador fiable de intentos, así que la defensa es que las contraseñas generadas sean difíciles de adivinar, junto con la regla de límite de peticiones de Vercel Firewall si está disponible en Hobby. Los alumnos no pueden cambiarla, para que Paco no tenga que gestionar olvidos de contraseñas inventadas. Paco puede borrar una clase con todos sus datos, lo que debería hacerse al acabar cada curso.

### Seguridad

- Toda escritura se autoriza en el servidor. El navegador no recibe credenciales de Blob ni de Global Config.
- La contraseña de Paco es larga, generada al azar y se guarda con scrypt.
- Las cookies son `HttpOnly`, `Secure`, `SameSite=Lax` y firmadas.
- La ruta pública de configuración solo devuelve la configuración de ese juego.
- El primer administrador se crea con un comando documentado, que genera una contraseña larga.
- Si Paco olvida la contraseña, se restablece con ese mismo comando.

## 9. Protección de datos

Esto no es asesoramiento legal: la decisión corresponde al centro y a su delegado de protección de datos.

- **Sin sesión:** no se piden datos personales y no hay analítica ni publicidad. Vercel puede registrar direcciones IP en sus logs.
- **Con sesión:** un nombre de usuario ligado al progreso de un alumno es un **dato personal y el RGPD se aplica**. Un apodo o una inicial reducen el riesgo, pero no lo eliminan, porque Paco sabe quién es cada uno.
- **Edad:** en España, por debajo de 14 años el consentimiento corresponde a madres, padres o tutores. Puede no hacer falta si el tratamiento forma parte de la función docente, pero esa base no cubre cualquier herramienta. La AEPD ya ha sancionado a un centro por su uso de Google Workspace for Education.

Por eso:

- `accounts_enabled` está **desactivado por defecto** y se activa desde el panel.
- **No se usa con alumnos reales hasta tener el visto bueno del centro por escrito.**
- Almacén Blob y funciones en región de la UE. Global Config se replica globalmente, por lo que no guarda datos de alumnos.
- Hay que aportar al centro el proveedor (Vercel) y qué datos se guardan.

## 10. Fases

Cada fase termina con algo que se puede comprobar.

| # | Entrega | Validación |
|---|---|---|
| 0 | Cuenta de Vercel, consulta a soporte, repositorio, Blob privado en región UE y Global Config | Respuesta de Vercel |
| 1 | Prototipo visual publicado: naranjas, arrastre y celebración | **Javi lo aprueba y se prueba en un Chromebook del centro** |
| 2 | Motor y generador de naranjas, `lib/math.ts` | Pruebas unitarias |
| 3 | Juego de naranjas con arrastre, toque, pistas y correcciones | Prueba con Paco y, si es posible, con un alumno |
| 4 | Lazo | Pruebas de selección, con ratón y táctil |
| 5 | Contrato, marco común, galería y progreso local | Las naranjas funcionan como un juego más |
| 6 | Global Config, acceso de Paco y panel | Pruebas de acceso y validación |
| 7 | Caza-divisores | Se añade sin cambiar la plataforma |
| 8 | Blob, clases, alta de alumnos, tarjetas, acceso y página de progreso, desactivados por defecto | Pruebas de acceso, nueva contraseña, baja, paso de progreso local a la cuenta y frecuencia de escrituras |
| 9 | Producción, pruebas completas y README | Criterios de la sección 12 |

Las fases 1, 3 y 4 son las más laboriosas y arriesgadas. Si en la fase 1 el aspecto no convence o va lento, se corrige antes de seguir.

## 11. Pruebas

**Unitarias (Vitest):**

- Divisores y primos, incluido el caso del 1.
- Límites del generador y frecuencias aproximadas por categoría.
- Sin repetición inmediata.
- Todos los estados de corrección, en particular los repartos sin solución exacta.
- Progresión de pistas.
- Validación de configuraciones, incluidos rangos sin primos.
- Selección con el lazo.
- Correspondencia de cada juego con su contrato.

**De extremo a extremo (Playwright, con almacén de archivos local):**

- Arrastre y lazo con ratón y táctil.
- `/admin` y sus acciones rechazadas sin sesión.
- Un acceso fallido no escribe nada en el almacén.
- Criterios de aceptación de la sección 12.

Antes de publicar se hace una prueba real contra Blob y Global Config en un despliegue de preview.

## 12. Criterios de aceptación

1. Paco cambia el máximo de naranjas de 20 a 30 y guarda. Un alumno nuevo recibe un ejercicio con la nueva configuración, sin redesplegar.
2. Un alumno que ya estaba jugando termina su desafío con la configuración anterior.
3. Dos alumnos en dispositivos distintos reciben sus propios ejercicios, sin registrarse.
4. Un reparto sin solución exacta se puede resolver y se explica bien.
5. Los dos juegos funcionan y Paco puede activarlos y configurarlos por separado.
6. Si Global Config no responde, los juegos usan los valores por defecto. Si Blob no responde, se puede seguir jugando y el progreso queda en el dispositivo.
7. Con las cuentas activadas en un entorno de prueba, un alumno entra con su nombre y contraseña en otro dispositivo y recupera su progreso.
8. Con las cuentas desactivadas, no aparece ninguna opción de acceso para alumnos.
9. Rendimiento y accesibilidad cumplen los requisitos de la sección 7 en un Chromebook real.

## 13. Pendiente

| Quién | Qué | Bloquea |
|---|---|---|
| Javi | Consultar a Vercel si este uso cabe en Hobby; indicar si alguien cobra y si el centro es público o privado | Publicación final |
| Javi y Paco | Decidir a nombre de quién va la cuenta de Vercel | Fase 0 |
| Paco | Comprobar si la red del centro permite `vercel.app` | Fase 1 |
| Paco | Confirmar que el botón de ayuda esté siempre disponible | Nada: es el valor por defecto |
| Paco y centro | Aprobar las cuentas de alumno con nombre y contraseña | Activar las cuentas, no construirlas |
| Javi | Comprobar si el token de escritura de Global Config se puede limitar a este almacén | Fase 6 |
| Javi | Comprobar si Vercel Firewall permite limitar peticiones en Hobby | Activar las cuentas |

## 14. Riesgos

| Riesgo | Medida |
|---|---|
| Vercel considera que el uso no cabe en Hobby | Pagar Pro o cambiar de hosting; se decide antes de publicar |
| El filtro del centro bloquea la web | Comprobarlo en la fase 1 |
| Poca fluidez en Chromebooks | Prueba real en la fase 1 y requisitos de rendimiento |
| Global Config no responde | Valores por defecto |
| Se superan los límites de Blob y queda bloqueado hasta 30 días | Escrituras agrupadas, avisos de Vercel por correo y progreso local mientras dure; si se queda corto, pasar a Pro o añadir una base de datos |
| Ataque de fuerza bruta al login de alumnos | Contraseñas difíciles de adivinar y, si está disponible, límite en Vercel Firewall; el riesgo se limita a un apodo y unos totales de juego |
| Todo depende de un solo proveedor | Asumido por decisión del proyecto; `store.ts` concentra el cambio si hay que migrar |
| Paco olvida la contraseña | Comando documentado de restablecimiento, que requiere a Javi |
| El centro rechaza las cuentas | Se quedan desactivadas y todo lo demás sigue funcionando |

## 15. Fuentes

- [Vercel: opciones de almacenamiento](https://vercel.com/docs/storage)
- [Vercel: límites de Global Config](https://vercel.com/docs/global-config/global-config-limits)
- [Vercel: Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Vercel Blob](https://vercel.com/docs/vercel-blob)
- [Vercel Blob: precios y límites](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [AEPD: consentimiento de menores](https://www.aepd.es/infografias/infografia-consentimiento-menores.pdf)
- [ECIJA: sanción por el uso de Google Workspace for Education](https://www.ecija.com/actualidad-insights/sancion-por-el-uso-de-google-workspace-for-education-a-un-centro-educativo/)
