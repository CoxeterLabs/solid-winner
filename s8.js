(function () {
  if (window.__DMBO_S8_LOADED__) return;
  window.__DMBO_S8_LOADED__ = true;

  var CONFIG = {
    triggerSelector: '[data-mj="widget-top-providers"]',
    containerId: "dmbo-s8-widget",
    styleId: "dmbo-s8-style",
    lottieLibrary: "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js",
    lottiePath: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json",
    youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
    iframeUrl: "https://www.fifa.com/"
  };

  var mounted = false;
  var observerStarted = false;
  var lottieLoading = false;
  var lottieReady = false;
  var lottieFailed = false;

  function log() {
    try { console.log.apply(console, arguments); } catch (e) {}
  }

  function err() {
    try { console.error.apply(console, arguments); } catch (e) {}
  }

  function getRoot() {
    return document.body || document.documentElement;
  }

  function targetExists() {
    try {
      return !!document.querySelector(CONFIG.triggerSelector);
    } catch (e) {
      err("[DMBO S8] invalid selector", e);
      return false;
    }
  }

  function loadLottie(callback) {
    if (window.lottie && typeof window.lottie.loadAnimation === "function") {
      lottieReady = true;
      callback(true);
      return;
    }

    if (lottieFailed) {
      callback(false);
      return;
    }

    if (lottieLoading) {
      setTimeout(function () {
        loadLottie(callback);
      }, 100);
      return;
    }

    lottieLoading = true;

    var s = document.createElement("script");
    s.src = CONFIG.lottieLibrary;

    s.onload = function () {
      lottieLoading = false;
      lottieReady = true;
      log("[DMBO S8] lottie loaded");
      callback(true);
    };

    s.onerror = function () {
      lottieLoading = false;
      lottieFailed = true;
      err("[DMBO S8] lottie failed to load");
      callback(false);
    };

    (document.head || document.documentElement).appendChild(s);
  }

  function addStyles() {
    if (document.getElementById(CONFIG.styleId)) return;

    var style = document.createElement("style");
    style.id = CONFIG.styleId;
    style.textContent =
      "#dmbo-s8-widget{" +
      "position:fixed;right:18px;bottom:18px;width:min(920px,calc(100vw - 36px));" +
      "z-index:999999;display:grid;grid-template-columns:220px 1fr 1fr;gap:12px;" +
      "padding:12px;border-radius:16px;background:rgba(8,10,18,.94);" +
      "border:1px solid rgba(255,255,255,.16);box-shadow:0 20px 60px rgba(0,0,0,.45);" +
      "font-family:Arial,sans-serif;color:#fff;" +
      "}" +
      "#dmbo-s8-widget iframe{width:100%;height:180px;border:0;border-radius:10px;background:#111;}" +
      "#dmbo-s8-widget .dmbo-s8-box{position:relative;min-height:180px;overflow:hidden;border-radius:10px;background:rgba(255,255,255,.06);}" +
      "#dmbo-s8-widget .dmbo-s8-note{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:rgba(0,0,0,.68);font-size:12px;line-height:1.35;text-align:center;}" +
      "#dmbo-s8-widget a{color:#fff;font-weight:700;}" +
      "#dmbo-s8-close{position:absolute;top:-10px;right:-10px;width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer;}" +
      "@media(max-width:760px){#dmbo-s8-widget{grid-template-columns:1fr;max-height:calc(100vh - 36px);overflow:auto;}}";

    (document.head || document.documentElement).appendChild(style);
  }

  function mountShell() {
    if (mounted || document.getElementById(CONFIG.containerId)) return;

    var root = getRoot();
    if (!root) return;

    addStyles();

    var box = document.createElement("div");
    box.id = CONFIG.containerId;

    box.innerHTML =
      '<button id="dmbo-s8-close" type="button">x</button>' +
      '<div class="dmbo-s8-box"><div id="dmbo-s8-lottie" style="width:100%;height:180px;"></div></div>' +
      '<div class="dmbo-s8-box">' +
        '<iframe title="YouTube video" src="' + CONFIG.youtubeUrl + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>' +
      '</div>' +
      '<div class="dmbo-s8-box">' +
        '<iframe title="FIFA" src="' + CONFIG.iframeUrl + '" loading="lazy" referrerpolicy="no-referrer"></iframe>' +
        '<div class="dmbo-s8-note">FIFA may block iframe embedding. <a href="' + CONFIG.iframeUrl + '" target="_blank" rel="noopener noreferrer">Open FIFA</a></div>' +
      '</div>';

    root.appendChild(box);

    var close = document.getElementById("dmbo-s8-close");
    if (close) {
      close.onclick = function () {
        box.remove();
        mounted = false;
      };
    }

    mounted = true;
    log("[DMBO S8] widget shell mounted");
  }

  function mountLottie() {
    var el = document.getElementById("dmbo-s8-lottie");
    if (!el || el.getAttribute("data-loaded") === "1") return;

    loadLottie(function (ok) {
      if (!ok) return;

      try {
        el.setAttribute("data-loaded", "1");
        window.lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: CONFIG.lottiePath
        });
        log("[DMBO S8] lottie mounted");
      } catch (e) {
        err("[DMBO S8] lottie mount failed safely", e);
      }
    });
  }

  function check() {
    try {
      if (!targetExists()) return;
      mountShell();
      mountLottie();
    } catch (e) {
      err("[DMBO S8] safe check failure", e);
    }
  }

  function startObserver() {
    if (observerStarted) return;
    if (!getRoot()) return;

    observerStarted = true;

    if (typeof MutationObserver !== "function") {
      check();
      return;
    }

    var observer = new MutationObserver(function () {
      check();
    });

    observer.observe(getRoot(), {
      childList: true,
      subtree: true
    });

    log("[DMBO S8] observer started");
  }

  function start() {
    check();
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
