(function () {
  if (window.__DMBO_WIDGET_V12__) return;
  window.__DMBO_WIDGET_V12__ = true;
  window.__DMBO_MEDIA_V11_LOADER__ = true;
  window.__DMBO_MEDIA_V10_LOADER__ = true;
  window.__DMBO_MEDIA_V9_LOADER__ = true;

  var WORKER = "https://sports.hypercubik.workers.dev/";
  var CONFIG_URL = WORKER + "config.js?v=" + Date.now();
  var LOTTIE_URL = "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js";
  var MANIFEST_URL = "https://raw.githubusercontent.com/CoxeterLabs/solid-winner/refs/heads/main/dmbo-widget-manifest-v1.json";
  var DEFAULT_PANELS = ["account", "lottie", "video", "youtube", "iframe", "liveMatch", "top", "worldcup", "sports", "casino"];

  var logoIndex = null;
  var logoWaiters = [];
  var logoLoading = false;
  var manifest = null;
  var currentRouteKey = "";
  var currentDmboWidget = null;
  var lottieReady = false;
  var routeHooked = false;
  var loadedScriptIds = {};
  var originalTitle = "";
  var titleOwned = false;
  var casino = { page: 0, query: "", loading: false, done: false, games: [] };
  var sport = { service: "PREMATCH", sportId: "1", sportName: "Football", offset: 0, limit: 20, events: [], loading: false, done: false };
  var lastAccountRender = null;
  var live = { timer: 0, seq: 0, activeKey: "", store: {}, animationCache: {}, animationMiss: {} };

  function log() { try { console.log.apply(console, arguments); } catch (e) {} }
  function err() { try { console.error.apply(console, arguments); } catch (e) {} }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function clean(v) { return String(v || "").trim().toLowerCase(); }

  function initials(v) {
    var p = String(v || "?").trim().split(/\s+/);
    return ((p[0] || "?").charAt(0) + (p[1] || "").charAt(0)).toUpperCase();
  }

  function dateText(ms) {
    var n = Number(ms);
    if (!isFinite(n)) return "";
    try {
      return new Date(n).toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "";
    }
  }

  function qs(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function loadScript(src, cb) {
    try {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { cb && cb(true); };
      s.onerror = function () { err("[DMBO] failed", src); cb && cb(false); };
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {
      cb && cb(false);
    }
  }

  function cfg() {
    var c = window.DMBO_MEDIA_WIDGET_CONFIG || {};
    c.triggerSelector = c.triggerSelector || "body";
    c.containerId = c.containerId || "dmbo-media-widget-v12";
    c.styleId = c.styleId || "dmbo-media-widget-v12-style";
    c.lottiePath = c.lottiePath || "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json";
    c.youtubeEmbedUrl = c.youtubeEmbedUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0";
    c.iframeUrl = c.iframeUrl || "https://react-view-transitions-demo.labs.vercel.dev";
    c.iframeTitle = c.iframeTitle || "Vercel";
    c.videoTitle = c.videoTitle || "Featured Video";
    c.videoPoster = c.videoPoster || "";
    c.videoSource = c.videoSource || "";
    c.sportsProxyUrl = c.sportsProxyUrl || WORKER;
    c.casinoGamesUrl = c.casinoGamesUrl || "/api/integration/api/v1.0/webSites/pages/casino/lobby-games";
    c.casinoMaxPages = c.casinoMaxPages || 20;
    c.manifestUrl = c.manifestUrl || MANIFEST_URL;
    window.DMBO_MEDIA_WIDGET_CONFIG = c;
    return c;
  }

  function copyObject(v) {
    var out = {};

    Object.keys(v || {}).forEach(function (k) {
      out[k] = v[k];
    });

    return out;
  }

  function createDefaultManifest() {
    return {
      version: "20260701-live-animation-ui-2",
      global: {
        styles: [],
        scripts: []
      },
      pages: [
        {
          id: "advanced-features",
          title: "Advanced Features | Winrai",
          paths: ["/home/adv"],
          widgets: [
            {
              id: "dmbo-media-widget-v12",
              type: "dmbo-v12",
              panels: [
                {
                  name: "account",
                  title: "Player Status",
                  baseCurrency: "EUR",
                  endpoints: {
                    profile: ["/api/v1/me"],
                    balances: ["/api/v1/me/balances", "/api/v1/balance"],
                    bonuses: ["/api/v1/me/bonuses"],
                    level: ["/api/v1/me/level", "/api/v1/me/category"]
                  },
                  dataEndpoints: {
                    profile: ["/api/v1/me"],
                    userInfo: ["/api/user/api/v1.0/users/userinfo"],
                    balances: [
                      "/api/platform/api/v1.0/user/balances?currency={currency}",
                      "/api/platform/api/v1.0/user/balances",
                      "/api/v1/me/balances",
                      "/api/v1/balance"
                    ],
                    accounts: [
                      "/api/platform/api/v1.0/user/accounts?currency={currency}",
                      "/api/platform/api/v1.0/user/accounts"
                    ],
                    baseBalance: [
                      "/api/platform/api/v1.0/user/balance?currency={baseCurrency}",
                      "/api/platform/api/v1.0/user/balance",
                      "/api/platform/api/v1.0/user/balance?currency={currency}"
                    ],
                    bonuses: [
                      "/api/bonusengine/api/v1/BonusSite/campaignAssignments/currency/{currency}",
                      "/api/v1/me/bonuses"
                    ],
                    level: ["/api/v1/me/level", "/api/v1/me/category"]
                  }
                },
                "lottie",
                {
                  name: "video",
                  title: "Advanced Feature Player",
                  source: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                  poster: ""
                },
                "youtube",
                "iframe",
                {
                  name: "liveMatch",
                  title: "Live Match Center",
                  pollMs: 8000,
                  resolverPath: "/matchtracker-resolver/resolve",
                  events: {
                    "4542851": {
                      home: "Serena Williams",
                      away: "Maya Joint",
                      animationUrl: "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66083805?s=3&lang=en"
                    }
                  }
                },
                "top",
                "worldcup",
                "sports",
                "casino"
              ]
            }
          ],
          styles: [
            {
              id: "dmbo-adv-theme-v1",
              cssUrl: "https://raw.githubusercontent.com/CoxeterLabs/solid-winner/refs/heads/main/dmbo-adv-theme-v1.css"
            }
          ],
          scripts: [
            {
              id: "dmbo-adv-compat-v1-loader",
              code: "(function(){if(window.__DMBO_ADV_COMPAT_LOADER__)return;window.__DMBO_ADV_COMPAT_LOADER__=true;fetch('https://raw.githubusercontent.com/CoxeterLabs/solid-winner/refs/heads/main/dmbo-adv-compat-v1.js?v='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).then(function(c){if(c)(0,eval)(c);}).catch(function(){});})()"
            }
          ]
        }
      ]
    };
  }

  function normalizePagePath(value) {
    var raw = String(value || "");
    var path = raw;
    var parts;

    try {
      if (/^https?:\/\//i.test(raw)) path = new URL(raw).pathname;
    } catch (e) {}

    path = path.split(/[?#]/)[0] || "/";
    path = path.replace(/\/+/g, "/");
    if (path.length > 1) path = path.replace(/\/+$/g, "");

    parts = path.split("/").filter(Boolean);
    if (parts.length && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0])) parts.shift();

    return "/" + parts.join("/");
  }

  function matchesPath(pattern, path, mode) {
    var p = normalizePagePath(pattern);
    var x = normalizePagePath(path);

    if (mode === "prefix") return x === p || x.indexOf(p + "/") === 0;
    if (mode === "contains") return x.indexOf(p) !== -1;

    if (p.slice(-2) === "/*") {
      p = p.slice(0, -2);
      return x === p || x.indexOf(p + "/") === 0;
    }

    if (p.indexOf("*") !== -1) {
      var re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
      return re.test(x);
    }

    return x === p;
  }

  function pageMatches(page, path) {
    var paths = [];
    var i;

    if (!page || page.enabled === false) return false;
    if (page.path) paths.push(page.path);
    if (Array.isArray(page.paths)) paths = paths.concat(page.paths);
    if (!paths.length) return false;

    for (i = 0; i < paths.length; i++) {
      if (matchesPath(paths[i], path, page.match)) return true;
    }

    return false;
  }

  function addLayers(target, list, scope) {
    (list || []).forEach(function (item) {
      var x;

      if (!item || item.enabled === false) return;

      x = copyObject(item);
      x.__dmboScope = scope;
      target.push(x);
    });
  }

  function uniqueLayers(list) {
    var seen = {};
    var out = [];

    (list || []).forEach(function (item) {
      var key = item.id || item.domId || item.href || item.src || item.code || JSON.stringify(item);
      if (seen[key]) return;
      seen[key] = true;
      out.push(item);
    });

    return out;
  }

  function getActiveLayers(inputManifest, path) {
    var m = inputManifest && typeof inputManifest === "object" ? inputManifest : createDefaultManifest();
    var pages = Array.isArray(m.pages) ? m.pages : [];
    var result = {
      path: normalizePagePath(path),
      pageIds: [],
      title: null,
      styles: [],
      scripts: [],
      widgets: [],
      dmboWidget: null
    };

    addLayers(result.styles, m.global && m.global.styles, "global");
    addLayers(result.scripts, m.global && m.global.scripts, "global");

    pages.forEach(function (page) {
      if (!pageMatches(page, path)) return;

      result.pageIds.push(page.id || "");
      if (page.title || page.documentTitle) result.title = page.title || page.documentTitle;
      addLayers(result.styles, page.styles, "page");
      addLayers(result.scripts, page.scripts, "page");
      addLayers(result.widgets, page.widgets, "page");
    });

    result.styles = uniqueLayers(result.styles);
    result.scripts = uniqueLayers(result.scripts);
    result.widgets = uniqueLayers(result.widgets);

    result.widgets.some(function (widget) {
      if (widget && widget.enabled !== false && widget.type === "dmbo-v12") {
        result.dmboWidget = widget;
        if (!Array.isArray(result.dmboWidget.panels) || !result.dmboWidget.panels.length) {
          result.dmboWidget.panels = DEFAULT_PANELS.slice(0);
        }
        return true;
      }
      return false;
    });

    return result;
  }

  function panelEnabled(widget, name) {
    var panels = widget && widget.panels;
    var enabled = false;

    if (!Array.isArray(panels) || !panels.length) return true;

    panels.forEach(function (panel) {
      var panelName;

      if (typeof panel === "string") {
        if (panel === name) enabled = true;
        return;
      }

      if (!panel || typeof panel !== "object") return;

      panelName = panel.name || panel.type || panel.id;
      if (panelName === name && panel.enabled !== false) enabled = true;
    });

    return enabled;
  }

  function panelConfig(widget, name) {
    var panels = widget && widget.panels;
    var config = {};

    if (!Array.isArray(panels)) return config;

    panels.forEach(function (panel) {
      var panelName;

      if (!panel || typeof panel !== "object") return;

      panelName = panel.name || panel.type || panel.id;
      if (panelName === name) config = copyObject(panel);
    });

    if (widget && widget[name] && typeof widget[name] === "object") {
      Object.keys(widget[name]).forEach(function (k) {
        config[k] = widget[name][k];
      });
    }

    return config;
  }

  function needsLottie(widget) {
    return panelEnabled(widget, "lottie");
  }

  function shouldFetchAccountData(accountConfig, signals) {
    if (!accountConfig || accountConfig.enabled === false) return false;
    if (accountConfig.fetchWhen === "always") return true;
    if (signals && signals.hasLoginCta) return false;
    return true;
  }

  function proxy(c, path, params) {
    try {
      var u = new URL(c.sportsProxyUrl || WORKER);
      u.searchParams.set("path", path);
      Object.keys(params || {}).forEach(function (k) {
        u.searchParams.set(k, params[k]);
      });
      return u.toString();
    } catch (e) {
      return "";
    }
  }

  function getJson(url, credentials, cb) {
    if (!url) return cb(new Error("missing url"));

    fetch(url, {
      credentials: credentials || "omit",
      headers: { accept: "application/json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) { cb(null, d); })
      .catch(function (e) { cb(e); });
  }

  function cleanup(c) {
    closeLiveModal(true);

    [
      "conditional-lottie",
      "dmbo-s8-widget",
      "dmbo-media-widgets",
      "dmbo-media-widget-v9",
      "dmbo-media-widget-v10",
      "dmbo-media-widget-v11",
      "dmbo-media-widget-v12",
      c.containerId
    ].forEach(function (id) {
      var el = id && qs(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    [
      "dmbo-media-widget-v9-style",
      "dmbo-media-widget-v10-style",
      "dmbo-media-widget-v11-style",
      "dmbo-media-widget-v12-style",
      c.styleId
    ].forEach(function (id) {
      var el = id && qs(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function safeDomId(v) {
    return String(v || "asset").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset";
  }

  function assetDomId(item, type) {
    return item.domId || ("dmbo-" + type + "-" + safeDomId(item.id || item.href || item.src || item.code || type));
  }

  function setAssetScope(el, item) {
    if (!el || !el.setAttribute) return;

    el.setAttribute("data-dmbo-asset", "true");
    if (item.__dmboScope === "page") el.setAttribute("data-dmbo-page-asset", "true");
  }

  function removePageAssets() {
    try {
      Array.prototype.forEach.call(document.querySelectorAll("[data-dmbo-page-asset='true']"), function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    } catch (e) {}
  }

  function injectStyleAsset(item) {
    var id;
    var el;
    var url;

    if (!item || item.enabled === false) return;

    id = assetDomId(item, "style");
    if (qs(id)) return;

    if (item.cssUrl) {
      url = item.cssUrl + (item.cssUrl.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
      el = document.createElement("style");
      el.id = id;
      el.textContent = "";
      setAssetScope(el, item);
      (document.head || document.documentElement).appendChild(el);

      fetch(url, {
        cache: "no-store",
        credentials: "omit",
        headers: { accept: "text/css,*/*" }
      })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.text();
        })
        .then(function (cssText) {
          el.textContent = cssText;
        })
        .catch(function (e) {
          err("[DMBO] style asset failed", item.id || item.cssUrl, e && e.message ? e.message : e);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      return;
    }

    if (item.href) {
      el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = item.href;
    } else if (item.css) {
      el = document.createElement("style");
      el.textContent = item.css;
    } else {
      return;
    }

    el.id = id;
    setAssetScope(el, item);
    (document.head || document.documentElement).appendChild(el);
  }

  function injectScriptAsset(item) {
    var id;
    var el;
    var runOnce;

    if (!item || item.enabled === false) return;

    id = assetDomId(item, "script");
    runOnce = item.once === true || (item.once !== false && item.__dmboScope !== "page");
    if (runOnce && loadedScriptIds[id]) return;
    if (qs(id)) return;

    el = document.createElement("script");
    el.id = id;
    el.async = item.async !== false;
    if (item.type) el.type = item.type;
    if (item.defer) el.defer = true;

    if (item.src) {
      el.src = item.src;
      el.onerror = function () { err("[DMBO] script asset failed", item.id || item.src); };
    } else if (item.code) {
      el.textContent = item.code;
    } else {
      return;
    }

    setAssetScope(el, item);
    if (runOnce) loadedScriptIds[id] = true;
    (document.head || document.documentElement).appendChild(el);
  }

  function applyAssets(layers) {
    (layers.styles || []).forEach(injectStyleAsset);
    (layers.scripts || []).forEach(injectScriptAsset);
  }

  function resetWidgetData() {
    casino = { page: 0, query: "", loading: false, done: false, games: [] };
    sport = { service: "PREMATCH", sportId: "1", sportName: "Football", offset: 0, limit: 20, events: [], loading: false, done: false };
    live.store = {};
  }

  function applyDocumentTitle(layers) {
    var title = layers && layers.title;

    try {
      if (!originalTitle) originalTitle = document.title || "";

      if (title) {
        document.title = title;
        titleOwned = true;
      } else if (titleOwned) {
        document.title = originalTitle;
        titleOwned = false;
      }
    } catch (e) {}
  }

  function styles(c) {
    if (qs(c.styleId)) return;

    var s = document.createElement("style");
    s.id = c.styleId;
    s.textContent =
      "#" + c.containerId + "{position:fixed;right:18px;bottom:18px;width:min(1240px,calc(100vw - 36px));max-height:calc(100vh - 36px);box-sizing:border-box;overflow:auto;overscroll-behavior:contain;z-index:999999;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-content:start;gap:12px;padding:12px;border-radius:16px;background:rgba(8,10,18,.96);border:1px solid rgba(255,255,255,.16);box-shadow:0 20px 60px rgba(0,0,0,.45);font-family:Arial,sans-serif;color:#fff}" +
      "#" + c.containerId + " iframe{width:100%;height:176px;border:0;border-radius:10px;background:#111}" +
      "#" + c.containerId + " .b{position:relative;min-height:176px;overflow:hidden;border-radius:10px;background:rgba(255,255,255,.06)}" +
      "#" + c.containerId + " .d{padding:12px;overflow:auto;max-height:280px}" +
      "#" + c.containerId + " .s2{grid-column:span 2}#" + c.containerId + " .s3{grid-column:1/-1}" +
      "#" + c.containerId + " .t{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px;font-size:13px;font-weight:800}" +
      "#" + c.containerId + " .m{font-size:11px;color:rgba(255,255,255,.62)}#" + c.containerId + " .note{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:rgba(0,0,0,.7);font-size:12px;text-align:center}" +
      "#" + c.containerId + " .ev{padding:9px 0;border-top:1px solid rgba(255,255,255,.1)}#" + c.containerId + " .match{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;font-size:12px;font-weight:700}" +
      "#" + c.containerId + " .team{display:flex;align-items:center;gap:6px;min-width:0;flex:1}#" + c.containerId + " .team span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#" + c.containerId + " .logo,#" + c.containerId + " .flag{width:22px;height:22px;object-fit:cover;border-radius:50%;background:rgba(255,255,255,.12)}#" + c.containerId + " .flag{height:16px;border-radius:3px}" +
      "#" + c.containerId + " .init{display:inline-flex;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;background:#24314f;font-size:10px;font-weight:900}" +
      "#" + c.containerId + " .od{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}#" + c.containerId + " .pill{display:inline-flex;gap:5px;align-items:center;padding:5px 7px;border-radius:7px;background:#1f2a44;color:#fff;font-size:11px;border:0}" +
      "#" + c.containerId + " a.pill{text-decoration:none}#" + c.containerId + " a.pill:hover{background:#2f4068}" +
      "#" + c.containerId + " .stat-btn{display:inline-flex;vertical-align:middle;align-items:center;justify-content:center;width:24px;height:24px;margin-left:6px;border:0;border-radius:7px;background:#fd224e;color:#fff;cursor:pointer}#" + c.containerId + " .stat-btn:hover{background:#ff4569}#" + c.containerId + " .stat-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      "#" + c.containerId + " .stat-bars{display:inline-grid;grid-template-columns:repeat(3,3px);align-items:end;gap:2px;height:12px}#" + c.containerId + " .stat-bars i{display:block;width:3px;border-radius:2px;background:#fff}#" + c.containerId + " .stat-bars i:nth-child(1){height:6px}#" + c.containerId + " .stat-bars i:nth-child(2){height:10px}#" + c.containerId + " .stat-bars i:nth-child(3){height:8px}" +
      "#" + c.containerId + " .btn{border:0;border-radius:7px;background:#fd224e;color:#fff;font-size:11px;font-weight:800;padding:6px 8px;cursor:pointer}#" + c.containerId + " .btn2{background:#24314f}" +
      "#" + c.containerId + " .search{display:flex;gap:6px;margin-bottom:8px}#" + c.containerId + " input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.15);background:#101827;color:#fff;border-radius:7px;padding:7px;font-size:12px}" +
      "#" + c.containerId + " .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}#" + c.containerId + " .game{border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#111827;overflow:hidden}" +
      "#" + c.containerId + " .gimg{display:block;width:100%;aspect-ratio:1.33;object-fit:cover;background:#1f2937}#" + c.containerId + " .gb{padding:8px}#" + c.containerId + " .gn{font-size:12px;font-weight:800;line-height:1.25;min-height:30px}" +
      "#" + c.containerId + " .video-wrap{position:relative;height:176px;background:#05070c}#" + c.containerId + " .video-wrap video{display:block;width:100%;height:100%;object-fit:cover;background:#05070c}" +
      "#" + c.containerId + " .video-empty{height:176px;display:flex;align-items:center;justify-content:center;padding:16px;text-align:center;color:rgba(255,255,255,.7);font-size:12px}" +
      "#" + c.containerId + " .vc{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;gap:6px;padding:6px;border-radius:9px;background:rgba(0,0,0,.68)}#" + c.containerId + " .vc button{border:0;border-radius:7px;background:#fd224e;color:#fff;font-size:11px;font-weight:900;padding:5px 7px;cursor:pointer}#" + c.containerId + " .vc input{padding:0;min-width:0;accent-color:#fd224e;background:transparent;border:0}#" + c.containerId + " .vc .time{font-size:10px;color:rgba(255,255,255,.78);min-width:60px;text-align:right}" +
      "#" + c.containerId + " .kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}#" + c.containerId + " .kv div{border-radius:8px;background:rgba(255,255,255,.06);padding:7px}#" + c.containerId + " .kv .wide{grid-column:1/-1}#" + c.containerId + " .kv span{display:block;font-size:10px;color:rgba(255,255,255,.58)}#" + c.containerId + " .kv b{display:block;margin-top:2px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .kv .wide b{white-space:normal;line-height:1.35}#" + c.containerId + " .bal-toggle{display:flex;gap:4px;margin-top:7px}#" + c.containerId + " .bal-toggle button{border:0;border-radius:6px;background:#22304f;color:#fff;cursor:pointer;font-size:10px;font-weight:800;line-height:1;padding:5px 8px}#" + c.containerId + " .bal-toggle button.on{background:#fd224e}#" + c.containerId + " .bal-toggle button:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      "#dmbo-live-modal{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,5,10,.66);font-family:Arial,sans-serif;color:#fff}#dmbo-live-modal.open{display:flex}#dmbo-live-modal .live-dialog{position:relative;width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border-radius:12px;background:#111722;border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 70px rgba(0,0,0,.58)}#dmbo-live-modal .live-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.09)}#dmbo-live-modal .live-title{font-size:14px;font-weight:900;line-height:1.25}#dmbo-live-modal .live-meta{margin-top:3px;font-size:11px;color:rgba(255,255,255,.62)}#dmbo-live-modal .live-close{width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer}#dmbo-live-modal .live-body{padding:12px 14px 14px}#dmbo-live-modal .live-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.06)}#dmbo-live-modal .live-team{min-width:0;font-size:13px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-team.away{text-align:right}#dmbo-live-modal .live-score-num{font-size:24px;font-weight:900;line-height:1;color:#fff}#dmbo-live-modal .live-sub{margin-top:8px;font-size:11px;color:rgba(255,255,255,.66)}#dmbo-live-modal .live-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:10px}#dmbo-live-modal .live-panel{min-width:0;border-radius:10px;background:rgba(255,255,255,.05);padding:10px}#dmbo-live-modal .live-panel h3{margin:0 0 8px;font-size:12px;line-height:1.2}#dmbo-live-modal .live-table{display:grid;gap:5px}#dmbo-live-modal .live-row{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center;font-size:11px}#dmbo-live-modal .live-row span:nth-child(2){color:rgba(255,255,255,.68);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-row b{text-align:center;font-size:12px}#dmbo-live-modal .live-animation{margin-top:10px;border-radius:10px;overflow:hidden;background:#070a10;border:1px solid rgba(255,255,255,.08)}#dmbo-live-modal .live-animation iframe{display:block;width:100%;height:230px;border:0;background:#070a10}#dmbo-live-modal .live-empty{padding:14px;text-align:center;font-size:12px;color:rgba(255,255,255,.62)}#dmbo-live-modal .live-error{margin-top:8px;color:#ff8aa1;font-size:11px}#dmbo-live-modal a{color:#fff}" +
      "#dmbo-v12-close{position:absolute;top:6px;right:6px;z-index:2;width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer}" +
      "@media(max-width:980px){#" + c.containerId + "{grid-template-columns:1fr;max-height:calc(100vh - 36px);overflow:auto}#" + c.containerId + " .s2,#" + c.containerId + " .s3{grid-column:auto}#" + c.containerId + " .grid{grid-template-columns:repeat(2,minmax(0,1fr))}#dmbo-live-modal .live-grid{grid-template-columns:1fr}#dmbo-live-modal .live-animation iframe{height:210px}}";

    (document.head || document.documentElement).appendChild(s);
  }

  function teams(ev) {
    var ps = ev.participants || [];
    var h = {};
    var a = {};
    var i;

    for (i = 0; i < ps.length; i++) {
      if (clean(ps[i].qualifier) === "home") h = ps[i];
      if (clean(ps[i].qualifier) === "away") a = ps[i];
    }

    return {
      h: h.translatedName || h.fullName || "Home",
      a: a.translatedName || a.fullName || "Away"
    };
  }

  function flag(region) {
    var map = {
      "world cup": "un",
      "international": "un",
      "england": "gb-eng",
      "scotland": "gb-sct",
      "wales": "gb-wls",
      "norway": "no",
      "ivory coast": "ci",
      "egypt": "eg",
      "australia": "au",
      "usa": "us",
      "united states": "us",
      "brazil": "br",
      "turkey": "tr",
      "germany": "de",
      "france": "fr",
      "spain": "es",
      "italy": "it"
    };

    return map[clean(region)] ? "https://flagcdn.com/w40/" + map[clean(region)] + ".png" : "";
  }

  function localePrefix() {
    var parts = [];

    try {
      parts = String(window.location && window.location.pathname || "").split("/").filter(Boolean);
    } catch (e) {}

    return parts.length && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0]) ? "/" + parts[0] : "";
  }

  function sportsbookSlug(value, kind) {
    var s = clean(value || "");

    if (kind === "tournament") {
      s = s.replace(/\b20\d{2}\b/g, " ").replace(/\bfifa\b/g, " ");
    }

    s = s.replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    return s || (kind === "sport" ? "football" : "");
  }

  function sportsbookPath(ev) {
    var sportName = ev.sportName || "Football";
    var sportSlug = sportsbookSlug(sportName, "sport");
    var tournamentSlug = sportsbookSlug(ev.tournamentName || ev.regionName || "", "tournament");
    var path = "/sportsbook-newsport/" + sportSlug;

    if (tournamentSlug) path += "/" + tournamentSlug;

    return path + "?projectId=1006";
  }

  function signedInEventHref(ev) {
    var prefix = localePrefix();
    var payload = {
      argument: {
        path: sportsbookPath(ev || {})
      }
    };

    return prefix + "/g-sport/sport?additionalParams=" + encodeURIComponent(JSON.stringify(payload));
  }

  function guestEventHref(ev, tm) {
    var prefix = localePrefix();
    var sportName = ev.sportName || "Football";
    var tournament = ev.tournamentName || ev.regionName || "Event";
    var eventName = (tm.h || "Home") + " vs " + (tm.a || "Away") + (ev.eventId ? "-" + ev.eventId : "");
    var payload = {
      argument: {
        path: "sport/" + sportName + "/" + tournament + "/" + eventName
      }
    };

    return prefix + "/home/game/demo/170142?additionalParams=" + encodeURIComponent(JSON.stringify(payload));
  }

  function eventHref(ev, tm, signals) {
    var s = signals || accountSignals();

    return s && !s.hasLoginCta ? signedInEventHref(ev) : guestEventHref(ev, tm);
  }

  function eventId(ev) {
    return String(ev && (ev.eventId || ev.id || ev.eventID) || "");
  }

  function liveMatchConfig(widget) {
    var config = panelConfig(widget || currentDmboWidget, "liveMatch");
    var pollMs = Number(config.pollMs);

    config.title = config.title || "Live Match Center";
    config.pollMs = isFinite(pollMs) && pollMs >= 3000 ? pollMs : 8000;
    config.resolverPath = config.resolverPath || "/matchtracker-resolver/resolve";
    config.events = config.events || {};
    config.animationUrls = config.animationUrls || {};

    return config;
  }

  function liveStatsEnabled() {
    return !!(currentDmboWidget && panelEnabled(currentDmboWidget, "liveMatch"));
  }

  function scoreValue(v) {
    var n;

    if (v == null || v === "") return "-";
    n = Number(v);
    if (isFinite(n) && String(v).trim() !== "") return String(n % 1 ? n : Math.trunc(n));
    return String(v);
  }

  function statLabel(value) {
    var text = String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

    if (!text) return "Stat";
    return text.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function liveEventSummary(data, fallbackTeams) {
    var ev = data || {};
    var score = ev.score || {};
    var tm = teams(ev);
    var fallback = fallbackTeams || {};
    var extra = score.liveExtraData || {};
    var server = "";
    var periods = ((ev.periodScoreInfo && ev.periodScoreInfo.scores) || ev.periodScores || []).map(function (row) {
      return {
        label: row.periodName || row.name || row.type || "Period",
        home: scoreValue(row.homeScore != null ? row.homeScore : row.home),
        away: scoreValue(row.awayScore != null ? row.awayScore : row.away)
      };
    });
    var stats = ((ev.eventStatistics && ev.eventStatistics.statistics) || ev.statistics || []).map(function (row) {
      return {
        label: statLabel(row.type || row.name || row.label),
        home: scoreValue(row.home),
        away: scoreValue(row.away)
      };
    });
    var status = ev.eventStatus || ev.status || "";
    var streamStatus = ev.videoStreaming && ev.videoStreaming.status;

    if ((!tm.h || tm.h === "Home") && fallback.h) tm.h = fallback.h;
    if ((!tm.a || tm.a === "Away") && fallback.a) tm.a = fallback.a;

    if (String(extra.TURN || "") === "1") server = tm.h;
    if (String(extra.TURN || "") === "2") server = tm.a;
    if (server) server = "Server: " + server + (extra.SERVE_NUMBER ? " · Serve " + extra.SERVE_NUMBER : "");

    return {
      eventId: eventId(ev),
      title: ev.eventName || ((tm.h || "Home") + " vs " + (tm.a || "Away")),
      tournament: ev.tournamentName || ev.regionName || ev.sportName || "",
      status: status || "-",
      homeName: tm.h || "Home",
      awayName: tm.a || "Away",
      scoreText: scoreValue(score.homeScore != null ? score.homeScore : ev.homeScore) + " - " + scoreValue(score.awayScore != null ? score.awayScore : ev.awayScore),
      period: score.currentPeriodName || ev.currentPeriodName || status || "Live",
      serviceText: server,
      periodRows: periods,
      statRows: stats,
      streamText: streamStatus ? "Stream " + String(streamStatus).toLowerCase() : ""
    };
  }

  function liveEventOverride(config, ev) {
    var id = eventId(ev);
    var item = id && config && config.events ? config.events[id] : null;

    return item && typeof item === "object" ? item : {};
  }

  function liveAnimationPresetUrl(config, ev) {
    var id = eventId(ev);
    var mapped = id && config && config.animationUrls ? config.animationUrls[id] : "";
    var item = liveEventOverride(config || {}, ev || {});

    if (mapped && typeof mapped === "string") return mapped;
    if (mapped && typeof mapped === "object" && mapped.animationUrl) return mapped.animationUrl;
    if (item.animationUrl) return item.animationUrl;
    if (config && config.eventId && String(config.eventId) === id && config.animationUrl) return config.animationUrl;

    return "";
  }

  function liveResolverName(value) {
    return String(value || "")
      .replace(/[^A-Za-z0-9 ._'\/&()-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function liveAnimationResolverUrl(c, config, ev, tm) {
    var item = liveEventOverride(config || {}, ev || {});
    var home = liveResolverName(item.home || (tm && tm.h) || "");
    var away = liveResolverName(item.away || (tm && tm.a) || "");

    if (config && config.resolveAnimation === false) return "";
    if (!home || !away) return "";

    return proxy(c || cfg(), (config && config.resolverPath) || "/matchtracker-resolver/resolve", {
      home: home,
      away: away,
      nocache: "1"
    });
  }

  function liveAnimationUrlFromResolver(data) {
    var src = data && (data.url || data.animationUrl || data.trackerUrl || "");
    var broadcast = data && data.broadcastUrl;

    if (src) return String(src);
    if (broadcast && /^https?:\/\//i.test(String(broadcast))) return String(broadcast);
    if (broadcast && String(broadcast).charAt(0) === "/") return "https://ui-monitor.lynon.online" + String(broadcast);

    return "";
  }

  function registerLiveEvent(ev, tm) {
    var id = eventId(ev);
    var key;

    if (!id || !liveStatsEnabled()) return "";

    live.seq += 1;
    key = "live-" + id + "-" + live.seq;
    live.store[key] = {
      key: key,
      event: ev,
      teams: tm,
      config: liveMatchConfig(currentDmboWidget)
    };

    return key;
  }

  function liveStatsButtonHtml(key, label) {
    if (!key) return "";

    return '<button type="button" class="stat-btn" data-dmbo-live-key="' + esc(key) + '" title="Live stats" aria-label="' + esc("Open live stats for " + (label || "event")) + '"><span class="stat-bars" aria-hidden="true"><i></i><i></i><i></i></span></button>';
  }

  function ensureLiveModal() {
    var modal = qs("dmbo-live-modal");

    if (modal) return modal;
    if (!document.body) return null;

    modal = document.createElement("div");
    modal.id = "dmbo-live-modal";
    modal.innerHTML = '<div class="live-dialog" role="dialog" aria-modal="true" aria-labelledby="dmbo-live-title">' +
      '<div class="live-head"><div><div class="live-title" id="dmbo-live-title">Live Match Center</div><div class="live-meta" id="dmbo-live-meta">Loading...</div></div><button type="button" class="live-close" id="dmbo-live-close" aria-label="Close">x</button></div>' +
      '<div class="live-body" id="dmbo-live-body"><div class="live-empty">Loading live data...</div></div></div>';
    document.body.appendChild(modal);

    qs("dmbo-live-close").onclick = function () { closeLiveModal(false); };
    modal.onclick = function (e) {
      if (e && e.target === modal) closeLiveModal(false);
    };

    return modal;
  }

  function closeLiveModal(remove) {
    var modal = qs("dmbo-live-modal");

    if (live.timer) {
      clearTimeout(live.timer);
      live.timer = 0;
    }

    live.activeKey = "";

    if (!modal) return;
    modal.className = "";
    if (remove && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function tableRows(rows) {
    if (!rows || !rows.length) return '<div class="live-empty">No rows yet.</div>';

    return '<div class="live-table">' + rows.map(function (row) {
      return '<div class="live-row"><b>' + esc(row.home) + '</b><span>' + esc(row.label) + '</span><b>' + esc(row.away) + '</b></div>';
    }).join("") + '</div>';
  }

  function liveAnimationHtml(src) {
    return '<iframe title="Live match animation" src="' + esc(src) + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer"></iframe>';
  }

  function sameLiveSrc(a, b) {
    if (!a || !b) return false;
    try {
      return new URL(a, window.location && window.location.href).toString() === new URL(b, window.location && window.location.href).toString();
    } catch (e) {
      return String(a) === String(b);
    }
  }

  function renderLiveAnimation(c, item, summary) {
    var slot = qs("dmbo-live-animation");
    var preset = liveAnimationPresetUrl(item.config, item.event);
    var cached = live.animationCache[item.key];
    var src = preset || cached;
    var frame;
    var resolverUrl;

    if (!slot) return;

    if (src) {
      frame = slot.querySelector && slot.querySelector("iframe");
      if (frame && sameLiveSrc(frame.src, src)) return;
      slot.innerHTML = liveAnimationHtml(src);
      return;
    }

    if (live.animationMiss[item.key]) {
      slot.innerHTML = '<div class="live-empty">Animation is not available for this event yet.</div>';
      return;
    }

    resolverUrl = liveAnimationResolverUrl(c, item.config, item.event, {
      h: summary.homeName,
      a: summary.awayName
    });

    if (!resolverUrl) {
      live.animationMiss[item.key] = true;
      slot.innerHTML = '<div class="live-empty">Animation resolver is not configured for this event.</div>';
      return;
    }

    slot.innerHTML = '<div class="live-empty">Resolving live animation...</div>';
    getJson(resolverUrl, "omit", function (e, d) {
      var resolved = e ? "" : liveAnimationUrlFromResolver(d);

      if (live.activeKey !== item.key) return;
      if (resolved) {
        live.animationCache[item.key] = resolved;
        slot.innerHTML = liveAnimationHtml(resolved);
      } else {
        live.animationMiss[item.key] = true;
        slot.innerHTML = '<div class="live-empty">Animation unavailable until the Worker allows the matchtracker resolver.</div>';
      }
    });
  }

  function renderLiveModal(c, item, data, error) {
    var modal = ensureLiveModal();
    var title = qs("dmbo-live-title");
    var meta = qs("dmbo-live-meta");
    var body = qs("dmbo-live-body");
    var summary = liveEventSummary(data || item.event, item.teams);
    var home = qs("dmbo-live-home");
    var away = qs("dmbo-live-away");
    var score = qs("dmbo-live-score-num");
    var sub = qs("dmbo-live-sub");
    var result = qs("dmbo-live-result");
    var stats = qs("dmbo-live-stats");
    var errorBox = qs("dmbo-live-error");

    if (!modal || !body) return;

    if (title) title.textContent = item.config.title || "Live Match Center";
    if (meta) meta.textContent = summary.tournament + (summary.status && summary.status !== "-" ? " · " + summary.status : "");

    if (!home || !away || !score || !sub || !result || !stats || !qs("dmbo-live-animation")) {
      body.innerHTML = '<div class="live-score"><div class="live-team" id="dmbo-live-home"></div><div class="live-score-num" id="dmbo-live-score-num"></div><div class="live-team away" id="dmbo-live-away"></div></div>' +
        '<div class="live-sub" id="dmbo-live-sub"></div>' +
        '<div class="live-error" id="dmbo-live-error" style="display:none"></div>' +
        '<div class="live-grid"><div class="live-panel"><h3>Result</h3><div id="dmbo-live-result"></div></div><div class="live-panel"><h3>Stats</h3><div id="dmbo-live-stats"></div></div></div>' +
        '<div class="live-animation" id="dmbo-live-animation"><div class="live-empty">Loading animation...</div></div>';
      home = qs("dmbo-live-home");
      away = qs("dmbo-live-away");
      score = qs("dmbo-live-score-num");
      sub = qs("dmbo-live-sub");
      result = qs("dmbo-live-result");
      stats = qs("dmbo-live-stats");
      errorBox = qs("dmbo-live-error");
    }

    if (home) home.textContent = summary.homeName;
    if (away) away.textContent = summary.awayName;
    if (score) score.textContent = summary.scoreText;
    if (sub) sub.textContent = summary.period + (summary.serviceText ? " · " + summary.serviceText : "") + (summary.streamText ? " · " + summary.streamText : "");
    if (result) result.innerHTML = tableRows(summary.periodRows);
    if (stats) stats.innerHTML = tableRows(summary.statRows);
    if (errorBox) {
      errorBox.textContent = error ? "Live update failed. Showing latest known event data." : "";
      errorBox.style.display = error ? "block" : "none";
    }

    renderLiveAnimation(c, item, summary);
  }

  function loadLiveEvent(c, item) {
    var id = eventId(item && item.event);
    var url;

    if (!item || !id || live.activeKey !== item.key) return;

    url = proxy(c, "/partner-api/sportsbook/public/v2/event/" + encodeURIComponent(id));
    getJson(url, "omit", function (e, d) {
      if (live.activeKey !== item.key) return;

      renderLiveModal(c, item, e ? item.event : d, e);

      if (live.timer) clearTimeout(live.timer);
      live.timer = setTimeout(function () {
        loadLiveEvent(c, item);
      }, item.config.pollMs || 8000);
    });
  }

  function openLiveStats(c, key) {
    var item = live.store[key];
    var modal;

    if (!item) return;
    modal = ensureLiveModal();
    if (!modal) return;

    if (live.timer) {
      clearTimeout(live.timer);
      live.timer = 0;
    }

    live.activeKey = key;
    modal.className = "open";
    renderLiveModal(c, item, item.event, null);
    loadLiveEvent(c, item);
  }

  function bindLiveButtons(c, root) {
    if (!root || !liveStatsEnabled()) return;

    Array.prototype.forEach.call(root.querySelectorAll("[data-dmbo-live-key]"), function (button) {
      if (button.__DMBO_LIVE_BOUND__) return;
      button.__DMBO_LIVE_BOUND__ = true;
      button.onclick = function () {
        openLiveStats(c, button.getAttribute("data-dmbo-live-key"));
      };
    });
  }

  function logoIndexLoad(c, cb) {
    if (logoIndex) return cb(logoIndex);

    logoWaiters.push(cb);
    if (logoLoading) return;

    logoLoading = true;

    getJson(proxy(c, "/team-logos/index.json"), "omit", function (e, d) {
      logoIndex = e ? {} : d || {};
      logoLoading = false;
      logoWaiters.splice(0).forEach(function (fn) { fn(logoIndex); });
    });
  }

  function setLogo(c, sportId, name, imgId, initId) {
    var folders = {
      "1": "football",
      "2": "basketball",
      "3": "tennis",
      "4": "volleyball",
      "5": "hockey",
      "8": "baseball",
      "12": "american_football",
      "16": "american_football"
    };

    var folder = folders[String(sportId)] || "football";

    logoIndexLoad(c, function (idx) {
      var group = idx[folder] || {};
      var key = clean(name);
      var norm = key.replace(/\s*u\d{1,2}\s*/g, " ").replace(/\s+/g, " ").trim();
      var file = group[key] || group[norm];
      var img = qs(imgId);
      var init = qs(initId);

      if (!file || !img) return;

      img.onload = function () {
        if (init) init.style.display = "none";
        img.style.display = "inline-block";
      };

      img.onerror = function () {
        img.style.display = "none";
        if (init) init.style.display = "inline-flex";
      };

      img.src = proxy(c, "/team-logos/" + folder + "/" + file);
    });
  }

  function enrich(c, events, cb) {
    var ids = [];
    var i;

    for (i = 0; i < events.length; i++) {
      if (events[i].eventId && !events[i].market) ids.push(events[i].eventId);
    }

    if (!ids.length) return cb(events);

    getJson(proxy(c, "/partner-api/sportsbook/public/v2/events/main-markets", {
      eventIds: ids.slice(0, 40).join(","),
      marketTypeIds: "77,23,100,103"
    }), "omit", function (e, d) {
      if (!e && d && d.data) {
        d.data.forEach(function (mt) {
          var em = mt.eventMarkets || {};
          events.forEach(function (ev) {
            if (!ev.market && em[ev.eventId]) ev.market = em[ev.eventId];
          });
        });
      }

      cb(events);
    });
  }

  function renderEvents(id, c, events, title, max) {
    var box = qs(id);
    if (!box) return;

    events = events || [];
    max = max || 8;

    var html = '<div class="t"><span>' + esc(title) + '</span><span class="m">' + events.length + '</span></div>';
    var signals = accountSignals();

    if (!events.length) html += '<div class="m">No events found.</div>';

    events.slice(0, max).forEach(function (ev, i) {
      var tm = teams(ev);
      var fl = flag(ev.regionName);
      var odds = (ev.market && ev.market.outcomes) || [];
      var p = id + "-" + i;
      var href = eventHref(ev, tm, signals);
      var liveKey = registerLiveEvent(ev, tm);
      var liveButton = liveStatsButtonHtml(liveKey, tm.h + " vs " + tm.a);

      html += '<div class="ev"><div class="m">' + (fl ? '<img class="flag" src="' + fl + '"> ' : '') + esc(ev.tournamentName || ev.regionName || "") + ' · ' + esc(dateText(ev.startTime)) + ' · <a class="m" href="' + esc(href) + '">Open match</a>' + liveButton + '</div>';
      html += '<div class="match"><div class="team"><span id="' + p + '-hi" class="init">' + esc(initials(tm.h)) + '</span><img id="' + p + '-hl" class="logo" style="display:none"><span>' + esc(tm.h) + '</span></div><span class="m">vs</span><div class="team"><span id="' + p + '-ai" class="init">' + esc(initials(tm.a)) + '</span><img id="' + p + '-al" class="logo" style="display:none"><span>' + esc(tm.a) + '</span></div></div><div class="od">';

      odds.slice(0, 4).forEach(function (o) {
        html += '<a class="pill" href="' + esc(href) + '"><b>' + esc(o.shortName || o.name) + '</b> ' + esc(o.odds) + '</a>';
      });

      if (!odds.length) html += '<span class="m">Odds loading or unavailable</span>';
      html += '</div></div>';
    });

    box.innerHTML = html;
    bindLiveButtons(c, box);

    events.slice(0, max).forEach(function (ev, i) {
      var tm = teams(ev);
      var p = id + "-" + i;
      setLogo(c, ev.sportId, tm.h, p + "-hl", p + "-hi");
      setLogo(c, ev.sportId, tm.a, p + "-al", p + "-ai");
    });
  }

  function flat(data) {
    var out = [];

    ((data && data.tournaments) || []).forEach(function (t) {
      (t.events || []).forEach(function (ev) {
        ev.tournamentName = ev.tournamentName || t.tournamentName;
        out.push(ev);
      });
    });

    return out;
  }

  function topEvents(c) {
    getJson(proxy(c, "/partner-api/sportsbook/public/v2/events/top"), "omit", function (e, d) {
      renderEvents("dmbo-top", c, e ? [] : d.events || [], "Top Events & Odds", 8);
    });
  }

  function worldCup(c) {
    getJson(proxy(c, "/partner-api/sportsbook/public/v2/listing/tournaments-with-events", {
      sportId: "1",
      sportService: "PREMATCH",
      regionId: "2172",
      tournamentId: "77983",
      offset: "0",
      limit: "100"
    }), "omit", function (e, d) {
      var events = e ? [] : flat(d);

      enrich(c, events, function (x) {
        renderEvents("dmbo-worldcup", c, x, "World Cup 2026", 10);
      });
    });
  }

  function sports(c) {
    var params = { sportService: sport.service };

    if (sport.service === "LIVE") {
      params.onlyHotOrBestOdds = "false";
      params.onlyBestOdds = "false";
    }

    getJson(proxy(c, "/partner-api/sportsbook/public/v2/sports", params), "omit", function (e, d) {
      var box = qs("dmbo-sports");
      if (!box) return;

      var list = e ? [] : d.sports || [];
      var html = '<div class="t"><span>All Sports</span><span><button class="btn" id="dmbo-live">Live</button> <button class="btn btn2" id="dmbo-pre">Pre</button></span></div><div class="od">';

      list.forEach(function (s) {
        html += '<button class="pill sport-chip" data-id="' + esc(s.id) + '" data-name="' + esc(s.name) + '">' + esc(s.name) + '</button>';
      });

      html += '</div><div id="dmbo-sport-events" style="margin-top:10px"><div class="m">Loading Football events...</div></div>';

      box.innerHTML = html;

      qs("dmbo-live").onclick = function () {
        sport.service = "LIVE";
        sport.offset = 0;
        sport.events = [];
        sports(c);
      };

      qs("dmbo-pre").onclick = function () {
        sport.service = "PREMATCH";
        sport.offset = 0;
        sport.events = [];
        sports(c);
      };

      Array.prototype.forEach.call(document.querySelectorAll(".sport-chip"), function (b) {
        b.onclick = function () {
          sport.sportId = this.getAttribute("data-id");
          sport.sportName = this.getAttribute("data-name");
          sport.offset = 0;
          sport.events = [];
          sport.done = false;
          loadSportEvents(c, true);
        };
      });

      loadSportEvents(c, true);
    });
  }

  function loadSportEvents(c, reset) {
    var box = qs("dmbo-sport-events");
    if (!box || sport.loading) return;

    if (reset) {
      sport.offset = 0;
      sport.events = [];
      sport.done = false;
    }

    sport.loading = true;
    box.innerHTML = '<div class="m">Loading ' + esc(sport.sportName) + ' events...</div>';

    getJson(proxy(c, "/partner-api/sportsbook/public/v2/listing/tournaments-with-events", {
      sportId: sport.sportId,
      sportService: sport.service,
      offset: String(sport.offset),
      limit: String(sport.limit)
    }), "omit", function (e, d) {
      var fresh = e ? [] : flat(d);

      sport.offset += sport.limit;
      if (!fresh.length) sport.done = true;

      sport.events = sport.events.concat(fresh);

      enrich(c, sport.events, function (events) {
        sport.events = events;

        box.innerHTML = '<div id="dmbo-sport-list"></div>' + (sport.done ? '<span class="m">End of list</span>' : '<button class="btn btn2" id="dmbo-more-sport">Load more</button>');

        renderEvents("dmbo-sport-list", c, sport.events, sport.sportName + " Events", 10);

        var more = qs("dmbo-more-sport");
        if (more) more.onclick = function () {
          loadSportEvents(c, false);
        };

        sport.loading = false;
      });
    });
  }

  function gameImg(game) {
    var p = "/api/cmsgateway/api/v1/AssetsSite/gameimage/" + encodeURIComponent(game.id) + "?width=282&height=212";
    var f = "/api/cmsgateway/api/v1/AssetTemplateSite/gameimage/" + encodeURIComponent(game.id) + "?width=282&height=212";

    return '<img class="gimg" src="' + p + '" loading="lazy" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=\'' + f + '\';}else{this.style.display=\'none\';}">';
  }

  function casinoRender(c) {
    var box = qs("dmbo-casino");
    if (!box) return;

    var html = '<div class="t"><span>All Casino Games</span><span class="m">' + casino.games.length + '</span></div><div class="search"><input id="dmbo-casino-q" placeholder="Search casino games" value="' + esc(casino.query) + '"><button class="btn" id="dmbo-casino-search">Search</button><button class="btn btn2" id="dmbo-casino-all">Load all</button></div><div class="grid">';

    casino.games.forEach(function (g) {
      html += '<div class="game">' + gameImg(g) + '<div class="gb"><div class="gn">' + esc(g.name) + '</div><div class="m">' + esc(g.providerName || "") + (g.hasDemoMode ? " · demo" : "") + '</div></div></div>';
    });

    html += '</div><div style="margin-top:10px;display:flex;gap:8px;align-items:center">' + (casino.done ? '<span class="m">End of list</span>' : '<button class="btn btn2" id="dmbo-casino-more">Load more</button>') + (casino.loading ? '<span class="m">Loading...</span>' : "") + '</div>';

    box.innerHTML = html;

    var input = qs("dmbo-casino-q");
    var search = qs("dmbo-casino-search");
    var more = qs("dmbo-casino-more");
    var all = qs("dmbo-casino-all");

    if (search) search.onclick = function () {
      casino.query = input ? input.value : "";
      casino.page = 0;
      casino.games = [];
      casino.done = false;
      casinoPage(c);
    };

    if (input) input.onkeydown = function (e) {
      if (e.key === "Enter" && search) search.onclick();
    };

    if (more) more.onclick = function () {
      casinoPage(c);
    };

    if (all) all.onclick = function () {
      casinoAll(c);
    };
  }

  function casinoPage(c) {
    if (casino.loading || casino.done) return;

    casino.loading = true;
    casino.page += 1;
    casinoRender(c);

    var url = c.casinoGamesUrl + "?page=" + casino.page + (casino.query ? "&query=" + encodeURIComponent(casino.query) : "");

    getJson(url, "include", function (e, games) {
      if (e || !Array.isArray(games) || !games.length) {
        casino.done = true;
      } else {
        casino.games = casino.games.concat(games);
        if (games.length < 100) casino.done = true;
      }

      casino.loading = false;
      casinoRender(c);
    });
  }

  function casinoAll(c) {
    if (casino.loading) return;

    function next() {
      if (casino.done || casino.page >= c.casinoMaxPages) {
        casinoRender(c);
        return;
      }

      casinoPage(c);
      setTimeout(next, 850);
    }

    next();
  }

  function timeLabel(seconds) {
    var n = Number(seconds);
    var m;
    var s;

    if (!isFinite(n) || n < 0) return "0:00";

    m = Math.floor(n / 60);
    s = Math.floor(n % 60);

    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function setupVideoPlayer(videoConfig) {
    var video = qs("dmbo-video");
    var play = qs("dmbo-video-play");
    var mute = qs("dmbo-video-mute");
    var seek = qs("dmbo-video-seek");
    var time = qs("dmbo-video-time");

    if (!video || !play || !mute || !seek || !time) return;

    play.onclick = function () {
      if (video.paused) {
        video.play().catch(function () {});
      } else {
        video.pause();
      }
    };

    mute.onclick = function () {
      video.muted = !video.muted;
      mute.textContent = video.muted ? "Sound" : "Mute";
    };

    seek.oninput = function () {
      if (!isFinite(video.duration) || !video.duration) return;
      video.currentTime = (Number(seek.value) / 100) * video.duration;
    };

    video.onplay = function () { play.textContent = "Pause"; };
    video.onpause = function () { play.textContent = "Play"; };
    video.ontimeupdate = function () {
      if (isFinite(video.duration) && video.duration) seek.value = String((video.currentTime / video.duration) * 100);
      time.textContent = timeLabel(video.currentTime) + " / " + timeLabel(video.duration);
    };

    if (videoConfig && videoConfig.autoplay) {
      video.muted = videoConfig.muted !== false;
      video.play().catch(function () {});
    }
  }

  function videoPanelHtml(c, widget) {
    var video = panelConfig(widget, "video");
    var source = video.source || video.src || c.videoSource;
    var poster = video.poster || c.videoPoster;
    var title = video.title || c.videoTitle;
    var type = video.type || "";

    if (!source) {
      return '<div class="b"><div class="video-empty">' + esc(title) + '</div></div>';
    }

    return '<div class="b"><div class="video-wrap"><video id="dmbo-video" preload="metadata" playsinline ' + (poster ? 'poster="' + esc(poster) + '" ' : "") + '>' +
      '<source src="' + esc(source) + '"' + (type ? ' type="' + esc(type) + '"' : "") + '>' +
      '</video><div class="vc"><button id="dmbo-video-play" type="button">Play</button><button id="dmbo-video-mute" type="button">Mute</button><input id="dmbo-video-seek" type="range" min="0" max="100" value="0" step="1"><span class="time" id="dmbo-video-time">0:00</span></div></div></div>';
  }

  function elementVisible(el) {
    var r;

    if (!el) return false;

    try {
      r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
    } catch (e) {
      return true;
    }
  }

  function accountSignals() {
    var loginCtas = [];

    try {
      loginCtas = Array.prototype.slice.call(document.querySelectorAll('a[href*="m=login"],a[href*="login"],button,[role="button"]')).filter(function (el) {
        var text = clean(el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("href") || "");
        return elementVisible(el) && (text.indexOf("login") !== -1 || text.indexOf("log in") !== -1 || text.indexOf("register") !== -1);
      });
    } catch (e) {}

    return {
      hasLoginCta: loginCtas.length > 0
    };
  }

  function accountLoginHref(kind) {
    var prefix = localePrefix();
    var returnUrl = String(window.location && window.location.pathname || prefix + "/home/adv");
    var mode = kind === "register" ? "registration&t=email" : "login&t=phone";

    return prefix + "/home/adv?m=" + mode + "&returnUrl=" + encodeURIComponent(returnUrl);
  }

  function accountConfig(widget) {
    var account = panelConfig(widget, "account");

    account.endpoints = account.endpoints || {};
    account.title = account.title || "Player Status";
    account.baseCurrency = account.baseCurrency || "EUR";

    return account;
  }

  function accountDataEndpoints(account) {
    return (account && account.dataEndpoints) || (account && account.endpoints) || {};
  }

  function scalarCandidate(v) {
    var picked;

    if (v == null) return "";

    if (typeof v !== "object") return String(v);

    ["name", "title", "label", "value", "amount", "balance", "availableAmount", "availableBalance", "realBalance", "bonusBalance", "totalBalance"].some(function (key) {
      if (v[key] != null && typeof v[key] !== "object") {
        picked = String(v[key]);
        return true;
      }
      return false;
    });

    return picked || "";
  }

  function accountTypeKey(v) {
    return clean(v).replace(/[^a-z0-9]+/g, "");
  }

  function extractRawValue(data, keys) {
    var found;
    var wanted = {};

    (keys || []).forEach(function (key) {
      wanted[String(key).toLowerCase()] = true;
    });

    function walk(v) {
      if (found !== undefined || v == null) return;

      if (Array.isArray(v)) {
        v.some(function (item) {
          walk(item);
          return found !== undefined;
        });
        return;
      }

      if (typeof v !== "object") return;

      Object.keys(v).some(function (key) {
        if (wanted[String(key).toLowerCase()]) {
          found = v[key];
          return true;
        }
        return false;
      });

      if (found !== undefined) return;

      Object.keys(v).some(function (key) {
        walk(v[key]);
        return found !== undefined;
      });
    }

    walk(data);
    return found;
  }

  function extractValue(data, keys) {
    var found = "";

    function walk(v) {
      var objectKeys;

      if (found || v == null) return;

      if (Array.isArray(v)) {
        v.some(function (item) {
          walk(item);
          return !!found;
        });
        return;
      }

      if (typeof v !== "object") return;

      objectKeys = Object.keys(v);

      keys.some(function (wantedKey) {
        return objectKeys.some(function (key) {
          var scalar;

          if (String(key).toLowerCase() !== String(wantedKey).toLowerCase()) return false;

          scalar = scalarCandidate(v[key]);
          if (!scalar) return false;

          found = scalar;
          return true;
        });
      });

      if (found) return;

      objectKeys.some(function (key) {
        walk(v[key]);
        return !!found;
      });
    }

    walk(data);
    return found;
  }

  function extractPreferredValue(data, keys) {
    var value = "";

    (keys || []).some(function (key) {
      value = extractValue(data, [key]);
      return !!value;
    });

    return value;
  }

  function extractPreferredRawValue(data, keys) {
    var value;

    (keys || []).some(function (key) {
      value = extractRawValue(data, [key]);
      return value !== undefined && value !== null && scalarCandidate(value) !== "";
    });

    return value;
  }

  function firstScalarInMap(v, currency) {
    var keys;
    var preferred;

    if (v == null) return "";

    if (typeof v !== "object") return String(v);

    if (currency && v[currency] != null && typeof v[currency] !== "object") return String(v[currency]);

    preferred = String(currency || "").toLowerCase();
    keys = Object.keys(v);

    if (preferred) {
      for (var i = 0; i < keys.length; i += 1) {
        if (String(keys[i]).toLowerCase() === preferred && v[keys[i]] != null && typeof v[keys[i]] !== "object") {
          return String(v[keys[i]]);
        }
      }
    }

    for (var j = 0; j < keys.length; j += 1) {
      if (v[keys[j]] != null && typeof v[keys[j]] !== "object") return String(v[keys[j]]);
    }

    return scalarCandidate(v);
  }

  function extractCurrency(data) {
    var currency = extractValue(data, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]);

    return currency ? currency.toUpperCase() : "";
  }

  function amountWithCurrency(amount, currency) {
    if (amount == null || amount === "") return "-";

    return String(amount) + (currency ? " " + currency : "");
  }

  function cleanCurrencyCode(v) {
    var code = String(v || "").trim().toUpperCase();

    if (!code || code.length > 12 || !/^[A-Z0-9._-]+$/.test(code)) return "";

    return code;
  }

  function scalarAmount(v, currency) {
    var amount = firstScalarInMap(v, currency || "");

    return amount == null ? "" : String(amount);
  }

  function addCurrencyAmount(out, currency, amount) {
    var code = cleanCurrencyCode(currency);
    var value = amount == null ? "" : String(amount);

    if (!code || value === "" || typeof amount === "object") return;

    out[code] = value;
  }

  function addCurrencyMap(out, raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

    Object.keys(raw).forEach(function (key) {
      if (raw[key] != null && typeof raw[key] !== "object") addCurrencyAmount(out, key, raw[key]);
    });
  }

  function mergeCurrencyAmounts(out, source) {
    Object.keys(source || {}).forEach(function (key) {
      addCurrencyAmount(out, key, source[key]);
    });
  }

  function itemAmount(v, keys) {
    var amount = "";

    (keys || []).some(function (key) {
      if (v && v[key] != null) {
        amount = scalarAmount(v[key]);
        return !!amount;
      }
      return false;
    });

    return amount;
  }

  function collectCurrencyAmounts(data, wantedType, mapKeys, itemKeys) {
    var out = {};
    var wanted = accountTypeKey(wantedType);

    (mapKeys || []).forEach(function (key) {
      addCurrencyMap(out, extractRawValue(data, [key]));
    });

    function walk(v) {
      var itemType;
      var currency;
      var amount;

      if (v == null) return;

      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }

      if (typeof v !== "object") return;

      itemType = accountTypeKey(v.type || v.balanceType || v.accountType || v.name || v.code);
      if (!wanted || itemType === wanted) {
        currency = v.currency || v.currencyCode || v.currencyName || v.displayCurrency || v.id;
        amount = itemAmount(v, itemKeys);
        addCurrencyAmount(out, currency, amount);
      }

      Object.keys(v).forEach(function (key) {
        walk(v[key]);
      });
    }

    walk(data);
    return out;
  }

  function formatCurrencyAmounts(map, preferredCurrency) {
    var preferred = cleanCurrencyCode(preferredCurrency);
    var keys = Object.keys(map || {}).filter(function (key) {
      return map[key] != null && map[key] !== "";
    }).sort();

    if (preferred && keys.indexOf(preferred) > 0) {
      keys.splice(keys.indexOf(preferred), 1);
      keys.unshift(preferred);
    }

    return keys.length ? keys.map(function (key) {
      return key + " " + map[key];
    }).join(" · ") : "-";
  }

  function prettyStatus(value) {
    var raw = scalarCandidate(value);
    var text;

    if (raw === "true") return "Verified";
    if (raw === "false") return "Unverified";
    if (!raw) return "";

    text = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!text) return "";

    return text.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function balanceEntryAmount(data, wantedType, currency) {
    var found = "";
    var wanted = accountTypeKey(wantedType);

    function walk(v) {
      var itemCurrency;

      if (found || v == null) return;

      if (Array.isArray(v)) {
        v.some(function (item) {
          walk(item);
          return !!found;
        });
        return;
      }

      if (typeof v !== "object") return;

      if (accountTypeKey(v.type || v.balanceType || v.accountType || v.name || v.code) === wanted) {
        itemCurrency = v.currency || v.currencyCode || v.currencyName || v.displayCurrency;
        if (!currency || !itemCurrency || String(itemCurrency).toUpperCase() === currency) {
          found = firstScalarInMap(v.balance, currency) ||
            firstScalarInMap(v.amount, currency) ||
            firstScalarInMap(v.availableAmount, currency) ||
            firstScalarInMap(v.availableBalance, currency) ||
            firstScalarInMap(v.realBalance, currency) ||
            firstScalarInMap(v.total, currency) ||
            firstScalarInMap(v.totalBalance, currency);
          if (found) return;
        }
      }

      Object.keys(v).some(function (key) {
        walk(v[key]);
        return !!found;
      });
    }

    walk(data);
    return found;
  }

  function currencyAmount(data, keys, currency) {
    var raw = extractRawValue(data, keys);

    return firstScalarInMap(raw, currency);
  }

  function summarizeAccountData(account, result) {
    var profile = {
      userInfo: result.userInfo || {},
      profile: result.profile || {}
    };
    var balances = result.balances || {};
    var accounts = result.accounts || {};
    var baseBalanceData = result.baseBalance || {};
    var bonuses = result.bonuses || {};
    var level = result.level || {};
    var currency = (account && account.currency) || extractCurrency(profile) || extractCurrency(balances) || extractCurrency(accounts) || extractCurrency(bonuses);
    var baseCurrency = extractCurrency(baseBalanceData) || (account && account.baseCurrency) || currency;
    var balanceMap = collectCurrencyAmounts(balances, "playerAccount", ["used", "playerAccount", "balance"], ["balance", "amount", "availableAmount", "availableBalance", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "total", "totalBalance"]);
    mergeCurrencyAmounts(balanceMap, collectCurrencyAmounts(accounts, "playerAccount", ["used", "playerAccount", "balance"], ["balance", "amount", "availableAmount", "availableBalance", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "total", "totalBalance"]));
    var baseBalance = balanceEntryAmount(baseBalanceData, "playerAccount", baseCurrency) ||
      currencyAmount(baseBalanceData, ["balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "amount", "total", "totalBalance"], baseCurrency);
    var baseBonus = balanceEntryAmount(baseBalanceData, "playerUnusedBalance", baseCurrency) ||
      currencyAmount(baseBalanceData, ["bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance"], baseCurrency);
    if (!baseBalance && currency && balanceMap[cleanCurrencyCode(currency)] != null) {
      baseBalance = balanceMap[cleanCurrencyCode(currency)];
      baseCurrency = currency;
    }
    if (baseBalance) addCurrencyAmount(balanceMap, baseCurrency || currency, baseBalance);
    var balance = baseBalance ||
      balanceEntryAmount(balances, "playerAccount", currency) ||
      currencyAmount(balances, ["used", "playerAccount", "balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "amount", "total", "totalBalance"], currency) ||
      currencyAmount(profile, ["balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash"], currency);
    var bonus = baseBonus ||
      balanceEntryAmount(balances, "playerUnusedBalance", currency) ||
      currencyAmount(balances, ["unUsed", "unused", "playerUnusedBalance", "bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance"], currency) ||
      currencyAmount(bonuses, ["bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance", "amount", "total", "count"], currency);
    var lvl = extractValue(level, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]) ||
      extractValue(profile, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]);
    var category = extractValue(level, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]) ||
      extractValue(profile, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]);
    var status = prettyStatus(extractPreferredRawValue(profile, ["verificationStatus", "kycStatus", "kycVerificationStatus", "accountStatus", "playerStatus", "isVerified", "verified", "status"])) ||
      prettyStatus(extractPreferredRawValue(level, ["verificationStatus", "kycStatus", "kycVerificationStatus", "accountStatus", "playerStatus", "isVerified", "verified", "status"]));

    return {
      name: extractPreferredValue(profile, ["userName", "username", "email", "phone", "firstName", "name"]) || "Signed in",
      uid: extractPreferredValue(profile, ["walletNumber", "walletNo", "accountNumber", "accountNo", "customerNumber", "clientNumber", "playerNumber", "publicId", "publicID", "id", "uid", "playerId", "userId"]) || "-",
      balance: amountWithCurrency(balance, baseCurrency || currency),
      bonus: amountWithCurrency(bonus, baseCurrency || currency),
      allBalances: formatCurrencyAmounts(balanceMap, baseCurrency || currency),
      level: lvl || "-",
      category: category || "-",
      status: status || "-"
    };
  }

  function accountBalanceMode() {
    return window.__DMBO_ACCOUNT_BALANCE_MODE__ === "all" ? "all" : "base";
  }

  function accountBalanceDisplay(summary, mode) {
    var activeMode = mode === "all" ? "all" : "base";
    var baseValue = summary && summary.balance ? summary.balance : "-";
    var allValue = summary && summary.allBalances ? summary.allBalances : "-";
    var value = activeMode === "all" ? allValue : baseValue;

    if (!value || value === "-") {
      activeMode = "base";
      value = baseValue || "-";
    }

    return {
      label: activeMode === "all" ? "All Balances" : "Base Balance",
      value: value || "-",
      mode: activeMode
    };
  }

  function renderBalanceToggle(mode) {
    return '<div class="bal-toggle" role="group" aria-label="Balance display">' +
      '<button type="button" data-dmbo-balance-mode="base" class="' + (mode === "base" ? "on" : "") + '">Base</button>' +
      '<button type="button" data-dmbo-balance-mode="all" class="' + (mode === "all" ? "on" : "") + '">All</button>' +
      '</div>';
  }

  function resolveEndpoint(url, result) {
    var currency = extractCurrency(result && result.profile) || extractCurrency(result && result.userInfo) || extractCurrency(result && result.balances) || extractCurrency(result && result.accounts) || "";
    var baseCurrency = (result && result.__baseCurrency) || "";

    if (String(url).indexOf("{currency}") >= 0 && !currency) return "";
    if (String(url).indexOf("{baseCurrency}") >= 0 && !baseCurrency) return "";

    return String(url)
      .replace(/\{baseCurrency\}/g, encodeURIComponent(baseCurrency))
      .replace(/\{currency\}/g, encodeURIComponent(currency));
  }

  function accountDebug(item) {
    try {
      var list = window.__DMBO_ACCOUNT_DEBUG__ || [];
      list.push(item);
      window.__DMBO_ACCOUNT_DEBUG__ = list.slice(-25);
    } catch (e) {}
  }

  function responseKeys(data) {
    if (Array.isArray(data)) return ["array:" + data.length];
    if (!data || typeof data !== "object") return [typeof data];

    return Object.keys(data).slice(0, 12);
  }

  function firstEndpoint(urls, result, cb) {
    var list = Array.isArray(urls) ? urls.slice(0) : [];

    if (typeof result === "function") {
      cb = result;
      result = {};
    }

    function next() {
      var raw = list.shift();
      var url = raw ? resolveEndpoint(raw, result || {}) : "";

      if (!raw) return cb(null);
      if (!url) return next();

      fetch(url, {
        credentials: "include",
        headers: { accept: "application/json" }
      })
        .then(function (r) {
          accountDebug({ url: url, status: r.status, ok: r.ok });
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          accountDebug({ url: url, keys: responseKeys(data) });
          cb(data);
        })
        .catch(function () {
          accountDebug({ url: url, failed: true });
          next();
        });
    }

    next();
  }

  function renderAccountSummary(account, result) {
    var box = qs("dmbo-account");
    var summary = summarizeAccountData(account, result || {});
    var balance = accountBalanceDisplay(summary, accountBalanceMode());

    if (!box) return;
    lastAccountRender = { account: account, result: result || {} };

    box.innerHTML = '<div class="t"><span>' + esc(account.title || "Player Status") + '</span><span class="m">' + esc(summary.status !== "-" ? summary.status : "Live") + '</span></div>' +
      '<div class="kv">' +
      '<div><span>User</span><b>' + esc(summary.name) + '</b></div>' +
      '<div><span>ID</span><b>' + esc(summary.uid) + '</b></div>' +
      '<div class="wide"><span>' + esc(balance.label) + '</span><b>' + esc(balance.value) + '</b>' + renderBalanceToggle(balance.mode) + '</div>' +
      '<div><span>Bonus</span><b>' + esc(summary.bonus) + '</b></div>' +
      '<div><span>Level</span><b>' + esc(summary.level) + '</b></div>' +
      '<div><span>Category</span><b>' + esc(summary.category) + '</b></div>' +
      '</div>';
  }

  function installAccountBalanceToggle() {
    if (window.__DMBO_ACCOUNT_BALANCE_TOGGLE__) return;
    window.__DMBO_ACCOUNT_BALANCE_TOGGLE__ = true;

    document.addEventListener("click", function (ev) {
      var target = ev && ev.target;
      var btn = null;
      var mode;
      var root;

      try {
        btn = target && target.closest ? target.closest("[data-dmbo-balance-mode]") : null;
        root = qs(cfg().containerId);
      } catch (e) {
        btn = null;
      }

      if (!btn || !root || !root.contains(btn) || !lastAccountRender) return;

      mode = btn.getAttribute("data-dmbo-balance-mode") === "all" ? "all" : "base";
      window.__DMBO_ACCOUNT_BALANCE_MODE__ = mode;
      renderAccountSummary(lastAccountRender.account, lastAccountRender.result);
    }, true);
  }

  function accountPanel(widget) {
    var box = qs("dmbo-account");
    var account = accountConfig(widget);
    var signals = accountSignals();
    var endpoints = accountDataEndpoints(account);
    var result = { __baseCurrency: account.baseCurrency || "" };
    var pending = 0;

    if (!box) return;

    if (!shouldFetchAccountData(account, signals)) {
      box.innerHTML = '<div class="t"><span>' + esc(account.title || "Player Status") + '</span><span class="m">Guest</span></div>' +
        '<div class="m">Sign in to view profile, balances, bonuses, level, and category.</div>' +
        '<div class="od"><a class="pill" href="' + esc(accountLoginHref("login")) + '">Login</a><a class="pill" href="' + esc(accountLoginHref("register")) + '">Register</a></div>';
      return;
    }

    box.innerHTML = '<div class="t"><span>' + esc(account.title || "Player Status") + '</span><span class="m">Loading</span></div><div class="m">Checking account status...</div>';

    function loadPart(i) {
      var key = ["profile", "userInfo", "balances", "accounts", "baseBalance", "bonuses", "level"][i];

      if (!key) return renderAccountSummary(account, result);

      pending += 1;
      firstEndpoint(endpoints[key], result, function (data) {
        result[key] = data || {};
        pending -= 1;
        loadPart(i + 1);
      });
    }

    loadPart(0);
  }

  function mount(widget) {
    var c = cfg();
    var html = '<button id="dmbo-v12-close" type="button">x</button>';

    if (!document.body || window.__DMBO_WIDGET_CLOSED__ || qs(c.containerId)) return;

    try {
      if (!document.querySelector(c.triggerSelector)) return;
    } catch (e) {
      return;
    }

    cleanup(c);
    styles(c);

    var root = document.createElement("div");
    root.id = c.containerId;

    if (panelEnabled(widget, "account")) {
      html += '<div class="b d" id="dmbo-account"><div class="t">Player Status</div><div class="m">Checking...</div></div>';
    }

    if (panelEnabled(widget, "lottie")) {
      html += '<div class="b"><div id="dmbo-lottie" style="width:100%;height:176px"></div></div>';
    }

    if (panelEnabled(widget, "video")) {
      html += videoPanelHtml(c, widget);
    }

    if (panelEnabled(widget, "youtube")) {
      html += '<div class="b"><iframe title="YouTube" src="' + esc(c.youtubeEmbedUrl) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    }

    if (panelEnabled(widget, "iframe")) {
      html += '<div class="b"><iframe title="' + esc(c.iframeTitle) + '" src="' + esc(c.iframeUrl) + '" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="note">External iframe may be blocked. <a href="' + esc(c.iframeUrl) + '" target="_blank" rel="noopener noreferrer">Open</a></div></div>';
    }

    if (panelEnabled(widget, "top")) {
      html += '<div class="b d" id="dmbo-top"><div class="t">Top Events & Odds</div><div class="m">Loading...</div></div>';
    }

    if (panelEnabled(widget, "worldcup")) {
      html += '<div class="b d" id="dmbo-worldcup"><div class="t">World Cup 2026</div><div class="m">Loading...</div></div>';
    }

    if (panelEnabled(widget, "sports")) {
      html += '<div class="b d s2" id="dmbo-sports"><div class="t">All Sports</div><div class="m">Loading...</div></div>';
    }

    if (panelEnabled(widget, "casino")) {
      html += '<div class="b d s3" id="dmbo-casino"><div class="t">All Casino Games</div><div class="m">Loading...</div></div>';
    }

    root.innerHTML = html;

    document.body.appendChild(root);

    qs("dmbo-v12-close").onclick = function () {
      window.__DMBO_WIDGET_CLOSED__ = true;
      if (root.parentNode) root.parentNode.removeChild(root);
    };

    if (panelEnabled(widget, "lottie") && window.lottie && window.lottie.loadAnimation && qs("dmbo-lottie")) {
      window.lottie.loadAnimation({
        container: qs("dmbo-lottie"),
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: c.lottiePath
      });
    }

    resetWidgetData();

    if (panelEnabled(widget, "video")) setupVideoPlayer(panelConfig(widget, "video"));
    if (panelEnabled(widget, "account")) accountPanel(widget);
    if (panelEnabled(widget, "top")) topEvents(c);
    if (panelEnabled(widget, "worldcup")) worldCup(c);
    if (panelEnabled(widget, "sports")) sports(c);
    if (panelEnabled(widget, "casino")) casinoPage(c);

    log("[DMBO] widget mounted");
  }

  function layerRouteKey(layers) {
    var widget = layers.dmboWidget;
    return [
      layers.path,
      layers.pageIds.join(","),
      widget ? widget.id || widget.type || "dmbo-v12" : "none",
      widget && widget.panels ? widget.panels.join(",") : ""
    ].join("|");
  }

  function syncRoute() {
    var c = cfg();
    var layers = getActiveLayers(manifest || createDefaultManifest(), window.location && window.location.href);
    var key = layerRouteKey(layers);

    applyDocumentTitle(layers);

    if (key !== currentRouteKey) {
      cleanup(c);
      removePageAssets();
      currentRouteKey = key;
      applyAssets(layers);
    }

    currentDmboWidget = layers.dmboWidget;

    if (!currentDmboWidget) {
      cleanup(c);
      return;
    }

    if (qs(c.containerId)) return;

    if (needsLottie(currentDmboWidget) && !lottieReady) {
      loadScript(LOTTIE_URL, function (ok) {
        lottieReady = !!ok;
        mount(currentDmboWidget);
      });
      return;
    }

    mount(currentDmboWidget);
  }

  function scheduleSyncRoute() {
    clearTimeout(window.__DMBO_WIDGET_ROUTE_TIMER__);
    window.__DMBO_WIDGET_ROUTE_TIMER__ = setTimeout(syncRoute, 120);
  }

  function installRouteHooks() {
    var pushState;
    var replaceState;

    if (routeHooked) return;
    routeHooked = true;

    try {
      pushState = window.history && window.history.pushState;
      replaceState = window.history && window.history.replaceState;

      if (pushState) {
        window.history.pushState = function () {
          var result = pushState.apply(this, arguments);
          scheduleSyncRoute();
          return result;
        };
      }

      if (replaceState) {
        window.history.replaceState = function () {
          var result = replaceState.apply(this, arguments);
          scheduleSyncRoute();
          return result;
        };
      }
    } catch (e) {}

    try {
      window.addEventListener("popstate", scheduleSyncRoute);
      window.addEventListener("hashchange", scheduleSyncRoute);
      window.addEventListener("dmbo-media-config-ready", scheduleSyncRoute);
    } catch (e) {}
  }

  function loadManifest(cb) {
    var c = cfg();
    var url = c.manifestUrl || MANIFEST_URL;
    var bust = (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();

    if (!window.fetch) {
      manifest = createDefaultManifest();
      window.DMBO_WIDGET_MANIFEST = manifest;
      cb(manifest);
      return;
    }

    fetch(url + bust, {
      cache: "no-store",
      credentials: "omit",
      headers: { accept: "application/json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) {
        manifest = d && typeof d === "object" ? d : createDefaultManifest();
        window.DMBO_WIDGET_MANIFEST = manifest;
        cb(manifest);
      })
      .catch(function (e) {
        err("[DMBO] manifest failed; using default", e && e.message ? e.message : e);
        manifest = createDefaultManifest();
        window.DMBO_WIDGET_MANIFEST = manifest;
        cb(manifest);
      });
  }

  function boot() {
    cfg();
    installAccountBalanceToggle();
    installRouteHooks();
    syncRoute();

    if (typeof MutationObserver === "function" && document.body) {
      new MutationObserver(function () {
        if (!currentDmboWidget || qs(cfg().containerId)) return;
        scheduleSyncRoute();
      }).observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  function start() {
    loadScript(CONFIG_URL, function () {
      cfg();
      loadManifest(boot);
    });
  }

  if (window.__DMBO_WIDGET_TEST_MODE__) {
    window.__DMBO_WIDGET_TESTS__ = {
      accountBalanceDisplay: accountBalanceDisplay,
      accountDataEndpoints: accountDataEndpoints,
      createDefaultManifest: createDefaultManifest,
      eventHref: eventHref,
      getActiveLayers: getActiveLayers,
      liveAnimationResolverUrl: liveAnimationResolverUrl,
      liveEventSummary: liveEventSummary,
      matchesPath: matchesPath,
      normalizePagePath: normalizePagePath,
      pageMatches: pageMatches,
      panelConfig: panelConfig,
      panelEnabled: panelEnabled,
      sameLiveSrc: sameLiveSrc,
      shouldFetchAccountData: shouldFetchAccountData,
      summarizeAccountData: summarizeAccountData
    };
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
