import {MORE_EXAMPLES} from './algorithms.js';

/** Generic deterministic multitape TM executor. No target-program decoding occurs here. */
export const BLANK = 'B';
export const ALPHABET = '^|:10BLRH$';
export const key = (q, read) => JSON.stringify([q, read]);
export function validateRules(rules) {
  if (!Array.isArray(rules) || !rules.length || rules.length > 1000) throw Error('规则数量须为 1–1000。');
  const seen = new Set();
  for (const row of rules) {
    if (!Array.isArray(row) || row.length !== 5) throw Error('每行须为 [状态, 读取, 下一状态, 写入, 方向]。');
    const [q,a,p,b,d] = row;
    if (![q,p].every(x=>Number.isInteger(x)&&x>0&&x<=1000) || !['0','1','B'].includes(a) || !['0','1','B'].includes(b) || !['L','R','H'].includes(d)) throw Error('状态须为 1–1000 的整数；符号限 0/1/B；方向限 L/R/H。');
    const k = `${q}:${a}`;
    if(seen.has(k)) throw Error(`非确定性规则：q${q} 读取 ${a} 重复。`);
    seen.add(k);
  }
  return rules;
}
export function encode(rules) {
  validateRules(rules);
  return '^'+rules.map(([q,a,p,b,d])=>'1'.repeat(q)+':'+a+':'+'1'.repeat(p)+':'+b+':'+d+'|').join('')+'$';
}
export function tapeFrom(s) { return new Map([...s].flatMap((c,i)=>c==='B'?[]:[[i,c]])); }
export function readTape(t,h) {return t.get(h) ?? BLANK;}
export function output(t) {
  if (!t.size) return '';
  const min=Math.min(...t.keys()), max=Math.max(...t.keys());
  let s=''; for(let i=min;i<=max;i++)s+=readTape(t,i);
  return s;
}
export class Machine {
  constructor(rows, tapes, heads, state='START') {
    this.rows=rows; this.delta=new Map();
    for(const r of rows) {
      const k=key(r.state,r.read);
      if(this.delta.has(k)) throw Error('Duplicate delta entry');
      this.delta.set(k,r);
    }
    this.tapes=tapes;this.heads=heads;this.state=state;this.steps=0;
  }
  get halted(){return this.state.startsWith('HALT');}
  peek(){return this.delta.get(key(this.state,this.heads.map((h,i)=>readTape(this.tapes[i],h))));}
  snapshot(){return {state:this.state,steps:this.steps,heads:[...this.heads],tapes:this.tapes.map(t=>[...t])};}
  restore(s){this.state=s.state;this.steps=s.steps;this.heads=[...s.heads];this.tapes=s.tapes.map(t=>new Map(t));}
  step(){
    if(this.halted)return null;
    const r=this.peek();if(!r)throw Error(`未定义的 U 转移：${this.state}`);
    const before=this.snapshot();
    this.tapes.forEach((t,i)=>{if(r.write[i]===BLANK)t.delete(this.heads[i]);else t.set(this.heads[i],r.write[i]);});
    this.heads=this.heads.map((h,i)=>h+r.move[i]);this.state=r.next;this.steps++;
    return {before,rule:r,after:this.snapshot()};
  }
}
export function createUniversal(rows,rules,data,initial=1){
  if(!/^[01B]*$/.test(data)||data.length>256)throw Error('输入限 256 个 0/1/B。B 表示空白。');
  if(!Number.isInteger(initial)||initial<1||initial>1000)throw Error('初始状态须为 1–1000。');
  return new Machine(rows,[tapeFrom(encode(rules)),tapeFrom(data),tapeFrom('^'+'1'.repeat(initial))],[0,0,0]);
}
/** Independent direct semantics; used to explain M and check macro-step equivalence. */
export class Target {
  constructor(rules,data,initial=1){validateRules(rules);this.rules=rules;this.tape=tapeFrom(data);this.head=0;this.q=initial;this.steps=0;this.halt=null;}
  peek(){return this.rules.find(r=>r[0]===this.q&&r[1]===readTape(this.tape,this.head));}
  step(){
    if(this.halt)return null;
    const r=this.peek();if(!r){this.halt='HALT_NO_RULE';return null;}
    const [,,p,b,d]=r;if(b==='B')this.tape.delete(this.head);else this.tape.set(this.head,b);
    this.q=p;if(d==='H')this.halt='HALT_OK';else this.head+=d==='L'?-1:1;
    this.steps++;return r;
  }
  snapshot(){return {q:this.q,head:this.head,steps:this.steps,halt:this.halt,tape:[...this.tape]};}
  restore(s){Object.assign(this,{q:s.q,head:s.head,steps:s.steps,halt:s.halt,tape:new Map(s.tape)});}
}
export const EXAMPLES={
  ...MORE_EXAMPLES,
  add:{name:'一元加法',en:'Unary addition',input:'110111',rules:[[1,'1',1,'1','R'],[1,'0',2,'1','R'],[2,'1',2,'1','R'],[2,'B',3,'B','L'],[3,'1',3,'B','H']],description:'用 0 分隔两个一元数：11 0 111 表示 2 + 3，结果为 11111。先把分隔符改成 1，再擦除最右侧一个 1。'},
  invert:{name:'逐位取反',en:'Bitwise inversion',input:'10110',rules:[[1,'0',1,'1','R'],[1,'1',1,'0','R'],[1,'B',1,'B','H']],description:'从左到右，把 0 写成 1、把 1 写成 0，遇到空白后停机。10110 → 01001。'},
  increment:{name:'二进制加一',en:'Binary increment',input:'1011',rules:[[1,'0',1,'0','R'],[1,'1',1,'1','R'],[1,'B',2,'B','L'],[2,'1',2,'0','L'],[2,'0',2,'1','H'],[2,'B',2,'1','H']],description:'先找到末尾，再向左处理进位。1011（11）变成 1100（12）；111 则变成 1000，展示向负下标扩展纸带。'}
};
export function phase(q){
  if(q.startsWith('HALT'))return ['停止','U 已停机。HALT_OK 表示目标规则选择了 H；HALT_NO_RULE 表示目标机器没有匹配规则。'];
  if(q==='START')return ['读取输入','读取目标磁头下的符号，并把它记在 U 的有限控制状态中。'];
  if(q.startsWith('SEARCH')||q.startsWith('BEGIN'))return ['查找规则','程序磁头扫描规则起点。U 的状态后缀 0/1/B 记住目标磁头读到的符号。'];
  if(q.startsWith('CMP'))return ['比较状态','程序带与状态带同步右移，逐个比较一元状态编号是否等长。'];
  if(q.startsWith('EQBACK')||q.startsWith('CHECK')||q.startsWith('SEP'))return ['核对符号','状态编号匹配后，检查规则的读取符号是否等于目标磁头下的符号。'];
  if(q.startsWith('FAILBACK')||q.startsWith('SKIP'))return ['跳过规则','这一条规则不匹配。状态磁头先回到起点，程序磁头再寻找下一条规则。'];
  if(q.startsWith('ERASE'))return ['更新状态 · 擦除','匹配成功。擦除旧的一元状态编号，为下一状态腾出空间。'];
  if(q.startsWith('COPY'))return ['更新状态 · 复制','把程序带上的下一状态编号逐个复制到状态带。'];
  if(q.startsWith('WRITE')||q.startsWith('DIRSEP'))return ['写入符号','读取规则的写入字段，并修改模拟带当前格。此时目标的一步还没有完成。'];
  if(q.startsWith('DIR'))return ['移动目标磁头','按规则的 L/R 移动模拟带磁头，或按 H 停机。'];
  return ['复位磁头','状态带磁头回到 ^，程序带磁头返回开头。随后开始模拟目标机器的下一步。'];
}
