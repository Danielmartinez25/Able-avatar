import { readWidgetConfig } from './widgetConfig.ts';
import type { Notice } from './kioskAdapter.ts';

export interface KioskConfig {
  baseUrl: string;
  chatId: string;
  /** Extractable from the bundle by design (accepted risk, see docs/23-kiosco-implementation.md). */
  kioskKey: string;
  idleSeconds: number;
}

/** Returns null when the kiosk is not configured; throws on malformed values. */
export function readKioskConfig(env: Record<string, string | undefined>): KioskConfig | null {
  const widget = readWidgetConfig(env);
  const kioskKey = env.VITE_KIOSK_KEY?.trim();
  if (!widget || !kioskKey) return null;
  const rawIdle = Number(env.VITE_KIOSK_IDLE_SECONDS?.trim() || 60);
  const idleSeconds = Number.isFinite(rawIdle) ? Math.round(Math.min(3600, Math.max(15, rawIdle))) : 60;
  return { baseUrl: widget.baseUrl, chatId: widget.chatId, kioskKey, idleSeconds };
}

export function isPlausibleEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type SessionResult = { ok: true; token: string } | { ok: false; notice: Notice };

export const sessionNotices = {
  invalid: { tone: 'warning', text: 'Revisá el mail.' },
  exists: { tone: 'warning', text: 'Ya tenés cuenta en Able, probá con otro mail.' },
  unavailable: { tone: 'alert', text: 'Kiosco no disponible. Avisá al equipo técnico (configuración de Able).' },
  failed: { tone: 'warning', text: 'No pudimos crear la cuenta, probá de nuevo.' },
} as const;

function rateLimited(retryAfter: string | null): Notice {
  const seconds = Number(retryAfter);
  return {
    tone: 'warning',
    text: Number.isFinite(seconds) && seconds > 0
      ? `Esperá ${Math.ceil(seconds)} segundos y probá de nuevo.`
      : 'Esperá un momento y probá de nuevo.',
  };
}

/**
 * POST /api/kiosk/session. The email, token and key never reach logs, storage or the URL;
 * the token is returned to the caller only to be passed straight to startSession.
 */
export async function createKioskSession(
  email: string,
  config: Pick<KioskConfig, 'baseUrl' | 'kioskKey'>,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionResult> {
  if (!isPlausibleEmail(email)) return { ok: false, notice: sessionNotices.invalid };
  let response: Response;
  try {
    response = await fetchImpl(config.baseUrl + '/api/kiosk/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-kiosk-key': config.kioskKey },
      body: JSON.stringify({ email }),
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, notice: { tone: 'warning', text: 'No hay conexión con Able. Revisá la red y probá de nuevo.' } };
  }
  const body = await response.json().catch(() => null) as { token?: unknown; error?: unknown } | null;
  if (response.ok && typeof body?.token === 'string' && body.token) return { ok: true, token: body.token };
  if (response.status === 400) return { ok: false, notice: sessionNotices.invalid };
  if (response.status === 409) return { ok: false, notice: sessionNotices.exists };
  if (response.status === 429) return { ok: false, notice: rateLimited(response.headers.get('retry-after')) };
  if ([401, 403, 503].includes(response.status)) return { ok: false, notice: sessionNotices.unavailable };
  return { ok: false, notice: sessionNotices.failed };
}
