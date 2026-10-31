# Integración del widget de voz de Able

## Actualización 2026-10-29

Ya se recibió la guía y el ChatId de pruebas. El widget real está cargado en las dos
páginas, sin sincronización con el avatar. Configuración, capacidades comprobadas y
limitaciones actuales en **21-able-widget-test-integration.md**. Guía aportada sin
edición en **20-able-widget-official-guide.md**. Las listas siguientes se conservan
como antecedentes y pendientes del contrato de voz; ya no falta el snippet básico.

## Confirmado
- La tecnología conversacional y de voz pertenece a la plataforma Able.
- La integración con el avatar se realizará mediante **un widget**.

## Pendiente de verificar con documentación oficial
- Snippet de inserción, SDK o paquete y versiones soportadas.
- Requisitos de autenticación, origen permitido, CORS/CSP y despliegue.
- Permisos de micrófono y reproducción de audio.
- Opciones para iniciar, detener y reiniciar conversaciones.
- Eventos/callbacks disponibles (si existen).
- Acceso a audio, transcripciones, estados o marcas temporales (si existe).
- Manejo de errores, desconexión y privacidad de sesiones.

## Restricciones
No crear API, eventos, tokens, endpoints o callbacks ficticios. No inspeccionar ni capturar audio del widget mediante mecanismos invasivos. La integración visual debe funcionar con degradación progresiva cuando no haya metadatos disponibles.

## Material por incorporar
Pegá aquí la documentación o el código real del widget cuando esté disponible. No incluyas secretos.
