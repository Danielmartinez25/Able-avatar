import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
} from "three";
import type { Expression } from "../experience/performance";

type Point = [number, number, number];
export function Stroke({
  points,
  radius = 0.018,
  color = "#6bb5ff",
  glow = true,
}: {
  points: Point[];
  radius?: number;
  color?: string;
  glow?: boolean;
}) {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        32,
        radius,
        8,
        false,
      ),
    [points, radius],
  );
  const rendered = useMemo(() => geometry.clone(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 18);
    for (const name of ["position", "normal"]) {
      const current = rendered.getAttribute(name),
        target = geometry.getAttribute(name);
      for (let i = 0; i < current.array.length; i++)
        current.array[i] += (target.array[i] - current.array[i]) * blend;
      current.needsUpdate = true;
    }
    rendered.computeBoundingSphere();
  });
  return (
    <group>
      <mesh geometry={rendered}>
        <meshStandardMaterial
          color={color}
          emissive={glow ? "#004aff" : "#000000"}
          emissiveIntensity={glow ? 1.2 : 0}
          roughness={glow ? 0.25 : 0.6}
          toneMapped={!glow}
        />
      </mesh>
      {glow && (
        <mesh geometry={rendered}>
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            vertexShader="void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*0.018,1.0);}"
            fragmentShader="void main(){gl_FragColor=vec4(0.0,0.3,1.0,0.16);}"
          />
        </mesh>
      )}
      {!glow && [points[0], points[points.length - 1]].map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
const curve = (height: number, width = 0.14): Point[] => [
  [-width, 0, 0],
  [-width * 0.55, height * 0.8, 0],
  [0, height, 0],
  [width * 0.55, height * 0.8, 0],
  [width, 0, 0],
];
const ring = (): Point[] =>
  Array.from({ length: 25 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return [Math.cos(a) * 0.105, Math.sin(a) * 0.135, 0];
  });
export function Eye({
  expression,
  side,
}: {
  expression: Exclude<Expression, "auto">;
  side: number;
}) {
  const points = useMemo(() => {
    if (expression === "surprised" || expression === "curious") return ring();
    if (expression === "sleeping") return curve(-0.045);
    if (expression === "excited")
      return [
        [-0.14, -0.02, 0],
        [0, 0.13, 0],
        [0.14, -0.02, 0],
      ] as Point[];
    if (expression === "focused" || expression === "thinking")
      return [
        [-0.13, 0.07, 0],
        [0, 0.04, 0],
        [0.13, 0.07, 0],
      ] as Point[];
    if (expression === "wink" && side === 1)
      return [
        [-0.12, 0.1, 0],
        [0.06, 0, 0],
        [-0.12, -0.07, 0],
      ] as Point[];
    if (expression === "doubtful") return curve(side === 1 ? 0.02 : 0.1);
    return curve(0.13, 0.14);
  }, [expression, side]);
  return (
    <>
      <Stroke points={points} radius={0.023} />
      {(expression === "focused" || expression === "thinking") && (
        <mesh position={[0.02, 0.005, 0]}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshBasicMaterial color="#59cfff" />
        </mesh>
      )}
    </>
  );
}
export function Mouth({
  expression,
}: {
  expression: Exclude<Expression, "auto">;
}) {
  const points = useMemo(() => {
    if (expression === "surprised")
      return Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return [Math.cos(a) * 0.045, Math.sin(a) * 0.065, 0] as Point;
      });
    if (expression === "sleeping" || expression === "focused")
      return [
        [-0.06, 0, 0],
        [0, -0.01, 0],
        [0.06, 0, 0],
      ] as Point[];
    if (expression === "thinking" || expression === "doubtful")
      return [
        [-0.045, 0, 0],
        [0, 0.015, 0],
        [0.07, 0.01, 0],
      ] as Point[];
    return curve(-0.055, 0.105);
  }, [expression]);
  return <Stroke points={points} radius={0.016} />;
}
