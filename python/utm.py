"""A fixed-table three-tape universal Turing machine.

D is the complete finite delta_U. The add() helper expands finite pattern
shorthand at import time; the executor U.step() uses ONLY exact dictionary
lookup, local writes and one-cell moves. Target rules live on tape 0.

Tape alphabet: ^ | : 1 0 B L R H $  (B is blank).
A target rule is q:a:p:b:d| with unary q,p. ^ begins the program; $ ends it.
H means write and halt without moving the target head.
"""
from itertools import product
from dataclasses import dataclass

A='^|:10BLRH$'
D={}
def add(s,pat,n,w=(None,None,None),m='SSS'):
    for r in product(*[(A if x is None else x) for x in pat]):
        k=(s,r)
        if k in D: raise ValueError(k)
        D[k]=(n,tuple(r[i] if w[i] is None else w[i] for i in range(3)),tuple({'L':-1,'S':0,'R':1}[x] for x in m))

for c in '01B':
    add('START',('^',c,'^'),'SEARCH'+c,m='RSS')
    add('SEARCH'+c,('1',None,'^'),'BEGIN'+c)
    add('SEARCH'+c,('|',None,'^'),'SEARCH'+c,m='RSS')
    add('SEARCH'+c,('$',None,'^'),'HALT_NO_RULE')
    add('BEGIN'+c,('1',None,'^'),'CMP'+c,m='SSR')
    add('CMP'+c,('1',None,'1'),'CMP'+c,m='RSR')
    add('CMP'+c,(':',None,'B'),'EQBACK'+c,m='SSL')
    add('CMP'+c,('1',None,'B'),'FAILBACK'+c,m='SSL')
    add('CMP'+c,(':',None,'1'),'FAILBACK'+c,m='SSL')
    add('EQBACK'+c,(None,None,'1'),'EQBACK'+c,m='SSL')
    add('EQBACK'+c,(None,None,'^'),'CHECK'+c,m='RSS')
    add('FAILBACK'+c,(None,None,'1'),'FAILBACK'+c,m='SSL')
    add('FAILBACK'+c,(None,None,'^'),'SKIP'+c)
    add('CHECK'+c,(c,None,'^'),'SEP'+c,m='RSS')
    for wrong in set('01B')-{c}:add('CHECK'+c,(wrong,None,'^'),'SKIP'+c)
    add('SEP'+c,(':',None,'^'),'ERASEBEGIN'+c,m='RSS')
    add('ERASEBEGIN'+c,('1',None,'^'),'ERASE'+c,m='SSR')
    add('ERASE'+c,(None,None,'1'),'ERASE'+c,w=(None,None,'B'),m='SSR')
    add('ERASE'+c,(None,None,'B'),'ERASEBACK'+c,m='SSL')
    add('ERASEBACK'+c,(None,None,'B'),'ERASEBACK'+c,m='SSL')
    add('ERASEBACK'+c,(None,None,'^'),'COPY'+c,m='SSR')
    add('COPY'+c,('1',None,'B'),'COPY'+c,w=(None,None,'1'),m='RSR')
    add('COPY'+c,(':',None,'B'),'WRITE'+c,m='RSS')
    for w in '01B':add('WRITE'+c,(w,None,'B'),'DIRSEP'+c,w=(None,w,None),m='RSS')
    add('DIRSEP'+c,(':',None,'B'),'DIR'+c,m='RSS')
    for dr in 'LR':add('DIR'+c,(dr,None,'B'),'RESET3',m='S'+dr+'L')
    add('DIR'+c,('H',None,'B'),'HALT_OK')
    add('SKIP'+c,('|',None,'^'),'SEARCH'+c,m='RSS')
    add('SKIP'+c,('$',None,'^'),'HALT_NO_RULE')
    for ch in A:
        if ch not in '|$':add('SKIP'+c,(ch,None,'^'),'SKIP'+c,m='RSS')
add('RESET3',(None,None,'1'),'RESET3',m='SSL')
add('RESET3',(None,None,'^'),'RESET1')
for ch in A:
    if ch!='^':add('RESET1',(ch,None,'^'),'RESET1',m='LSS')
for c in '01B':add('RESET1',('^',c,'^'),'SEARCH'+c,m='RSS')

@dataclass
class U:
    tapes:list
    heads:list
    state:str='START'
    steps:int=0
    def step(self):
        if self.state.startswith('HALT'):return False
        r=tuple(t.get(h,'B') for t,h in zip(self.tapes,self.heads))
        if (self.state,r) not in D:raise RuntimeError(f'undefined: {self.state} {r} {self.heads}')
        n,w,m=D[(self.state,r)]
        for i in range(3):
            if w[i]=='B':self.tapes[i].pop(self.heads[i],None)
            else:self.tapes[i][self.heads[i]]=w[i]
            self.heads[i]+=m[i]
        self.state=n;self.steps+=1
        return True
    def run(self,limit=1000000):
        while not self.state.startswith('HALT') and self.steps<limit:self.step()
        if not self.state.startswith('HALT'):raise TimeoutError(limit)
        return self.state
    def output(self):
        t=self.tapes[1]
        return ''.join(t.get(i,'B') for i in range(min(0,*t),max(0,*t)+1)).strip('B') if t else ''

def encode(rules):
    if not rules: raise ValueError('At least one rule is required')
    seen=set();s='^'
    for q,a,p,b,d in rules:
        if not (type(q) is int and type(p) is int and q>0 and p>0 and a in ('0','1','B') and b in ('0','1','B') and d in ('L','R','H') and (q,a) not in seen):
            raise ValueError('Invalid or nondeterministic target rule')
        seen.add((q,a));s+='1'*q+':'+a+':'+'1'*p+':'+b+':'+d+'|'
    return s+'$'

def machine(rules,data,initial=1):
    s=encode(rules)
    if not set(data)<=set('01B') or type(initial) is not int or initial<1:
        raise ValueError('Invalid input or initial state')
    return U([{i:c for i,c in enumerate(s) if c!='B'},
              {i:c for i,c in enumerate(data) if c!='B'},
              {0:'^',**{i:'1' for i in range(1,initial+1)}}],[0,0,0])

ADD=[(1,'1',1,'1','R'),(1,'0',2,'1','R'),(2,'1',2,'1','R'),(2,'B',3,'B','L'),(3,'1',3,'B','H')]
IDENTITY_SCAN=[(1,'0',1,'0','R'),(1,'1',1,'1','R'),(1,'B',1,'B','H')]
INVERT=[(1,'0',1,'1','R'),(1,'1',1,'0','R'),(1,'B',1,'B','H')]
INCREMENT=[(1,'0',1,'0','R'),(1,'1',1,'1','R'),(1,'B',2,'B','L'),(2,'1',2,'0','L'),(2,'0',2,'1','H'),(2,'B',2,'1','H')]

if __name__=='__main__':
    for name,rules,data in [('addition',ADD,'110111'),('identity scan',IDENTITY_SCAN,'10101')]:
        u=machine(rules,data)
        print(name,'program:',encode(rules))
        print(name,'status:',u.run(),'steps:',u.steps,'output:',u.output())
