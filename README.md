# Able Avatar — Córdoba Tech Week (v0.2)

Experiencia de personaje 3D para que los visitantes conversen con **Able**, mascota de IThreex Global.

## Distribución de responsabilidades

**Plataforma Able (ya existente):** agente conversacional, modelo de IA, system prompt XML, guardrails, conocimiento y **widget de voz**.

**Proyecto local / Codex:** diseño, rigging y animaciones del avatar en Blender; runtime de presentación, interfaz para visitantes, incorporación del widget de Able y coordinación de estados visuales.

No crear un segundo backend conversacional ni servicios STT/TTS. La API exacta y los eventos del widget aún **no se han verificado**.

## Documentación
- `AGENTS.md`: reglas operativas para Codex.
- `PROJECT_CONTEXT.md`: arquitectura, decisiones y límites.
- `TODO.md`: trabajo priorizado.
- `docs/05-avatar-visual-design.md`: definición visual oficial, preservada.
- `docs/07-able-widget-integration.md`: integración pendiente de documentación.
- `docs/08-avatar-runtime.md`: límites y módulos del runtime.
- `docs/09-animation-state-machine.md`: estados visuales propuestos.
- `able-reference/`: copia documental del prompt y comportamiento que se configura realmente dentro de Able.

## Ejecutar el prototipo local (Windows)

Con Node 24 y npm disponibles, desde la raíz:

```powershell
npm ci
npm run dev
```

Abrí la URL local indicada por Vite. El servidor escucha solo en `127.0.0.1`.
Para verificar: `npm test` y `npm run build`. Para revisar la compilación: `npm run preview`.

El laboratorio muestra un avatar geométrico provisional con seis estados manuales. No es el
personaje definitivo, no reproduce audio, no solicita micrófono y no conecta con Able.
Saludo y despedida vuelven automáticamente a idle. Reiniciar visual solo reinicia la animación.
La opción de reducir movimiento comienza con la preferencia del sistema.

## Desarrollo

- `src/avatar/`: escena y animación procedural provisional; futuro consumidor de GLB.
- `src/experience/`: estados internos y transiciones, sin dependencia de Three.js o Able.
- `src/ui/`: controles manuales y estado de integración.
- `src/integration/able/`: contrato interno propuesto, sin implementación del widget.
- `assets/blender/`: futuras fuentes de modelado; `scripts/blender/`: automatización futura.
- `assets/exports/`: archivos intermedios ignorados; `public/models/`: GLB distribuibles.

Cuando exista documentación oficial, incorporarla a `docs/07-able-widget-integration.md`
antes de programar la conexión real. Ver decisiones de ABLE-001 en `docs/10-able-001-architecture.md`.

## Estudio de movimiento 02

Usá **Ver rutina** para reproducir aparecer, saludar, caminar, saltar, guiñar y celebrar en bucle.
Las diez expresiones faciales se eligen de manera independiente. Las acciones pueden darles una
expresión temporal y, al terminar, vuelve la elegida. Los seis estados originales están en
**Estados de interacción**. Cualquier selección manual interrumpe la rutina.

**Modo compañero** saca a Able del panel y permite arrastrarlo por la página desde la barra superior.
Se orienta suavemente con el puntero y responde con un guiño al tocarlo. También existe el botón
Guiña para activar la misma acción con teclado. No es todavía una aplicación de escritorio ni
se dibuja fuera de esta página. **Reiniciar visual** detiene acciones y rutina y vuelve a idle/auto.

La referencia aportada está en `assets/references/able-character-board.png`. El peluche se aproxima
con microtextura y fibras procedurales; sigue pendiente el asset Blender de producción. No se han
agregado dependencias. Ver `docs/12-motion-study-02.md` para alcance y verificaciones.

## Estudio 03 — accesorios y señales

La rutina ahora incluye diez acciones. Se suman **Busca información** (lupa), **Trabaja** (notebook),
**Tiene una idea** (bombilla) y **Organiza** (lista). Son escenas visuales y no ejecutan tareas reales.
Las expresiones incorporan Z al dormir, signos de pregunta, puntos de pensamiento, exclamaciones,
corazón y destellos. Con movimiento reducido los símbolos y accesorios permanecen estáticos.
Ver `docs/13-expression-props.md` para detalle, archivos y verificaciones.

## ABLE-003 — comparar con Blender

La versión procedural principal se conserva intacta. La comparación independiente está en
`http://127.0.0.1:5174/compare.html` (o el puerto mostrado por Vite). Usá **Reproducir jump**,
**Reproducir wave** y la barra de inspección del GLB.

- Fuente Blender: `assets/able-003/blender/able-rigged.blend`.
- Copia neutral: `assets/able-003/source/able-neutral.glb`.
- GLB animado: `public/models/able-003/able-rigged.glb`.
- FBX preparado: `assets/able-003/exchange/able-for-cascadeur.fbx`.

Blender -> GLB y reimportación FBX en Blender fueron comprobados. **Cascadeur no fue ejecutado**:
no se encontró instalación accesible. Los clips se crearon con Python de Blender. Detalle,
limitaciones, pruebas y reproducción: `docs/14-able-003-model-transition.md`.

## Modo kiosco (tótem)

`/totem.html` muestra solo a Able y usa el widget en modo kiosco (invisible). El staff abre su panel
con Ctrl+M o la esquina superior derecha, tipea el mail y "Empezar" crea la sesión; el avatar sigue
los eventos del widget. Requiere `VITE_KIOSK_KEY` en `.env.local` y el
MR !622 de agenthreex desplegado. Sin backend: `/totem.html?simulate` (solo en desarrollo) o el
panel "Simulador del kiosco" del laboratorio. Plan: `docs/22-kiosco-avatar-plan.md`; contrato: `docs/24-widget-kiosk-contract.md`; estado real:
`docs/23-kiosco-implementation.md`.
