# ABLE-001 — Registro de validación

Fecha: 2026-10-25. Entorno: Windows, Node 24.19.0, npm 11.17.0.

## Resultado

- Instalación: 43 paquetes; auditoría npm inicial sin vulnerabilidades reportadas.
- `npm test`: tres pruebas aprobadas. Cubren las 36 combinaciones de selección manual,
  la protección frente a finalizaciones obsoletas tras interrupción/reinicio y la diferencia
  entre estados persistentes y estados que vuelven a idle.
- `npm run build`: comprobación TypeScript y compilación de producción correctas.
- HTTP local: respuesta 200 desde Vite.
- Navegador integrado: escena WebGL visible, personaje completo, seis controles verificados,
  retorno automático de greeting y farewell a idle, cambio de estado, reinicio y opción
  de reducir movimiento comprobados. Se corrigieron encuadre y dirección del saludo.
- UI de integración: muestra explícitamente widget pendiente y sin conectar.

## Límites de esta validación

Vite advierte un chunk de aproximadamente 1.14 MB (314 kB gzip), principalmente por el motor
3D. El build finaliza correctamente. Optimización de descarga pendiente antes de distribuir.
No se midieron FPS ni se validó hardware del stand, navegadores adicionales o dispositivos móviles.
El manejo de fallas de la escena está implementado con fallback y reintento, pero no se indujo
una pérdida real de contexto GPU durante la revisión.

El prototipo no contiene modelo Blender definitivo, clips GLB, audio, lipsync ni integración
Able. No se ejecutaron las pruebas conversacionales: requieren el agente real en la plataforma.
La descripción visual oficial y el XML de referencia permanecen sin modificaciones.

## Archivos de esta entrega

- Configuración: package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html y .gitignore.
- Aplicación: src/main.tsx, src/vite-env.d.ts, src/app/App.tsx y styles.css.
- Avatar: src/avatar/AvatarScene.tsx, ProvisionalAvatar.tsx y animationController.ts.
- Estados: src/experience/visualState.ts y visualStateReducer.ts.
- UI: src/ui/StateControls.tsx e IntegrationStatus.tsx.
- Adaptador pendiente: src/integration/able/adapter.ts y README.md.
- Pruebas: tests/visual-state.test.ts.
- Documentación actualizada: README.md, PROJECT_CONTEXT.md, TODO.md y docs/06, 08 y 09.
- Documentación nueva: docs/10-able-001-architecture.md y este registro.
- Reservas de carpetas: assets/blender/.gitkeep, scripts/blender/.gitkeep y public/models/.gitkeep.

## Decisiones pendientes

Snippet y capacidades oficiales del widget, política de sesiones de visitantes, entorno del
stand, modelado/rig/GLB definitivo y viabilidad de sincronización según señales reales de Able.
