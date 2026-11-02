import {Machine,Target,EXAMPLES,createUniversal,encode,validateRules,readTape,output,phase,key} from './engine.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbol=c=>c==='B'?'□':c, dirs=m=>m.map(x=>x===-1?'L':x===1?'R':'S').join(' ');
let delta=[],mode='tm',u,target,rules=EXAMPLES.add.rules,data='110111',initial=1,history=[],trace=[],running=false,timer=null,busy=false,page=0,tableFilter='',last=null;
const MAX_STEPS=20000,MAX_HISTORY=2000;
let sourceProgram=null;
function message(s,error=false){$('#message').textContent=s;$('#message').classList.toggle('error',error);}
function stop(){running=false;clearTimeout(timer);$('#play').textContent='▶ 自动运行';}
function totalSteps(){return mode==='utm'?u.steps:target.steps;}
function halted(){return mode==='utm'?u.halted:!!target.halt;}
function load(){
  stop();try{
    const newRules=validateRules(JSON.parse($('#rules').value));
    const newData=$('#input').value, newInitial=Number($('#initial').value);
    if(encode(newRules).length>20000)throw Error('编码后的程序最多 20,000 格。');
    const next=createUniversal(delta,newRules,newData,newInitial);
    rules=newRules;data=newData;initial=newInitial;u=next;target=new Target(rules,data,initial);sourceProgram=[...u.tapes[0]];
    history=[];trace=[];last=null;
    render();message(mode==='utm'?'单步执行的是 U 的真实转移。「完成 M 的一步」会运行多个 U 微步。':'点击「单步」，观察第一条规则如何改变纸带。');return true;
  }catch(e){message(e.message,true);return false;}
}
function currentRule(){if(halted())return null;if(mode==='utm')return u.peek();const r=target.peek();return r?{state:'q'+r[0],read:[r[1]],next:'q'+r[2],write:[r[3]],move:[r[4]==='L'?-1:r[4]==='R'?1:0],halt:r[4]==='H'}:null;}
function activeTapes(){return mode==='utm'?u.tapes:[target.tape];}
function activeHeads(){return mode==='utm'?u.heads:[target.head];}
function saveHistory(){
  const us=u.snapshot();us.tapes[0]=null;
  history.push({u:us,target:target.snapshot(),traceLength:trace.length,last});
  if(history.length>MAX_HISTORY)history.shift();
}
function sameTape(a,b){return a.size===b.size&&[...a].every(([i,c])=>b.get(i)===c);}
function verify(){
  const q=[...u.tapes[2].values()].filter(c=>c==='1').length;
  if(!sameTape(u.tapes[1],target.tape)||u.heads[1]!==target.head||q!==target.q||(u.halted&&u.state!==target.halt))throw Error('宏步等价核验失败，执行已暂停。请导出轨迹。');
}
function advance(){
  if(halted())return false;
  if(totalSteps()>=MAX_STEPS){stop();throw Error('已达到本次运行 20,000 步上限；可导出轨迹并重置。');}
  saveHistory();const r=currentRule();const beforeHeads=[...activeHeads()];let macro=false;
  if(mode==='utm'){
    const event=u.step();
    if((/^DIR[01B]$/.test(event.before.state))||u.state==='HALT_NO_RULE') {target.step();verify();macro=true;}
    last={...r,heads:beforeHeads};
    trace.push({step:u.steps,state:event.before.state,read:r.read,write:r.write,move:dirs(r.move),next:r.next,headsBefore:beforeHeads,headsAfter:[...u.heads],targetSteps:target.steps,macro});
  }else{
    const oldQ=target.q;target.step();
    last=r?{...r,heads:beforeHeads}:null;
    trace.push({step:target.steps,state:'q'+oldQ,read:r?.read??[readTape(target.tape,target.head)],write:r?.write??[],move:r?(r.halt?'H':dirs(r.move)):'—',next:target.halt??'q'+target.q,headsBefore:beforeHeads,headsAfter:[target.head],targetSteps:target.steps,macro:true});macro=true;
  }
  return macro;
}
function safeAdvance(){try{advance();render();afterMessage();}catch(e){stop();message(e.message,true);render();}}
function afterMessage(){
  if(halted()){
    stop();const status=mode==='utm'?u.state:target.halt;
    message(status==='HALT_OK'?`运行结束。结果：${output(target.tape)||'（空纸带）'}。${mode==='utm'?'U 与独立 M 运行器的纸带、磁头、状态核验一致。':''}`:'无匹配规则，目标机器停机（HALT_NO_RULE）。');
  }else if(mode==='utm')message(`已执行 ${u.steps} 个 U 微步，完成 ${target.steps} 个 M 步。当前阶段：${phase(u.state)[0]}。`);
  else message(`已完成第 ${target.steps} 步。下一步将执行高亮规则。`);
}
function tick(){if(!running)return;safeAdvance();if(running)timer=setTimeout(tick,Number($('#speed').value));}
async function macroStep(){
  if(busy||halted())return;stop();busy=true;render();let completed=false;
  try{for(let chunk=0;chunk<40&&!completed&&!u.halted;chunk++){
    for(let i=0;i<250&&!completed&&!u.halted;i++)completed=advance();
    render();await new Promise(resolve=>setTimeout(resolve,0));
  }afterMessage();if(!completed&&!u.halted)message('已执行 10,000 个 U 微步，尚未完成此宏步；再次点击可继续。');}
  catch(e){message(e.message,true);}finally{busy=false;render();}
}
function renderTapes(){
 const tapes=activeTapes(),heads=activeHeads();const names=mode==='utm'?['P / 程序带','T / 模拟纸带','Q / 目标状态带']:['T / 工作纸带'];
 const half=window.innerWidth<650?4:window.innerWidth>1450?7:6;
 $('#tapes').innerHTML=tapes.map((t,i)=>{let cells='';for(let n=heads[i]-half;n<=heads[i]+half;n++){
   const c=readTape(t,n);const head=n===heads[i];const written=last&&last.heads[i]===n;
   cells+=`<div class="cell${head?' head':''}${c==='B'?' empty':''}${written?' written':''}" data-index="${n}" aria-label="格 ${n}：${esc(c)}${head?'，当前磁头':''}">${esc(symbol(c))}${head?'':`<span class="index">${n}</span>`}</div>`;
 }return `<div class="tape-block"><div class="tape-info"><b>${names[i]}</b><code>HEAD ${heads[i]} · ${i===0&&mode==='utm'?'READ ONLY':'READ / WRITE'}</code></div><div class="tape-viewport">${cells}</div></div>`;}).join('');
}
function renderInspector(){
 const r=currentRule();const st=mode==='utm'?u.state:'q'+target.q;
 const [name,description]=mode==='utm'?phase(u.state):[halted()?'停止':'读取 → 查表',halted()?'目标机器已停机。可后退查看最后一步，或更换程序重新开始。':'读取磁头下的符号，在转移表中查找「当前状态 + 读取符号」匹配的唯一规则。'];
 $('#phase-name').textContent=name;$('#phase-description').textContent=description;
 $('#equation').innerHTML=r?`δ(${esc(st)}, ${r.read.map(symbol).map(esc).join(' ')})<br><span class="next">→ (${esc(r.next)}, ${r.write.map(symbol).map(esc).join(' ')}, ${r.halt?'H':dirs(r.move)})</span>`:halted()?`<span class="next">${esc(mode==='utm'?u.state:target.halt)}</span>`:'δ 未定义 → 停机';
 const reads=activeHeads().map((h,i)=>readTape(activeTapes()[i],h)).map(symbol).join(' / ');
 $('#operations').innerHTML=`<div class="operation"><span>01</span><strong>读取当前格</strong><small>${esc(reads)}</small></div><div class="operation"><span>02</span><strong>查找转移规则</strong><small>${r?'匹配成功':'无后继规则'}</small></div><div class="operation"><span>03</span><strong>同时写入符号</strong><small>${r?r.write.map(symbol).map(esc).join(' / '):'—'}</small></div><div class="operation"><span>04</span><strong>移动磁头 / 更新状态</strong><small>${r?(r.halt?'HALT':dirs(r.move)):'—'}</small></div>`;
 $('#match-caption').textContent=mode==='utm'?'δU：下一条实际执行的转移':'δM：目标机器的状态转移表';
 $('#rules-head').innerHTML=mode==='utm'?'<tr><th>状态</th><th>读 / 写 / 移动</th></tr>':'<tr><th>状态</th><th>读</th><th>下一状态</th><th>写</th><th>移</th></tr>';
 if(mode==='utm'){
  const idx=r?delta.indexOf(r):-1;const nearby=idx<0?[]:delta.slice(Math.max(0,idx-1),idx+2);
  $('#target-rules').innerHTML=nearby.length?nearby.map(x=>`<tr class="${x===r?'matched':''}"><td>${esc(x.state)}<br>→ ${esc(x.next)}</td><td>${x.read.map(symbol).map(esc).join(' ')}<br>${x.write.map(symbol).map(esc).join(' ')}<br>${dirs(x.move)}</td></tr>`).join(''):'<tr><td colspan="2">停机状态没有后继转移。</td></tr>';
 }else $('#target-rules').innerHTML=rules.map(x=>`<tr class="${!target.halt&&x===target.peek()?'matched':''}"><td>q${x[0]}</td><td>${symbol(x[1])}</td><td>q${x[2]}</td><td>${symbol(x[3])}</td><td>${x[4]}</td></tr>`).join('');
 $('#last-rule').innerHTML=last?`<div class="last-transition">上一步实际执行<code>${esc(last.state)} / ${last.read.map(symbol).map(esc).join(' ')}<br>→ ${esc(last.next)} / ${last.write.map(symbol).map(esc).join(' ')} / ${last.halt?'H':dirs(last.move)}</code></div>`:'';
}
function render(){
 if(!u||!target)return;
 document.body.dataset.mode=mode;
 $('#state').textContent=mode==='utm'?u.state:'q'+target.q;$('#state').style.fontSize=mode==='utm'?'19px':'';
 $('#steps').textContent=String(totalSteps()).padStart(4,'0');$('#macro').textContent=target.steps;
 $('#state-label').textContent=mode==='utm'?'U 的有限控制状态':'目标状态';$('#steps-label').textContent=mode==='utm'?'U 执行微步数':'M 执行步数';
 $('#status').className='status'+(halted()?' halted':'');$('#status').innerHTML=`<i></i>${halted()?'已停机':totalSteps()?'执行中':'就绪'}`;
 $('#mode-caption').textContent=mode==='utm'?'固定的 U，逐条解释纸带上的程序':'直接执行目标机器的转移规则';
 $('#back').disabled=busy||!history.length;$('#step').disabled=busy||halted();$('#play').disabled=busy||halted();$('#macro-step').disabled=busy||halted();
 $('#load').disabled=busy;$('#reset').disabled=busy;$$('.mode').forEach(b=>b.disabled=busy);
 $('#input').disabled=busy;$('#example').disabled=busy;$('#initial').disabled=busy;$('#rules').disabled=busy;
 $('#output').textContent=output(mode==='utm'?u.tapes[1]:target.tape)||'（空）';
 renderTapes();renderInspector();
 $('#trace').innerHTML=trace.length?trace.slice(-40).reverse().map(t=>`<tr><td>${String(t.step).padStart(4,'0')}</td><td>${esc(t.state)}</td><td>${t.read.map(symbol).map(esc).join(' ')}</td><td>${t.write.map(symbol).map(esc).join(' ')}</td><td>${esc(t.move)}</td><td>${esc(t.next)}</td></tr>`).join(''):'<tr class="empty-trace"><td colspan="6">尚未执行 · 第一条转移将在这里留下记录</td></tr>';
 $('#try-title').textContent=mode==='utm'?'一台机器，三种算法。':'只改变一个符号。';
 $('#try-description').textContent=mode==='utm'?'更换为「逐位取反」，再观察 U 如何重新搜索规则。你会发现 δU 的每一条规则都没有改变。':'把输入改为 111011，然后载入。数一数：需要几步，两个数才变成一个数？';
}
function setTab(id){$$('.page').forEach(p=>p.hidden=p.id!==id);$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));if(id==='reference')renderDelta();}
function renderDelta(){const filtered=delta.map((r,i)=>({r,i})).filter(({r})=>Object.values(r).flat().join(' ').toLowerCase().includes(tableFilter));const count=Math.max(1,Math.ceil(filtered.length/50));page=Math.min(page,count-1);$('#table-count').textContent=`${filtered.length.toLocaleString()} / ${delta.length.toLocaleString()} 条规则 · 每页 50 条`;
 $('#delta-body').innerHTML=filtered.slice(page*50,(page+1)*50).map(({r,i})=>`<tr><td>${i+1}</td><td>${esc(r.state)}</td><td>${r.read.map(symbol).map(esc).join(' ')}</td><td>${esc(r.next)}</td><td>${r.write.map(symbol).map(esc).join(' ')}</td><td>${dirs(r.move)}</td></tr>`).join('')||'<tr><td colspan="6">没有匹配的规则</td></tr>';
 $('#page-count').textContent=`${page+1} / ${count}`;$('#prev-page').disabled=page===0;$('#next-page').disabled=page===count-1;
}
function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function traceBundle(){return {format:'turing-atlas-trace-v1',mode,convention:'B=blank; H=write then halt without moving',program:{rules,input:data,initial},deltaSize:delta.length,initialTapes:mode==='utm'?[sourceProgram,[...new Target(rules,data).tape],[[0,'^'],...Array.from({length:initial},(_,i)=>[i+1,'1'])]]:undefined,trace,final:mode==='utm'?u.snapshot():target.snapshot()};}
$('#example').addEventListener('change',()=>{stop();const ex=EXAMPLES[$('#example').value];if(ex){$('#input').value=ex.input;$('#rules').value=JSON.stringify(ex.rules,null,2);$('#initial').value=1;$('#program-description').textContent=ex.description;load();}else{$('#editor').open=true;$('#program-description').textContent='编辑五字段规则，点击「载入」执行。可下载或导入包含 rules、input、initial 的 JSON。';}});
$('#load').onclick=load;$('#reset').onclick=()=>{stop();$('#input').value=data;$('#rules').value=JSON.stringify(rules,null,2);$('#initial').value=initial;load();};
$('#step').onclick=()=>{stop();safeAdvance();};$('#macro-step').onclick=macroStep;
$('#back').onclick=()=>{stop();const h=history.pop();if(!h)return;h.u.tapes[0]=sourceProgram;u.restore(h.u);target.restore(h.target);trace.length=h.traceLength;last=h.last;render();message('已回退一步。可重放并检查磁头、纸带与规则。');};
$('#play').onclick=()=>{if(running)stop();else{running=true;$('#play').textContent='Ⅱ 暂停';tick();}};
$$('.mode').forEach(b=>b.onclick=()=>{if(mode===b.dataset.mode)return;const previous=mode;mode=b.dataset.mode;if(!load())mode=previous;$$('.mode').forEach(x=>{const active=x.dataset.mode===mode;x.classList.toggle('active',active);x.setAttribute('aria-selected',active);});render();});
$$('.nav-item').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#show-guide').onclick=()=>setTab('guide');
$('#guide-add').onclick=()=>{setTab('lab');$('#example').value='add';$('#example').dispatchEvent(new Event('change'));};
$('#guide-utm').onclick=()=>{setTab('lab');document.querySelector('[data-mode="utm"]').click();};
$('#search').oninput=e=>{tableFilter=e.target.value.toLowerCase();page=0;renderDelta();};$('#prev-page').onclick=()=>{page--;renderDelta();};$('#next-page').onclick=()=>{page++;renderDelta();};
$('#download-delta').onclick=()=>download('delta-u.json',JSON.stringify(delta,null,2));$('#export').onclick=()=>download('turing-trace.json',JSON.stringify(traceBundle(),null,2));
$('#export-csv').onclick=()=>{const csvCell=s=>'"'+String(s).replaceAll('"','""')+'"';const fields=['step','state','read','write','move','next','headsBefore','headsAfter','targetSteps','macro'];download('turing-trace.csv','\uFEFF'+[fields,...trace.map(t=>fields.map(f=>Array.isArray(t[f])?t[f].join(' '):t[f]))].map(row=>row.map(csvCell).join(',')).join('\n'),'text/csv;charset=utf-8');};
$('#download-program').onclick=()=>{try{const r=validateRules(JSON.parse($('#rules').value));download('machine.json',JSON.stringify({rules:r,input:$('#input').value,initial:Number($('#initial').value)},null,2));}catch(e){message(e.message,true);}};
$('#import').onclick=()=>$('#file-input').click();$('#file-input').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error('程序文件最多 100 KB。');const p=JSON.parse(await f.text());validateRules(p.rules);$('#rules').value=JSON.stringify(p.rules,null,2);$('#input').value=p.input??'';$('#initial').value=p.initial??1;$('#example').value='custom';$('#editor').open=true;$('#program-description').textContent='已导入自定义程序。';load();}catch(err){message(err.message,true);}e.target.value='';};
window.addEventListener('resize',()=>{if(target)renderTapes();});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON','SUMMARY'].includes(e.target.tagName)||!$('#guide').hidden||!$('#reference').hidden||busy)return;if(e.code==='ArrowRight'){e.preventDefault();$('#step').click();}if(e.code==='Space'){e.preventDefault();$('#play').click();}});
try{const response=await fetch('./delta.json');if(!response.ok)throw Error('转移表加载失败');delta=await response.json();$('#rules').value=JSON.stringify(rules,null,2);$('#program-description').textContent=EXAMPLES.add.description;load();}catch(e){message('无法加载固定转移表。请通过 HTTP 服务打开项目。'+e.message,true);}
