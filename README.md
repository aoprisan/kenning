# Kenning

Interactive learning modules — theory, a manipulable animation, a calculator,
and a quiz you can fail. First subject: low-voltage electrical installations,
in Romanian, aimed at the ANRE authorization syllabus.

The name is Old Norse. A *kenning* is the compressed handle you keep for a
large idea — *whale-road* for the sea.

## Run it

```bash
npm install
just dev            # http://localhost:8080
```

ES modules will not load over `file://`. You need the server.

## Verify it

```bash
just check          # tsc --noEmit, strict
just test           # maths sweep + full jsdom render
```

`tests/smoke.mjs` runs every animation frame across every control extreme and
fails on a `NaN` attribute. `tests/render.mjs` opens every module and every tab
in jsdom, answers a quiz to 100%, and checks the progress gauge moves.

## Deploy

`dist/` is committed and GitHub Pages serves the repo root.

```bash
just deploy         # build, test, commit, push
```

Repository settings → Pages → deploy from branch `main`, folder `/ (root)`.
The `.nojekyll` file stops Pages filtering anything.

## Structure

`src/modules/<id>/` holds one subject: curriculum, questions, animations,
calculators. Everything else is the shell. See `CLAUDE.md` for the contracts.

## Subjects

| id | status | language |
|---|---|---|
| `electro` | 17 modules, 10 animations, 8 calculators, 72 questions | Romanian |
| `dsys` | planned — distributed systems | English |
| `crypto` | planned — cryptography, break-it exercises | English |
| `os` | planned — operating systems | English |
| `arch` | planned — computer architecture | English |
