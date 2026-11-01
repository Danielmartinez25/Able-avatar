import { useCallback, useEffect, useRef, useState } from 'react';
import { AvatarScene } from '../avatar/AvatarScene';
import { SpeechLevelContext } from '../avatar/speechContext';
import { actionDetails, attentionActions } from '../experience/performance';
import type { ActionName, ActionPlayback } from '../experience/performance';
import { useKiosk } from '../integration/able/useKiosk';
import type { Conversation } from '../integration/able/kioskAdapter';

// Development-only fake widget and session API: /totem.html?simulate
const simulate = import.meta.env.DEV && new URLSearchParams(window.location.search).has('simulate');
const talkStatus: Record<Conversation, { icon: string; text: string }> = {
  preparing: { icon: '◌', text: 'Preparando el micrófono…' },
  listening: { icon: '◉', text: 'Te estoy escuchando' },
  thinking: { icon: '⋯', text: 'Pensando…' },
  speaking: { icon: '♪', text: 'Able está hablando' },
};
const idlePhases = ['loading', 'unavailable', 'operator'];
const workingStatus = { icon: '⚙', text: 'Armando tu agente…' };
const aiNote = 'La charla se procesa con IA y no se guarda en el tótem.';
const beforeStartNote = 'La charla se procesa con IA. Al terminar te llegan tus agentes y el acceso a tu cuenta por mail.';
const startHint = 'Contale al avatar qué agente te gustaría tener, por ejemplo uno que te dé recetas o uno que responda a tus clientes.';
const isStaffShortcut = (event: KeyboardEvent) => event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'm';

