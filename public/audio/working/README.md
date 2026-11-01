# Clips del modo trabajando (opcional)

Audios pregrabados para las frases que Able dice mientras arma un agente (`src/experience/workingMode.ts`).
Hoy no hay ninguno: el modo trabajando funciona solo con texto y animación.

## Reglas

- Un clip por frase, generado **una vez a mano**, si se puede con la misma voz de ElevenLabs que usa Able.
- Nunca sintetizar en el momento ni usar `speechSynthesis`.
- Clips cortos (la frase y nada más), en `.mp3`.

## Cómo agregar uno

1. Guardar el archivo acá, por ejemplo `public/audio/working/dale.mp3`.
2. Registrarlo en `workingClips` (`src/experience/workingMode.ts`), con la frase exacta como clave:

   ```ts
   export const workingClips: Partial<Record<string, string>> = {
     '¡Dale! Lo estoy armando…': '/audio/working/dale.mp3',
   };
   ```

Las frases que no tengan clip se muestran igual, sin audio. Un clip solo suena mientras el widget
sigue en `thinking`: cualquier otro evento lo corta al instante, y nunca suena en `listening` ni en
`speaking`.
