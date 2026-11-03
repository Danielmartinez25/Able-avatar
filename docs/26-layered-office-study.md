# Oficina por capas — maqueta de composición

Referencia: oficina vertical aportada por el responsable el 2026-11-03.

- Fondo limpio derivado con imagegen: public/backgrounds/office-clean-v1.png. Se retiraron personajes, documento y rombos móviles; se conserva el logo representado en la referencia. No es un logo vectorial oficial independiente.
- LayeredOffice separa el fondo, tres instancias estáticas del personaje aprobado y tres marcadores de traspaso. Las instancias reciben SpeechLevelContext null y props locales constantes: no reaccionan al widget.
- El personaje principal conserva AvatarScene y su contexto de voz. No se modifica integración, modelo ni controlador procedural.
- Presentación vertical contenida en pantallas horizontales para no cortar puestos.
- Es una maqueta estática, NO la implementación final de personajes sentados ni de animaciones. Las poses actuales son provisionales; las sillas y escritorios siguen integrados en el fondo y todavía no tienen máscaras de oclusión.

## Próxima etapa
Validar posiciones y escala en pantalla vertical; preparar máscaras frontales de muebles, poses sentadas específicas y un renderer compartido con menos detalle para los secundarios. Después crear bucles locales desfasados y recorrido del rombo, respetando movimiento reducido. No acoplarlos a eventos del agente.

## Verificación
npm run build aprobado (TypeScript y Vite). Persiste aviso de tamaño del bundle 3D. Inspección del fondo generado realizada. No se logró inspeccionar la composición en el navegador integrado porque el control del navegador devolvió `browser.user is unavailable`; revisión visual de la maqueta pendiente.

## Primer secundario — puesto izquierdo
SeatedOfficeWorker es una copia visual aislada del personaje aprobado: postura sentada, giro hacia el monitor, pies adelantados y manos en ciclo de escritura. Mantiene las geometrías y rostro existentes. SeatedWorkerScene usa cámara ortográfica adaptada a la altura de su capa. El escritorio se recompone delante mediante una máscara CSS del fondo. Ciclo local de 14 s; parpadeo y mirada; respeta prefers-reduced-motion. No recibe voz ni eventos del widget. Los otros dos puestos permanecen en maqueta. Pendiente inspección visual del encaje exacto del asiento y máscara; no se afirma una revisión visual completada.

## Puesto izquierdo 3D integrado
Se reemplaza la máscara CSS por escritorio, monitor, cajonera, teclado y silla 3D en el mismo Canvas del secundario, con sombras y oclusión geométrica. Fondo v2 sin el antiguo puesto izquierdo; v1 conservado. Compilación aprobada. Pendiente revisión visual del conjunto en el tótem; no se modifica el widget ni los otros dos puestos.

## Rostros ilustrativos sobre fondo aprobado — versión vigente
Se incorpora office-faces-ready-v3.png aportado por el responsable, con los tres rostros limpios. LayeredOffice ahora usa una sola composición SVG: imagen y rostros comparten coordenadas 941 x 1672, clips locales de pantalla y ajuste contain. Se retiran de la pantalla los tres secundarios 3D y sus rombos duplicados; los módulos anteriores quedan archivados sin uso. Parpadeos, cambios de mirada y sonrisa por CSS con duraciones y desfases distintos. Movimiento reducido desactiva animaciones. Sin acceso a eventos, audio ni estado del widget. El avatar principal sigue en AvatarScene con su contexto existente.
Verificación: npm run build aprobado; dos capturas del navegador comprueban alineación y cambio de pose facial. Persiste el aviso de tamaño del bundle 3D y el aviso de kiosco no disponible del entorno, ajeno a esta animación. Pendiente evaluación estética del responsable en pantalla vertical.
