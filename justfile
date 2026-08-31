# Kenning — interactive learning modules.

default: check

# Typecheck without emitting.
check:
    npx tsc --noEmit

# Compile src/ to dist/.
build:
    npx tsc

# Pure maths: every animation frame and calculator across full control ranges.
smoke: build
    node tests/smoke.mjs

# Full app render in jsdom: every module, every tab, a complete quiz.
render: build
    node tests/render.mjs

test: smoke render

# Regenerate the PWA icon set from tools/icons.mjs. Output is committed.
icons:
    node tools/icons.mjs

# Serve locally. ES modules need http://, file:// will not work.
dev: build
    @echo "http://localhost:8080"
    python3 -m http.server 8080

# Rebuild, verify, commit dist, push. The push triggers the Pages deploy.
deploy: build test
    git add -A
    git commit -m "build" || true
    git push

clean:
    rm -rf dist
