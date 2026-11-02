import unittest,random
from utm import D,ADD,IDENTITY_SCAN,machine,encode

class Tests(unittest.TestCase):
    def test_add(self):
        for a in range(1,6):
            for b in range(1,6):
                u=machine(ADD,'1'*a+'0'+'1'*b)
                self.assertEqual(u.run(),'HALT_OK')
                self.assertEqual(u.output(),'1'*(a+b))
    def test_identity_scan(self):
        for s in ('','0','1','10101','001010111'):
            u=machine(IDENTITY_SCAN,s)
            self.assertEqual(u.run(),'HALT_OK')
            self.assertEqual(u.output(),s)
    def test_unbounded_state_names(self):
        # U's finite delta never changes even when target uses states 10 and 20.
        rules=[(10,'0',20,'1','R'),(20,'B',20,'B','H')]
        u=machine(rules,'0',10)
        self.assertEqual(u.run(),'HALT_OK')
        self.assertEqual(u.output(),'1')
    def test_no_rule(self):
        u=machine([(1,'1',1,'1','H')],'0')
        self.assertEqual(u.run(),'HALT_NO_RULE')
    def test_finite_delta(self):
        self.assertTrue(len(D)>0)
        self.assertTrue(all(len(reads)==3 and len(value[1])==3 for (_,reads),value in D.items()))
    def test_random_finite_programs(self):
        rng=random.Random(3)
        for _ in range(80):
            n=rng.randrange(1,5)
            rules=[]
            for q in range(1,n+1):
                for c in '01B':
                    if rng.random()<0.7:
                        rules.append((q,c,rng.randrange(1,n+1),rng.choice('01B'),rng.choice('LRH')))
            if not rules:continue
            s=''.join(rng.choice('01') for _ in range(rng.randrange(0,6)))
            u=machine(rules,s)
            # Independent reference semantics, limited to 12 target steps.
            tape={i:v for i,v in enumerate(s) if v!='B'}
            q=1;h=0; halted=None
            lookup={(a,b):(c,d,e) for a,b,c,d,e in rules}
            for _ in range(12):
                v=tape.get(h,'B')
                if (q,v) not in lookup:halted='HALT_NO_RULE';break
                nq,w,dr=lookup[(q,v)]
                if w=='B':tape.pop(h,None)
                else:tape[h]=w
                q=nq
                if dr=='H':halted='HALT_OK';break
                h+=-1 if dr=='L' else 1
            if halted is None:continue
            self.assertEqual(u.run(100000),halted)
            self.assertEqual(u.tapes[1],tape)

if __name__=='__main__':unittest.main()
