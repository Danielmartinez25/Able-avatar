# Contexto y arquitectura — Able Avatar v0.2

## Objetivo
Ofrecer en Córdoba Tech Week una experiencia en la que una persona habla con Able y observa un personaje 3D expresivo. El personaje deberá ser reutilizable en otras experiencias de IThreex Global.

## Arquitectura aprobada
Visitante ⇄ Aplicación visual con avatar 3D + widget de voz Able ⇄ Plataforma Able (agente IA y voz).

La tecnología de voz de Able se integra mediante un **widget**, no mediante un motor de voz propio del proyecto.

## Responsabilidades
- **Able:** comportamiento conversacional, system prompt, LLM, conocimiento, políticas del agente, reconocimiento/generación de voz provistos por su tecnología/widget.
- **Codex:** archivos de Blender, animaciones, UI, representación visual, integración técnica del widget y coordinación visual con los eventos disponibles.

## Desacoplamiento
La aplicación visual no toma decisiones de negocio en lugar de Able. Un adaptador encapsulará las capacidades comprobadas del widget. No se presume acceso a transcript, audio crudo, timestamps ni eventos de estado hasta revisar la documentación.

## Estado
- Agente Able v0.1: definición y prompt disponibles como referencia; su estado real en la plataforma no se verifica desde este repositorio.
- Diseño visual oficial: definido textualmente.
- Widget: confirmado por el usuario como vía de voz; interfaz técnica pendiente.
- ABLE-001: runtime web React/TypeScript/Vite con Three.js y React Three Fiber aprobado e implementado como prototipo manual.
- Avatar provisional procedural: seis estados internos; no es el personaje definitivo ni un asset Blender.
- Modelo/rig de producción, resto de clips e integración/sincronización con el widget: pendientes. ABLE-003 agrega una copia Blender y dos clips de ensayo independientes.

## Evolución visual — estudio de movimiento 02
- Referencia de personaje aportada por el responsable y preservada en assets/references/able-character-board.png.
- Diez expresiones, seis acciones corporales y modo compañero arrastrable dentro de la web.
- Estados de interacción, expresiones y acciones independientes; la integración Able sigue pendiente.
- Se mantiene el carácter provisional del modelo procedural. No se modifica la especificación oficial.

## Evolución visual — estudio 03 (2026-10-26)
- Diez acciones, con lupa, notebook, bombilla y lista en nuevas escenas locales.
- Símbolos específicos por expresión, incluidas Z al dormir y puntos al pensar.
- No representan búsquedas ni trabajo real del agente; la integración sigue pendiente.


## ABLE-003 — primera etapa
- Copia neutral y referencia procedural archivada; implementación original sin modificaciones.
- Blender editable con rig A de 14 huesos y acciones jump/wave; GLB reproducible en comparación separada.
- Rostro procedural conservado mediante face_socket. Materiales/fibras de producción no abordados.
- Cascadeur no ejecutado por falta de instalación accesible; FBX y pasos de intercambio preparados.
- Ver docs/14-able-003-model-transition.md para resultados reales y limitaciones.

## ABLE-004 — saludo mejorado en Blender
- wave_v2 de 5 segundos en una copia del proyecto de 14 huesos; jump/wave anteriores intactos.
- Comparador con GLB anterior frente a wave_v2 y opción de recuperar el procedural.
- Ver docs/15-able-004-wave-v2.md. Esta ejecución fue autorizada en Blender, sin Cascadeur.

## Estudio procedural 04 — espera e interacción (2026-10-28)
- Por decisión posterior del responsable, el procedural es la versión principal y primero se pulen sus animaciones, antes del widget.
- Espera con reloj continuo, parpadeo simple/doble, pequeños gestos; estados con pausas, anticipación y retorno suave.
- El snapshot ABLE-003 conserva el código original; los archivos Blender/GLB ABLE-003/004 no cambian.
- Ver docs/16-procedural-interaction-motion.md. Quedan posteriores iteraciones de acciones y personalidad; el widget sigue pendiente.

## Estudio 05 — siesta y documentos (2026-10-29)
- Dos variantes temporales de dormir y dos de ir/volver con documentos; 14 acciones locales en total.
- Elección explícita por botones o recorrido en Ver rutina; desplazamiento real en profundidad y accesorios coordinados.
- Ver docs/17-sleep-and-documents.md. No se realizan tareas reales con documentos ni se modifica el widget.

## Estudio 06 — atraer visitantes
- Baile travieso, acá estoy y tarán, con partículas y aros animados. 17 acciones locales en total.
- Modo feria opcional: alterna las tres con 12 s de reposo; se cancela con selección manual y movimiento reducido.
- Ver docs/18-attention-series.md. El modo no detecta personas ni inicia sesiones del agente.

## Tótem vertical — oficina v1
- Presentación independiente en /totem.html con oficina 3D y cartel iluminado usando el logo aportado.
- Laboratorio / y comparador /compare.html conservados, sin cambios de UI en esta etapa.
- Interacciones visuales reales, sin voz ni widget simulado. Ver docs/19-totem-office-v1.md.

## Widget de pruebas — 2026-10-29
- Guía y Chat Live recibidos; widget real cargado en laboratorio y tótem con baseUrl explícito de able-test.
- Interfaz de chat, dictado y voz visible; audio y respuestas sin probar. Sin contrato para sincronizar animaciones.
- Ver docs/21-able-widget-test-integration.md para configuración, pruebas y defecto de reapertura observado.

## Modo kiosco — 2026-10-30
- Contrato del widget kiosco v1 recibido de agenthreex (plan en docs/22). Adaptador, simulador y pantallas del tótem implementados.
- Tótem: pantalla de mail, charla por voz con subtítulos, despedida y modo feria entre visitantes. El laboratorio conserva el chat común y suma un simulador.
- Sin prueba contra Able real hasta que el MR !622 esté en test. Ver docs/23-kiosco-implementation.md.
