import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, LoopOnce, Vector3, PropertyBinding } from 'three';

async function load(path) {
  const b = await readFile(path);
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
const original = await load('public/models/able-003/able-rigged.glb');
const updated = await load('public/models/able-004/able-wave-v2.glb');
test('ABLE-004 backups match untouched source files', async () => {
  for (const [source,name] of [['assets/able-003/blender/able-rigged.blend','able-rigged.blend'],['public/models/able-003/able-rigged.glb','able-rigged.glb']]) {
    const hash = b => createHash('sha256').update(b).digest('hex');
    assert.equal(hash(await readFile(source)),hash(await readFile('assets/able-004/backup/'+name)));
  }
});
test('wave and jump tracks remain numerically identical in the new export', () => {
  for (const name of ['wave','jump']) {
    const before = original.animations.find(c=>c.name===name);
    const after = updated.animations.find(c=>c.name===name);
    assert.equal(after.duration,before.duration);
    assert.equal(after.tracks.length,before.tracks.length);
    for (const track of before.tracks) {
      const match=after.tracks.find(t=>t.name===track.name);
      assert.deepEqual(match.times,track.times);
      assert.deepEqual(match.values,track.values);
    }
  }
});
test('wave_v2 is five seconds, finite, returns neutral and keeps feet planted', async () => {
  const clip=updated.animations.find(c=>c.name==='wave_v2');
  assert.equal(clip.duration,5);
  assert.equal(clip.tracks.length,42);
  for (const track of clip.tracks) for (const v of track.values) assert.ok(Number.isFinite(v));
  let bones=0; updated.scene.traverse(o=>{if(o.isBone)bones++;});
  assert.equal(bones,14);
  const mixer=new AnimationMixer(updated.scene);
  const action=mixer.clipAction(clip).setLoop(LoopOnce,1); action.clampWhenFinished=true; action.play();
  const feet=['foot_R_shell_rig','foot_L_shell_rig'].map(n=>updated.scene.getObjectByName(n));
  const rest=feet.map(o=>o.getWorldPosition(new Vector3()));
  let maxFootDrift=0;
  const poses=[];
  for(let i=0;i<=300;i++) {
    mixer.setTime(i/60); updated.scene.updateMatrixWorld(true);
    for(const [j,o] of feet.entries()) {
      o.skeleton.update(); o.computeBoundingBox();
      const drift=o.getWorldPosition(new Vector3()).distanceTo(rest[j]);
      maxFootDrift=Math.max(maxFootDrift,drift);
      assert.ok(drift<1e-5);
      assert.ok(o.boundingBox.clone().applyMatrix4(o.matrixWorld).min.y>=.13);
    }
    if(i%30===0) poses.push({time:i/60,hand:updated.scene.getObjectByName('handR').getWorldPosition(new Vector3()).toArray()});
  }
  for(const track of clip.tracks) {
    const n=track.getValueSize();
    for(let j=0;j<n;j++) assert.ok(Math.abs(track.values[j]-track.values[track.values.length-n+j])<1e-5,track.name);
  }
  await writeFile('assets/able-004/validation-report.json',JSON.stringify({duration:clip.duration,bones,tracks:clip.tracks.length,samples:301,maxFootDrift,poses},null,2));
});
test('exported wave_v2 matches the saved Blender joint poses',async () => {
  const report=JSON.parse(await readFile('assets/able-004/blender-validation.json','utf8'));
  const mixer=new AnimationMixer(updated.scene);
  const action=mixer.clipAction(updated.animations.find(c=>c.name==='wave_v2')).setLoop(LoopOnce,1);
  action.clampWhenFinished=true;action.play();
  for(const sample of report.samples) {
    mixer.setTime(sample.time);updated.scene.updateMatrixWorld(true);
    for(const [name,position] of Object.entries(sample.joints)) {
      const node=updated.scene.getObjectByName(PropertyBinding.sanitizeNodeName(name));
      assert.ok(node.getWorldPosition(new Vector3()).distanceTo(new Vector3(...position))<1e-4,name+' at '+sample.time);
    }
  }
});
