# Instrucciones para Codex — Able Avatar v0.2

Trabajás en el **frontend/runtime visual** de la mascota Able de IThreex Global para Córdoba Tech Week. Respondé en español; código y variables en inglés.

## Decisiones cerradas (no reinterpretar)
- El agente conversacional, su modelo, system prompt, conocimiento, guardrails y backend **viven en la plataforma Able**.
- **Able también proporciona la tecnología de voz mediante un widget** que se integrará en nuestra aplicación.
- Este repositorio **NO implementa otro backend conversacional, LLM, RAG, STT ni TTS**.
- El proyecto local abarca diseño/rigging/animación 3D, runtime de visualización, UI, conexión con el widget y sincronización visual si las capacidades reales del widget lo permiten.
- Las características concretas del widget (SDK, callbacks, streaming, audio/timestamps, permisos y ciclo de vida) **todavía no están documentadas aquí**. Nunca inventes sus APIs.
- Excepción: el **modo kiosco** tiene contrato v1 recibido de agenthreex (`docs/24-widget-kiosk-contract.md`, plan en `docs/22`). Usá solo lo que figura ahí.

## Procedimiento de trabajo
1. Leé `PROJECT_CONTEXT.md`, `TODO.md` y el documento técnico del área involucrada.
2. Conservá el diseño aprobado: `docs/05-avatar-visual-design.md`.
3. Antes de programar el conector real, solicitá o examiná el snippet oficial de integración del widget. Si falta, usá una interfaz abstracta y mocks claramente identificados, sin aparentar funcionalidad real.
4. Separá capa visual y adaptador Able; evitá acoplar Blender a formatos de respuesta no confirmados.
5. No cambies prompts en Able ni afirmes que fueron publicados; `able-reference/` es solo un respaldo documental.
6. No publiques claves ni tokens, ni grabes conversaciones o audio sin requisitos de privacidad y autorización definidos.
7. Al terminar, informá archivos modificados, pruebas ejecutadas, resultados y decisiones pendientes.

## Alcance inicial
- Documentación técnica y plan del runtime.
- Definición de estados visuales y clips de animación independientes de la voz.
- Prototipo de visualización y widget una vez que exista documentación de integración.
- No implementar servicios de voz alternativos por iniciativa propia.
