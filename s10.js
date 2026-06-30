(function () {
  const CONFIG = {
    triggerSelector: '[data-mj="widget-top-providers"]',
    containerId: "dmbo-media-widgets",
    lottieLibrary: "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js",
    lottiePath: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json",
    youtubeEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
    externalPage: "https://www.fifa.com/"
  };

  let mounted = false;
  let observerStarted = false;

  function log() {
    try { console.log.apply(console, arguments); } catch (_) {}
  }

  function error() {
    try { console.error.apply(console, arguments); } catch (_) {}
  }

  function loadScriptOnce(src, globalCheck) {
    return new Promise(function (resolve) {
      try {
        if (globalCheck && globalCheck()) return resolve(true);

        const existing = document.querySelector('script[src="' + src + '"]');
        if (existing) {
          existing.addEventListener("load", function () { resolve(true); }, { once: true });
          existing.addEventListener("error", function () { resolve(false); }, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.onload = function () { resolve(true); };
        script.onerror = function () { resolve(false); };

        (document.head || document.documentElement).appendChild(script);
      } catch (e) {
        error("[DMBO Media] library load failed safely:", e);
        resolve(false);
      }
    });
  }

  function targetExists() {
    try {
      return !!document.querySelector(CONFIG.triggerSelector);
    } catch (e) {
      error("[DMBO Media] bad selector:", CONFIG.triggerSelector, e);
      return false;
    }
  }

  function createStyles() {
    if (document.getElementById("dmbo-media-widgets-style")) return;

    const style = document.createElement("style");
    style.id = "dmbo-media-widgets-style";
    style.textContent = `
      #dmbo-media-widgets {
        position: fixed;
        right: 18px;
        bottom: 18px;
        width: min(920px, calc(100vw - 36px));
        z-index: 999999;
        display: grid;
        grid-template-columns: 220px 1fr 1fr;
        gap: 12px;
        padding: 12px;
        border-radius: 16px;
        background: rgba(8, 10, 18, 0.92);
        border: 1px solid rgba(255,255,255,0.16);
        box-shadow: 0 20px 60px rgba(0,0,0,0.45);
        color: #fff;
        font-family: Arial, sans-serif;
      }

      #dmbo-media-widgets iframe {
        width: 100%;
        height: 180px;
        border: 0;
        border-radius: 10px;
        background: #111;
      }

      #dmbo-media-widgets .dmbo-box {
        position: relative;
        min-height: 180px;
        overflow: hidden;
        border-radius: 10px;
        background: rgba(255,255,255,0.06);
      }

      #dmbo-media-widgets .dmbo-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
        font-size: 13px;
        line-height: 1.4;
        background: rgba(0,0,0,0.58);
      }

      #dmbo-media-widgets a {
        color: #fff;
        font-weight: 700;
      }

      #dmbo-media-close {
        position: absolute;
        top: -10px;
        right: -10px;
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 999px;
        background: #fd224e;
        color: #fff;
        cursor: pointer;
        font-weight: 900;
      }

      @media (max-width: 760px) {
        #dmbo-media-widgets {
          grid-template-columns: 1fr;
          max-height: calc(100vh - 36px);
          overflow: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function mountShell() {
    if (mounted || document.getElementById(CONFIG.containerId)) return null;

    createStyles();

    const root = document.createElement("div");
    root.id = CONFIG.containerId;

    root.innerHTML = `
      <button id="dmbo-media-close" type="button">x</button>

      <div class="dmbo-box">
        <div id="dmbo-lottie-box" style="width:100%;height:180px;"></div>
      </div>

      <div class="dmbo-box">
        <iframe
          title="YouTube video"
          src="${CONFIG.youtubeEmbed}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>
      </div>

      <div class="dmbo-box">
        <iframe
          title="FIFA"
          src="${CONFIG.externalPage}"
          loading="lazy"
          referrerpolicy="no-referrer">
        </iframe>
        <div class="dmbo-fallback">
          FIFA may block iframe embedding. If it does not show,
          <a href="${CONFIG.externalPage}" target="_blank" rel="noopener noreferrer">open FIFA here</a>.
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const close = document.getElementById("dmbo-media-close");
    if (close) {
      close.onclick = function () {
        root.remove();
        mounted = false;
      };
    }

    mounted = true;
    return root;
  }

  async function mount() {
    try {
      if (!targetExists()) return;

      const root = mountShell();
      if (!root) return;

      const ok = await loadScriptOnce(CONFIG.lottieLibrary, function () {
        return window.lottie && typeof window.lottie.loadAnimation === "function";
      });

      if (!ok || !window.lottie) {
        log("[DMBO Media] Lottie library unavailable; rest of widget still mounted");
        return;
      }

      const lottieBox = document.getElementById("dmbo-lottie-box");
      if (!lottieBox || lottieBox.dataset.loaded === "1") return;

      lottieBox.dataset.loaded = "1";

      window.lottie.loadAnimation({
        container: lottieBox,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: CONFIG.lottiePath
      });

      log("[DMBO Media] mounted");
    } catch (e) {
      error("[DMBO Media] safe failure:", e);
    }
  }

  function start() {
    mount();

    if (observerStarted || !document.body || typeof MutationObserver !== "function") return;
    observerStarted = true;

    const observer = new MutationObserver(function () {
      mount();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
