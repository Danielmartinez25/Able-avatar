import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActionPlayback } from '../experience/performance';
import { attentionEnvelope, isAttention } from './attentionMotion';

/** Small local geometry, no lights, textures, flashing or external media. */
export function AttentionEffects({action,reducedMotion}:{action:ActionPlayback;reducedMotion:boolean}) {
  const group=useRef<Group>(null),timer=useRef({revision:-1,start:0});
  useFrame(({clock})=>{
    if(!group.current)return;
    if(timer.current.revision!==action.revision)timer.current={revision:action.revision,start:clock.elapsedTime};
    const t=clock.elapsedTime-timer.current.start;
    const e=action.name ? attentionEnvelope(action.name,t,reducedMotion) : 0;
    group.current.visible=e>.001;
    if(!e)return;
    group.current.children.forEach((object,i)=>{
      const mesh=object as Mesh;
      if(i<18) {
        const a=i*Math.PI*2/18+t*.7;
        const r=1.13+(i%3)*.13;
        mesh.position.set(Math.cos(a)*r,.35+Math.sin(a)*.7,Math.sin(a*2)*.22+.12);
        mesh.rotation.set(t*.4,a,t*.8+i);
        mesh.scale.setScalar((.65+.35*Math.sin(t*2+i)**2)*e);
      } else {
        const k=i-18;
        mesh.position.set(0,-.96+k*.035,0);
        mesh.rotation.set(-Math.PI/2,0,t*.3);
        mesh.scale.setScalar((1+.12*Math.sin(t*2-k))*e);
      }
      (mesh.material as MeshBasicMaterial).opacity=e*(i<18 ? .8 : .38);
    });
  });
  if(!isAttention(action.name))return null;
  return <group ref={group} visible={false}>
    {Array.from({length:18},(_,i)=><mesh key={i}>
      {i%3===0 ? <octahedronGeometry args={[.073,0]}/> : <boxGeometry args={[.027,.10,.018]}/>}
      <meshBasicMaterial color={i%4===0 ? '#ffcf68' : i%2 ? '#139fff' : '#7fdfff'} transparent depthWrite={false} toneMapped={false}/>
    </mesh>)}
    {[1.2,1.42].map(r=><mesh key={r}>
      <torusGeometry args={[r,.013,6,64]}/>
      <meshBasicMaterial color="#1eaeff" transparent opacity={0} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </group>;
}
