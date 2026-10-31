import { useRef } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { ActionName, ActionPlayback } from "../experience/performance";
import { getActionEnvelope } from "./animationController";

function Laptop() {
  return (
    <group position={[0, -0.78, 1.03]}>
      <mesh castShadow>
        <boxGeometry args={[1.25, 0.055, 0.63]} />
        <meshStandardMaterial
          color="#263952"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <group position={[0, 0.02, 0.22]} rotation={[-0.17, 0, 0]}>
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[1.25, 0.72, 0.055]} />
          <meshStandardMaterial
            color="#142944"
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.34, -0.031]}>
          <boxGeometry args={[1.12, 0.6, 0.012]} />
          <meshStandardMaterial
            color="#0a1c33"
            emissive="#1469b5"
            emissiveIntensity={0.4}
          />
        </mesh>
        {[0, 1, 2, 3].map((row) => (
          <mesh
            key={row}
            position={[-0.16 + (row % 2) * 0.06, 0.52 - row * 0.12, -0.045]}
          >
            <boxGeometry args={[0.58 - (row % 2) * 0.2, 0.025, 0.01]} />
            <meshBasicMaterial color={row % 2 ? "#6bd5ff" : "#3c91cf"} />
          </mesh>
        ))}
        {[-1, 1].map((sign) => (
          <mesh
            key={sign}
            position={[0, 0.34, 0.04]}
            rotation={[0, 0, (sign * Math.PI) / 4]}
          >
            <capsuleGeometry args={[0.025, 0.22, 4, 8]} />
            <meshStandardMaterial color="#319ee4" />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -0.44 + (i % 6) * 0.175,
            0.032,
            -0.18 + Math.floor(i / 6) * 0.15,
          ]}
        >
          <boxGeometry args={[0.12, 0.012, 0.09]} />
          <meshStandardMaterial color="#78a1bf" />
        </mesh>
      ))}
    </group>
  );
}
function Clipboard() {
  return (
    <group position={[0.93, -0.4, 0.93]} rotation={[0, -0.15, -0.09]}>
      <mesh castShadow>
        <boxGeometry args={[0.77, 1.02, 0.06]} />
        <meshStandardMaterial color="#1c78ba" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.038]}>
        <boxGeometry args={[0.65, 0.86, 0.015]} />
        <meshStandardMaterial color="#f4fbff" />
      </mesh>
      <mesh position={[0, 0.47, 0.06]}>
        <boxGeometry args={[0.27, 0.12, 0.045]} />
        <meshStandardMaterial color="#a5bbcb" metalness={0.6} />
      </mesh>
      {[0, 1, 2].map((row) => (
        <group key={row} position={[-0.19, 0.24 - row * 0.23, 0.06]}>
          <mesh>
            <boxGeometry args={[0.12, 0.12, 0.012]} />
            <meshBasicMaterial color="#239ff0" />
          </mesh>
          <mesh position={[0.015, 0.012, 0.012]} rotation={[0, 0, -0.7]}>
            <boxGeometry args={[0.018, 0.09, 0.012]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[-0.017, -0.01, 0.012]} rotation={[0, 0, 0.7]}>
            <boxGeometry args={[0.018, 0.05, 0.012]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <mesh position={[0.26, 0, 0]}>
            <boxGeometry args={[0.25, 0.025, 0.012]} />
            <meshBasicMaterial color="#8eafc7" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Bulb() {
  return (
    <group position={[-0.85, 1.12, 0.35]}>
      <mesh>
        <sphereGeometry args={[0.19, 28, 20]} />
        <meshStandardMaterial
          color="#fff2a2"
          emissive="#ffcf38"
          emissiveIntensity={1.3}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.085, 0.07, 0.15, 16]} />
        <meshStandardMaterial color="#a4b4c5" metalness={0.6} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <capsuleGeometry args={[0.012, 0.07, 4, 8]} />
            <meshBasicMaterial color="#e9b92c" />
          </mesh>
        );
      })}
    </group>
  );
}
export function Magnifier() {
  return (
    <group position={[0, -0.36, 0.4]} rotation={[0, 0, -1.1]}>
      <mesh position={[0, 0.03, 0]}>
        <capsuleGeometry args={[0.05, 0.34, 6, 12]} />
        <meshStandardMaterial color="#193b59" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <torusGeometry args={[0.25, 0.035, 12, 48]} />
        <meshStandardMaterial
          color="#217dc1"
          metalness={0.65}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <circleGeometry args={[0.22, 40]} />
        <meshPhysicalMaterial
          color="#9ad8ff"
          transparent
          opacity={0.22}
          roughness={0.08}
          depthWrite={false}
          side={2}
        />
      </mesh>
    </group>
  );
}
export function PropReveal({
  action,
  reducedMotion,
  children,
}: {
  action: ActionPlayback;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null),
    timer = useRef({ revision: -1, start: 0 });
  useFrame(({ clock }, delta) => {
    if (!group.current || !action.name) return;
    if (timer.current.revision !== action.revision)
      timer.current = { revision: action.revision, start: clock.elapsedTime };
    const target = getActionEnvelope(
      action.name,
      clock.elapsedTime - timer.current.start,
      reducedMotion,
    );
    group.current.scale.setScalar(
      reducedMotion
        ? target
        : group.current.scale.x +
            (target - group.current.scale.x) * (1 - Math.exp(-delta * 20)),
    );
  });
  return (
    <group ref={group} scale={reducedMotion ? 1 : 0.001}>
      {children}
    </group>
  );
}
export function PerformanceProps({
  action,
  reducedMotion,
}: {
  action: ActionPlayback;
  reducedMotion: boolean;
}) {
  const content: Partial<Record<ActionName, ReactNode>> = {
    work: <Laptop />,
    organize: <Clipboard />,
    idea: <Bulb />,
  };
  if (!action.name || !content[action.name]) return null;
  return (
    <PropReveal key={action.name} action={action} reducedMotion={reducedMotion}>
      {content[action.name]}
    </PropReveal>
  );
}

