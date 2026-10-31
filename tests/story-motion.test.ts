import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getPose, resolveExpression } from '../src/avatar/animationController.ts';
import { documentReveal } from '../src/avatar/storyMotion.ts';
import { actionDetails } from '../src/experience/performance.ts';

const actions=['nap','napCozy','fetchDocuments','fetchFolder'] as const;
test('story scenes settle completely and remain continuous with bounded depth',()=>{
  for(const action of actions) {
    const duration=actionDetails[action].duration/1000;
    let previous=getPose('idle',0,false,action,0);
    for(let t=1/60;t<=duration;t+=1/60) {
      const pose=getPose('idle',t,false,action,t);
      for(const key of Object.keys(pose)) {
        if(key==='eyeHeight') continue; // Intentional eyelid changes use their own faster smoothing.
        assert.ok(Math.abs(pose[key]-previous[key])<.16,`${action} ${key} ${t}`);
      }
      assert.ok(pose.depth>=-2.91 && pose.depth<=0);
      assert.ok(Math.abs(pose.x)<1);
      previous=pose;
    }
    const end=getPose('idle',duration,false,action,20),idle=getPose('idle',0,false,null,20);
    for(const key of Object.keys(end)) assert.ok(Math.abs(end[key]-idle[key])<1e-9,action+' '+key);
    assert.deepEqual(getPose('idle',0,true,action),getPose('idle',duration,true,action));
  }
});
test('sleep has drowsiness, sleeping Z expression, and waking before completion',()=>{
  for(const action of ['nap','napCozy'] as const) {
    assert.equal(resolveExpression('idle','auto',action,0),'happy');
    assert.equal(resolveExpression('idle','auto',action,3),'sleeping');
    assert.equal(resolveExpression('idle','auto',action,7),'happy');
    assert.ok(getPose('idle',3,false,action).scaleY<.87);
  }
  assert.ok(getPose('idle',3,false,'napCozy').tilt < getPose('idle',3,false,'nap').tilt-.2);
});
test('fetch departs empty, picks up documents far away, and comes home carrying them',()=>{
  assert.equal(documentReveal(2,false),0);
  assert.equal(documentReveal(4,false),1);
  assert.equal(documentReveal(7,false),1);
  assert.equal(documentReveal(8.5,false),0);
  assert.equal(documentReveal(0,true),1);
  const away=getPose('idle',3,false,'fetchDocuments');
  const returning=getPose('idle',5.5,false,'fetchDocuments');
  assert.ok(away.depth < -2.8 && away.x>.9);
  assert.ok(returning.depth>away.depth && returning.depth<0);
  assert.ok(returning.rightArmForward<-.6);
  assert.ok(getPose('idle',3,false,'fetchFolder').x<-.9);
});
