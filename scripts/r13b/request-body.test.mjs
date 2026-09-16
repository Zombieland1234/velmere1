import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readRequestObject } from '../../supabase/functions/r13-entitlement-boundary-preview/request-body.ts';
const req=(body,extra={})=>new Request('https://unit.invalid',{method:'POST',body,...extra,...(body instanceof ReadableStream?{duplex:'half'}:{})});
for(const [name,body,status,error]of [
 ['empty','',400,'invalid_json'],['malformed','{',400,'invalid_json'],['null','null',400,'request_invalid'],['array','[]',400,'request_invalid'],['string','"x"',400,'request_invalid'],['boolean','true',400,'request_invalid'],
 ['number','42',400,'request_invalid'],['invalid_utf8',new Uint8Array([0xff]),400,'invalid_json'],['oversize','x'.repeat(4097),413,'payload_too_large'],['multibyte','界'.repeat(1366),413,'payload_too_large']
])test(`parser rejects ${name}`,async()=>assert.deepEqual(await readRequestObject(req(body)),{ok:false,status,error}));
test('parser accepts an exact 4096-byte object',async()=>{const body=JSON.stringify({x:'x'.repeat(4088)});assert.equal(Buffer.byteLength(body),4096);assert.equal((await readRequestObject(req(body))).ok,true);});
test('parser bounds bytes despite false Content-Length',async()=>assert.equal((await readRequestObject(req('x'.repeat(4097),{headers:{'content-length':'1'}}))).status,413));
test('parser bounds chunked data',async()=>{const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(3000));c.enqueue(new Uint8Array(1097));c.close();}});assert.equal((await readRequestObject(req(stream))).status,413);});
test('parser timeout does not wait for never-resolving cancel',async()=>{const stream=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){return new Promise(()=>{});}});const start=performance.now();assert.deepEqual(await readRequestObject(req(stream),25),{ok:false,status:408,error:'request_timeout'});assert.ok(performance.now()-start<1000);});
test('parser handles abort while read is pending',async()=>{const controller=new AbortController();const stream=new ReadableStream({pull(){return new Promise(()=>{});}});const promise=readRequestObject(req(stream,{signal:controller.signal}),100);controller.abort();assert.deepEqual(await promise,{ok:false,status:400,error:'request_aborted'});});
test('parser handles already-aborted request',async()=>{const controller=new AbortController();controller.abort();assert.deepEqual(await readRequestObject(req('{}',{signal:controller.signal})),{ok:false,status:400,error:'request_aborted'});});
test('parser handles locked stream without rejection',async()=>{const request=req('{}');const reader=request.body.getReader();try{assert.equal((await readRequestObject(request)).status,400);}finally{reader.releaseLock();}});
test('parser accepts split UTF-8 across chunks',async()=>{const data=new TextEncoder().encode('{"x":"ż"}');const stream=new ReadableStream({start(c){for(const x of data)c.enqueue(new Uint8Array([x]));c.close();}});assert.deepEqual(await readRequestObject(req(stream)),{ok:true,body:{x:'ż'}});});
test('parser rejects internal timeout outside supported range',async()=>{await assert.rejects(()=>readRequestObject(req('{}'),0),RangeError);});
