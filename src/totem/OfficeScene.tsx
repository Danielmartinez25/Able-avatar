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
    camera.position.set(0,2.85,Math.max(8.6,4.3/aspect));
    camera.lookAt(0,1.35,-.5);camera.updateProjectionMatrix();
  },[camera,size]);
  return <>
    <color attach="background" args={['#182c50']}/>
    <ambientLight intensity={.55} color="#e2efff"/>
    <directionalLight position={[-3,6,5]} intensity={3.1} color="#f1f6ff" castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.035} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={7} shadow-camera-bottom={-5} shadow-radius={5}/>
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
  return <group position={[0,3.7,-2.70]}>
    <Box position={[0,0,-.04]} size={[2.53,1.03,.10]} color="#e1f3ff"/>
    <mesh position={[0,0,-.09]}><planeGeometry args={[2.48,1.22]}/><meshBasicMaterial color="#70c7ff" transparent opacity={.10} depthWrite={false}/></mesh>
    <Box position={[0,0,.035]} size={[2.42,.92,.075]} color="#252c36"/>
    <mesh position={[0,0,.085]}><planeGeometry args={[2.32,.92]}/><meshBasicMaterial map={logo} toneMapped={false}/></mesh>
    <pointLight position={[0,0,.25]} color="#5cbdff" intensity={1.7} distance={2.7} decay={2}/>
    <Box position={[0,-.43,.02]} size={[1.92,.018,.015]} color="#8ddcff"/>
  </group>;
}
function BrandWall(){
  return <group position={[0,0,-2.80]}>
    {/* Layered diagonal ribbons and diamonds follow the supplied stand artwork. */}
    {[-1,1].map(side=><group key={side}>
      {[0,1,2,3].map(i=><mesh key={i} position={[side*(2.7+i*.25),3.8-i*.26,.01+i*.008]} rotation={[0,0,-Math.PI/4]}>
        <planeGeometry args={[.19+i*.04,3.7]}/><meshBasicMaterial color={i%2 ? '#056797' : '#178db4'} transparent opacity={.23+i*.08} depthWrite={false}/>
      </mesh>)}
      {Array.from({length:20},(_,i)=><mesh key={i} position={[side*(1.9+(i%5)*.43),.55+Math.floor(i/5)*1.1+(i%3)*.13,.07]} rotation={[0,0,Math.PI/4]}>
        <planeGeometry args={[.12+(i%3)*.09,.12+(i%3)*.09]}/><meshBasicMaterial color={i%4===0 ? '#9b57b6' : '#35bee9'} transparent opacity={.18+(i%3)*.12} depthWrite={false}/>
      </mesh>)}
      {[0,1,2,3,4].map(i=><group key={i} position={[side*(2+i*.37),.8+i*.84,.11]}>
        <mesh rotation={[0,0,-side*Math.PI/4]}><planeGeometry args={[.012,1.35]}/><meshBasicMaterial color="#139acb" transparent opacity={.65}/></mesh>
        <mesh position={[side*.477,.477,.01]}><sphereGeometry args={[.028,10,8]}/><meshBasicMaterial color="#9eeeff"/></mesh>
        <mesh position={[side*.477,.477,.005]}><circleGeometry args={[.09,20]}/><meshBasicMaterial color="#00bfff" transparent opacity={.16} depthWrite={false}/></mesh>
      </group>)}
    </group>)}
  </group>;
}
function Office(){
  return <group>
    <Box position={[0,2.9,-2.9]} size={[12,5.8,.14]} color="#20395f"/>
    <Box position={[-4,2.5,0]} size={[.12,5.2,7]} color="#162b4a"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.12,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#a9b9cb" roughness={.86}/></mesh>
    {[-3,-2,-1,0,1,2,3].map(i=><Box key={i} position={[i*1.1,.125,0]} size={[.012,.003,15]} color="#889eb5"/>)}
    <Box position={[0,.21,-2.77]} size={[12,.14,.055]} color="#1597c2"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.14,.05]} receiveShadow><circleGeometry args={[1.72,80]}/><meshStandardMaterial color="#304e70" roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.145,.05]}><ringGeometry args={[1.65,1.68,80]}/><meshStandardMaterial color="#45b8e5"/></mesh>
    <IlluminatedSign/>
    <spotLight position={[-3,5,1]} target-position={[-1,1,-2]} color="#63cfff" intensity={22} angle={.65} penumbra={.85} castShadow/>
    <pointLight position={[2.8,2,-1.5]} color="#9564d9" intensity={5} distance={5}/>
    <Box position={[4,2.5,0]} size={[.12,5.2,7]} color="#172f50"/>
    <Box position={[0,5.1,-1.9]} size={[8,.14,2]} color="#122741"/>
    {[-3,3].map(x=><mesh key={x} position={[x,4.99,-1.5]}><boxGeometry args={[.04,.025,2.4]}/><meshBasicMaterial color="#a6e6ff"/></mesh>)}
    <BrandWall/>
    {/* Window with a stylized local skyline, no downloaded imagery. */}
    <Box position={[1.45,3.15,-2.77]} size={[1.38,2.07,.13]} color="#42769b"/>
    <Box position={[1.45,3.15,-2.69]} size={[1.23,1.92,.035]} color="#b9d7dd"/>
    {[0,1,2,3,4].map(i=><Box key={i} position={[.95+i*.25,2.65+(i%3)*.09,-2.65]} size={[.20,.7+(i%3)*.18,.025]} color={i%2 ? '#97b3bb' : '#87a5b1'}/>)}
    <Box position={[1.45,3.15,-2.60]} size={[.045,1.98,.05]} color="#f4eee5"/>
    <Box position={[1.45,3.20,-2.59]} size={[1.28,.045,.05]} color="#f4eee5"/>
    <Box position={[1.45,2.12,-2.51]} size={[1.53,.07,.39]} color="#507391"/>
    {/* Walnut acoustic slats on the right wall. */}
    {Array.from({length:13},(_,i)=><Box key={i} position={[2.48+i*.13,2.6,-2.71]} size={[.06,4.9,.14]} color={i%2 ? '#23446c' : '#2b507a'}/>)}
    {/* Work desk remains behind Able, leaving the foreground free for movement. */}
    <Box position={[-2.05,1.05,-1.74]} size={[1.75,.11,.78]} color="#8198ae"/>
    {[-2.76,-1.34].map(x=><Box key={x} position={[x,.58,-1.74]} size={[.055,.92,.57]} color="#414c4a" metalness={.3}/>)}
    <Box position={[-2.08,1.56,-1.98]} size={[.90,.62,.065]} color="#343f44"/>
    <Box position={[-2.08,1.56,-1.94]} size={[.79,.51,.015]} color="#8ebbc9"/>
    <Box position={[-2.08,1.21,-1.99]} size={[.055,.27,.05]} color="#414c4a"/>
    <Box position={[-2.08,1.11,-1.89]} size={[.33,.028,.2]} color="#414c4a"/>
    <Box position={[-2.06,1.12,-1.49]} size={[.65,.025,.2]} color="#e5e1d6"/>
    <Plant position={[-2.7,1.10,-1.78]} scale={.45}/>
    <Box position={[-2.15,2.69,-2.61]} size={[1.4,.075,.38]} color="#8198ae"/>
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
