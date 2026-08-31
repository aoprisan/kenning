/**
 * Progressive-web-app wiring: service worker registration, the update
 * prompt, and the install button.
 *
 * The service worker itself is `sw.js` at the site root — see the comment
 * at the top of that file for why it is not compiled from TypeScript.
 * Everything here degrades to a no-op when the APIs are missing, which is
 * also what keeps `tests/render.mjs` happy under jsdom.
 */
let deferredInstall = null;
/**
 * Set only when the reader accepts an update. `controllerchange` also fires
 * the first time a worker calls `clients.claim()`, and reloading on that
 * would throw away a page the reader is part-way through.
 */
let updateAccepted = false;
/** Bottom-anchored notice. Reused for both the update and the offline hint. */
function toast(message, action) {
    document.getElementById("pwaToast")?.remove();
    const el = document.createElement("div");
    el.id = "pwaToast";
    el.className = "toast";
    el.setAttribute("role", "status");
    const text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);
    if (action) {
        const go = document.createElement("button");
        go.className = "toast-go";
        go.textContent = action.label;
        go.onclick = action.run;
        el.appendChild(go);
    }
    const close = document.createElement("button");
    close.className = "toast-x";
    close.setAttribute("aria-label", "Închide");
    close.textContent = "✕";
    close.onclick = () => el.remove();
    el.appendChild(close);
    document.body.appendChild(el);
}
/** Offer to activate a worker that has installed and is waiting. */
function offerUpdate(waiting) {
    toast("Versiune nouă disponibilă.", {
        label: "Reîncarcă",
        run: () => {
            updateAccepted = true;
            waiting.postMessage("skip-waiting");
        },
    });
}
function watchForUpdate(reg) {
    if (reg.waiting && navigator.serviceWorker.controller)
        offerUpdate(reg.waiting);
    reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw)
            return;
        sw.addEventListener("statechange", () => {
            // A worker that installs with no controller is the first one: nothing
            // is being replaced, so there is nothing to prompt about.
            if (sw.state === "installed" && navigator.serviceWorker.controller)
                offerUpdate(sw);
        });
    });
}
function wireInstallButton() {
    const btn = document.getElementById("btnInstall");
    if (!btn)
        return;
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredInstall = e;
        btn.hidden = false;
    });
    btn.onclick = async () => {
        const p = deferredInstall;
        if (!p)
            return;
        deferredInstall = null;
        btn.hidden = true;
        await p.prompt();
        await p.userChoice;
    };
    window.addEventListener("appinstalled", () => {
        deferredInstall = null;
        btn.hidden = true;
    });
}
/** Registers the worker and wires the update and install affordances. */
export function initPWA() {
    wireInstallButton();
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
        return;
    // Reload only for an update the reader asked for. A first install claiming
    // the page, or another tab updating, must leave this one alone.
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!updateAccepted || reloading)
            return;
        reloading = true;
        location.reload();
    });
    // Registered immediately rather than on `load`. Waiting for `load` is the
    // usual advice — it keeps the precache off the critical path — but `load`
    // waits on every subresource, including the third-party webfonts, so a slow
    // CDN would leave the app permanently uninstalled and never offline-ready.
    // updateViaCache "none": never let an HTTP cache decide whether the worker
    // script has changed. Without it a long-lived cache header can pin readers
    // to an old worker.
    navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" })
        .then(watchForUpdate)
        .catch(() => { });
}
//# sourceMappingURL=pwa.js.map