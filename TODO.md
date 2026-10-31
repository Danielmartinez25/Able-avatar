# Plan de trabajo — v0.2

## P0 — Preparación / arquitectura
- [x] Separar responsabilidades Able / Codex.
- [x] Confirmar que la voz la proporciona Able mediante widget.
- [x] Obtener snippet oficial / documentación del widget Able y registrar sus capacidades reales.
- [x] Elegir runtime web React/TypeScript/Vite + React Three Fiber y futuro formato GLB para el prototipo (ABLE-001 aprobado).
- [ ] Validar navegador, GPU, pantalla y dispositivos de audio del stand antes de cerrar la configuración del evento.

## P1 — Diseño 3D y prototipo visual
- [x] Preparar laboratorio local con avatar provisional y estados manuales idle / greeting / listening / thinking / speaking / farewell.
- [x] Separar estados internos, controlador visual y punto de integración Able pendiente.
- [x] Conservar la referencia visual aportada por el responsable en `assets/references/` con su procedencia.
- [ ] Crear personaje base Blender según `docs/05-avatar-visual-design.md`.
- [ ] Preparar rig, rostro digital y clips idle / greeting / listening / thinking / speaking / farewell (clips locales, no dependientes de eventos de Able).
- [ ] Probar reproducción de clips y transiciones en runtime.

## P2 — Integración widget
- [x] Integrar widget de chat de pruebas con baseUrl explícito y verificar carga/apertura en ambas páginas.
- [ ] Resolver con el proveedor la doble pulsación para reabrir después de cerrar desde la X.
- [ ] Verificar inicio/cierre de sesión, permisos de micrófono, reproducción y recuperación de errores.
- [ ] Mapear únicamente eventos reales disponibles a estados visuales.
- [ ] Comprobar si puede realizarse lipsync preciso; si no, usar animación de habla aproximada y documentar limitación.

## P3 — Modo feria / calidad
- [ ] Establecer modo pantalla completa, recuperación ante fallas y reinicio entre visitantes.
- [ ] Validar latencia percibida, fluidez y aislamiento de sesiones.
- [ ] Pruebas reales con el agente alojado en Able.

## Fuera de alcance
- Backend LLM o agente conversacional propio.
- STT/TTS propios o proveedor alternativo de voz.
- Suposiciones sobre API del widget sin documentación.


## Estudio de movimiento 02
- [x] Aproximar silueta A con abertura inferior, pantalla triangular, materiales de peluche y LED según referencia aportada.
- [x] Incorporar diez expresiones, seis acciones coreografiadas, rutina automática y modo compañero dentro de la página.
- [x] Verificar interpolación facial, anticipación/salto/asentamiento, repetición e interrupción de acciones.
- [ ] Sustituir el modelo procedural por un asset Blender de producción y validar rendimiento en el stand.

## Estudio de movimiento 03
- [x] Señales de expresión (Z, preguntas, pensamiento, sorpresa, alegría y enfoque).
- [x] Acciones locales de buscar con lupa, trabajar con notebook, tener una idea y organizar.
- [x] Aparición/retiro de accesorios, compatibilidad con rutina y movimiento reducido.

## ABLE-003 — modelo independiente, primera etapa
- [x] Preservar procedural y archivar copias verificadas por SHA-256.
- [x] Exportar copia neutral GLB y preparar .blend editable con rig personalizado para la A.
- [x] Crear jump y wave en Blender y reproducirlos desde GLB con rostro procedural.
- [x] Comparación en página separada, sin cambiar la interfaz principal.
- [x] Validar neutral, pesos, clips, apoyos y exportación Blender -> GLB; reimportar FBX en Blender.
- [ ] Completar Blender -> Cascadeur -> Blender -> GLB cuando exista instalación y exportación disponibles.
- [ ] Revisar calidad artística y avanzar posteriormente al rig/materiales de producción y resto de clips.

## ABLE-004 — wave_v2
- [x] Respaldar originales y agregar saludo de 5 s en copia Blender con el mismo rig.
- [x] Exportar GLB con wave_v2 y conservar numéricamente jump/wave.
- [x] Comparación de saludos en runtime, reapertura Blender, reimportación GLB y verificaciones técnicas.

## Prioridad actual — animaciones procedurales antes del widget
- [x] Primera iteración de espera y seis estados de interacción con pausas y transiciones suaves.
- [ ] Evaluación visual del responsable y ajustes específicos.
- [ ] Pulir el resto de acciones y expresiones de personalidad sobre la versión procedural principal.
- Blender/GLB se conservan como referencia; Cascadeur no es dependencia ni próximo paso.
- [x] Dos siestas y dos recorridos con documentos/carpetas para alternar actuaciones.
- [x] Tres acciones vistosas y modo feria con pausas para atraer visitantes.
- [x] Primera página independiente para tótem vertical: oficina, cartel IThreex y avatar interactivo.
- [ ] Revisar la oficina en pantalla física e integrar el widget al recibir el snippet oficial.

## Modo kiosco (docs/22, docs/23)
- [x] Fase 1: adaptador de eventos, simulador, boca con audio_level y tests.
- [x] Fase 2: pantallas del tótem (mail, charla, Terminar, despedida, avisos aria-live).
- [x] Comparar con WIDGET_KIOSK_CONTRACT.md de agenthreex (copia en docs/24) y ajustar diferencias.
- [ ] Pasar a agenthreex el origen exacto del tótem (`http://127.0.0.1:<puerto>` en desarrollo).
- [ ] Fase 3: probar contra able-test cuando el MR !622 esté desplegado (cuenta nueva, 409, Terminar, inactividad, token vencido, micrófono denegado).
- [ ] Confirmar visualmente la apertura de boca con audio real.
- [ ] Fase 4: Chrome kiosco con autoplay y micrófono pre-autorizado; audio y latencia del stand.
