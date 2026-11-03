import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { SeatedOfficeWorker } from '../avatar/SeatedOfficeWorker';

function WorkerFraming(){
  const {camera,size}=useThree();
  useEffect(()=>{
    camera.position.set(3.2,2.8,7);
    camera.lookAt(-.15,1.15,0);
    camera.zoom=size.height/4.0;
    camera.updateProjectionMatrix();
  },[camera,size.height]);
  return null;
}

function Part({position,size,color}:{position:[number,number,number];size:[number,number,number];color:string}){
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.55}/></mesh>;
}
function Workstation(){
  return <group>
    {/* Chair and desk occupy the same depth buffer as the character. */}
    <Part position={[.15,.72,-.35]} size={[1.35,.18,1.05]} color="#263b59"/>
    <group position={[.15,1.22,-.83]} rotation={[-.12,0,0]}><Part position={[0,0,0]} size={[1.25,1.15,.16]} color="#263b59"/></group>
    <mesh position={[.15,.38,-.35]}><cylinderGeometry args={[.065,.08,.58,16]}/><meshStandardMaterial color="#596a7c" metalness={.7} roughness={.3}/></mesh>
    {[0,1,2,3,4].map(i=><group key={i} position={[.15,.12,-.35]} rotation={[0,i*Math.PI*2/5,0]}>
      <Part position={[0,0,.32]} size={[.065,.065,.7]} color="#4a596b"/>
      <mesh position={[0,-.035,.65]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.085,.085,.09,12]}/><meshStandardMaterial color="#182331"/></mesh>
    </group>)}
    <Part position={[-.25,1.22,.83]} size={[2.85,.12,1.05]} color="#b9c5d3"/>
    <Part position={[-1.28,.61,.83]} size={[.57,1.12,.89]} color="#74859c"/>
    {[.35,.68,1.01].map(y=><group key={y}><Part position={[-1.28,y,1.285]} size={[.51,.014,.015]} color="#34465e"/><Part position={[-1.28,y-.07,1.30]} size={[.16,.025,.02]} color="#d7e6f2"/></group>)}
    <Part position={[1,.63,.83]} size={[.06,1.12,.75]} color="#34465e"/>
    <group position={[-.85,1.65,.63]} rotation={[0,.2,0]}>
      <Part position={[0,0,0]} size={[.88,.65,.07]} color="#142d49"/>
      <mesh position={[0,0,-.04]} rotation={[0,Math.PI,0]}><planeGeometry args={[.78,.55]}/><meshBasicMaterial color="#12649a"/></mesh>
      <Part position={[0,-.36,0]} size={[.055,.22,.05]} color="#31465c"/>
      <Part position={[0,-.4,0]} size={[.42,.025,.27]} color="#31465c"/>
    </group>
    <Part position={[.1,1.30,.6]} size={[.7,.035,.28]} color="#243d59"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]} receiveShadow><planeGeometry args={[5,5]}/><shadowMaterial transparent opacity={.22}/></mesh>
  </group>;
}

/** Independent illustrative worker; never receives session state. */
export function SeatedWorkerScene(){
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  return <Canvas shadows orthographic camera={{position:[0,1.45,7],zoom:48}} dpr={[1,1.5]}>
    <WorkerFraming/>
    <ambientLight intensity={.8} color="#b6cdea"/>
    <directionalLight position={[-3,4,5]} intensity={2} color="#ffe7c5" castShadow shadow-mapSize={[1024,1024]} shadow-normalBias={.03}/>
    <directionalLight position={[3,2,-1]} intensity={1.2} color="#31bbff"/>
    <Workstation/>
    <group position={[.1,.60,-.30]} scale={.72}><SeatedOfficeWorker state="idle" revision={0} expression="focused" action={{name:null,revision:0}} reducedMotion={reduced} onReact={()=>{}}/></group>
  </Canvas>;
}
