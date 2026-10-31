# Runtime del avatar — especificación inicial

## Misión
Mostrar el modelo 3D de Able en una experiencia para un stand, presentar el widget oficial de voz y coordinar reacciones visuales sin implementar el backend conversacional.

## Módulos lógicos (ABLE-001)
- **Scene/Renderer:** cámara, iluminación, materiales y render del personaje exportado desde Blender.
- **Animation Controller:** clips, mezclas, transiciones y expresiones.
- **Able Widget Adapter:** punto único de integración, basado en API real documentada.
- **Experience UI:** pantalla completa, mensajes de error y forma simple de iniciar/reiniciar experiencia.
- **Session Controller:** gestión local de ciclo de vida, sin almacenar conversaciones de visitantes por defecto.

## Decisiones pendientes
Se aprobó un prototipo web React/TypeScript/Vite con Three.js/React Three Fiber y futuro intercambio GLB desde Blender. Ver `10-able-001-architecture.md`. Siguen pendientes modo kiosco, pantalla/audio/micrófono del stand y política real de reinicio de conversaciones.

El laboratorio principal conserva geometría y poses procedurales. ABLE-003 agrega compare.html, que carga un GLB y reproduce dos clips Blender sin modificar esa implementación. El controlador se actualizará al incorporar esos assets. El error de la escena está aislado para conservar la UI y ofrecer reintento. Un navegador sin WebGL muestra una explicación.

## Criterios mínimos
Se reproduce idle sin widget; se puede alternar manualmente entre clips; en la integración real el widget conversa con Able sin backend IA local; una desconexión no bloquea la pantalla.

