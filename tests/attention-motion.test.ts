import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getPose, resolveExpression } from '../src/avatar/animationController.ts';
import { attentionEnvelope } from '../src/avatar/attentionMotion.ts';
import { attentionActions, actionDetails } from '../src/experience/performance.ts';

test('attention clips settle without accumulated rotation and effects disappear',()=>{
  for(const action of attentionActions) {
    const end=actionDetails[action].duration/1000;
    let previous=getPose('idle',0,false,action,0);
    for(let i=1;i<=Math.round(end*60);i++) {
      const p=getPose('idle',i/60,false,action,i/60);
      for(const key of Object.keys(p)) {
        assert.ok(Number.isFinite(p[key]));
        assert.ok(Math.abs(p[key]-previous[key])<(key==='eyeHeight' ? .3 : .15),`${action} ${key} ${i/60}`);
      }
      assert.ok(Math.abs(p.x)<.35 && p.height<.5 && p.scaleY>.85);
      previous=p;
    }
    const rest=getPose('idle',0,false,null,22),last=getPose('idle',end,false,action,22);
    for(const key of Object.keys(rest))assert.ok(Math.abs(rest[key]-last[key])<1e-9,`${action} final ${key}`);
    assert.equal(attentionEnvelope(action,0,false),0);
    assert.equal(attentionEnvelope(action,end,false),0);
    assert.equal(attentionEnvelope(action,2,true),0);
    assert.deepEqual(getPose('idle',0,true,action),getPose('idle',end,true,action));
  }
});
test('attention scenes have distinct staging and expressions',()=>{
  assert.ok(getPose('idle',.75,false,'peek').scaleY<.93);
  assert.ok(getPose('idle',1.25,false,'taDa').height>.35);
  assert.ok(Math.abs(getPose('idle',1.1,false,'dance').x)>.2);
  assert.equal(resolveExpression('idle','auto','dance',3.7),'wink');
  assert.equal(resolveExpression('idle','auto','peek',.7),'curious');
  assert.equal(resolveExpression('idle','auto','taDa',2),'excited');
});
