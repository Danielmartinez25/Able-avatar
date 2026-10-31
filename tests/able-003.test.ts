import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AnimationMixer, LoopOnce } from "three";

const bytes = await readFile("public/models/able-003/able-rigged.glb");
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
test("ABLE-003 archived procedural source stays intact; only approved interaction modules evolve", async () => {
  const manifest = JSON.parse(
    await readFile("assets/able-003/reports/procedural-before.json", "utf8"),
  );
  for (const item of manifest) {
    const name = item.Path.split(/[\\/]/).pop();
    const data = await readFile("src/avatar/" + name);
    // The later, explicitly approved procedural motion study edits these two modules.
    // The ABLE-003 snapshot remains the original source of truth, never rebaselined.
    if (!["animationController.ts", "ProvisionalAvatar.tsx"].includes(name)) {
      assert.equal(createHash("sha256").update(data).digest("hex").toUpperCase(), item.Hash, name);
    }
    const copy = await readFile(
      "assets/able-003/source/procedural-snapshot/" + name,
    );
    assert.equal(
      createHash("sha256").update(copy).digest("hex").toUpperCase(),
      item.Hash,
      "snapshot " + name,
    );
  }
});
test("independent GLB includes two named clips, a custom 14-bone skeleton and a face mount", () => {
  assert.deepEqual(gltf.animations.map((clip) => clip.name).sort(), [
    "jump",
    "wave",
  ]);
  assert.ok(gltf.scene.getObjectByName("face_socket"));
  const bones = [];
  gltf.scene.traverse((obj) => {
    if (obj.isBone) bones.push(obj.name);
    assert.ok(
      !obj.name.startsWith("eye_stroke") &&
        !obj.name.startsWith("mouth_stroke"),
      "static face must not duplicate procedural face",
    );
  });
  assert.equal(bones.length, 14);
  assert.ok(bones.every((name) => !/pelvis|neck|knee/i.test(name)));
  assert.equal(
    gltf.animations.find((clip) => clip.name === "jump").duration,
    3,
  );
  assert.ok(
    Math.abs(
      gltf.animations.find((clip) => clip.name === "wave").duration - 3.6,
    ) < 0.00001,
  );
});
test("all mesh skin weights are normalized and reference valid bones", () => {
  gltf.scene.traverse((obj) => {
    if (!obj.isSkinnedMesh) return;
    const weights = obj.geometry.attributes.skinWeight,
      indices = obj.geometry.attributes.skinIndex;
    for (let i = 0; i < weights.count; i++) {
      let total = 0;
      for (let j = 0; j < 4; j++) {
        const w = weights.array[i * 4 + j];
        total += w;
        if (w > 0)
          assert.ok(indices.array[i * 4 + j] < obj.skeleton.bones.length);
      }
      assert.ok(Math.abs(total - 1) < 0.0001);
    }
  });
});
test("external jump has real lift, returns to rest, and wave keeps feet planted", () => {
  const mixer = new AnimationMixer(gltf.scene);
  const foot = gltf.scene.getObjectByName("foot_R_shell_rig");
  assert.ok(foot?.isSkinnedMesh);
  const minimum = (clip, time) => {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(time);
    gltf.scene.updateMatrixWorld(true);
    foot.skeleton.update();
    foot.computeBoundingBox();
    return foot.boundingBox.clone().applyMatrix4(foot.matrixWorld).min.y;
  };
  const jump = gltf.animations.find((c) => c.name === "jump"),
    wave = gltf.animations.find((c) => c.name === "wave");
  const rest = minimum(jump, 0);
  assert.ok(minimum(jump, 1) > rest + 0.6);
  assert.ok(Math.abs(minimum(jump, 3) - rest) < 0.0001);
  for (let time = 0; time <= wave.duration; time += 1 / 30)
    assert.ok(Math.abs(minimum(wave, time) - rest) < 0.0001);
  for (let time = 0; time <= jump.duration; time += 1 / 60)
    assert.ok(
      minimum(jump, time) > 0.139,
      "foot must not penetrate scene floor",
    );
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);
});
