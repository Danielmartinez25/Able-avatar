export interface AbleWidgetConfig {
  chatId: string;
  baseUrl: string;
  theme: 'blue';
  position: 'bottom-right';
  size: 'medium';
}

/** Public browser settings, never a private API key. */
export function readWidgetConfig(env: Record<string,string|undefined>): AbleWidgetConfig | null {
  const chatId=env.VITE_ABLE_CHAT_ID?.trim();
  if(!chatId)return null;
  if(!/^[a-zA-Z0-9-]+_[a-zA-Z0-9-]+$/.test(chatId))throw Error('El ChatId de Able no tiene el formato esperado.');
  const origin=new URL(env.VITE_ABLE_BASE_URL || 'https://able-test.ithreexglobal.com');
  if(!['https://able-test.ithreexglobal.com','https://able.ithreexglobal.com'].includes(origin.origin) || origin.pathname!=='/' || origin.search || origin.hash || origin.username || origin.password)
    throw Error('El origen de Able debe ser el dominio oficial de pruebas o producción, sin rutas ni credenciales.');
  return {chatId,baseUrl:origin.origin,theme:'blue',position:'bottom-right',size:'medium'};
}
