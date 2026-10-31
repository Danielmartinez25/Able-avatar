import { writeFile, mkdir } from "node:fs/promises";
import {
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  CapsuleGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
  Box3,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import {
  createBodyGeometry,
  createScreenGeometry,
} from "../../assets/able-003/source/procedural-snapshot/characterGeometry.ts";

// Offline copy: frozen source geometry is read from procedural-snapshot, never rewritten.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const root = new Group();
root.name = "ABLE_Neutral";
root.position.y = 1.25;
const plush = new MeshPhysicalMaterial({
  color: "#fffaf0",
  roughness: 0.96,
  sheen: 1,
  sheenColor: "#fff7ed",
  sheenRoughness: 0.8,
});
const dark = new MeshPhysicalMaterial({
  color: "#07172d",
  metalness: 0.45,
  roughness: 0.23,
  clearcoat: 1,
});
const led = new MeshStandardMaterial({
  color: "#039bff",
  emissive: "#039bff",
  emissiveIntensity: 0.7,
  metalness: 0.65,
  roughness: 0.3,
});
const eyes = new MeshStandardMaterial({
  color: "#6bb5ff",
  emissive: "#004aff",
  emissiveIntensity: 1.2,
  roughness: 0.25,
});
const black = new MeshStandardMaterial({ color: "#171c28", roughness: 0.6 });
function mesh(
  parent,
  name,
  geometry,
  material,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const obj = new Mesh(geometry, material);
  obj.name = name;
  obj.position.set(...position);
  obj.scale.set(...scale);
  obj.rotation.set(...rotation);
  parent.add(obj);
  return obj;
}
function group(parent, name, position, rotation = [0, 0, 0]) {
  const g = new Group();
  g.name = name;
  g.position.set(...position);
  g.rotation.set(...rotation);
  parent.add(g);
  return g;
}
function stroke(parent, name, points, radius, material) {
  return mesh(
    parent,
    name,
    new TubeGeometry(
      new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
      32,
      radius,
      8,
      false,
    ),
    material,
  );
}
const curve = (h, w) => [
  [-w, 0, 0],
  [-w * 0.55, h * 0.8, 0],
  [0, h, 0],
  [w * 0.55, h * 0.8, 0],
  [w, 0, 0],
];
mesh(root, "body_shell", createBodyGeometry(), plush);
const screen = group(root, "face_anchor", [0, -0.03, 0.51], [-0.025, 0, 0]);
mesh(
  screen,
  "screen_rim",
  createScreenGeometry(),
  led,
  [0, 0, -0.012],
  [1.045, 1.055, 1],
);
mesh(
  screen,
  "screen_glass",
  createScreenGeometry(),
  new MeshPhysicalMaterial({
    color: "#020916",
    metalness: 0.45,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }),
);
const face = group(screen, "digital_face", [0, 0, 0]);
for (const side of [-1, 1]) {
  const eye = group(face, `eye_${side < 0 ? "R" : "L"}`, [
    side * 0.275,
    0.12,
    0.12,
  ]);
  stroke(eye, "eye_stroke_" + side, curve(0.13, 0.14), 0.023, eyes);
}
const mouth = group(face, "mouth", [0, -0.08, 0.12]);
stroke(mouth, "mouth_stroke", curve(-0.055, 0.105), 0.016, eyes);
for (const side of [-1, 1]) {
  const suffix = side < 0 ? "R" : "L";
  const brow = group(
    root,
    "brow_" + suffix,
    [side * 0.39, 0.6, 0.48],
    [0, 0, side * -0.28],
  );
  const points = [
    [-0.12, 0, 0],
    [0, 0.055, 0],
    [0.12, 0.005, 0],
  ];
  stroke(brow, "brow_curve_" + suffix, points, 0.043, black);
  for (const [i, p] of [points[0], points[2]].entries())
    mesh(
      brow,
      `brow_cap_${suffix}_${i}`,
      new SphereGeometry(0.043, 16, 12),
      black,
      p,
    );
  const arm = group(
    root,
    "arm_" + suffix,
    [side * 0.72, -0.12, 0.35],
    [0, 0, side * 0.28],
  );
  mesh(
    arm,
    "arm_" + suffix + "_upper",
    new SphereGeometry(1, 40, 28),
    plush,
    [0, -0.17, 0.02],
    [0.18, 0.28, 0.2],
  );
  mesh(
    arm,
    "arm_" + suffix + "_hand",
    new SphereGeometry(1, 40, 28),
    plush,
    [0, -0.37, 0.22],
    [0.235, 0.23, 0.24],
  );
  const foot = group(root, "foot_" + suffix, [side * 0.61, -0.86, 0.18]);
  mesh(
    foot,
    "foot_" + suffix + "_shell",
    new SphereGeometry(1, 40, 24),
    dark,
    [0, 0, 0],
    [0.32, 0.2, 0.37],
  );
  mesh(
    foot,
    "foot_" + suffix + "_LED",
    new TorusGeometry(0.303, 0.014, 8, 48),
    new MeshStandardMaterial({
      color: "#77dbff",
      emissive: "#039bff",
      emissiveIntensity: 2.5,
    }),
    [0, 0, 0],
    [1, 1.17, 1],
    [Math.PI / 2, 0, 0],
  );
  const lateral = group(
    root,
    "lateral_" + suffix,
    [side * 0.94, -0.25, -0.06],
    [0, (side * Math.PI) / 2, 0],
  );
  stroke(
    lateral,
    "lateral_LED_" + suffix,
    [
      [0, -0.35, 0],
      [-0.12, -0.18, 0],
      [-0.16, 0.05, 0],
      [-0.08, 0.28, 0],
    ],
    0.025,
    eyes,
  );
}
const x = group(root, "brand_X", [0.63, -0.47, 0.52], [0, 0.15, -0.15]);
for (const sign of [-1, 1])
  mesh(
    x,
    "brand_X_" + sign,
    new CapsuleGeometry(0.035, 0.26, 6, 12),
    new MeshStandardMaterial({ color: "#149fe9", roughness: 0.5 }),
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, (sign * Math.PI) / 4],
  );
root.updateMatrixWorld(true);
const exporter = new GLTFExporter();
const result = await exporter.parseAsync(root, {
  binary: true,
  onlyVisible: true,
});
await mkdir("assets/able-003/source", { recursive: true });
await writeFile("assets/able-003/source/able-neutral.glb", Buffer.from(result));
const bounds = new Box3().setFromObject(root);
const meshes = [];
root.traverse((obj) => {
  if (obj.isMesh)
    meshes.push({
      name: obj.name,
      vertices: obj.geometry.attributes.position.count,
    });
});
await writeFile(
  "assets/able-003/reports/neutral-export.json",
  JSON.stringify(
    {
      source: "procedural copy; neutral bind pose; no active clips",
      coordinates: "Three.js Y-up, front +Z",
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      meshes,
      omitted: [
        "runtime fur lines",
        "canvas bump texture",
        "custom face halo shader",
        "scene lights/environment",
        "decorative sprites",
        "action props",
      ],
      notes: [
        "Digital face meshes included as static reference; hidden in animated GLB, procedural face attached at runtime.",
        "Base materials approximate source parameters; no material refinement in this stage.",
      ],
    },
    null,
    2,
  ),
);
console.log(`Neutral GLB: ${result.byteLength} bytes, ${meshes.length} meshes`);
