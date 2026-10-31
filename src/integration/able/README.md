# Integración de chat Able

Actualización 2026-10-29: widget real cargado desde able-test mediante widgetConfig.ts,
widgetLoader.ts y useAbleWidget.ts. Configuración pública en .env.local, ejemplo en
.env.example. Guía recibida en docs/20-able-widget-official-guide.md y resultados
comprobados en docs/21-able-widget-test-integration.md. El resto de este documento
describe el estado previo; VisualStateSink sigue sin conexión a eventos de conversación.

`adapter.ts` define exclusivamente un destino interno de estados visuales. No describe métodos,
eventos ni capacidades del widget Able. El prototipo no instancia un conector ni hace solicitudes
a la plataforma. Los botones actúan directamente sobre el controlador visual.

Antes de integrar: incorporar el snippet oficial en `docs/07-able-widget-integration.md`, verificar
su ciclo de vida y mapear únicamente las señales documentadas. Si no ofrece eventos, mantener
idle o el control manual. Un reinicio visual no significa reiniciar una conversación de Able.

Actualización 2026-10-30 — modo kiosco: kioskContract.ts, kioskAdapter.ts, kioskSession.ts,
kioskLoader.ts y useKiosk.ts implementan el contrato v1 (docs/22). kioskSimulator.ts es solo
simulación. Estado y verificaciones: docs/23-kiosco-implementation.md.
