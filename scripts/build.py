"""Reproduce the static website and materialize every UTM transition."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python'))
from utm import A, D

rows = [dict(state=q, read=list(r), next=n, write=list(w), move=list(m))
        for (q, r), (n, w, m) in sorted(D.items())]
# The checked-in JSON is the runtime's entire UTM program, not target-specific code.
(ROOT / 'web' / 'delta.json').write_text('[\n' + ',\n'.join(json.dumps(row, ensure_ascii=False) for row in rows) + '\n]\n', encoding='utf-8')
(ROOT / 'dist').mkdir(exist_ok=True)
for child in (ROOT / 'dist').iterdir():
    if child.is_dir():
        shutil.rmtree(child)
    else:
        child.unlink()
shutil.copytree(ROOT / 'web', ROOT / 'dist', dirs_exist_ok=True)
print(f'Built dist: {len(rows)} explicit transitions; {len({r["state"] for r in rows})} nonhalting states; alphabet {A}')
