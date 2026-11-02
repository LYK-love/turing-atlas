# Verification

Run `npm run check` from the repository root. No dependency installation is needed.

The suite contains Python tests for the original fixed-table machine and Node.js
tests for the web runtime. It checks:

- exactly 3,656 unique transition keys and 48 nonhalting U control states;
- exact equality of the checked-in JavaScript table and Python's generated table;
- unary addition for every pair of operands 0–6;
- binary increment and bit inversion over 32 inputs, including a carry into cell -1;
- missing target rules, non-unit initial states, invalid/nondeterministic programs;
- program tape immutability across different algorithms;
- snapshot/restore and deterministic replay;
- 150 reproducibly generated arbitrary targets, comparing tape contents, head,
  state and halt outcome at every examined macro boundary, up to 30 per target;
- visibly failing undefined U transitions.

These finite tests complement the invariant argument in `architecture.md`.
They do not exhaust all possible programs and are not a formal universality proof.
The macro comparator does not affect U execution.

Manual browser acceptance checks cover M step/undo, U step/macro-step, playback,
algorithm changes, input validation, the searchable complete table and guide.
JSON/CSV trace exports describe actual executed transitions with head positions,
allowing independent reconstruction from the included initial program/input.
