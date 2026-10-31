# Widget Able de pruebas — integración real

2026-10-29. Guía aportada conservada en 20-able-widget-official-guide.md.
Se usa el ChatId completo de la URL Chat Live proporcionada por el responsable,
con prefijo de bot b7525e08-4399-4df4-aabe-82924f7c3a76, bajo able-test.ithreexglobal.com.

## Configuración

`.env.local` (ignorado por control de versiones):

```text
VITE_ABLE_BASE_URL=https://able-test.ithreexglobal.com
VITE_ABLE_CHAT_ID=<ChatId completo posterior a /chat/>
```

Ejemplo sin datos reales en .env.example. Reiniciar Vite y recargar páginas tras cambios.
Los valores VITE se incorporan al navegador: no colocar claves privadas allí.
El ChatId identifica la integración pública; no se añade una API key.

Dato crucial del script servido por el proveedor: aunque se descarga desde able-test,
el baseUrl predeterminado es producción. El loader sobrescribe explícitamente baseUrl
con el origen de pruebas, evitando mezclar entornos.

Se verificó el script HTTPS /able-widget.js del mismo dominio. SHA-256 observado:
E0159953ECAE45E3D287296A18E411599E84790D6914DFEC193505735B288839.
No se incluye ni modifica el script remoto en el repositorio.

## Contrato observado

- AbleWidget.init({chatId,baseUrl,theme,position,size}).
- Configuración usada: theme blue, position bottom-right, size medium.
- El script convierte blue en theme=dark para el iframe /widget/{chatId}.
- Existe AbleWidget.close(); no se encontró open/destroy público ni suscripciones de conversación.
- WIDGET_RESIZE y CLOSE_WIDGET son mensajes de UI; no son eventos de voz ni de estado del agente.
- La guía documenta init, tema, tamaño y posición. baseUrl y close se comprobaron en el código
  servido; revisarlos si el proveedor actualiza su script.

## Archivos

src/integration/able/widgetConfig.ts valida configuración/origen; widgetLoader.ts carga
una vez e inicializa bajo StrictMode; useAbleWidget.ts comunica loading/ready/error.
IntegrationStatus lo monta en el laboratorio; TotemApp lo monta en el tótem.
Se conservan todos los controles y animaciones del laboratorio. /compare.html no carga widget.
Saludá a Able y Sorprendeme siguen siendo botones de animación local, sin envío de mensajes.

ready significa script y contenedor/iframe creados con origen y agente correctos.
No significa que se haya probado una respuesta o iniciado una conversación.
Hay errores de configuración, descarga y timeout visibles; ante fallo se debe recargar.
No se inventa un destroy ni se eliminan listeners privados del widget en desmontajes de React.

## Resultados reales

- http://127.0.0.1:5174/ y /totem.html cargan y abren el iframe de pruebas con el ChatId correcto.
- Se ven Asistente Able, la entrada de texto, Dictar mensaje y Conversar por voz.
- No se enviaron mensajes, subieron archivos ni activaron micrófono/cámara. Audio, respuestas
  y permisos requieren prueba del responsable. Las pruebas de carga no certifican esos tramos.
- Se verificó cierre. Tras cerrar con la X, la primera pulsación del lanzador no abre y la segunda sí.
  El código remoto lo explica: close global oculta el iframe sin restablecer isOpen de la instancia.
  Limitación del proveedor documentada; no se parchea su API ni se simula reapertura.
- 31 pruebas npm aprobadas y build TypeScript/Vite correcto. Tests nuevos cubren origen,
  configuración, carga única en doble montaje y error de script con DOM simulado. La comprobación
  real del iframe en navegador es independiente de esos tests. Sigue el aviso de bundle 3D grande.
- La recarga en caliente de desarrollo tras cambiar la estructura de hooks requirió recarga completa;
  se comprobó después el arranque limpio. No reutilizar estado de un loader fallido tras editarlo.

La guía recomienda HTTPS. Se observó carga de chat en localhost HTTP; eso no verifica voz
en el dispositivo final. Probar HTTPS, navegador y hardware definitivos antes del evento.

## Pendientes

No hay contrato de listening/thinking/speaking, fin de turno, visemas o timestamps.
El avatar continúa con animaciones locales. Los botones de voz visibles no prueban acceso
a eventos desde la página contenedora. Se requiere documentación adicional para sincronizar.
No se implementa STT/TTS, ni captura de audio o transcript del iframe.
El listener del script observado no valida el origen de mensajes; nuestro adaptador no añade
postMessage ni interpreta mensajes de iframe como instrucciones para el avatar.
