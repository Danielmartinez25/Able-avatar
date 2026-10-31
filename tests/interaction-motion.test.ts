import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getInteractionPose } from '../src/avatar/interactionMotion.ts';
import { visualStates } from '../src/experience/visualState.ts';

test('interaction states remain finite, bounded and continuous across a full minute', () => {
  for(const state of visualStates) {
    let previous=getInteractionPose(state,0,false);
    for(let i=1;i<=3600;i++) {
      const pose=getInteractionPose(state,i/60,false);
      for(const key of Object.keys(pose)) {
        assert.ok(Number.isFinite(pose[key]),state+' '+key);
        // Eyelids close much faster than body motion, including the short double blink.
        assert.ok(Math.abs(pose[key]-previous[key])<(key==='eyeHeight' ? .30 : .22),state+' discontinuity '+key+' '+i/60);
      }
      assert.ok(pose.scaleY>.93 && pose.scaleY<1.06);
      assert.ok(Math.abs(pose.height)<.05);
      previous=pose;
    }
  }
});
test('state selection preserves breathing and blinking phase', () => {
  const life=3.915;
  const idle=getInteractionPose('idle',12,false,life);
  assert.ok(idle.eyeHeight<.1);
  for(const state of visualStates) {
    const pose=getInteractionPose(state,0,false,life);
    assert.equal(pose.eyeHeight,idle.eyeHeight);
    assert.equal(pose.scaleY,idle.scaleY);
    assert.equal(pose.height,idle.height);
  }
});
test('greeting and farewell settle into the current idle without a restart', () => {
  for(const state of ['greeting','farewell'] as const) {
    assert.deepEqual(getInteractionPose(state,3.4,false,22),getInteractionPose('idle',0,false,22));
    assert.ok(getInteractionPose(state,1.4,false).rightArm < -2);
  }
  assert.notDeepEqual(getInteractionPose('greeting',2.1,false),getInteractionPose('farewell',2.1,false));
});
test('persistent states have quiet pauses and reduced motion remains static', () => {
  const talk=getInteractionPose('speaking',1,false);
  const pause=getInteractionPose('speaking',2.3,false);
  assert.ok(talk.mouthHeight>pause.mouthHeight);
  assert.equal(pause.mouthHeight,1);
  assert.ok(getInteractionPose('listening',2.1,false).pitch>getInteractionPose('listening',4,false).pitch+.04);
  for(const state of visualStates) {
    assert.deepEqual(getInteractionPose(state,0,true,0),getInteractionPose(state,50,true,70));
  }
});
