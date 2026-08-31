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

## Install it

The app is a PWA: `manifest.webmanifest`, a root-scoped service worker in
`sw.js`, and an icon set in `icons/`. Browsers offer it for install from the
address bar, or through the **Instalează** button in the header once the
install prompt fires. Once installed it opens standalone and works offline.

Caching is deliberately not cache-first. There is no bundler and no content
hashing in file names, so pinning readers to cached copies would strand them
on old code:

| request | strategy |
|---|---|
| navigation | network-first, cached shell as fallback |
| same-origin | stale-while-revalidate |
| webfonts | stale-while-revalidate, in an unversioned cache |

A deploy therefore lands on the next load, or the one after. When a new
worker installs, the reader is offered a reload rather than being reloaded
out from under a half-finished quiz. Bump `VERSION` in `sw.js` to force a
clean purge.

```bash
just icons          # regenerate icons/ from tools/icons.mjs; output is committed
```

`tools/icons.mjs` draws the mark and encodes the PNGs itself — no image
editor and no dependency.

## Verify it

```bash
just check          # tsc --noEmit, strict
just test           # maths sweep + full jsdom render
```

`tests/smoke.mjs` runs every animation frame across every control extreme and
fails on a `NaN` attribute. It also checks the manifest, the icon set, and
that every path the service worker precaches actually exists.
`tests/render.mjs` opens every module and every tab in jsdom, answers a quiz
to 100%, checks the progress gauge moves, and exercises the collapsible menu
and drawer.

Neither suite runs a service worker — jsdom has none. Offline behaviour, the
update prompt, and the drawer's CSS were verified in Chromium by hand.

## Deploy

GitHub Pages is published by Actions. Every push to `main` runs
`.github/workflows/pages.yml`, which typechecks, builds, runs both test
suites, then uploads `index.html`, `styles.css`, `.nojekyll`, `sw.js`,
`manifest.webmanifest`, `icons/` and a freshly compiled `dist/` as the Pages
artifact and deploys it.

```bash
just deploy         # build, test, commit, push — the push triggers the deploy
```

Repository settings → Pages → Source: **GitHub Actions**. The `.nojekyll` file
stops Pages filtering anything. `dist/` stays committed so the repo can be
served straight from a checkout and so `ci.yml` can catch a stale build.

## Structure

`src/modules/<id>/` holds one subject: curriculum, questions, animations,
calculators. Everything else is the shell. See `CLAUDE.md` for the contracts.

The module menu is an accordion: each level collapses, and which levels are
collapsed persists separately from progress, so clearing progress does not
reset it. Below 880px the sidebar becomes an off-canvas drawer opened from
the header, closed by the scrim, Escape, its own close button, or by picking
a module.

## Subjects

| id | status | language |
|---|---|---|
| `electro` | 17 modules, 10 animations, 8 calculators, 72 questions | Romanian |
| `dsys` | 4 modules, 3 animations, 1 calculator, 32 questions | English |
| `crypto` | 14 modules, 5 animations, 6 calculators, 107 questions | English |
| `os` | 14 modules, 5 animations, 5 calculators, 114 questions | English |
| `arch` | planned — computer architecture | English |
