# Contributing

Use Node.js 20+ and Python 3.10+. There are no package dependencies to install.

1. Change `python/utm.py` only when changing the fixed universal machine.
2. Run `npm run build` to regenerate `web/delta.json` and `dist/`.
3. Run `npm test`. Extend differential tests for semantic changes.
4. Serve `dist/` over HTTP and inspect both M and U modes, undo, custom programs,
   no-rule halting, and the complete transition table.
5. Commit `web/delta.json`; do not commit `dist/`.

Keep the generic U executor free of target-program interpretation. The independent
Target class is a reference and teaching aid; it must never drive U's execution.
Document any encoding or halt-convention changes in `docs/architecture.md`.

Open issues with the program JSON, input, mode, expected behavior, and an exported
trace. Screenshots alone cannot establish a semantic discrepancy.
