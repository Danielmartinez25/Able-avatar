import type { AbleWidgetConfig } from './widgetConfig';
import type { KioskInitConfig } from './kioskLoader';

declare global {
  interface Window {
    AbleWidget?: {
      init(config:AbleWidgetConfig|KioskInitConfig):void;
      close?():void;
      // Kiosk mode (WIDGET_KIOSK_CONTRACT v1); absent from scripts older than agenthreex !622.
      startSession?(token:string):boolean;
      endSession?():void;
      // Manual end of the visitor turn (PRD 038); absent from older kiosk scripts.
      endTurn?():void;
    };
  }
}
let pending:Promise<void>|undefined;
let activeKey:string|undefined;

/** One initialization per page, including React StrictMode. No undocumented teardown. */
export function ensureAbleWidget(config:AbleWidgetConfig):Promise<void> {
  const key=config.baseUrl+'/widget/'+config.chatId;
  if(pending) return activeKey===key ? pending : Promise.reject(Error('Ya existe otro agente inicializado en esta página.'));
  activeKey=key;
  pending=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');
    script.id='able-widget-script';
    script.src=config.baseUrl+'/able-widget.js';
    script.async=true;
    const fail=(error:Error)=>{clearTimeout(timeout);script.onload=null;script.onerror=null;script.remove();reject(error);};
    const timeout=setTimeout(()=>fail(Error('Able no respondió al cargar el widget. Revisá la conexión y recargá la página.')),15000);
    script.onerror=()=>fail(Error('No se pudo descargar el widget de Able. Revisá la conexión o los bloqueadores.'));
    script.onload=()=>{
      clearTimeout(timeout);
      try {
        if(!window.AbleWidget?.init)throw Error('El script cargó sin la API AbleWidget.init.');
        window.AbleWidget.init(config);
        const frame=document.getElementById('able-widget-iframe');
        if(!document.getElementById('able-widget-container') || !frame || frame.getAttribute('src')!==key+'?theme=dark')
          throw Error('El widget no creó el chat con el agente y entorno esperados.');
        // Accessibility metadata only; lifecycle and chat UI remain owned by Able.
        frame.setAttribute('title','Chat con el agente Able');
        document.getElementById('able-widget-button')?.setAttribute('aria-label','Abrir chat de Able');
        resolve();
      }catch(error){fail(error instanceof Error ? error : Error('No se pudo iniciar Able.'));}
    };
    document.head.appendChild(script);
  });
  return pending;
}
