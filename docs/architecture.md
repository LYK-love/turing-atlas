# Machine architecture and invariants

## Two machines, three representations

M is a deterministic single-tape target machine. Its rows contain five fields:
`q, a, p, b, d`. U is a deterministic three-tape machine with one finite control
state and three heads. The generic JavaScript and Python executors simulate U;
the executors themselves are ordinary host programs. The claim is that U's
behavior is specified by a fixed finite transition relation, rather than by
host-language code which interprets M's rule structure.

The table is intentionally inspectable rather than state-minimal. Wildcards in
`add` are finite generator shorthand, never runtime operations. Each pattern
expands over the fixed nine-symbol alphabet; duplicate keys are rejected.

## Encoding

A complete program has the form `^q:a:p:b:d|q:a:p:b:d|$`. Integers q and p are
nonempty strings of `1`; a and b are one of `0/1/B`; d is `L/R/H`. For example,
`1:0:11:1:R|` encodes `(q1,0)→(q2,1,R)`. Delimiters make fields self-delimiting.
B denotes an actual blank cell, including inside the program tape.

Initial configuration:

| Tape | Contents | Head |
| --- | --- | --- |
| P | Encoded program, beginning with `^` | 0 |
| T | Target input at coordinates 0, 1, … | 0 |
| Q | `^` followed by the initial state's unary ID | 0 |

All other cells are blank; tape coordinates range over all integers. P remains
unchanged. The state number lives on Q, so larger target state spaces do not
require additional states or rules in U.

## State families

The suffix `c∈{0,1,B}` remembers the target symbol sampled at the beginning of a
simulated step. This requires three variants of the relevant finite states.

| Family | Tape-level operation |
| --- | --- |
| START / SEARCHc / BEGINc | Sample T, enter candidate program rule |
| CMPc | Move P and Q right, compare unary state lengths |
| EQBACKc / CHECKc / SEPc | Rewind Q; compare the rule's read field with c |
| FAILBACKc / SKIPc | Rewind Q; skip to next rule or end marker |
| ERASEBEGINc / ERASEc / ERASEBACKc | Erase old unary target state and rewind Q |
| COPYc | Copy next state from P onto Q |
| WRITEc / DIRSEPc | Apply the write field to T |
| DIRc | Move T head left/right, or halt for H |
| RESET3 / RESET1 | Rewind Q and P for the next simulated step |
| HALT_OK / HALT_NO_RULE | No further transitions |

## Simulation invariant

At the beginning of each target step, T and its head equal M's tape and head;
Q contains `^1^q` for M's current q; Q's head is on `^`. P is unchanged. START
handles the first step. On subsequent steps RESET1 returns P to `^` and enters
SEARCHc after sampling T.

CMP compares exactly q ones with each rule's state field. A match then checks a.
Determinism guarantees at most one successful pair. At `$` without a match, U
halts with HALT_NO_RULE without altering the target configuration.

After a match, the old Q data is erased, the p field copied to Q, and b written
to T. DIR applies d. Immediately after DIR, T, its head and Q agree with one
M transition; the UI updates its independent reference and verifies equality.
For L/R, RESET3/RESET1 re-establish the head positions required for another
search. For H, U halts in HALT_OK after the prescribed write and without moving
the target head. During erase/copy, Q is temporary workspace; it must not be
interpreted as a committed target state.

By induction over target transitions, U simulates any valid encoded target until
explicit halt or missing-rule halt, or continues indefinitely. This is a
construction/invariant argument, not a machine-checked formal proof.

## Trust boundary

The independent Target class is only a pedagogical reference and checker.
Neither it nor parsed target rules supply U's next transition or modify U's
configuration. U is driven only by delta, local read/write and head movements.
Malformed encodings are rejected by the public encoder before execution;
undefined U transitions are execution errors rather than target halts.
