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

GitHub Pages is published by Actions. Every push to `main` runs
`.github/workflows/pages.yml`, which typechecks, builds, runs both test
suites, then uploads `index.html`, `styles.css`, `.nojekyll` and a freshly
compiled `dist/` as the Pages artifact and deploys it.

```bash
just deploy         # build, test, commit, push — the push triggers the deploy
```

Repository settings → Pages → Source: **GitHub Actions**. The `.nojekyll` file
stops Pages filtering anything. `dist/` stays committed so the repo can be
served straight from a checkout and so `ci.yml` can catch a stale build.

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
