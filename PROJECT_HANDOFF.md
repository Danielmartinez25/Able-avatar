# Able Avatar — Project Handoff para Codex

**Fecha de corte:** 2026-10-28  
**Proyecto local:** `F:\Trabajo\CWT2026\able-avatar`  
**Propósito:** transferir decisiones y contexto de la conversación con ChatGPT al trabajo local de Codex, sin reiniciar análisis ni reemplazar el código existente.

## 1. Objetivo

Crear una experiencia interactiva para el stand de **IThreex Global** en **Córdoba Tech Week 2026**: visitantes conversan por voz con **Able**, la mascota oficial de la empresa, mostrada como avatar animado.

La prioridad actual es **mejorar la expresividad y la calidad de las animaciones**, de manera incremental, rápida y con entregables funcionales. Evitar ciclos de propuestas, reanálisis y cambios reiterados de tecnología.

## 2. Identidad visual innegociable

**Able es una letra A estilizada con personalidad propia; NO es un robot y NO es un humanoide.**

- Silueta de A triangular con bordes muy redondeados y abertura característica.
- Cuerpo de peluche blanco, suave y ligeramente esponjoso.
- Pantalla facial negra brillante y curva.
- Ojos digitales expresivos azul eléctrico, boca luminosa y cejas redondeadas.
- Brazos pequeños y acolchados; pies cortos azul oscuro con iluminación azul.
- Detalles LED azules y pequeña X azul en el lateral derecho.
- Personalidad: curioso, inteligente, proactivo, simpático, divertido, cercano, colaborativo y ligeramente travieso.
- Estética de mascota animada premium: movimientos orgánicos, squash & stretch, anticipación, seguimiento secundario y transiciones suaves.

No rediseñar ni alterar proporciones, colores o silueta sin indicación explícita.

## 3. Arquitectura y límites de responsabilidad

### Plataforma Able (externa al repositorio)
- Agente conversacional, LLM, system prompt XML, guardrails, conocimiento y lógica del agente.
- Tecnología de voz y **widget de voz** de Able.

### Proyecto local con Codex
- Aplicación visual en React + TypeScript + React Three Fiber / Three.js.
- Avatar procedural existente, modelo externo GLB y comparador.
- Archivos editables Blender, rigging, clips y reproducción de animaciones.
- Futuro acoplamiento visual con el widget oficial de Able, cuando se disponga de su contrato técnico real.

**No construir otro backend de IA, STT ni TTS.** No inventar API, SDK o eventos del widget Able. No integrar voz por ahora salvo instrucción explícita.

## 4. Decisiones de herramientas

- Mantener **Blender + Three.js / React Three Fiber + Codex** como pipeline actual.
- **Masko** fue una prueba separada: descartado para este proyecto por costos. No usarlo ni proponerlo nuevamente salvo pedido expreso.
- **Cascadeur** fue evaluado, pero las condiciones de licencia/exportación complican su uso comercial; no constituye dependencia ni próximo paso. No instalar ni comprar herramientas pagas sin autorización.
- No se requieren sprite sheets para los clips de animación 3D incluidos en GLB.

## 5. Implementación existente reportada por Codex

### Avatar original
- Creado proceduralmente en Three.js y React Three Fiber, **sin archivo Blender de origen**.
- Geometría de cuerpo basada en curvas Bézier extruidas y biseladas.
- Rostro digital y expresiones procedurales, accesorios y efectos.
- Textura con parámetros físicos y numerosas fibras dibujadas en runtime.
- Archivos de código destacados reportados: `src/avatar/characterGeometry.ts`, `src/avatar/ProvisionalAvatar.tsx`, `src/avatar/DigitalFace.tsx`.

### ABLE-003
- Se informó la generación de una versión GLB desde Blender con **rig de 14 huesos** y clips `jump` y `wave`.
- Existe un comparador de avatar procedural y avatar GLB.
- Se preservó la versión procedural como referencia y respaldo.
- El rostro procedural puede seguir anclado al modelo externo; no asumir que toda la lógica facial está incluida en GLB.