/** Able alone on screen. The staff panel is hidden behind a corner button or Ctrl+M. */
export function TotemApp(){
  const kiosk=useKiosk({simulate});
  const {snapshot}=kiosk;
  const [email,setEmail]=useState('');
  const [panelOpen,setPanelOpen]=useState(false);
  const [action,setAction]=useState<ActionPlayback>({name:'appear',revision:0});
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [fullscreen,setFullscreen]=useState(false);
  const [fullscreenNotice,setFullscreenNotice]=useState('');
  const nextScene=useRef(0);
  const emailInput=useRef<HTMLInputElement>(null),endButton=useRef<HTMLButtonElement>(null),corner=useRef<HTMLButtonElement>(null);
  const attracting=idlePhases.includes(snapshot.phase);
  const inSession=snapshot.phase==='conversation' || snapshot.phase==='error';
  const play=useCallback((name:ActionName)=>setAction(current=>({name,revision:current.revision+1})),[]);
  const greet=useCallback(()=>{if(attracting)play('wave');},[attracting,play]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReducedMotion(media.matches);
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    if(!action.name)return;
    const revision=action.revision;
    const timer=setTimeout(()=>setAction(current=>current.revision===revision ? {name:null,revision:current.revision+1} : current),actionDetails[action.name].duration);
    return ()=>clearTimeout(timer);
  },[action]);
  // Fair mode only while nobody is talking; it never starts a session by itself.
  useEffect(()=>{
    if(attracting)return;
    setAction(current=>current.name ? {name:null,revision:current.revision+1} : current);
  },[attracting]);
  useEffect(()=>{
    if(action.name || reducedMotion || !attracting)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const schedule=()=>{
      clearTimeout(timer);
      if(document.hidden)return;
      timer=setTimeout(()=>{
        play(attentionActions[nextScene.current++%attentionActions.length]);
      },16000);
    };
    schedule();document.addEventListener('visibilitychange',schedule);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
  },[action.name,reducedMotion,play,attracting]);
  // The visitor's mail lives only in this input while the staff types it.
  useEffect(()=>{
    if(snapshot.phase==='conversation' || snapshot.phase==='farewell')setEmail('');
    if(snapshot.phase==='conversation')setPanelOpen(false);
  },[snapshot.phase]);
  useEffect(()=>{
    if(panelOpen)emailInput.current?.focus({preventScroll:true});
    else if(inSession)endButton.current?.focus({preventScroll:true});
  },[panelOpen,inSession]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(isStaffShortcut(event)){event.preventDefault();setPanelOpen(open=>!open);}
      else if(event.key==='Escape')setPanelOpen(false);
    };
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[]);
  useEffect(()=>{
    const change=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange',change);
    return ()=>document.removeEventListener('fullscreenchange',change);
  },[]);
  const toggleFullscreen=async()=>{
    try {
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenNotice('');
    }catch {setFullscreenNotice('La pantalla completa no está disponible en este navegador.');}
  };
  const closePanel=()=>{setPanelOpen(false);corner.current?.focus({preventScroll:true});};
  const polite=snapshot.notice && snapshot.notice.tone!=='alert' ? snapshot.notice.text : '';
  const assertive=snapshot.notice?.tone==='alert' ? snapshot.notice.text : '';
  // Working mode rotates its own animations; negative revisions never clash with `action`'s.
  const beat=kiosk.workingBeat;
  const sceneAction:ActionPlayback=beat ? {name:beat.action,revision:-2-beat.index} : action;
  const status=snapshot.working ? workingStatus : snapshot.conversation ? talkStatus[snapshot.conversation] : null;
  return <main className="totem" data-phase={snapshot.phase}>
    <div className="avatar-view">
      <SpeechLevelContext value={kiosk.speech}>
        <AvatarScene state={snapshot.visual} revision={snapshot.visualRevision} expression={snapshot.expression} action={sceneAction} reducedMotion={reducedMotion} onReact={greet}/>
      </SpeechLevelContext>
    </div>
    {kiosk.mode==='simulated' && <span className="sim-badge">SIMULACIÓN</span>}
    {kiosk.mode==='simulated' && snapshot.phase==='conversation' && <div className="sim-tools" role="group" aria-label="Escenarios simulados">
      <button type="button" onClick={()=>kiosk.simulator?.think(90000,'reply')}>Thinking largo · 90 s</button>
      <button type="button" onClick={()=>kiosk.simulator?.think(240000,'timeout')}>Timeout · 240 s</button>
      <button type="button" onClick={()=>kiosk.simulator?.think(1500,'noise')}>Ruido descartado</button>
    </div>}
    <button ref={corner} className="staff-corner" aria-label="Abrir panel del staff (Ctrl+M)" aria-expanded={panelOpen} aria-controls="staff-panel" onClick={()=>setPanelOpen(open=>!open)}/>

    {inSession && <section className="talk" aria-label="Charla con Able">
      <div className="working-region" aria-live="polite">
        {kiosk.workingPhrase && <p key={kiosk.workingPhrase} className="working-bubble">{kiosk.workingPhrase}</p>}
      </div>
      <p className="talk-status" data-state={snapshot.phase==='error' ? 'error' : snapshot.working ? 'working' : snapshot.conversation ?? ''}>
        <span className="talk-icon" aria-hidden="true">{snapshot.phase==='error' ? '!' : status?.icon}</span>
        {snapshot.phase==='error' ? 'Able necesita ayuda del staff' : status?.text}
      </p>
      <div className="subtitles" aria-live="polite">
        {snapshot.transcript.user && <p className="line user"><span>Vos</span>{snapshot.transcript.user}</p>}
        {snapshot.transcript.bot && <p className="line bot"><span>Able</span>{snapshot.transcript.bot}</p>}
        {!snapshot.transcript.user && !snapshot.transcript.bot && <p className="line hint">{startHint}</p>}
      </div>
      <div className="talk-footer">
        <p className="ai-note">{aiNote}</p>
        <button ref={endButton} type="button" className="end-button" aria-label="Terminar la charla con Able" onClick={kiosk.end}>Terminar</button>
      </div>
    </section>}

    {snapshot.phase==='farewell' && <section className="farewell" role="status">
      <strong>¡Listo!</strong>
      <span>{snapshot.endReason==='idle' ? 'Me quedé esperando, así que cerramos la charla. ' : ''}Revisá tu mail: te mandamos tus agentes y un link para entrar a tu cuenta.</span>
    </section>}

    <div className="notices">
      <p id="kiosk-polite" className="kiosk-notice" role="status">{polite}</p>
      <p className="kiosk-notice alert" role="alert">{assertive}</p>
    </div>

    {panelOpen && <aside id="staff-panel" className="staff-panel" role="dialog" aria-labelledby="staff-title">
      <div className="staff-head">
        <h2 id="staff-title">Panel del staff</h2>
        <button type="button" className="staff-close" aria-label="Cerrar panel del staff" onClick={closePanel}>×</button>
      </div>
      <form autoComplete="off" onSubmit={event=>{event.preventDefault();void kiosk.start(email);}}>
        <label className="field-label" htmlFor="visitor-email">Mail del visitante</label>
        <input ref={emailInput} id="visitor-email" name="visitor-email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={email} onChange={event=>setEmail(event.target.value)} disabled={snapshot.phase!=='operator'} aria-describedby="kiosk-polite staff-note"/>
        <button type="submit" className="start-button" disabled={snapshot.phase!=='operator' || !email.trim()}>
          {snapshot.phase==='creating' ? 'Creando…' : snapshot.phase==='operator' ? 'Empezar' : snapshot.phase==='unavailable' ? 'No disponible' : inSession ? 'Charla en curso' : 'Preparando…'}
        </button>
      </form>
      <p id="staff-note" className="ai-note">{beforeStartNote}</p>
      <div className="staff-tools">
        {snapshot.phase==='unavailable' && <button type="button" onClick={kiosk.retry}>Reintentar</button>}
        <button type="button" onClick={toggleFullscreen}>{fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}</button>
      </div>
      <p className="staff-hint">Ctrl+M abre y cierra este panel. Esc lo cierra.</p>
      {fullscreenNotice && <p className="kiosk-notice" role="status">{fullscreenNotice}</p>}
    </aside>}
  </main>;
}
