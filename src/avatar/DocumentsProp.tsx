import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ActionPlayback } from '../experience/performance';
import { documentReveal, isFetch } from './storyMotion';

export function DocumentsProp({action,reducedMotion}:{action:ActionPlayback;reducedMotion:boolean}) {
  const group=useRef<Group>(null);
  const timer=useRef({revision:-1,start:0});
  useFrame(({clock})=>{
    if(!group.current) return;
    if(timer.current.revision!==action.revision) timer.current={revision:action.revision,start:clock.elapsedTime};
    const time=clock.elapsedTime-timer.current.start;
    const reveal=documentReveal(time,reducedMotion);
    group.current.visible=reveal>.001;
    group.current.scale.setScalar(reveal);
    group.current.rotation.z=reducedMotion ? -.04 : -.04+.025*Math.sin(time*3)*reveal;
  });
  if(!isFetch(action.name)) return null;
  const folder=action.name==='fetchFolder';
  return <group ref={group} position={[0,-.58,1.02]} scale={reducedMotion ? 1 : 0}>
    {folder && <>
      <mesh position={[0,-.02,-.02]} castShadow><boxGeometry args={[1.03,.64,.045]}/><meshStandardMaterial color="#168bd3" roughness={.6}/></mesh>
      <mesh position={[-.31,.32,-.02]}><boxGeometry args={[.35,.14,.045]}/><meshStandardMaterial color="#168bd3"/></mesh>
    </>}
    {[0,1,2].map(i=><group key={i} position={[(i-1)*.065,i*.035,i*.022]} rotation={[0,0,(i-1)*.065]}>
      <mesh castShadow><boxGeometry args={[.8,.55,.015]}/><meshStandardMaterial color={i===2 ? '#ffffff' : '#d9eaf6'} roughness={.85}/></mesh>
      {[0,1,2].map(row=><mesh key={row} position={[-.035,.14-row*.105,.012]}><boxGeometry args={[row===0 ? .48 : .57,.019,.008]}/><meshBasicMaterial color={row===0 ? '#179de9' : '#9bb6c9'}/></mesh>)}
    </group>)}
    {folder && <mesh position={[0,-.13,.10]} castShadow><boxGeometry args={[1.03,.44,.025]}/><meshStandardMaterial color="#238fce" roughness={.65}/></mesh>}
  </group>;
}
