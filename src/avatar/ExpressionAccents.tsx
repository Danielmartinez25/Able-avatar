import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture } from "three";
import type { Group } from "three";
import type { AccentKind } from "../experience/visualAccents";

const marks: Record<AccentKind, string[]> = {
  sleep: ["Z", "Z", "Z"],
  question: ["?"],
  thought: ["•", "•", "•"],
  surprise: ["!", "!"],
  joy: ["♥"],
  sparkle: ["✦", "✧"],
  focus: ["‹", "›"],
  rays: ["!", "!"],
  check: ["✓"],
  none: [],
};
function Glyph({ text, color }: { text: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.font = 'bold 96px "Segoe UI", Arial, sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, 64, 65);
    return new CanvasTexture(canvas);
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

/** Decorative cues only: no agent status, transcript or audio is inferred. */
export function ExpressionAccents({
  kind,
  reducedMotion,
}: {
  kind: AccentKind;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const timeline = useRef({ kind, start: -1 });
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (timeline.current.kind !== kind || timeline.current.start < 0)
      timeline.current = { kind, start: clock.elapsedTime };
    const t = reducedMotion ? 0 : clock.elapsedTime - timeline.current.start;
    group.current.children.forEach((child, index) => {
      const phase = (t * 0.34 + index / 3) % 1;
      let x = 0.72 + index * 0.19,
        y = 1.08 + index * 0.22,
        size = 0.22 + index * 0.065;
      let alpha = 1;
      if (kind === "sleep" && !reducedMotion) {
        x = 0.7 + phase * 0.45;
        y = 0.9 + phase * 0.85;
        size = 0.2 + phase * 0.17;
        alpha = Math.sin(phase * Math.PI);
      } else if (kind === "thought") {
        x = 0.67 + index * 0.15;
        y = 1.2 + (reducedMotion ? 0 : Math.sin(t * 3.5 - index) * 0.045);
        size = 0.13;
      } else if (kind === "surprise" || kind === "rays") {
        x = index ? 0.95 : -0.95;
        y = 1.12;
        size = 0.4;
      } else if (kind === "focus") {
        x = index ? 0.87 : -0.87;
        y = 0.6;
        size = 0.25;
      } else if (kind === "joy") {
        x = -0.92;
        y = 0.95;
        size = 0.24;
      } else if (kind === "question") {
        x = 0.82;
        y = 1.25;
        size = 0.48;
      } else if (kind === "check") {
        x = 0.95;
        y = 1.1;
        size = 0.42;
      } else if (kind === "sparkle") {
        x = index ? 0.98 : -0.9;
        y = 0.65 + index * 0.4;
        size = 0.3;
      }
      if (!reducedMotion && kind !== "sleep" && kind !== "thought")
        y += Math.sin(t * 2.3 + index) * 0.045;
      child.position.set(x, y, 0.72);
      const target =
        size * (reducedMotion ? 1 : 0.94 + Math.sin(t * 2 + index) * 0.06);
      const scale = reducedMotion
        ? target
        : child.scale.x +
          (target - child.scale.x) * (1 - Math.exp(-delta * 12));
      child.scale.setScalar(scale);
      const sprite = child.children[0] as import("three").Sprite;
      sprite.material.opacity = alpha;
    });
  });
  return (
    <group ref={group} key={kind}>
      {marks[kind].map((text, index) => (
        <group key={index} scale={0.001}>
          <Glyph
            text={text}
            color={
              kind === "joy"
                ? "#49aef0"
                : kind === "check"
                  ? "#30a98a"
                  : "#187bdd"
            }
          />
        </group>
      ))}
    </group>
  );
}
