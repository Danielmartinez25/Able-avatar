import { Component, useEffect } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { VisualState } from "../experience/visualState";
import type { ActionPlayback, Expression } from "../experience/performance";
import { ProvisionalAvatar } from "./ProvisionalAvatar";
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-error" role="alert">
          <h2>No pudimos mostrar la escena 3D</h2>
          <p>Verificá la aceleración gráfica del navegador.</p>
          <button
            onClick={() =>
              this.setState(({ attempt }) => ({
                failed: false,
                attempt: attempt + 1,
              }))
            }
          >
            Reintentar escena
          </button>
        </div>
      );
    return (
      <div className="canvas-wrapper" key={this.state.attempt}>
        {this.props.children}
      </div>
    );
  }
}
function Studio() {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.55;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      environment.dispose();
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
export function AvatarScene(props: {
  state: VisualState;
  revision: number;
  reducedMotion: boolean;
  expression: Expression;
  action: ActionPlayback;
  onReact: () => void;
}) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        camera={{ position: [0, 1.9, 6.1], fov: 36 }}
        dpr={[1, 1.75]}
        aria-label="Able, personaje 3D interactivo"
        fallback={
          <div className="scene-error" role="alert">
            No hay renderizado WebGL disponible.
          </div>
        }
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
        <ProvisionalAvatar {...props} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.14, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={0.15} />
        </mesh>
      </Canvas>
    </SceneBoundary>
  );
}
