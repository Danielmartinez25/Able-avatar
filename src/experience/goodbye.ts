/**
 * Spoken goodbye: when the visitor's whole turn is a farewell ("chau", "bueno gracias, nos vemos"),
 * the totem ends the session after Able answers, as if the staff pressed "Terminar". A goodbye
 * inside a request ("creame un agente que diga chau") never counts.
 */
const goodbyePhrases = [
  'me tengo que ir', 'hasta la proxima', 'hasta luego', 'hasta pronto', 'hasta manana', 'eso seria todo', 'eso es todo',
  'nos vemos', 'me voy', 'nada mas', 'terminamos', 'terminemos', 'terminar', 'cortamos', 'chaucito', 'chau', 'chao', 'adios',
  'bye', 'goodbye',
];
/** Words that may surround the goodbye without turning it into a request. */
const fillers = new Set([
  'gracias', 'muchas', 'mil', 'bueno', 'buenisimo', 'listo', 'ok', 'okay', 'dale', 'perfecto', 'genial', 'joya', 'barbaro',
  'able', 'che', 'y', 'por', 'hoy', 'todo', 'entonces', 'ya', 'bien', 'muy', 'un', 'beso', 'abrazo', 'quiero', 'podemos',
  'la', 'charla', 'eso', 'es', 'nada', 'mas', 'chicos', 'amigo', 'amiga', 'saludos', 'suerte',
]);

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function isGoodbye(text: string): boolean {
  let rest = ` ${normalize(text)} `;
  let found = false;
  for (const phrase of goodbyePhrases) {
    const spaced = ` ${phrase} `;
    while (rest.includes(spaced)) { rest = rest.replace(spaced, ' '); found = true; }
  }
  return found && rest.trim().split(' ').every(word => !word || fillers.has(word));
}

/** After Able's last words the totem waits this long before ending, so the farewell is not clipped. */
export const goodbyeEndMs = 1200;
