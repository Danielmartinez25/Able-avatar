import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readWidgetConfig } from '../src/integration/able/widgetConfig.ts';

const env={VITE_ABLE_CHAT_ID:'example-agent_public-id',VITE_ABLE_BASE_URL:'https://able-test.ithreexglobal.com'};
test('widget configuration keeps the agent on the selected official environment',()=>{
  assert.equal(readWidgetConfig({}),null);
  assert.equal(readWidgetConfig(env).baseUrl,'https://able-test.ithreexglobal.com');
  assert.equal(readWidgetConfig({...env,VITE_ABLE_BASE_URL:'https://able.ithreexglobal.com'}).baseUrl,'https://able.ithreexglobal.com');
  for(const url of ['http://able-test.ithreexglobal.com','https://example.org','https://able-test.ithreexglobal.com/chat/abc','https://user:password@able-test.ithreexglobal.com'])
    assert.throws(()=>readWidgetConfig({...env,VITE_ABLE_BASE_URL:url}));
  assert.throws(()=>readWidgetConfig({...env,VITE_ABLE_CHAT_ID:'<script>'}));
});
test('widget loads once under double mounting, uses test baseUrl, and reports script errors',async()=>{
  const originalDocument=globalThis.document,originalWindow=globalThis.window;
  try {
    const nodes=new Map(),scripts=[];
    const element=()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},remove(){this.removed=true;}});
    globalThis.document={createElement:element,head:{appendChild(script){scripts.push(script);}},getElementById(id){return nodes.get(id)??null;}};
    let calls=0;
    globalThis.window={AbleWidget:{init(config){
      calls++;
      assert.equal(config.baseUrl,env.VITE_ABLE_BASE_URL);
      nodes.set('able-widget-container',element());
      const frame=element();frame.setAttribute('src',config.baseUrl+'/widget/'+config.chatId+'?theme=dark');
      nodes.set('able-widget-iframe',frame);nodes.set('able-widget-button',element());
    }}};
    const {ensureAbleWidget}=await import('../src/integration/able/widgetLoader.ts');
    const config=readWidgetConfig(env);
    const first=ensureAbleWidget(config),second=ensureAbleWidget(config);
    assert.equal(first,second);assert.equal(scripts.length,1);
    assert.equal(scripts[0].src,'https://able-test.ithreexglobal.com/able-widget.js');
    scripts[0].onload();await first;assert.equal(calls,1);
    assert.equal(nodes.get('able-widget-iframe').getAttribute('title'),'Chat con el agente Able');
    await assert.rejects(ensureAbleWidget({...config,chatId:'another_agent'}));
    const fresh=await import('../src/integration/able/widgetLoader.ts?error-case');
    const failed=fresh.ensureAbleWidget(config);
    scripts[1].onerror();await assert.rejects(failed,/descargar/);
    assert.equal(scripts[1].removed,true);
  }finally {globalThis.document=originalDocument;globalThis.window=originalWindow;}
});
