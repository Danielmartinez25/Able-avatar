import {
  Suspense,
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  Canvas,
  createPortal,
  useFrame,
  useLoader,
  useThree,
} from "@react-three/fiber";
import { AnimationMixer, LoopOnce, PMREMGenerator } from "three";
import type { Group } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Eye, Mouth } from "../avatar/DigitalFace";

export type ClipName = "jump" | "wave" | "wave_v2";
export type PlaybackCommand = {
  clip: ClipName | null;
  revision: number;
  time?: number;
  paused?: boolean;
};
const modelUrl = "/models/able-004/able-wave-v2.glb";
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="compare-error">
        No se pudo cargar el GLB. La versión procedural permanece disponible en
        la página principal.
      </p>
    ) : (
      this.props.children
    );
  }
}
function Studio() {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.55;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    camera.position.set(
      0,
      1.9,
      Math.max(6.1, 5.9 / (size.width / size.height)),
    );
    camera.lookAt(0, 1.55, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
function DigitalFace({ active, time }: { active: ClipName | null; time: () => number }) {
  const eyes = useRef<Group>(null);
  const [joy, setJoy] = useState(false);
  const joyRef = useRef(false);
  useFrame(({ clock }) => {
    const t = time();
    const v2 = active === "wave_v2";
    const nextJoy = v2 && t >= 2.8 && t < 3.6;
    if (joyRef.current !== nextJoy) { joyRef.current = nextJoy; setJoy(nextJoy); }
    if (eyes.current) {
      const p = clock.elapsedTime % 5.8;
      eyes.current.scale.y = v2 ? 1 + .14 * Math.sin(Math.PI * Math.min(t / .6, 1)) : p > 5.5 && p < 5.66 ? 0.1 : 1;
      eyes.current.scale.x = v2 ? 1 + .05 * Math.sin(Math.PI * Math.min(t / .6, 1)) : 1;
    }
  });
  const expression = active === "jump" || joy ? "excited" : "happy";
  return (
    <>
      <group ref={eyes} position={[0, 0.12, 0.12]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.275, 0, 0]}>
            <Eye expression={expression} side={side} />
          </group>
        ))}
      </group>
      <group position={[0, -0.08, 0.12]}>
        <Mouth expression={expression} />
      </group>
    </>
  );
}
function GlbActor({
  command,
  onProgress,
  onReady,
  url = modelUrl,
}: {
  command: PlaybackCommand;
  onProgress: (time: number) => void;
  onReady: (clips: Record<ClipName, number>) => void;
  url?: string;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);
  const [active, setActive] = useState<ClipName | null>(null);
  const reportAt = useRef(0);
  const socket = scene.getObjectByName("face_socket");
  if (!socket) throw Error("GLB is missing face_socket");
  useEffect(() => {
    scene.traverse((o) => {
      if ("isMesh" in o) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const durations = {} as Record<ClipName, number>;
    for (const name of ["jump", "wave", "wave_v2"] as const) {
      const clip = gltf.animations.find((c) => c.name === name);
      if (clip) durations[name] = clip.duration;
    }
    onReady(durations);
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
    };
  }, [scene, mixer, gltf.animations, onReady]);
  useEffect(() => {
    mixer.stopAllAction();
    if (!command.clip) {
      scene.traverse((obj) => {
        if ("isSkinnedMesh" in obj)
          (obj as import("three").SkinnedMesh).skeleton.pose();
      });
      scene.updateMatrixWorld(true);
      setActive(null);
      onProgress(0);
      return;
    }
    const clip = gltf.animations.find((c) => c.name === command.clip)!;
    const action = mixer.clipAction(clip);
    action.reset().setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    if (command.time !== undefined) {
      mixer.setTime(command.time);
      action.paused = true;
    }
    setActive(command.clip);
    const finish = () => setActive(null);
    mixer.addEventListener("finished", finish);
    return () => {
      mixer.removeEventListener("finished", finish);
    };
  }, [
    command.clip,
    command.revision,
    command.time,
    mixer,
    scene,
    gltf.animations,
    onProgress,
  ]);
  useFrame((_, delta) => {
    if (!command.paused && command.time === undefined) mixer.update(delta);
    const clip = gltf.animations.find((c) => c.name === command.clip);
    const time = clip ? mixer.clipAction(clip).time : 0;
    reportAt.current += delta;
    if (reportAt.current > 0.08) {
      onProgress(time);
      reportAt.current = 0;
    }
  });
  return (
    <group rotation={[0, -0.12, 0]}>
      <primitive object={scene} dispose={null} />
      {createPortal(<DigitalFace active={active} time={() => {
        const clip = gltf.animations.find(c => c.name === command.clip);
        return clip ? mixer.clipAction(clip).time : 0;
      }} />, socket)}
    </group>
  );
}
export function GlbScene(props: {
  command: PlaybackCommand;
  onProgress: (time: number) => void;
  onReady: (clips: Record<ClipName, number>) => void;
  url?: string;
}) {
  return (
    <Boundary>
      <Canvas
        shadows
        camera={{ position: [0, 1.9, 6.1], fov: 36 }}
        dpr={[1, 1.75]}
        aria-label="Able GLB con rig y rostro procedural"
        fallback={<p>WebGL no disponible.</p>}
      >
        <Studio />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[-3, 6, 5]}
          intensity={3.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-normalBias={0.04}
          shadow-radius={5}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={5}
          shadow-camera-bottom={-3}
        />
        <directionalLight
          position={[4, 3, 1]}
          intensity={1.5}
          color="#c4e1ff"
        />
        <directionalLight
          position={[-3, 2, -3]}
          intensity={2}
          color="#6ac3ff"
        />
        <Suspense fallback={null}>
          <GlbActor {...props} />
        </Suspense>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.14, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={0.15} />
        </mesh>
      </Canvas>
    </Boundary>
  );
}
