# Turing Atlas · 图灵机实验室

An inspectable computation laboratory: watch a Turing machine execute, then watch
one fixed three-tape universal Turing machine interpret the same program.

**真正的固定转移表 UTM。每个微步、读写、磁头移动和规则匹配均可检查。**

## Run locally

Requires Node.js 20+ and Python 3.10+. No npm or Python packages are required.

```sh
npm run check
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Open through HTTP, not `file://`, because the browser
loads the explicit transition table as JSON. Optional Google Fonts improve the
typography; system-font fallbacks work without network access.

## Explore

- **M mode:** inspect the target's rules, step forward/back, and watch the tape.
- **U mode:** inspect the actual δU transition, three tapes and three heads.
- **Macro step:** run U until it completes one target transition. A separate
  interpreter checks target state, tape, head and halt outcome at each boundary.
- **Three programs:** unary addition, bitwise inversion, binary increment.
- Edit/import/export a custom deterministic target machine as JSON.
- Search/paginate all 3,656 U transitions; download the complete table.
- Export the entire session as JSON or CSV, including pre/post head coordinates.
- Read the built-in introduction to TM, program encoding and universal simulation.
- Keyboard: Right Arrow = step; Space = run/pause outside form controls.

Switching modes or loading a program starts a new execution. Inputs run locally
and are not uploaded. Runs are in memory; export before closing the tab.

## A target program

```json
{
  "initial": 1,
  "input": "110111",
  "rules": [
    [1,"1",1,"1","R"],
    [1,"0",2,"1","R"],
    [2,"1",2,"1","R"],
    [2,"B",3,"B","L"],
    [3,"1",3,"B","H"]
  ]
}
```

Each row is `[state, read, next_state, write, direction]`. Positive integer state
IDs are encoded in unary; `B` is blank, `L/R` move one cell, and `H` writes then
halts without moving. A missing rule halts with `HALT_NO_RULE`. This halt is
 distinct from explicit `HALT_OK`; neither asserts a language-recognition result.

The addition example produces `11111` in 608 U microsteps (8 target transitions).
No target-specific shortcut is used by U.

## Python CLI

```sh
python3 python/cli.py --example add --input 110111
python3 python/cli.py --example increment --input 111 --trace trace.json
python3 python/cli.py --program machine.json --delta delta-u.json
python3 -m unittest discover -s python -v
```

CLI step-limit exhaustion exits with status 2; it does not claim the target loops.

## What is actually universal?

`python/utm.py` defines a finite, deterministic three-tape machine: 48 nonhalting
states, two halt states, a nine-symbol tape alphabet and 3,656 explicit rules.
The generator expands finite pattern shorthand into `web/delta.json`. The web
runtime executes that table by exact lookup and local tape operations only.

U interprets arbitrary finite deterministic single-tape machines over `{0,1,B}`
with any finite number of positive-integer states. Such machines form a universal
model: other finite alphabets can be block encoded; stay-put transitions can be
expanded into two moves. The browser is a bounded simulator of this unbounded
mathematical machine, not an actually infinite physical computer.

See [architecture and invariants](docs/architecture.md),
[verification](docs/verification.md) and [contributing](CONTRIBUTING.md).

## Project map

| Path | Purpose |
| --- | --- |
| `python/utm.py` | Finite transition generator and minimal Python executor |
| `python/cli.py` | Run custom programs; export full trace and table |
| `web/delta.json` | Complete, expanded, checked-in δU |
| `web/engine.js` | Generic multitape executor + independent target semantics |
| `web/app.js` | Playback, undo, inspector, differential checks, exports |
| `web/index.html`, `web/style.css` | Responsive teaching interface |
| `tests/engine.test.js` | Table identity and macro-step differential tests |
| `scripts/build.py` | Reproducible dependency-free static build |
| `.github/workflows/` | CI and GitHub Pages deployment |

## Publish with GitHub Pages

Push this repository to GitHub. In Settings → Pages, choose **GitHub Actions** as
the source. The included Pages workflow builds/tests and publishes `dist/` on
pushes to `main` or a manual workflow dispatch. All asset paths are relative, so
repository subpaths work. No API keys or runtime server are needed.

Sites hosting metadata in `.openai/hosting.json` is specific to the accompanying
preview deployment and is not used by GitHub Pages.

## Practical limits

The web editor permits up to 1,000 rules, state IDs 1–1,000, 256 input cells and
20,000 encoded program cells. Each session stops after 20,000 U or M steps. Undo
retains the latest 2,000 steps; exports retain the full session. One macro-step
button press runs at most 10,000 microsteps and can be continued. These bounds
prevent accidental runaway work; reaching one is not a proof of nontermination.
The Python CLI has a configurable step limit and no browser-specific input bounds.

## License

MIT · Copyright 2026 Yukuan Lu.
