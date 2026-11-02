import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createUniversal,Target,EXAMPLES,encode,output,Machine} from '../web/engine.js';
const rows=JSON.parse(fs.readFileSync(new URL('../web/delta.json',import.meta.url)));
function compare(rules,input,initial=1,limit=50000,maxMacros=30){
 const u=createUniversal(rows,rules,input,initial),m=new Target(rules,input,initial);let macros=0;
 while(!u.halted&&u.steps<limit&&macros<maxMacros){const before=u.state;u.step();
  if(/^DIR[01B]$/.test(before)||u.state==='HALT_NO_RULE'){
   m.step();macros++;assert.deepEqual([...u.tapes[1]].sort((a,b)=>a[0]-b[0]),[...m.tape].sort((a,b)=>a[0]-b[0]));assert.equal(u.heads[1],m.head);assert.equal([...u.tapes[2].values()].filter(c=>c==='1').length,m.q);if(u.halted)assert.equal(u.state,m.halt);
  }
 }
 assert.ok(u.steps<limit,'UTM exhausted microstep budget');return {u,m,macros};
}
test('complete finite table is deterministic and valid',()=>{
 assert.equal(rows.length,3656);assert.equal(new Set(rows.map(r=>r.state)).size,48);
 const keys=new Set();for(const r of rows){const k=JSON.stringify([r.state,r.read]);assert.ok(!keys.has(k));keys.add(k);for(const a of ['read','write','move'])assert.equal(r[a].length,3);assert.ok(r.move.every(x=>[-1,0,1].includes(x)));assert.ok(r.read.every(x=>'^|:10BLRH$'.includes(x)));}
});
test('checked-in JSON is exactly the Python-generated delta',()=>{
 const py=execFileSync('python3',['-c',"import sys,json;sys.path.insert(0,'python');from utm import D;print(json.dumps([dict(state=q,read=list(r),next=n,write=list(w),move=list(m)) for (q,r),(n,w,m) in sorted(D.items())]))"],{encoding:'utf8'});assert.deepEqual(rows,JSON.parse(py));
});
test('unary addition including zero operands',()=>{for(let a=0;a<7;a++)for(let b=0;b<7;b++){const {u}=compare(EXAMPLES.add.rules,'1'.repeat(a)+'0'+'1'.repeat(b));assert.equal(u.state,'HALT_OK');assert.equal(output(u.tapes[1]),'1'.repeat(a+b));}});
test('inversion and binary increment including leading tape extension',()=>{
 for(let n=0;n<32;n++){
  const input=n.toString(2);const inc=compare(EXAMPLES.increment.rules,input);assert.equal(output(inc.u.tapes[1]),(n+1).toString(2));assert.equal(inc.u.state,'HALT_OK');
  const inv=compare(EXAMPLES.invert.rules,input);assert.equal(output(inv.u.tapes[1]),[...input].map(c=>c==='1'?'0':'1').join(''));
 }
 assert.equal(compare(EXAMPLES.increment.rules,'').u.state,'HALT_OK');
});
test('program is read-only and U does not change between algorithms',()=>{const saved=JSON.stringify(rows);for(const ex of Object.values(EXAMPLES)){const {u}=compare(ex.rules,ex.input);assert.equal([...u.tapes[0]].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(''),encode(ex.rules).replaceAll('B',''));}assert.equal(JSON.stringify(rows),saved);});
test('arbitrary target states, empty program rules, and missing rule halt',()=>{
 const {u}=compare([[10,'0',20,'1','R'],[20,'B',20,'B','H']],'0',10);assert.equal(output(u.tapes[1]),'1');
 assert.equal(compare([[1,'1',1,'1','H']],'0').u.state,'HALT_NO_RULE');
 assert.throws(()=>createUniversal(rows,[],'0'));assert.throws(()=>createUniversal(rows,[[1,'0',1,'1','R'],[1,'0',2,'0','L']],'0'));assert.throws(()=>createUniversal(rows,EXAMPLES.add.rules,'x'));
});
test('snapshot/restore repeats identical transition, including negative indices',()=>{
 const u=createUniversal(rows,EXAMPLES.increment.rules,'111');for(let i=0;i<40;i++)u.step();const snap=u.snapshot();const a=u.step();u.restore(snap);assert.deepEqual(u.step(),a);
 const {u:done}=compare(EXAMPLES.increment.rules,'111');assert.ok(done.tapes[1].has(-1));
});
test('150 seeded arbitrary programs agree at every bounded macro boundary',()=>{
 let seed=142;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let i=0;i<150;i++){const n=1+rnd(5),rules=[];for(let q=1;q<=n;q++)for(const c of '01B')if(rnd(4))rules.push([q,c,1+rnd(n),'01B'[rnd(3)],'LRH'[rnd(3)]]);if(!rules.length)rules.push([1,'0',1,'0','H']);compare(rules,Array.from({length:rnd(7)},()=>'01'[rnd(2)]).join(''));}
});
test('undefined U transition fails visibly',()=>{const m=new Machine(rows,[new Map(),new Map(),new Map()],[0,0,0]);assert.throws(()=>m.step(),/未定义/);});
