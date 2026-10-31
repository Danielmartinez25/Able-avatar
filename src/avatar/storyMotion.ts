import type { ActionName } from '../experience/performance.ts';
import { getInteractionPose } from './interactionMotion.ts';

const ease = (a:number,b:number,t:number) => {
  const x=Math.max(0,Math.min(1,(t-a)/(b-a)));
  return Math.max(0,Math.min(1,x*x*x*(10+x*(-15+6*x))));
};
const pulse = (a:number,b:number,t:number) => t>a && t<b ? Math.sin(Math.PI*(t-a)/(b-a))**2 : 0;
export const isNap = (action: ActionName | null) => action==='nap' || action==='napCozy';
export const isFetch = (action: ActionName | null) => action==='fetchDocuments' || action==='fetchFolder';

/** Visible only after reaching the pickup point; disappears before returning to idle. */
export function documentReveal(time:number,reduced:boolean) {
  return reduced ? 1 : ease(3.35,3.8,time)*(1-ease(7.5,8.25,time));
}
export function storyExpression(action:ActionName | null,time:number): 'sleeping'|'happy'|'curious'|null {
  if(isNap(action)) return time>=1.65 && time<6.65 ? 'sleeping' : 'happy';
  if(isFetch(action)) return time<3.8 ? 'curious' : 'happy';
  return null;
}
export function getStoryPose(action:ActionName,time:number,reduced:boolean,life=time) {
  const p=getInteractionPose('idle',time,reduced,life);
  if(isNap(action)) {
    const cozy=action==='napCozy';
    const rest=reduced ? 1 : ease(.6,2,time)*(1-ease(6.65,8.4,time));
    const sleepyBreath=reduced ? 0 : Math.sin(time*1.6)*.012*rest;
    const nod=reduced ? 0 : pulse(.25,1.2,time)*.07+pulse(1.05,1.85,time)*.045;
    p.pitch=.14*rest+nod;
    p.tilt=(cozy ? -.18 : .065)*rest;
    p.height=-.17*rest+sleepyBreath;
    p.scaleY=1-.16*rest+sleepyBreath;
    p.scaleX=1+.06*rest;
    p.rightArm=(cozy ? -.02 : -.42)*rest-.28*(1-rest);
    p.leftArm=(cozy ? .03 : .40)*rest+.28*(1-rest);
    p.rightArmForward=-.2*rest;
    p.leftArmForward=(cozy ? -.45 : -.18)*rest;
    p.eyeHeight=1;
    if(reduced) {p.height=0;p.scaleY=1;p.scaleX=1;}
    if(!reduced) {
      const stretch=pulse(6.75,8.25,time);
      p.rightArm-=1.15*stretch;
      p.leftArm+=1.1*stretch;
      p.pitch-=.12*stretch;
      p.scaleY+=.045*stretch;
      // Restore exactly the live idle at the end, preserving its continuous phase.
      const end=ease(8.15,9,time),idle=getInteractionPose('idle',time,false,life);
      for(const key of Object.keys(p) as (keyof typeof p)[]) p[key]+=(idle[key]-p[key])*end;
    }
  }
  if(isFetch(action)) {
    const side=action==='fetchFolder' ? -1 : 1;
    if(reduced) { p.rightArmForward=-.75;p.leftArmForward=-.75;return p; }
    const depart=ease(.6,2.9,time),arrive=ease(4.1,6.8,time);
    const away=depart-arrive;
    const walking=(ease(.5,.9,time)*(1-ease(2.55,2.95,time)) + ease(4.05,4.4,time)*(1-ease(6.45,6.9,time)));
    const carry=documentReveal(time,false);
    p.x=side*.95*away;
    p.depth=-2.9*away;
    p.turn+=side*(2.65*ease(.2,1.1,time)-3.05*ease(3.25,4.5,time)+.4*ease(6.65,7.25,time));
    p.height+=.035*(1-Math.cos(time*11))*walking;
    p.tilt+=side*.035*Math.sin(time*11)*walking;
    p.rightFoot=.35*Math.sin(time*11)*walking;
    p.leftFoot=-p.rightFoot;
    p.rightArmForward+=-.7*carry+.22*Math.sin(time*11)*walking*(1-carry);
    p.leftArmForward+=-.7*carry-.22*Math.sin(time*11)*walking*(1-carry);
    p.rightArm+=.13*carry;
    p.leftArm-=.13*carry;
    p.pitch+=.065*pulse(3,4.05,time)-.025*pulse(6.8,7.65,time);
  }
  return p;
}
