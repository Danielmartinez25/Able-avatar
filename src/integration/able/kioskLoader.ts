import type { KioskConfig } from './kioskSession.ts';
import type { KioskEvent, KioskWidget } from './kioskContract.ts';
import { parseKioskEvent } from './kioskContract.ts';

export interface KioskInitConfig {
  chatId: string;
  mode: 'kiosk';
  baseUrl: string;
  idleSeconds: number;
  pauseMs?: number;
  onEvent(event: unknown): void;
}

/** The init call, with `pauseMs` only when it was configured (the widget defaults to 2200). */
export function buildKioskInit(config: KioskConfig, onEvent: (event: unknown) => void): KioskInitConfig {
  const init: KioskInitConfig = { chatId: config.chatId, mode: 'kiosk', baseUrl: config.baseUrl, idleSeconds: config.idleSeconds, onEvent };
  if (config.pauseMs !== undefined) init.pauseMs = config.pauseMs;
  return init;
}

const listeners = new Set<(event: KioskEvent) => void>();
let pending: Promise<KioskWidget> | undefined;

/**
 * Loads the official script once per page in kiosk mode (invisible iframe). Events are
 * fanned out from init's onEvent; the script already validates their origin and source.
 */
export function ensureKioskWidget(config: KioskConfig): Promise<KioskWidget> {
  if (pending) return pending;
  pending = new Promise<KioskWidget>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'able-widget-script';
    script.src = config.baseUrl + '/able-widget.js';
    script.async = true;
    const fail = (error: Error) => {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      script.remove();
      pending = undefined;
      reject(error);
    };
    const timeout = setTimeout(() => fail(Error('Able no respondió al cargar el widget.')), 15000);
    script.onerror = () => fail(Error('No se pudo descargar el widget de Able. Revisá la conexión.'));
    script.onload = () => {
      clearTimeout(timeout);
      const able = window.AbleWidget;
      if (!able?.init || !able.startSession || !able.endSession)
        return fail(Error('El widget de Able de este entorno no tiene modo kiosco.'));
      try {
        able.init(buildKioskInit(config, raw => {
          const event = parseKioskEvent(raw);
          if (event) for (const listener of [...listeners]) listener(event);
        }));
      } catch {
        return fail(Error('No se pudo iniciar el widget de Able en modo kiosco.'));
      }
      resolve({
        startSession: token => able.startSession!(token),
        endSession: () => able.endSession!(),
        // Only exposed when this widget script has it (PRD 038).
        ...(typeof able.endTurn === 'function' ? { endTurn: () => able.endTurn!() } : {}),
        onEvent: listener => {
          listeners.add(listener);
          return () => { listeners.delete(listener); };
        },
      });
    };
    document.head.appendChild(script);
  });
  return pending;
}

/** Subscribe before loading so an early `ready` is never missed. */
export function onKioskEvent(listener: (event: KioskEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
