import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const url='http://127.0.0.1:3101';let server;let logs='';
before(async()=>{server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);for(let i=0;i<100;i++){try{if((await fetch(url+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Serveur indisponible : '+logs);});
after(async()=>{if(server){server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}});
const target={profile:'combine',age:9,level:'CM1',needs:['attention','langage']};
async function upload(file,bodyTarget=target){const body=new FormData();body.append('file',new Blob([await readFile(new URL('fixtures/'+file,import.meta.url))]),file);body.append('target',JSON.stringify(bodyTarget));return fetch(url+'/api/analyze',{method:'POST',body});}
test('le serveur expose l’interface et le moteur partagé',async()=>{assert.equal((await fetch(url)).status,200);const js=await fetch(url+'/engine.js');assert(js.headers.get('content-type').includes('javascript'));assert((await js.text()).includes('function adaptedHtml'));});
for(const ext of ['pdf','docx','doc','jpg'])test('import réel '+ext,{timeout:60000},async()=>{const response=await upload('support.'+ext);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data)+' '+logs);assert.match(data.result.text,/plante/i);assert.equal(data.result.checks.length,9);assert.equal(typeof data.result.score,'number');assert.equal(response.headers.get('cache-control'),'no-store');if(ext==='docx')assert.equal(data.result.checks.find(c=>c.id==='headings').status,'pass');});
test('le profil invalide et l’absence de fichier sont rejetés',async()=>{const response=await upload('support.pdf',{...target,age:1});assert.equal(response.status,400);const absent=await fetch(url+'/api/analyze',{method:'POST',body:new FormData()});assert.equal(absent.status,400);});
test('un document corrompu ne produit pas un score inventé',async()=>{const body=new FormData();body.append('file',new Blob(['ceci ne constitue pas un pdf']),'broken.pdf');body.append('target',JSON.stringify(target));const response=await fetch(url+'/api/analyze',{method:'POST',body});assert.equal(response.status,400);assert(!(await response.json()).result);});
