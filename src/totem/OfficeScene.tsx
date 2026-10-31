import { Component, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { PMREMGenerator, SRGBColorSpace, TextureLoader } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ProvisionalAvatar } from '../avatar/ProvisionalAvatar';
import type { ActionPlayback, Expression } from '../experience/performance';
import type { VisualState } from '../experience/visualState';

class Boundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed ? <div className="office-fallback"><strong>Able está preparando su oficina.</strong><p>No se pudo iniciar la escena 3D.</p><button onClick={()=>window.location.reload()}>Volver a intentar</button></div> : this.props.children;}
}
function Lighting(){
  const {gl,scene,camera,size}=useThree();
  useEffect(()=>{
    const pmrem=new PMREMGenerator(gl),room=new RoomEnvironment();
    const environment=pmrem.fromScene(room,.04);
    scene.environment=environment.texture;scene.environmentIntensity=.45;
    room.dispose();pmrem.dispose();
    return ()=>{scene.environment=null;environment.dispose();};
  },[gl,scene]);
  useEffect(()=>{
    const aspect=size.width/size.height;
    camera.position.set(0,2.85,Math.max(10.7,4.7/aspect));
    camera.lookAt(0,1.35,-.5);camera.updateProjectionMatrix();
  },[camera,size]);
  return <>
    <color attach="background" args={['#e6dfd3']}/>
    <ambientLight intensity={.9} color="#fff6e8"/>
    <directionalLight position={[-3,6,5]} intensity={3.1} color="#fff6e9" castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.035} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-radius={5}/>
    <directionalLight position={[4,4,-1]} intensity={1.7} color="#b9e6ff"/>
    <directionalLight position={[-4,2,-1]} intensity={.6} color="#e7caa3"/>
  </>;
}
function Box({position,size,color,metalness=0}:{position:[number,number,number];size:[number,number,number];color:string;metalness?:number}){
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={metalness ? .38 : .8} metalness={metalness}/></mesh>;
}
function Plant({position,scale=1}:{position:[number,number,number];scale?:number}){
  return <group position={position} scale={scale}>
    <mesh position={[0,.23,0]} castShadow><cylinderGeometry args={[.23,.17,.46,24]}/><meshStandardMaterial color="#c6b4a1" roughness={.9}/></mesh>
    {[0,1,2,3,4,5,6].map(i=><group key={i} rotation={[.12*Math.sin(i),i*2.4,.15]}>
      <mesh position={[0,.7+(i%3)*.13,0]} rotation={[0,0,.2]}><cylinderGeometry args={[.009,.012,.7,5]}/><meshStandardMaterial color="#536952"/></mesh>
      <mesh position={[.13,.88+(i%3)*.15,0]} rotation={[0,0,-.5]} scale={[.14,.34,.055]} castShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={i%2 ? '#586f52' : '#78916c'} roughness={.85}/></mesh>
    </group>)}
  </group>;
}
function IlluminatedSign(){
  const logo=useLoader(TextureLoader,'/branding/ithreex-logo.png');
  useEffect(()=>{logo.colorSpace=SRGBColorSpace;logo.needsUpdate=true;},[logo]);
  return <group position={[-.72,3.48,-2.70]}>
    <Box position={[0,0,-.04]} size={[2.13,.92,.10]} color="#e1f3ff"/>
    <mesh position={[0,0,-.09]}><planeGeometry args={[2.48,1.22]}/><meshBasicMaterial color="#70c7ff" transparent opacity={.10} depthWrite={false}/></mesh>
    <Box position={[0,0,.035]} size={[2.02,.81,.075]} color="#252c36" metalness={.25}/>
    <mesh position={[0,0,.078]}><planeGeometry args={[1.92,.766]}/><meshBasicMaterial map={logo} toneMapped={false}/></mesh>
    <pointLight position={[0,0,.25]} color="#5cbdff" intensity={1.7} distance={2.7} decay={2}/>
    <Box position={[0,-.43,.02]} size={[1.92,.018,.015]} color="#8ddcff"/>
  </group>;
}
function Office(){
  return <group>
    <Box position={[0,2.9,-2.9]} size={[12,5.8,.14]} color="#e2dccf"/>
    <Box position={[-4,2.5,0]} size={[.12,5.2,7]} color="#cfc8bc"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.12,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#d4cabb" roughness={.86}/></mesh>
    {[-3,-2,-1,0,1,2,3].map(i=><Box key={i} position={[i*1.1,.125,0]} size={[.012,.003,15]} color="#c0b6a7"/>)}
    <Box position={[0,.21,-2.77]} size={[12,.14,.055]} color="#b6a68e"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.14,.05]} receiveShadow><circleGeometry args={[1.72,80]}/><meshStandardMaterial color="#b9b4aa" roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.145,.05]}><ringGeometry args={[1.65,1.68,80]}/><meshStandardMaterial color="#d7d0c4"/></mesh>
    <IlluminatedSign/>
    {/* Window with a stylized local skyline, no downloaded imagery. */}
    <Box position={[1.45,3.15,-2.77]} size={[1.38,2.07,.13]} color="#b0a18a"/>
    <Box position={[1.45,3.15,-2.69]} size={[1.23,1.92,.035]} color="#b9d7dd"/>
    {[0,1,2,3,4].map(i=><Box key={i} position={[.95+i*.25,2.65+(i%3)*.09,-2.65]} size={[.20,.7+(i%3)*.18,.025]} color={i%2 ? '#97b3bb' : '#87a5b1'}/>)}
    <Box position={[1.45,3.15,-2.60]} size={[.045,1.98,.05]} color="#f4eee5"/>
    <Box position={[1.45,3.20,-2.59]} size={[1.28,.045,.05]} color="#f4eee5"/>
    <Box position={[1.45,2.12,-2.51]} size={[1.53,.07,.39]} color="#b5a087"/>
    {/* Walnut acoustic slats on the right wall. */}
    {Array.from({length:13},(_,i)=><Box key={i} position={[2.48+i*.13,2.6,-2.71]} size={[.06,4.9,.14]} color={i%2 ? '#b49b7c' : '#c4ad90'}/>)}
    {/* Work desk remains behind Able, leaving the foreground free for movement. */}
    <Box position={[-2.05,1.05,-1.74]} size={[1.75,.11,.78]} color="#b09474"/>
    {[-2.76,-1.34].map(x=><Box key={x} position={[x,.58,-1.74]} size={[.055,.92,.57]} color="#414c4a" metalness={.3}/>)}
    <Box position={[-2.08,1.56,-1.98]} size={[.90,.62,.065]} color="#343f44"/>
    <Box position={[-2.08,1.56,-1.94]} size={[.79,.51,.015]} color="#8ebbc9"/>
    <Box position={[-2.08,1.21,-1.99]} size={[.055,.27,.05]} color="#414c4a"/>
    <Box position={[-2.08,1.11,-1.89]} size={[.33,.028,.2]} color="#414c4a"/>
    <Box position={[-2.06,1.12,-1.49]} size={[.65,.025,.2]} color="#e5e1d6"/>
    <Plant position={[-2.7,1.10,-1.78]} scale={.45}/>
    <Box position={[-2.15,2.69,-2.61]} size={[1.4,.075,.38]} color="#b09474"/>
    {[0,1,2,3].map(i=><Box key={i} position={[-2.65+i*.13,2.89,-2.56]} size={[.10,.34+(i%2)*.08,.19]} color={['#617d85','#b5906b','#e9e2d4','#81917b'][i]!}/>)}
    <Plant position={[-1.75,2.73,-2.56]} scale={.34}/>
    <Plant position={[2.0,.14,-1.65]} scale={1.32}/>
    <Box position={[2.05,1.95,-2.72]} size={[.55,.028,.02]} color="#8edcff"/>
  </group>;
}
export function OfficeScene({action,reducedMotion,onReact,state='idle',revision=0,expression='auto'}:{action:ActionPlayback;reducedMotion:boolean;onReact:()=>void;state?:VisualState;revision?:number;expression?:Expression}){
  return <Boundary><Canvas shadows dpr={[1,1.5]} camera={{position:[0,2.85,8.6],fov:40}} aria-label="Able en la oficina de IThreex Global" fallback={<div className="office-fallback">La oficina 3D requiere WebGL.</div>}>
    <Lighting/>
    <Suspense fallback={null}><Office/></Suspense>
    <ProvisionalAvatar state={state} revision={revision} expression={expression} action={action} reducedMotion={reducedMotion} onReact={onReact}/>
  </Canvas></Boundary>;
}