### ABLE-004: wave_v2
Codex informó haber implementado una animación de saludo de **5 segundos** con anticipación, dos saludos asimétricos, squash suave, movimiento desfasado de brazo/mano y recuperación gradual.

Rutas reportadas por Codex (verificarlas localmente):
- `assets/able-004/able-wave-v2.blend`
- `public/models/able-004/able-wave-v2.glb`
- `assets/able-004/backup/`
- `docs/15-able-004-wave-v2.md`
- Comparador local: `http://127.0.0.1:5174/compare.html` (solo accesible si la app local está levantada).

Codex reportó **20 pruebas aprobadas**, build correcto, reapertura del .blend, reimportación GLB y reproducción en navegador, sin modificar `jump`, `wave` ni el procedural. **Estos resultados son reportados, no verificados independientemente por ChatGPT.** La calidad visual y artística de `wave_v2` aún requiere evaluación humana mirando la animación.

## 6. Estado actual / siguiente acción

**No reiniciar ABLE-003 o ABLE-004.** Primero verificar en el repositorio que los archivos mencionados existen y que el comparador permite reproducir `wave_v2` frente a `wave`.

El siguiente objetivo es una evaluación visual concreta del saludo y, únicamente si hiciera falta, una iteración localizada sobre `wave_v2` basada en observaciones específicas. Después usar ese estilo aprobado para las otras animaciones (`idle`, `listening`, `thinking`, `speaking`, `happy`, etc.).

## 7. Reglas de trabajo para Codex

1. **Ejecutar cambios cuando la tarea ya está autorizada**; no devolver otra ronda de arquitectura o planificación.
2. Conservar el procedural y las versiones anteriores como comparación o fallback.
3. No modificar la identidad visual de Able ni convertirlo en robot/humanoide.
4. Preferir cambios pequeños, reversibles y verificables.
5. No generar integraciones de voz propias; Able proporciona agente y widget de voz.
6. No usar Masko ni incorporar herramientas pagas sin autorización.
7. Reportar solo resultados comprobados: archivos, pruebas ejecutadas, estado real y bloqueos.
8. Para revisión visual compartida con ChatGPT, generar si es posible un **MP4 corto** de la animación y, para revisión técnica, incluir el `.blend`, `.glb`, archivos de código relevantes y/o un ZIP acotado.
9. No asumir que este chat puede leer automáticamente `F:\...` ni abrir `127.0.0.1` en la PC. Los materiales deben compartirse explícitamente mediante carga de archivos o repositorio conectado.
10. Ante una decisión técnica menor y reversible, elegir la opción más simple que preserve lo existente y seguir implementando.

## 8. Qué hacer al recibir este documento

1. Leer `AGENTS.md`, `README.md`, `PROJECT_CONTEXT.md` y este `PROJECT_HANDOFF.md`.
2. Verificar en el árbol de trabajo qué archivos de ABLE-003 y ABLE-004 existen realmente.
3. **No reescribir ni reorganizar el proyecto en respuesta a esta lectura.**
4. Mantener este documento como contexto y esperar una tarea concreta de implementación.
5. Si hay diferencias entre este handoff y los archivos reales, priorizar el estado verificable del repositorio y señalar solo las discrepancias materiales.

## 9. Prompt breve de incorporación

> Leé `PROJECT_HANDOFF.md` junto con `AGENTS.md` y el estado actual del repositorio. Este documento transfiere decisiones ya tomadas desde ChatGPT. No reinicies la arquitectura, no vuelvas a proponer Masko o Cascadeur y no modifiques archivos todavía. Verificá el estado real de `wave_v2` y respondé brevemente qué está listo para revisar visualmente y cómo abrirlo.

---

Este archivo es un **resumen operativo**, no una exportación literal del historial completo de ChatGPT ni una prueba independiente de los archivos locales.
