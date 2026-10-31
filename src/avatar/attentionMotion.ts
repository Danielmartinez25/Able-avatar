import { actionDetails, attentionActions } from '../experience/performance.ts';
import type { ActionName } from '../experience/performance.ts';
import { getInteractionPose } from './interactionMotion.ts';

export const isAttention = (action:ActionName|null) => attentionActions.some(name=>name===action);
const ease=(a:number,b:number,t:number)=>{
  const x=Math.max(0,Math.min(1,(t-a)/(b-a)));
  return Math.max(0,Math.min(1,x*x*x*(10+x*(-15+6*x))));
};
const beat=(a:number,b:number,t:number)=>t>a&&t<b ? Math.sin(Math.PI*(t-a)/(b-a))**2 : 0;
export function attentionEnvelope(action:ActionName,time:number,reduced:boolean) {
  if(!isAttention(action))return 0;
  return reduced ? 0 : ease(.3,.8,time)*(1-ease(actionDetails[action].duration/1000-.8,actionDetails[action].duration/1000,time));
}
export function attentionExpression(action:ActionName|null,time:number) {
  if(!isAttention(action))return null;
  if(action==='peek'&&time<1.6)return 'curious' as const;
  if(action==='dance'&&time>3.4&&time<4.15)return 'wink' as const;
  return 'excited' as const;
}
export function getAttentionPose(action:ActionName,t:number,reduced:boolean,life=t) {
  const p=getInteractionPose('idle',t,reduced,life);
  if(reduced){p.rightArm=-2;p.leftArm=1.8;return p;}
  const e=attentionEnvelope(action,t,false);
  if(action==='dance') {
    const rhythm=Math.sin((t-.8)*5.4);
    p.x+=.30*rhythm*e;
    p.tilt+=.16*rhythm*e;
    p.turn+=.28*Math.sin((t-.8)*2.7)*e;
    p.height+=.09*(1-Math.cos((t-.8)*10.8))*.5*e;
    p.scaleY-=.045*(1-Math.cos((t-.8)*10.8))*.5*e;
    p.scaleX+=.025*(1-Math.cos((t-.8)*10.8))*.5*e;
    p.rightArm-= (1.4+.55*Math.sin(t*5.4-.35))*e;
    p.leftArm+=(1.4+.55*Math.sin(t*5.4+1.6))*e;
    p.rightArmForward-=.28*Math.sin(t*5.4)*e;
    p.leftArmForward+=.28*Math.sin(t*5.4)*e;
    p.rightFoot=.25*rhythm*e;p.leftFoot=-p.rightFoot;
  }
  if(action==='peek') {
    const crouch=beat(.15,1.35,t);
    const pop=beat(1.2,2.35,t);
    const landing=beat(2.25,2.8,t);
    const hello=ease(1.5,1.95,t)*(1-ease(3.9,4.7,t));
    p.height+=-.15*crouch+.32*pop-.045*landing;
    p.scaleY+=-.12*crouch+.06*pop-.06*landing;
    p.scaleX+=.05*crouch-.025*pop+.025*landing;
    p.rightArm-=1.25*crouch+(2.1+.22*Math.sin(t*10))*hello;
    p.leftArm+=1.25*crouch+.8*hello;
    p.rightArmForward-=.8*crouch;p.leftArmForward-=.8*crouch;
    p.tilt+=.12*hello-.08*beat(3.8,4.95,t);
    p.eyeHeight*=1-.65*crouch;
  }
  if(action==='taDa') {
    const prep=beat(.1,.85,t),jump=beat(.7,1.8,t),land=beat(1.7,2.25,t);
    const show=ease(.65,1.35,t)*(1-ease(4.15,5.35,t));
    p.scaleY+=-.10*prep+.045*jump-.06*land;
    p.scaleX+=.05*prep-.02*jump+.03*land;
    p.height+=-.055*prep+.42*jump-.03*land;
    p.rightArm-=2.1*show;p.leftArm+=2.1*show;
    p.turn+=.3*Math.sin(t*3)*show;
    p.tilt+=.065*Math.sin(t*4)*show;
    p.pitch+=.08*beat(3.65,4.6,t);
  }
  return p;
}
