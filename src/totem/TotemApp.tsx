import { useCallback, useEffect, useRef, useState } from 'react';
import { AvatarScene } from '../avatar/AvatarScene';
import { LayeredOffice } from './LayeredOffice';
import { TeamOffice } from './TeamOffice';
import { SpeechLevelContext } from '../avatar/speechContext';
import { actionDetails, attentionActions } from '../experience/performance';
import type { ActionName, ActionPlayback } from '../experience/performance';
import { activityMotion } from '../experience/activityMotion';
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
const workingStatus = { icon: '⚙', text: 'Creando tu agente…' };
const aiNote = 'La charla se procesa con IA y no se guarda en el tótem. Para terminar, decí "chau".';
const beforeStartNote = 'La charla se procesa con IA. Al terminar te llega un mail con tus agentes y el acceso a tu cuenta.';
/** One mail since 2026-11-03: the agents (if any) plus "Elegí tu contraseña". `madeAgent` comes from `worked` (PRD 037). */
const farewellMail = (madeAgent: boolean) => madeAgent
  ? 'Te mandamos un mail con tus agentes y el acceso a tu cuenta.'
  : 'Te mandamos un mail con el acceso a tu cuenta de Able.';
const longTurnStatus = { icon: '◉', text: 'Si ya terminaste, tocá «Ya terminé de hablar»' };
const startHint = '¡Hola! Contame qué agente te gustaría tener: por ejemplo, uno que te dé recetas o uno que responda a tus clientes.';
const isStaffShortcut = (event: KeyboardEvent) => event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'm';

