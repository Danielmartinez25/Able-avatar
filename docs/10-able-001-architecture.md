# ABLE-001 — Arquitectura aprobada

Fecha: 2026-10-25. Aprobación del responsable en el chat antes de implementar.

## Separación

1. Blender: fuentes `.blend`, materiales y futuro rig en `assets/blender/`; scripts Python en `scripts/blender/`.
2. Exportación: GLB intermedios en `assets/exports/` (ignorados). Solo entregables listos en `public/models/`.
3. Runtime: React/TypeScript/Vite y React Three Fiber sobre Three.js. Estado visual en `src/experience/`, geometría y animación en `src/avatar/`, presentación en `src/ui/`.
4. Able: agente, guardrails, conocimiento, backend y voz en su plataforma. El adaptador futuro vive en `src/integration/able/`; actualmente solo hay un destino interno de estados tipado y un estado de integración pendiente.

El prototipo es una sola aplicación con un package.json. No requiere backend local ni Blender instalado.
React administra el estado con un reducer; no se añade una biblioteca de estados. Los controles son
manuales y no representan señales de un micrófono o agente conectado. No se guardan conversaciones,
audio ni estados en almacenamiento persistente.

## Assets y presentación

El personaje actual es una exploración geométrica según la especificación oficial, que permanece
intacta. Sus materiales lisos no pretenden representar el acabado definitivo de peluche. Las poses
son procedurales; no hay rig, clips exportados ni sincronización labial real.

La futura exportación GLB deberá validar mallas, materiales y animaciones en el navegador. No asumir
que el acabado de Blender se reproduce idéntico. Los nombres de clips corresponderán a los seis
estados internos y serán independientes de cualquier formato conversacional.

## Dependencias

Dependencias de ejecución: React/React DOM 19.3.1, Three.js 0.186.1 y Fiber 9.8.2.
Desarrollo: Vite 8.3.5, plugin React 6, TypeScript 7.0.2 y tipos React/DOM/Three.
Las versiones resueltas se conservan en package-lock.json. Entorno inicial: Node 24.19.0, npm 11.17.0.
Blender 4.5 LTS es la base propuesta para la etapa de assets; no se instala como parte de ABLE-001.

La compatibilidad declarada de Fiber exige React >=19 <19.4 y Three >=0.156.
Fuentes: https://r3f.docs.pmnd.rs/getting-started/installation,
https://registry.npmjs.org/@react-three%2ffiber/latest,
https://vite.dev/guide/, https://www.blender.org/releases/4-5/.

## Documentación anterior

Se incorpora farewell al contrato y a la máquina de estados. Error y reinicio se separan de los
estados expresivos. El XML v0.1 de `able-reference/` sigue como respaldo histórico de una experiencia
solo texto; no se modifica ni se afirma que haya sido publicado. La configuración real se verifica en Able.

## Verificación y pendientes

Comprobar tipos, build y transiciones (incluidas interrupciones y finalizaciones obsoletas).
Revisar escena, estados y reinicio en navegador. Las pruebas conversacionales de tests/test-cases.csv
se ejecutan contra Able real y no se sustituyen por las pruebas locales del reducer.

Pendientes: snippet oficial del widget, política de sesiones, hardware del stand, personaje definitivo,
rig/GLB y cualquier sincronización que las capacidades documentadas del widget permitan.
