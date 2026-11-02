"""Reproducible CLI: python3 python/cli.py --example add --input 110111."""
import argparse
import json
from pathlib import Path
from utm import D, ADD, INVERT, INCREMENT, machine, encode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--example', choices=['add', 'invert', 'increment'], default='add')
    parser.add_argument('--input', default=None)
    parser.add_argument('--program', type=Path, help='Custom JSON with rules, input, initial')
    parser.add_argument('--limit', type=int, default=100000)
    parser.add_argument('--trace', type=Path, help='Write complete microstep trace as JSON')
    parser.add_argument('--delta', type=Path, help='Write complete explicit delta_U as JSON')
    args = parser.parse_args()
    examples = {'add': (ADD, '110111'), 'invert': (INVERT, '10110'), 'increment': (INCREMENT, '1011')}
    rules, data = examples[args.example]
    initial = 1
    if args.program:
        program = json.loads(args.program.read_text())
        rules, data, initial = program['rules'], program.get('input', ''), program.get('initial', 1)
    if args.input is not None:
        data = args.input
    if args.limit < 1:
        parser.error('--limit must be positive')
    u = machine(rules, data, initial)
    trace = []
    while not u.state.startswith('HALT') and u.steps < args.limit:
        state, heads = u.state, list(u.heads)
        read = tuple(t.get(h, 'B') for t, h in zip(u.tapes, heads))
        nxt, write, move = D[(state, read)]
        u.step()
        if args.trace:
            trace.append(dict(step=u.steps, state=state, read=read, write=write,
                              move=move, next=nxt, headsBefore=heads, headsAfter=list(u.heads)))
    result = dict(status=u.state, steps=u.steps, output=u.output(), heads=u.heads)
    if args.trace:
        args.trace.write_text(json.dumps(dict(program=dict(rules=rules, input=data, initial=initial),
                                              trace=trace, result=result), indent=2))
    if args.delta:
        args.delta.write_text(json.dumps([dict(state=q, read=r, next=n, write=w, move=m)
                                         for (q, r), (n, w, m) in sorted(D.items())], indent=2))
    print(json.dumps(result))
    if not u.state.startswith('HALT'):
        parser.exit(2, 'Step limit reached; the machine is not known to halt.\n')


if __name__ == '__main__':
    main()