/** Able alone on screen. The staff panel is hidden behind a corner button or Ctrl+M. */
export function TotemApp({office='original'}:{office?:'original'|'team'}){
  const kiosk=useKiosk({simulate});
  const {snapshot}=kiosk;
  const [email,setEmail]=useState('');
  const [panelOpen,setPanelOpen]=useState(false);
  const [action,setAction]=useState<ActionPlayback>({name:'appear',revision:0});
  const [reducedMotion,setReducedMotion]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [fullscreen,setFullscreen]=useState(false);
  const [fullscreenNotice,setFullscreenNotice]=useState('');
  const nextScene=useRef(0);
  const scene=useRef({key:'',revision:-1});
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
  // The agent created or edited something in this turn: ¡Tarán! as it starts talking.
  useEffect(()=>{
    if(snapshot.visual==='speaking' && snapshot.worked)play('taDa');
  },[snapshot.visual,snapshot.visualRevision,snapshot.worked,play]);
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
  // Able's activity drives the animation; without it, working mode rotates its own.
  const {activity,workingBeat:beat}=kiosk;
  const activityName=activity && activity!=='working' ? activityMotion[activity].action : null;
  const sceneName:ActionName|null=activity ? activityName : beat ? beat.action : action.name;
  const sceneKey=activity ? 'activity:'+activity : beat ? 'beat:'+beat.index : 'action:'+action.revision;
  // Negative revisions never clash with `action`'s own.
  if(sceneKey!==scene.current.key)scene.current={key:sceneKey,revision:scene.current.revision-1};
  const sceneAction:ActionPlayback=activity || beat ? {name:sceneName,revision:scene.current.revision} : action;
  const sceneState=activity==='working' ? 'working' : snapshot.visual;
  const ableLine=kiosk.workingPhrase ?? (snapshot.transcript.bot || (snapshot.transcript.user ? '' : startHint));
  const listeningNow=snapshot.phase==='conversation' && snapshot.conversation==='listening';
  const status=activity ? {icon:'⚙',text:activityMotion[activity].text} : snapshot.working ? workingStatus : listeningNow && snapshot.longTurn ? longTurnStatus : snapshot.conversation ? talkStatus[snapshot.conversation] : null;
  return <main className="totem" data-phase={snapshot.phase} data-office={office}>
    {office==='team' ? <TeamOffice/> : <LayeredOffice/>}
    <div className="avatar-view">
      <SpeechLevelContext value={kiosk.speech}>
        <AvatarScene state={sceneState} revision={snapshot.visualRevision} expression={snapshot.expression} action={sceneAction} reducedMotion={reducedMotion} onReact={greet}/>
      </SpeechLevelContext>
    </div>
    {kiosk.mode==='simulated' && <span className="sim-badge">SIMULACIÓN</span>}
    {kiosk.mode==='simulated' && snapshot.phase==='conversation' && <div className="sim-tools" role="group" aria-label="Escenarios simulados">
      <button type="button" onClick={()=>kiosk.simulator?.think(90000,'reply')}>Thinking largo · 90 s</button>
      <button type="button" onClick={()=>kiosk.simulator?.think(120000,'timeout')}>Timeout · 120 s</button>
      <button type="button" onClick={()=>kiosk.simulator?.think(1500,'noise')}>Ruido descartado</button>
      <button type="button" onClick={()=>kiosk.simulator?.setState('error','connection_lost')}>Conexión perdida</button>
      <button type="button" onClick={()=>kiosk.simulator?.setState('error','credits_exhausted')}>Sin créditos</button>
      <button type="button" onClick={()=>kiosk.simulator?.setState('listening','long_turn')}>Turno largo · 20 s</button>
      <button type="button" onClick={()=>kiosk.simulator?.say('Bueno, gracias, chau','¡Chau! Fue un gusto, que lo disfrutes.')}>Decir chau</button>
    </div>}
    <button ref={corner} className="staff-corner" aria-label="Abrir panel del staff (Ctrl+M)" aria-expanded={panelOpen} aria-controls="staff-panel" onClick={()=>setPanelOpen(open=>!open)}/>

    {inSession && <section className="talk" aria-label="Charla con Able">
      {/* Comic-style bubbles: Able's above its head (its reply, or the working phrase), the visitor's below. */}
      <div className="bubble-row able-row" aria-live="polite">
        {ableLine && <p key={ableLine} className="bubble able-bubble" data-kind={kiosk.workingPhrase ? 'working' : snapshot.transcript.bot ? 'reply' : 'hint'}>
          <span className="bubble-who">Able</span><span className="bubble-text">{ableLine}</span>
        </p>}
      </div>
      <div className="talk-bottom">
      <div className="bubble-row visitor-row" aria-live="polite">
        {snapshot.transcript.user && <p className="bubble visitor-bubble"><span className="bubble-who">Vos</span><span className="bubble-text">{snapshot.transcript.user}</span></p>}
      </div>
      <div className="talk-bar">
        <p className="talk-status" data-state={snapshot.phase==='error' ? 'error' : snapshot.working ? 'working' : snapshot.conversation ?? ''}>
          <span className="talk-icon" aria-hidden="true">{snapshot.phase==='error' ? '!' : status?.icon}</span>
          {snapshot.phase==='error' ? 'Able necesita ayuda del staff' : status?.text}
        </p>
        <div className="talk-actions">
          {kiosk.canEndTurn && listeningNow && <button type="button" className="done-button" data-urgent={snapshot.longTurn} onClick={kiosk.endTurn}>Ya terminé de hablar</button>}
          <button ref={endButton} type="button" className="end-button" aria-label="Terminar la charla con Able" onClick={kiosk.end}>Terminar</button>
        </div>
        <p className="ai-note">{aiNote}</p>
      </div>
      </div>
    </section>}

    {snapshot.phase==='farewell' && <section className="farewell" role="status">
      <strong>{snapshot.endReason==='idle' ? '¡Listo!' : '¡Gracias por pasar!'}</strong>
      <span>{snapshot.endReason==='idle' ? 'Me quedé esperando, así que cerramos la charla. ' : ''}{farewellMail(snapshot.madeAgent)}</span>
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
