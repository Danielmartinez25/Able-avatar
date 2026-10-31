# Contrato de integración — condicionado al widget real

## Arquitectura
El visitante habla con el **widget de voz de Able**, que se comunica con la plataforma Able. El runtime local **muestra el personaje y reproduce sus animaciones**.

## Regla de implementación
**No asumir** que el widget expone audio crudo, eventos `listening/thinking/speaking`, transcript, timestamps, visemas, SDK o callbacks. Estos son posibles requisitos, no APIs confirmadas.

## Contrato interno propuesto (solo visual/mock)
Los estados internos del runtime son `idle`, `greeting`, `listening`, `thinking`, `speaking` y `farewell`. Son etiquetas de la aplicación visual, **no eventos oficiales de Able**. Los errores se presentan como condiciones del runtime; reiniciar visual lleva a idle sin afirmar un reinicio de la sesión Able.

## Adaptador
Definir un adaptador aislado del motor 3D. Al recibir documentación oficial, mapear las señales reales del widget hacia estados internos y dejar asentadas las limitaciones. Si solo se puede incrustar un iframe sin eventos, no prometer lipsync ni detección precisa del habla.

## No se requiere
Crear un sistema propio de voz ni alterar el prompt XML para emitir comandos de animación.
