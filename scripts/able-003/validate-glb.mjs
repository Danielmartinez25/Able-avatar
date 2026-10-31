import { readFile, writeFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  AnimationMixer,
  Box3,
  Vector3,
  LoopOnce,
  PropertyBinding,
} from "three";
const loader = new GLTFLoader();
async function load(path) {
  const bytes = await readFile(path);
  return loader.parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}
const neutral = await load("assets/able-003/source/able-neutral.glb");
const rig = await load("public/models/able-003/able-rigged.glb");
function bounds(scene) {
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.skeleton.update();
      o.computeBoundingBox();
    }
  });
  const b = new Box3().setFromObject(scene);
  return { min: b.min.toArray(), max: b.max.toArray() };
}
const neutralBounds = bounds(neutral.scene),
  rigBounds = bounds(rig.scene);
const report = {
  neutralBounds,
  rigBounds,
  clips: rig.animations.map((c) => ({
    name: c.name,
    duration: c.duration,
    tracks: c.tracks.length,
  })),
  samples: {},
  neutralError: 0,
};
const neutralMeshes = [];
neutral.scene.traverse((o) => {
  if (
    o.isMesh &&
    !o.name.startsWith("eye_stroke") &&
    !o.name.startsWith("mouth_stroke")
  )
    neutralMeshes.push(o);
});
const cellSize = 0.0002;
for (const source of neutralMeshes) {
  const target = rig.scene.getObjectByName(source.name + "_rig");
  if (!target) throw Error("Missing component " + source.name);
  const targetPositions = target.geometry.attributes.position;
  const cells = new Map();
  for (let i = 0; i < targetPositions.count; i++) {
    const q = new Vector3().fromBufferAttribute(targetPositions, i);
    if (target.isSkinnedMesh) target.applyBoneTransform(i, q);
    q.applyMatrix4(target.matrixWorld);
    const key = [q.x, q.y, q.z].map((v) => Math.floor(v / cellSize)).join(",");
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(q);
  }
  const positions = source.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const p = new Vector3()
      .fromBufferAttribute(positions, i)
      .applyMatrix4(source.matrixWorld);
    const cell = [p.x, p.y, p.z].map((v) => Math.floor(v / cellSize));
    let error = Infinity;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++)
          for (const q of cells.get(
            [cell[0] + x, cell[1] + y, cell[2] + z].join(","),
          ) ?? [])
            error = Math.min(error, p.distanceTo(q));
    if (!Number.isFinite(error))
      throw Error("No matching neutral vertex in " + source.name);
    report.neutralError = Math.max(report.neutralError, error);
  }
}
if (report.neutralError > 0.0001)
  throw Error("Neutral geometry changed: " + report.neutralError);
const mixer = new AnimationMixer(rig.scene);
for (const name of ["jump", "wave"]) {
  const clip = rig.animations.find((c) => c.name === name);
  if (!clip) throw Error("Missing clip " + name);
  const samples = [];
  for (const t of [0, 0.25, 0.53, 1, 1.5, 2, clip.duration]) {
    mixer.stopAllAction();
    const a = mixer.clipAction(clip);
    a.reset().setLoop(LoopOnce, 1).play();
    mixer.setTime(Math.min(t, clip.duration));
    samples.push({ time: t, bounds: bounds(rig.scene) });
  }
  report.samples[name] = samples;
}
const blendReport = JSON.parse(
  await readFile("assets/able-003/reports/blend-validation.json", "utf8"),
);
report.animationRoundtripMaxError = 0;
for (const [name, samples] of Object.entries(blendReport.samples)) {
  const clip = rig.animations.find((c) => c.name === name);
  for (const sample of samples) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(sample.time);
    rig.scene.updateMatrixWorld(true);
    for (const [bone, expected] of Object.entries(sample.joints_three_y_up)) {
      const actual = rig.scene.getObjectByName(
        PropertyBinding.sanitizeNodeName(bone),
      );
      if (!actual) throw Error("Missing bone " + bone);
      const error = actual
        .getWorldPosition(new Vector3())
        .distanceTo(new Vector3(...expected));
      report.animationRoundtripMaxError = Math.max(
        report.animationRoundtripMaxError,
        error,
      );
    }
  }
}
if (report.animationRoundtripMaxError > 0.0001)
  throw Error(
    "Animation changed during export: " + report.animationRoundtripMaxError,
  );
await writeFile(
  "assets/able-003/reports/glb-validation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
