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
  var DEFAULT_PANELS = ["account", "lottie", "video", "youtube", "iframe", "liveMatch", "betbyFeed", "betboomMatch", "top", "worldcup", "sports", "casino"];

  var logoIndex = null;
  var logoWaiters = [];
  var logoLoading = false;
  var manifest = null;
  var currentRouteKey = "";
  var currentDmboWidget = null;
  var lottieReady = false;
  var routeHooked = false;
  var expandObserver = null;
  var expandedPanelId = "";
  var expandKeyHooked = false;
  var loadedScriptIds = {};
  var originalTitle = "";
  var titleOwned = false;
  var casino = { page: 0, query: "", loading: false, done: false, games: [] };
  var sport = {
    service: "PREMATCH",
    sportId: "1",
    sportName: "Football",
    offset: 0,
    limit: 20,
    events: [],
    sports: [],
    loading: false,
    done: false,
    window: "all"
  };
  var betby = {
    timer: 0,
    loading: false,
    error: "",
    tab: "players",
    rows: [],
    liveRows: [],
    prematchRows: [],
    comboRows: [],
    leaderboardTournaments: [],
    leaderboardId: "",
    statsRows: [],
    trackerRows: [],
    updatedAt: 0
  };
  var betboom = {
    timer: 0,
    loading: false,
    detailLoading: false,
    error: "",
    emptyMessage: "",
    tab: "overview",
    mode: "",
    query: "",
    selectedId: "",
    catalog: [],
    catalogMeta: {},
    matches: [],
    detailsById: {},
    updatedAt: 0
  };
  var lastAccountRender = null;
  var live = { timer: 0, clockTimer: 0, clock: {}, seq: 0, activeKey: "", store: {}, animationCache: {}, animationMiss: {}, animationPending: {}, visualMode: {}, updateTab: {}, goalCounts: {}, timelineCache: {}, timelinePending: {}, newsCache: {}, newsPending: {}, weatherCache: {}, weatherPending: {} };

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
    c.betbyBaseUrl = c.betbyBaseUrl || "https://demoapi.betby.com";
    c.betbyBrandId = c.betbyBrandId || "1653815133341880320";
    c.betbyOpenUrl = c.betbyOpenUrl || "https://demo.betby.com/sportsbook/tile/bets-feed";
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
      version: "20260701-expanded-catalog-1",
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
                {
                  name: "betbyFeed",
                  title: "Live Bets Feed",
                  brandId: "1653815133341880320",
                  baseUrl: "https://demoapi.betby.com",
                  lang: "en",
                  openUrl: "https://demo.betby.com/sportsbook/tile/bets-feed",
                  pollMs: 12000,
                  maxItems: 8,
                  maxEvents: 6,
                  maxCombos: 4,
                  maxLeaderboardRows: 500,
                  maxStats: 8,
                  trackerBuild: "5d5e9d98",
                  trackers: [
                    {
                      id: "brooksby-buse-wimbledon",
                      title: "Brooksby, Jenson vs Buse, Ignacio",
                      subtitle: "Grand Slam - Wimbledon",
                      provider: "statscore",
                      sportId: "5",
                      lang: "en",
                      eventId: 6575292,
                      betbyEventId: "2683375830813515798",
                      openUrl: "https://demo.betby.com/sportsbook/tile/tennis/grand-slam/wimbledon/brooksby-jenson-buse-ignacio-2683375830813515798"
                    }
                  ],
                  tabs: ["players", "live", "prematch", "combo", "leaderboard", "stats", "tracker"]
                },
                {
                  name: "betboomMatch",
                  title: "BetBoom Match Center",
                  catalogPath: "/betboom/catalog",
                  workerPath: "/betboom/statshub",
                  lang: "en",
                  pollMs: 600000,
                  catalogLimit: 42,
                  catalogDefaultMode: "all",
                  catalogModes: ["all", "live", "prematch", "history"],
                  catalogSportIds: [2, 4, 5, 1, 11, 10],
                  catalogMaxTournaments: 12,
                  catalogMaxMatchesPerTournament: 8,
                  maxStats: 12,
                  maxImages: 14,
                  tabs: ["overview", "players", "stats", "timeline", "images", "sources"],
                  matches: [
                    {
                      id: "merida-medvedev-wimbledon",
                      matchId: "5146706",
                      title: "Merida Aguilar D. vs Medvedev D.",
                      subtitle: "Wimbledon tennis match center",
                      openUrl: "https://betboom.ru/sport/tennis/365/5019/5146706",
                      players: [
                        {
                          side: "away",
                          name: "Medvedev",
                          imageUrl: "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/11411252-f30c-474d-9d95-4a4e2b285338.webp"
                        }
                      ],
                      imageUrls: [
                        "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/47759e63-4ac3-4ed3-a8a5-64325f9fbaa7.webp",
                        "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/11411252-f30c-474d-9d95-4a4e2b285338.webp"
                      ]
                    }
                  ]
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
    closeExpandedPanel();
    if (expandObserver) {
      try { expandObserver.disconnect(); } catch (e) {}
      expandObserver = null;
    }
    if (betby.timer) {
      clearInterval(betby.timer);
      betby.timer = 0;
    }

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
    if (betby.timer) {
      clearInterval(betby.timer);
      betby.timer = 0;
    }
    if (betboom.timer) {
      clearInterval(betboom.timer);
      betboom.timer = 0;
    }
    casino = { page: 0, query: "", loading: false, done: false, games: [] };
    sport = {
      service: "PREMATCH",
      sportId: "1",
      sportName: "Football",
      offset: 0,
      limit: 20,
      events: [],
      sports: [],
      loading: false,
      done: false,
      window: "all"
    };
    betby = {
      timer: 0,
      loading: false,
      error: "",
      tab: "players",
      rows: [],
      liveRows: [],
      prematchRows: [],
      comboRows: [],
      leaderboardTournaments: [],
      leaderboardId: "",
      statsRows: [],
      trackerRows: [],
      updatedAt: 0
    };
    betboom = {
      timer: 0,
      loading: false,
      detailLoading: false,
      error: "",
      emptyMessage: "",
      tab: "overview",
      mode: "",
      query: "",
      selectedId: "",
      catalog: [],
      catalogMeta: {},
      matches: [],
      detailsById: {},
      updatedAt: 0
    };
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
      "#" + c.containerId + " .dmbo-expand-btn{flex:0 0 auto;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:#24314f;color:#fff;font-size:10px;font-weight:900;line-height:1;padding:6px 7px;cursor:pointer;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .dmbo-expand-btn:hover{background:#31436d;transform:translateY(-1px)}#" + c.containerId + " .dmbo-expand-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}#" + c.containerId + " .dmbo-expand-float{position:absolute;top:8px;left:8px;z-index:4;background:rgba(36,49,79,.9)}" +
      "#" + c.containerId + ".dmbo-expanded-root{inset:12px!important;right:12px!important;bottom:12px!important;width:auto!important;height:calc(100vh - 24px);max-height:none;grid-template-columns:1fr;overflow:auto;padding:48px 14px 14px;border-radius:14px}#" + c.containerId + ".dmbo-expanded-root:before{content:attr(data-dmbo-expanded-title);position:absolute;top:15px;left:16px;right:62px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:900}#" + c.containerId + ".dmbo-expanded-root>.b{display:none}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded{display:block;grid-column:1/-1;min-height:calc(100vh - 88px);max-height:none;overflow:auto}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded.d{max-height:none}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded iframe{height:min(72vh,720px)}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .video-wrap{height:min(72vh,720px)}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .bb-layout{grid-template-columns:minmax(320px,.78fr) minmax(560px,1.22fr)}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .bb-catalog{max-height:calc(100vh - 300px)}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .grid{grid-template-columns:repeat(7,minmax(0,1fr))}#" + c.containerId + ".dmbo-expanded-root #dmbo-v12-close{top:10px;right:10px}" +
      "#" + c.containerId + " .m{font-size:11px;color:rgba(255,255,255,.62)}#" + c.containerId + " .note{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:rgba(0,0,0,.7);font-size:12px;text-align:center}" +
      "#" + c.containerId + " .ev{padding:9px 0;border-top:1px solid rgba(255,255,255,.1)}#" + c.containerId + " .match{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;font-size:12px;font-weight:700}" +
      "#" + c.containerId + " .team{display:flex;align-items:center;gap:6px;min-width:0;flex:1}#" + c.containerId + " .team span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#" + c.containerId + " .logo,#" + c.containerId + " .flag{width:22px;height:22px;object-fit:cover;border-radius:50%;background:rgba(255,255,255,.12)}#" + c.containerId + " .flag{height:16px;border-radius:3px}" +
      "#" + c.containerId + " .init{display:inline-flex;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;background:#24314f;font-size:10px;font-weight:900}" +
      "#" + c.containerId + " .od{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}#" + c.containerId + " .pill{display:inline-flex;gap:5px;align-items:center;padding:5px 7px;border-radius:7px;background:#1f2a44;color:#fff;font-size:11px;border:0}" +
      "#" + c.containerId + " a.pill{text-decoration:none}#" + c.containerId + " a.pill:hover{background:#2f4068}" +
      "#" + c.containerId + " .sports-rail{display:flex;gap:8px;overflow:auto;padding:2px 2px 9px;margin:-1px 0 8px;scrollbar-width:thin;overscroll-behavior-x:contain}#" + c.containerId + " .sports-card{position:relative;flex:0 0 86px;min-height:58px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.045);color:#fff;padding:8px 7px;cursor:pointer;text-align:center;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1),border-color .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .sports-card.on{background:rgba(255,255,255,.14);border-color:rgba(35,209,139,.45)}#" + c.containerId + " .sports-card:hover{background:rgba(255,255,255,.09);transform:translateY(-1px)}#" + c.containerId + " .sports-icon{width:24px;height:24px;margin:0 auto 5px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(35,209,139,.12);color:#23d18b;font-size:13px;font-weight:900}#" + c.containerId + " .sports-icon img{width:22px;height:22px;object-fit:contain;display:block}#" + c.containerId + " .sports-icon b{display:block;font-size:10px;line-height:1}#" + c.containerId + " .sports-card span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:900}#" + c.containerId + " .sports-live{position:absolute;top:5px;right:5px;border-radius:999px;background:#fd224e;color:#fff;font-size:8px;font-weight:900;line-height:1;padding:3px 4px}#" + c.containerId + " .sports-controls{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:0 0 9px;padding:7px;border-radius:10px;background:rgba(255,255,255,.055)}#" + c.containerId + " .sports-seg,#" + c.containerId + " .sports-times{display:flex;flex-wrap:wrap;gap:5px}#" + c.containerId + " .sports-controls button{border:0;border-radius:7px;background:#24314f;color:#fff;font-size:11px;font-weight:900;padding:7px 9px;cursor:pointer}#" + c.containerId + " .sports-controls button.on{background:#fff;color:#151923}#" + c.containerId + " .sports-controls button:focus-visible,#" + c.containerId + " .sports-card:focus-visible{outline:2px solid #fff;outline-offset:2px}#" + c.containerId + " .sports-summary{margin-left:auto;font-size:10px;color:rgba(255,255,255,.6)}#" + c.containerId + " .sports-groups{display:grid;gap:7px}#" + c.containerId + " .sports-group{border-radius:9px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);overflow:hidden}#" + c.containerId + " .sports-group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border-bottom:1px solid rgba(255,255,255,.07);font-size:11px;font-weight:900}#" + c.containerId + " .sports-group-head span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .sports-group-head b{font-size:10px;color:rgba(255,255,255,.58)}#" + c.containerId + " .sports-event{display:grid;grid-template-columns:minmax(0,1.15fr) 70px minmax(180px,.95fr);gap:9px;align-items:center;padding:9px;border-top:1px solid rgba(255,255,255,.06)}#" + c.containerId + " .sports-event:first-child{border-top:0}#" + c.containerId + " .sports-event .match{margin:0}#" + c.containerId + " .sports-clock{display:grid;gap:3px;text-align:center;font-size:10px;color:rgba(255,255,255,.58)}#" + c.containerId + " .sports-clock b{color:#23d18b;font-size:13px;font-variant-numeric:tabular-nums}#" + c.containerId + " .sports-odds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}#" + c.containerId + " .sports-odds a,#" + c.containerId + " .sports-odds span{min-width:0;border-radius:8px;background:rgba(255,255,255,.08);padding:7px 6px;text-align:center;color:#fff;text-decoration:none;font-size:11px}#" + c.containerId + " .sports-odds b{display:block;color:rgba(255,255,255,.56);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .sports-odds a:hover{background:rgba(255,255,255,.13)}" +
      "#" + c.containerId + " .bet-feed-list{display:grid;gap:8px}#" + c.containerId + " .bet-row{display:grid;gap:7px;padding:9px;border-radius:9px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);animation:dmboBetRowIn .22s cubic-bezier(.23,1,.32,1);transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-row:hover{background:rgba(255,255,255,.075);transform:translateY(-1px)}#" + c.containerId + " .bet-row:first-child{border-color:rgba(253,34,78,.32);box-shadow:0 0 0 1px rgba(253,34,78,.08) inset}#" + c.containerId + " .bet-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px}#" + c.containerId + " .bet-player{min-width:0;display:flex;align-items:center;gap:6px;font-weight:900}#" + c.containerId + " .bet-player i{width:7px;height:7px;border-radius:50%;background:#23d18b;box-shadow:0 0 0 0 rgba(35,209,139,.45);animation:dmboLiveDot 1.4s ease-out infinite}#" + c.containerId + " .bet-type{flex:0 0 auto;color:rgba(255,255,255,.62);text-transform:uppercase;font-size:10px;font-weight:900}#" + c.containerId + " .bet-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}#" + c.containerId + " .bet-metric{min-width:0;border-radius:7px;background:rgba(255,255,255,.055);padding:6px}#" + c.containerId + " .bet-metric span{display:block;font-size:9px;color:rgba(255,255,255,.52)}#" + c.containerId + " .bet-metric b{display:block;margin-top:2px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-odd{background:rgba(253,34,78,.13)}#" + c.containerId + " .bet-selection{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:rgba(255,255,255,.72)}#" + c.containerId + " .bet-selection span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-selection a{flex:0 0 auto;text-decoration:none;color:#fff}" +
      "#" + c.containerId + " .bet-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 9px;padding:3px;border-radius:9px;background:rgba(255,255,255,.055)}#" + c.containerId + " .bet-tabs button{border:0;border-radius:7px;background:transparent;color:rgba(255,255,255,.7);font-size:10px;font-weight:900;padding:6px 8px;cursor:pointer;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-tabs button:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}#" + c.containerId + " .bet-tabs button.on{background:#fd224e;color:#fff}#" + c.containerId + " .bet-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}#" + c.containerId + " .bet-event-list,#" + c.containerId + " .bet-combo-list{display:grid;gap:8px}#" + c.containerId + " .bet-event,.bet-combo{display:grid;gap:7px;padding:9px;border-radius:9px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);animation:dmboBetRowIn .22s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-event-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}#" + c.containerId + " .bet-event-title{min-width:0;font-size:12px;font-weight:900;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-score{flex:0 0 auto;border-radius:7px;background:rgba(253,34,78,.15);padding:5px 7px;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}#" + c.containerId + " .bet-score.pulse{animation:dmboBetScorePulse 1.8s ease-in-out infinite}#" + c.containerId + " .bet-event-meta{font-size:10px;color:rgba(255,255,255,.56);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-odds{display:flex;flex-wrap:wrap;gap:5px}#" + c.containerId + " .bet-odds span,#" + c.containerId + " .bet-odds a{display:inline-flex;gap:5px;align-items:center;max-width:100%;border-radius:7px;background:#1f2a44;color:#fff;padding:5px 7px;font-size:11px;text-decoration:none}#" + c.containerId + " .bet-odds b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-combo-head{display:flex;align-items:center;justify-content:space-between;gap:8px}#" + c.containerId + " .bet-combo-title{font-size:12px;font-weight:900}#" + c.containerId + " .bet-combo-mult{border-radius:999px;background:rgba(35,209,139,.14);color:#b7ffd8;padding:4px 7px;font-size:11px;font-weight:900}#" + c.containerId + " .bet-legs{display:grid;gap:5px}#" + c.containerId + " .bet-leg{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:rgba(255,255,255,.7)}#" + c.containerId + " .bet-leg span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "#" + c.containerId + " .bet-board-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px}#" + c.containerId + " .bet-board-tabs button{min-width:0;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.045);color:#fff;padding:7px;cursor:pointer;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-board-tabs button.on{border-color:rgba(253,34,78,.45);background:rgba(253,34,78,.14)}#" + c.containerId + " .bet-board-tabs span,#" + c.containerId + " .bet-board-tabs b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-board-tabs span{font-size:11px;font-weight:900}#" + c.containerId + " .bet-board-tabs b{margin-top:2px;font-size:10px;color:rgba(255,255,255,.6)}#" + c.containerId + " .bet-board-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:7px}#" + c.containerId + " .bet-board-meta span{border-radius:999px;background:rgba(255,255,255,.07);padding:4px 7px;font-size:10px;color:rgba(255,255,255,.72)}#" + c.containerId + " .bet-leaderboard{display:grid;gap:4px;max-height:310px;overflow:auto;scrollbar-width:thin}#" + c.containerId + " .bet-lrow{display:grid;grid-template-columns:42px minmax(0,1fr) 74px 90px;gap:6px;align-items:center;border-radius:7px;background:rgba(255,255,255,.045);padding:6px;font-size:11px;animation:dmboBetRowIn .18s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-lrow.current{background:rgba(35,209,139,.12);border:1px solid rgba(35,209,139,.28)}#" + c.containerId + " .bet-lrow:nth-child(1),#" + c.containerId + " .bet-lrow:nth-child(2),#" + c.containerId + " .bet-lrow:nth-child(3){background:rgba(253,186,116,.11)}#" + c.containerId + " .bet-rank{font-weight:900;color:#ffd38a}#" + c.containerId + " .bet-player-id,#" + c.containerId + " .bet-prize{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-score-points{font-weight:900;text-align:right;font-variant-numeric:tabular-nums}#" + c.containerId + " .bet-prize{text-align:right;color:rgba(255,255,255,.72)}#" + c.containerId + " .bet-stat-list{display:grid;gap:8px}#" + c.containerId + " .bet-stat{display:grid;gap:7px;padding:9px;border-radius:9px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);animation:dmboBetRowIn .22s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bet-stat-head,#" + c.containerId + " .bet-tracker-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}#" + c.containerId + " .bet-stat-strip,#" + c.containerId + " .bet-periods{display:flex;flex-wrap:wrap;gap:5px}#" + c.containerId + " .bet-stat-strip span,#" + c.containerId + " .bet-periods span{display:inline-grid;grid-template-columns:auto auto;gap:4px;align-items:center;border-radius:7px;background:rgba(255,255,255,.055);padding:5px 7px;font-size:11px}#" + c.containerId + " .bet-stat-strip b,#" + c.containerId + " .bet-periods b{color:rgba(255,255,255,.58)}#" + c.containerId + " .bet-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}#" + c.containerId + " .bet-stat-grid div{display:grid;grid-template-columns:36px minmax(0,1fr) 36px;gap:6px;align-items:center;border-radius:7px;background:rgba(255,255,255,.055);padding:6px;font-size:11px}#" + c.containerId + " .bet-stat-grid span{text-align:center;font-weight:900;font-variant-numeric:tabular-nums}#" + c.containerId + " .bet-stat-grid b{text-align:center;color:rgba(255,255,255,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bet-tracker{display:grid;gap:8px}#" + c.containerId + " .bet-tracker-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}#" + c.containerId + " .bet-tracker-actions button.pill{cursor:pointer}#" + c.containerId + " .bet-tracker-frame{height:320px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.1);background:#05070c}#" + c.containerId + " .bet-tracker-frame iframe{display:block;width:100%;height:100%;border:0;border-radius:0;background:#05070c}" +
      "#" + c.containerId + " .bb-mode-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px;padding:3px;border-radius:9px;background:rgba(255,255,255,.055)}#" + c.containerId + " .bb-mode-tabs button{border:0;border-radius:7px;background:transparent;color:rgba(255,255,255,.72);font-size:10px;font-weight:900;padding:6px 8px;cursor:pointer;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bb-mode-tabs button:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}#" + c.containerId + " .bb-mode-tabs button.on{background:#fd224e;color:#fff}#" + c.containerId + " .bb-mode-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}#" + c.containerId + " .bb-summary{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 9px}#" + c.containerId + " .bb-summary span{border-radius:999px;background:rgba(255,255,255,.06);padding:4px 7px;font-size:10px;color:rgba(255,255,255,.68)}#" + c.containerId + " .bb-tools{position:relative;margin:0 0 9px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}#" + c.containerId + " .bb-tools input{width:100%;box-sizing:border-box;background:#101827;border-color:rgba(255,255,255,.14)}#" + c.containerId + " .bb-layout{display:grid;grid-template-columns:minmax(300px,.86fr) minmax(420px,1.34fr);gap:10px;align-items:start}#" + c.containerId + " .bb-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:438px;overflow:auto;scrollbar-width:thin;padding-right:2px}#" + c.containerId + " .bb-event-card{position:relative;min-width:0;overflow:hidden;text-align:left;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:#111827;color:#fff;padding:9px;cursor:pointer;animation:dmboBetRowIn .2s cubic-bezier(.23,1,.32,1);transition:border-color .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1),background .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bb-event-card:before{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,24,39,.98),rgba(17,24,39,.88)),var(--bb-bg);background-size:cover;background-position:center;opacity:.78}#" + c.containerId + " .bb-event-card>*{position:relative}#" + c.containerId + " .bb-event-card.on{border-color:rgba(253,34,78,.62);box-shadow:0 0 0 1px rgba(253,34,78,.22) inset}#" + c.containerId + " .bb-event-card:hover{transform:translateY(-1px);background:#172033}#" + c.containerId + " .bb-event-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px}#" + c.containerId + " .bb-event-title{font-size:12px;font-weight:900;line-height:1.25;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#" + c.containerId + " .bb-score{flex:0 0 auto;border-radius:8px;background:#fd224e;color:#fff;padding:5px 7px;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums}#" + c.containerId + " .bb-event-meta{font-size:10px;color:rgba(255,255,255,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:8px}#" + c.containerId + " .bb-teams{display:grid;gap:5px}#" + c.containerId + " .bb-team{display:grid;grid-template-columns:26px minmax(0,1fr);gap:7px;align-items:center;font-size:11px;font-weight:900}#" + c.containerId + " .bb-team img{width:26px;height:26px;border-radius:50%;object-fit:cover;background:#1f2a44;border:1px solid rgba(255,255,255,.1)}#" + c.containerId + " .bb-team span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-ac{position:absolute;z-index:4;left:0;right:74px;top:100%;margin-top:4px;display:grid;gap:4px;padding:5px;border-radius:9px;background:#0b1220;border:1px solid rgba(255,255,255,.13);box-shadow:0 14px 32px rgba(0,0,0,.42)}#" + c.containerId + " .bb-ac button{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:7px;align-items:center;width:100%;border:0;border-radius:7px;background:transparent;color:#fff;text-align:left;padding:6px;cursor:pointer}#" + c.containerId + " .bb-ac button:hover{background:rgba(255,255,255,.07)}#" + c.containerId + " .bb-ac img{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#1f2a44}#" + c.containerId + " .bb-ac b,#" + c.containerId + " .bb-ac span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-ac b{font-size:11px}#" + c.containerId + " .bb-ac span{font-size:10px;color:rgba(255,255,255,.58)}#" + c.containerId + " .bb-list{display:grid;gap:10px}#" + c.containerId + " .bb-card{display:grid;gap:9px;border-radius:10px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);padding:10px;animation:dmboBetRowIn .22s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}#" + c.containerId + " .bb-title{min-width:0;font-size:13px;font-weight:900;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-sub{margin-top:2px;font-size:10px;color:rgba(255,255,255,.58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-tag{flex:0 0 auto;border-radius:999px;background:rgba(253,34,78,.14);color:#fff;padding:5px 8px;font-size:10px;font-weight:900}#" + c.containerId + " .bb-tabs{display:flex;flex-wrap:wrap;gap:5px;padding:3px;border-radius:9px;background:rgba(255,255,255,.055)}#" + c.containerId + " .bb-tabs button{border:0;border-radius:7px;background:transparent;color:rgba(255,255,255,.68);font-size:10px;font-weight:900;padding:6px 8px;cursor:pointer;transition:background .16s cubic-bezier(.23,1,.32,1),transform .16s cubic-bezier(.23,1,.32,1)}#" + c.containerId + " .bb-tabs button.on{background:#fd224e;color:#fff}#" + c.containerId + " .bb-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}#" + c.containerId + " .bb-pane{display:grid;gap:8px}#" + c.containerId + " .bb-players{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#" + c.containerId + " .bb-player{min-width:0;border-radius:9px;background:rgba(255,255,255,.055);padding:8px;display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center}#" + c.containerId + " .bb-player.detail{align-items:start}#" + c.containerId + " .bb-avatar{width:42px;height:42px;border-radius:10px;object-fit:cover;background:#1f2a44}#" + c.containerId + " .bb-player b,#" + c.containerId + " .bb-player span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-player b{font-size:12px}#" + c.containerId + " .bb-player span{font-size:10px;color:rgba(255,255,255,.6)}#" + c.containerId + " .bb-player-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-top:7px}#" + c.containerId + " .bb-player-kv em{min-width:0;border-radius:6px;background:rgba(255,255,255,.045);padding:5px;font-style:normal;font-size:10px;color:rgba(255,255,255,.74)}#" + c.containerId + " .bb-player-kv strong{display:block;margin-bottom:2px;color:rgba(255,255,255,.52);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-facts{display:flex;flex-wrap:wrap;gap:6px}#" + c.containerId + " .bb-facts span{border-radius:7px;background:rgba(255,255,255,.06);padding:5px 7px;font-size:10px;color:rgba(255,255,255,.72)}#" + c.containerId + " .bb-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}#" + c.containerId + " .bb-stat{display:grid;grid-template-columns:42px minmax(0,1fr) 42px;gap:6px;align-items:center;border-radius:7px;background:rgba(255,255,255,.055);padding:6px;font-size:11px}#" + c.containerId + " .bb-stat span{text-align:center;font-weight:900}#" + c.containerId + " .bb-stat b{text-align:center;color:rgba(255,255,255,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-images{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}#" + c.containerId + " .bb-images a{min-width:0;text-decoration:none;color:#fff}#" + c.containerId + " .bb-images img{display:block;width:100%;height:58px;border-radius:8px;object-fit:cover;background:#111827;border:1px solid rgba(255,255,255,.08)}#" + c.containerId + " .bb-images span{display:block;margin-top:3px;font-size:9px;color:rgba(255,255,255,.58);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-timeline,#" + c.containerId + " .bb-sources{display:grid;gap:5px}#" + c.containerId + " .bb-time-row{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(0,82px) minmax(0,1fr);gap:6px;align-items:center;border-radius:7px;background:rgba(255,255,255,.055);padding:6px;font-size:11px}#" + c.containerId + " .bb-time-row b{font-variant-numeric:tabular-nums}#" + c.containerId + " .bb-time-row span,#" + c.containerId + " .bb-time-row strong,#" + c.containerId + " .bb-time-row em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-time-row em{font-style:normal;color:rgba(255,255,255,.58)}#" + c.containerId + " .bb-source{display:grid;grid-template-columns:42px minmax(0,1fr) 72px auto;gap:6px;align-items:center;border-radius:7px;background:rgba(255,255,255,.055);padding:6px;font-size:10px}#" + c.containerId + " .bb-source span{font-weight:900;color:#b7ffd8}#" + c.containerId + " .bb-source b,#" + c.containerId + " .bb-source em,#" + c.containerId + " .bb-source small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#" + c.containerId + " .bb-source em{font-style:normal;color:rgba(255,255,255,.64)}#" + c.containerId + " .bb-source a{color:#fff;text-decoration:none}#" + c.containerId + " .bb-source small{grid-column:2/5;color:rgba(255,255,255,.5)}#" + c.containerId + " .bb-actions{display:flex;flex-wrap:wrap;gap:6px}" +
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
      "#dmbo-live-modal{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,5,10,.66);font-family:Arial,sans-serif;color:#fff}#dmbo-live-modal.open{display:flex}#dmbo-live-modal .live-dialog{position:relative;width:min(820px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border-radius:12px;background:#111722;border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 70px rgba(0,0,0,.58)}#dmbo-live-modal .live-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.09)}#dmbo-live-modal .live-title{font-size:14px;font-weight:900;line-height:1.25}#dmbo-live-modal .live-meta{margin-top:3px;font-size:11px;color:rgba(255,255,255,.62)}#dmbo-live-modal .live-close{width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer}#dmbo-live-modal .live-body{padding:12px 14px 14px}#dmbo-live-modal .live-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:11px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);transition:border-color .2s ease,background .2s ease}#dmbo-live-modal .live-score.goal-pulse{animation:dmboLiveGoalPulse .78s cubic-bezier(.2,.8,.2,1)}#dmbo-live-modal .live-team{min-width:0;font-size:13px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-team.away{text-align:right}#dmbo-live-modal .live-score-num{font-size:24px;font-weight:900;line-height:1;color:#fff}#dmbo-live-modal .live-sub{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:rgba(255,255,255,.66)}#dmbo-live-modal .live-dot{width:7px;height:7px;border-radius:50%;background:#23d18b;box-shadow:0 0 0 0 rgba(35,209,139,.45);animation:dmboLiveDot 1.4s ease-out infinite}#dmbo-live-modal .live-clock-chip{display:inline-flex;align-items:center;min-width:48px;justify-content:center;border-radius:999px;background:#1f2a44;color:#fff;font-variant-numeric:tabular-nums;font-weight:900;padding:3px 7px}#dmbo-live-modal .live-live-text{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-latest{display:none;align-items:center;gap:7px;margin-top:8px;border-radius:9px;background:rgba(253,34,78,.11);border:1px solid rgba(253,34,78,.28);padding:7px 9px;font-size:11px;animation:dmboLiveRowIn .24s cubic-bezier(.2,.8,.2,1)}#dmbo-live-modal .live-latest span{color:rgba(255,255,255,.62)}#dmbo-live-modal .live-latest b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-latest em{margin-left:auto;font-style:normal;color:rgba(255,255,255,.62);font-variant-numeric:tabular-nums}#dmbo-live-modal .live-ticker{display:none;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}#dmbo-live-modal .live-tick{min-width:0;border-radius:9px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);padding:7px;animation:dmboLiveRowIn .24s cubic-bezier(.2,.8,.2,1)}#dmbo-live-modal .live-tick b,#dmbo-live-modal .live-tick span,#dmbo-live-modal .live-tick em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-tick b{font-size:10px;color:#fff;font-variant-numeric:tabular-nums}#dmbo-live-modal .live-tick span{margin-top:3px;font-size:11px;font-weight:900}#dmbo-live-modal .live-tick em{margin-top:2px;font-size:10px;font-style:normal;color:rgba(255,255,255,.56)}#dmbo-live-modal .live-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:10px}#dmbo-live-modal .live-panel{min-width:0;border-radius:10px;background:rgba(255,255,255,.05);padding:10px}#dmbo-live-modal .live-panel h3{margin:0 0 8px;font-size:12px;line-height:1.2}#dmbo-live-modal .live-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}#dmbo-live-modal .live-panel-head h3{margin:0}#dmbo-live-modal .live-update-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:3px;border-radius:9px;background:rgba(255,255,255,.06)}#dmbo-live-modal .live-update-tabs button{border:0;border-radius:7px;background:transparent;color:rgba(255,255,255,.68);font-size:11px;font-weight:900;padding:5px 8px;cursor:pointer}#dmbo-live-modal .live-update-tabs button.on{background:#fd224e;color:#fff}#dmbo-live-modal .live-update-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}#dmbo-live-modal .live-table{display:grid;gap:5px}#dmbo-live-modal .live-row{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center;font-size:11px}#dmbo-live-modal .live-row span:nth-child(2){color:rgba(255,255,255,.68);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-row b{text-align:center;font-size:12px}#dmbo-live-modal .live-info-list{display:grid;grid-template-columns:1fr 1fr;gap:6px}#dmbo-live-modal .live-info-list div{min-width:0;border-radius:7px;background:rgba(255,255,255,.045);padding:6px}#dmbo-live-modal .live-info-list span{display:block;font-size:10px;color:rgba(255,255,255,.55)}#dmbo-live-modal .live-info-list b{display:block;margin-top:2px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-goals{display:grid;gap:6px}#dmbo-live-modal .live-goals div{display:grid;grid-template-columns:38px minmax(0,82px) minmax(0,1fr);gap:7px;align-items:center;border-radius:7px;background:rgba(255,255,255,.045);padding:6px;font-size:11px;animation:dmboLiveRowIn .22s cubic-bezier(.2,.8,.2,1)}#dmbo-live-modal .live-goals div.latest{background:rgba(253,34,78,.12);border:1px solid rgba(253,34,78,.28)}#dmbo-live-modal .live-goals b{font-size:11px;color:#fff;font-variant-numeric:tabular-nums}#dmbo-live-modal .live-goals span,#dmbo-live-modal .live-goals strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-goals em{grid-column:3;font-style:normal;color:rgba(255,255,255,.58);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-news-list{display:grid;gap:6px}#dmbo-live-modal .live-news-list a{display:block;border-radius:7px;background:rgba(255,255,255,.045);padding:7px;text-decoration:none;font-size:11px;line-height:1.25;transition:background .16s ease,transform .16s ease}#dmbo-live-modal .live-news-list a:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}#dmbo-live-modal .live-news-list a span{display:block;margin-top:3px;color:rgba(255,255,255,.52);font-size:10px}.live-open-news{display:inline-block;margin-top:7px;font-size:11px;text-decoration:none;color:#fff}#dmbo-live-modal .live-timeline-total{margin-bottom:6px;font-size:11px;color:rgba(255,255,255,.62)}#dmbo-live-modal .live-timeline-list{display:grid;gap:6px;max-height:220px;overflow:auto}#dmbo-live-modal .live-timeline-list div{display:grid;grid-template-columns:44px minmax(0,98px) minmax(0,80px) minmax(0,1fr);gap:7px;align-items:center;border-radius:7px;background:rgba(255,255,255,.045);padding:7px;font-size:11px;animation:dmboLiveRowIn .2s cubic-bezier(.2,.8,.2,1)}#dmbo-live-modal .live-timeline-list b{font-variant-numeric:tabular-nums}#dmbo-live-modal .live-timeline-list span,#dmbo-live-modal .live-timeline-list strong,#dmbo-live-modal .live-timeline-list em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dmbo-live-modal .live-timeline-list em{font-style:normal;color:rgba(255,255,255,.56)}#dmbo-live-modal .live-team-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#dmbo-live-modal .live-team-list>div{min-width:0;border-radius:8px;background:rgba(255,255,255,.045);padding:8px}#dmbo-live-modal .live-team-list h4{margin:0 0 7px;font-size:12px}#dmbo-live-modal .live-team-list p{margin:0 0 7px;font-size:11px;line-height:1.35}#dmbo-live-modal .live-team-list p:last-child{margin-bottom:0}#dmbo-live-modal .live-team-list b{display:block;color:rgba(255,255,255,.58);font-size:10px}#dmbo-live-modal .live-team-list span{display:block;margin-top:2px;color:#fff}#dmbo-live-modal .live-animation{margin-top:10px;border-radius:10px;overflow:hidden;background:#070a10;border:1px solid rgba(255,255,255,.08)}#dmbo-live-modal .live-tabs{display:flex;gap:6px;align-items:center;padding:8px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}#dmbo-live-modal .live-tabs span{flex:1}#dmbo-live-modal .live-tabs button{border:0;border-radius:7px;background:#24314f;color:#fff;font-size:11px;font-weight:900;padding:6px 9px;cursor:pointer;transition:background .16s ease,transform .16s ease}#dmbo-live-modal .live-tabs button:hover{transform:translateY(-1px)}#dmbo-live-modal .live-tabs button.on{background:#fd224e}#dmbo-live-modal .live-tabs button:focus-visible{outline:2px solid #fff;outline-offset:2px}#dmbo-live-modal .live-animation iframe{display:block;width:100%;height:230px;border:0;background:#070a10}#dmbo-live-modal .live-empty{padding:14px;text-align:center;font-size:12px;color:rgba(255,255,255,.62)}#dmbo-live-modal .live-error{margin-top:8px;color:#ff8aa1;font-size:11px}#dmbo-live-modal a{color:#fff}" +
      "#dmbo-v12-close{position:absolute;top:6px;right:6px;z-index:2;width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer}" +
      "@keyframes dmboLiveDot{0%{box-shadow:0 0 0 0 rgba(35,209,139,.45)}70%{box-shadow:0 0 0 7px rgba(35,209,139,0)}100%{box-shadow:0 0 0 0 rgba(35,209,139,0)}}@keyframes dmboLiveGoalPulse{0%{border-color:rgba(253,34,78,.7);background:rgba(253,34,78,.18)}100%{border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.06)}}@keyframes dmboLiveRowIn{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}@keyframes dmboBetRowIn{0%{opacity:0;transform:translateY(5px)}100%{opacity:1;transform:translateY(0)}}@keyframes dmboBetScorePulse{0%,100%{box-shadow:0 0 0 0 rgba(253,34,78,0)}50%{box-shadow:0 0 0 5px rgba(253,34,78,.12)}}" +
      "@media(hover:hover) and (pointer:fine){#" + c.containerId + " .bet-board-tabs button:hover,#" + c.containerId + " .bet-odds a:hover,#" + c.containerId + " .bet-tracker-actions .pill:hover{background:rgba(255,255,255,.1);transform:translateY(-1px)}#" + c.containerId + " .bet-lrow:hover,#" + c.containerId + " .bet-stat:hover{background:rgba(255,255,255,.07)}}" +
      "@media(prefers-reduced-motion:reduce){#" + c.containerId + " .bet-row,#" + c.containerId + " .bet-event,#" + c.containerId + " .bet-combo,#" + c.containerId + " .bet-lrow,#" + c.containerId + " .bet-stat,#" + c.containerId + " .bet-score.pulse,#" + c.containerId + " .bb-card,#" + c.containerId + " .bb-tabs button{animation:none;transition:none}#" + c.containerId + " .bet-player i,#dmbo-live-modal .live-dot{animation:none}}" +
      "@media(max-width:980px){#" + c.containerId + "{grid-template-columns:1fr;max-height:calc(100vh - 36px);overflow:auto}#" + c.containerId + " .s2,#" + c.containerId + " .s3{grid-column:auto}#" + c.containerId + " .grid{grid-template-columns:repeat(2,minmax(0,1fr))}#" + c.containerId + " .sports-summary{width:100%;margin-left:0}#" + c.containerId + " .sports-event{grid-template-columns:1fr;gap:7px}#" + c.containerId + " .sports-clock{text-align:left;grid-template-columns:auto 1fr;align-items:center}#" + c.containerId + " .sports-odds{grid-template-columns:repeat(2,minmax(0,1fr))}#" + c.containerId + " .bb-layout{grid-template-columns:1fr}#" + c.containerId + " .bb-catalog{grid-template-columns:1fr;max-height:310px}#" + c.containerId + " .bb-tools{grid-template-columns:1fr}#" + c.containerId + " .bb-ac{right:0}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .bb-layout{grid-template-columns:1fr}#" + c.containerId + ".dmbo-expanded-root>.b.dmbo-panel-expanded .grid{grid-template-columns:repeat(2,minmax(0,1fr))}#" + c.containerId + " .bet-board-tabs{grid-template-columns:1fr}#" + c.containerId + " .bet-lrow{grid-template-columns:36px minmax(0,1fr) 58px}#" + c.containerId + " .bet-prize{grid-column:2/4;text-align:left}#" + c.containerId + " .bet-stat-grid,#" + c.containerId + " .bb-players,#" + c.containerId + " .bb-stats{grid-template-columns:1fr}#" + c.containerId + " .bb-images{grid-template-columns:repeat(2,minmax(0,1fr))}#" + c.containerId + " .bb-time-row{grid-template-columns:42px minmax(0,1fr)}#" + c.containerId + " .bb-time-row strong,#" + c.containerId + " .bb-time-row em{grid-column:2}#" + c.containerId + " .bb-source{grid-template-columns:42px minmax(0,1fr) 64px}#" + c.containerId + " .bb-source a{grid-column:2/4}#" + c.containerId + " .bb-source small{grid-column:2/4}#" + c.containerId + " .bet-tracker-frame{height:260px}#dmbo-live-modal .live-grid{grid-template-columns:1fr}#dmbo-live-modal .live-ticker{grid-template-columns:repeat(2,minmax(0,1fr))}#dmbo-live-modal .live-team-list{grid-template-columns:1fr}#dmbo-live-modal .live-timeline-list div{grid-template-columns:42px minmax(0,1fr)}#dmbo-live-modal .live-timeline-list strong,#dmbo-live-modal .live-timeline-list em{grid-column:2}#dmbo-live-modal .live-animation iframe{height:210px}}";

    (document.head || document.documentElement).appendChild(s);
  }

  function panelTitle(panel) {
    var title;
    var frame;

    if (!panel) return "Widget";
    title = panel.querySelector && panel.querySelector(".t span:first-child,.t");
    if (title) return String(title.textContent || "").replace(/\[\]/g, "").trim() || "Widget";
    frame = panel.querySelector && panel.querySelector("iframe[title]");
    if (frame && frame.getAttribute("title")) return frame.getAttribute("title");
    if (panel.id === "dmbo-lottie-panel") return "Animation";
    if (panel.id === "dmbo-video-panel") return "Video Player";
    if (panel.id === "dmbo-youtube") return "YouTube";
    if (panel.id === "dmbo-iframe") return "External Frame";
    return panel.id || "Widget";
  }

  function closeExpandedPanel() {
    var root = qs(cfg().containerId);
    var panel = expandedPanelId ? qs(expandedPanelId) : null;

    if (panel) panel.classList.remove("dmbo-panel-expanded");
    if (root) {
      root.classList.remove("dmbo-expanded-root");
      root.removeAttribute("data-dmbo-expanded-title");
    }
    expandedPanelId = "";
  }

  function openExpandedPanel(id) {
    var root = qs(cfg().containerId);
    var panel = id ? qs(id) : null;

    if (!root || !panel) return;
    if (expandedPanelId === id) {
      closeExpandedPanel();
      return;
    }
    closeExpandedPanel();
    expandedPanelId = id;
    panel.classList.add("dmbo-panel-expanded");
    root.classList.add("dmbo-expanded-root");
    root.setAttribute("data-dmbo-expanded-title", panelTitle(panel));
    try { panel.scrollIntoView({ block: "start" }); } catch (e) {}
  }

  function ensureExpandButton(panel) {
    var title;
    var button;

    if (!panel || !panel.id || panel.id === "dmbo-v12-close") return;
    if (panel.querySelector("[data-dmbo-expand-panel]")) return;

    title = panel.querySelector(".t");
    button = document.createElement("button");
    button.type = "button";
    button.className = "dmbo-expand-btn" + (title ? "" : " dmbo-expand-float");
    button.setAttribute("data-dmbo-expand-panel", panel.id);
    button.setAttribute("title", "Expand panel");
    button.setAttribute("aria-label", "Expand " + panelTitle(panel));
    button.textContent = "[]";
    button.onclick = function (event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      openExpandedPanel(panel.id);
    };

    if (title) title.appendChild(button);
    else panel.appendChild(button);
  }

  function enhanceExpandControls() {
    var root = qs(cfg().containerId);

    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(":scope > .b[id]"), ensureExpandButton);
  }

  function installExpandControls() {
    var root = qs(cfg().containerId);

    if (!root) return;
    enhanceExpandControls();

    if (!expandKeyHooked) {
      expandKeyHooked = true;
      try {
        window.addEventListener("keydown", function (event) {
          if (event && event.key === "Escape" && expandedPanelId) closeExpandedPanel();
        });
      } catch (e) {}
    }

    if (typeof MutationObserver === "function") {
      if (expandObserver) {
        try { expandObserver.disconnect(); } catch (e) {}
      }
      expandObserver = new MutationObserver(function () {
        enhanceExpandControls();
      });
      try {
        expandObserver.observe(root, { childList: true, subtree: true });
      } catch (e) {}
    }
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

  function betbyFeedConfig(widget) {
    var c = cfg();
    var config = panelConfig(widget || currentDmboWidget, "betbyFeed");
    var pollMs = Number(config.pollMs);
    var maxItems = Number(config.maxItems);
    var maxEvents = Number(config.maxEvents);
    var maxCombos = Number(config.maxCombos);
    var maxLeaderboardRows = Number(config.maxLeaderboardRows);
    var maxStats = Number(config.maxStats);

    config.title = config.title || "Live Bets Feed";
    config.brandId = String(config.brandId || c.betbyBrandId || "1653815133341880320");
    config.baseUrl = String(config.baseUrl || c.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    config.lang = String(config.lang || "en").replace(/[^a-z-]/gi, "") || "en";
    config.openUrl = String(config.openUrl || c.betbyOpenUrl || "https://demo.betby.com/sportsbook/tile/bets-feed");
    config.pollMs = isFinite(pollMs) && pollMs >= 5000 ? pollMs : 12000;
    config.maxItems = isFinite(maxItems) && maxItems > 0 ? Math.min(maxItems, 20) : 8;
    config.maxEvents = isFinite(maxEvents) && maxEvents > 0 ? Math.min(maxEvents, 20) : 6;
    config.maxCombos = isFinite(maxCombos) && maxCombos > 0 ? Math.min(maxCombos, 12) : 4;
    config.maxLeaderboardRows = isFinite(maxLeaderboardRows) && maxLeaderboardRows > 0 ? Math.min(maxLeaderboardRows, 500) : 500;
    config.maxStats = isFinite(maxStats) && maxStats > 0 ? Math.min(maxStats, 20) : 8;
    config.trackerBuild = String(config.trackerBuild || "5d5e9d98").replace(/[^a-z0-9_-]/gi, "") || "5d5e9d98";
    config.trackers = Array.isArray(config.trackers) ? config.trackers : [
      {
        id: "brooksby-buse-wimbledon",
        title: "Brooksby, Jenson vs Buse, Ignacio",
        subtitle: "Grand Slam - Wimbledon",
        provider: "statscore",
        sportId: "5",
        lang: config.lang,
        eventId: 6575292,
        betbyEventId: "2683375830813515798",
        openUrl: "https://demo.betby.com/sportsbook/tile/tennis/grand-slam/wimbledon/brooksby-jenson-buse-ignacio-2683375830813515798"
      }
    ];
    config.tabs = Array.isArray(config.tabs) && config.tabs.length ? config.tabs : ["players", "live", "prematch", "combo", "leaderboard", "stats", "tracker"];

    return config;
  }

  function betbyFeedUrl(c, config) {
    var runtime = c || cfg();
    var panel = copyObject(config || {});
    var base = String(panel.baseUrl || runtime.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    var brandId = encodeURIComponent(String(panel.brandId || runtime.betbyBrandId || "1653815133341880320"));

    if (panel.feedUrl) return String(panel.feedUrl);

    return base + "/api/v1/promo/bets_feed/brand/" + brandId;
  }

  function betbySnapshotUrl(c, config, service, version) {
    var runtime = c || cfg();
    var panel = copyObject(config || {});
    var base = String(panel.baseUrl || runtime.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    var brandId = encodeURIComponent(String(panel.brandId || runtime.betbyBrandId || "1653815133341880320"));
    var mode = service === "prematch" ? "prematch" : "live";
    var v = version == null || version === "" ? "0" : String(version);

    return base + "/api/v4/" + mode + "/brand/" + brandId + "/en/" + encodeURIComponent(v);
  }

  function betbyPromoUrl(c, config) {
    var runtime = c || cfg();
    var panel = copyObject(config || {});
    var base = String(panel.baseUrl || runtime.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    var brandId = encodeURIComponent(String(panel.brandId || runtime.betbyBrandId || "1653815133341880320"));

    return base + "/api/v1/promo/widget/" + brandId + "/en";
  }

  function betbyLeaderboardUrl(c, config) {
    var runtime = c || cfg();
    var panel = copyObject(config || {});
    var base = String(panel.baseUrl || runtime.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    var brandId = encodeURIComponent(String(panel.brandId || runtime.betbyBrandId || "1653815133341880320"));
    var lang = encodeURIComponent(String(panel.lang || "en"));

    if (panel.leaderboardUrl) return String(panel.leaderboardUrl);
    return base + "/api/v1/promo/tournaments/brand/" + brandId + "/lang/" + lang + "/view";
  }

  function betbyTrackerUrl(c, config, tracker) {
    var runtime = c || cfg();
    var panel = copyObject(config || {});
    var item = tracker || {};
    var base = String(panel.baseUrl || runtime.betbyBaseUrl || "https://demoapi.betby.com").replace(/\/+$/, "");
    var build = String(panel.trackerBuild || item.trackerBuild || "5d5e9d98").replace(/[^a-z0-9_-]/gi, "") || "5d5e9d98";
    var provider = {
      id: item.provider || item.id || "statscore",
      sportId: String(item.sportId || item.sport_id || ""),
      lang: item.lang || panel.lang || "en",
      eventId: item.eventId || item.event_id || item.providerEventId || item.provider_event_id
    };

    if (item.trackerUrl) provider.trackerUrl = item.trackerUrl;
    if (!provider.sportId || provider.eventId == null || provider.eventId === "") return "";

    return base + "/" + build + "/tracker.html?providers=" + encodeURIComponent(JSON.stringify(provider));
  }

  function betbyText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function betbyTimeMs(value) {
    var n;
    var parsed;

    if (value == null || value === "") return 0;
    n = Number(value);
    if (isFinite(n) && n > 0) return n > 100000000000 ? n : n * 1000;
    parsed = Date.parse(String(value));
    return isFinite(parsed) ? parsed : 0;
  }

  function betbyDateShort(value) {
    var ms = betbyTimeMs(value);

    if (!ms) return "";
    try {
      return new Date(ms).toLocaleDateString([], { month: "short", day: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function betbyLeaderboardStatus(tournament, nowMs) {
    var now = nowMs || Date.now();
    var starts = betbyTimeMs(tournament && tournament.starts);
    var ends = betbyTimeMs(tournament && tournament.ends);

    if (starts && now < starts) return "Upcoming";
    if (ends && now > ends) return "Ended";
    return "Live";
  }

  function betbyLeaderboardRows(payload, config, nowMs) {
    var panel = config || {};
    var maxRows = Number(panel.maxLeaderboardRows);
    var limit = isFinite(maxRows) && maxRows > 0 ? Math.min(maxRows, 500) : 500;
    var tournaments = Array.isArray(payload) ? payload : (
      (payload && Array.isArray(payload.tournaments) && payload.tournaments) ||
      (payload && Array.isArray(payload.data) && payload.data) ||
      []
    );

    return tournaments.map(function (tournament, index) {
      var rows = Array.isArray(tournament && tournament.leaderboard) ? tournament.leaderboard : [];

      return {
        id: betbyText(tournament && tournament.id) || String(index + 1),
        name: betbyText(tournament && tournament.name) || "Leaderboard",
        starts: tournament && tournament.starts,
        ends: tournament && tournament.ends,
        startsText: betbyDateShort(tournament && tournament.starts),
        endsText: betbyDateShort(tournament && tournament.ends),
        imageUrl: betbyText(tournament && (tournament.image_url || tournament.imageUrl)),
        status: betbyLeaderboardStatus(tournament, nowMs),
        count: rows.length,
        rows: rows.slice(0, limit).map(function (row, rowIndex) {
          return {
            place: betbyText(row && row.place) || String(rowIndex + 1),
            playerId: betbyText(row && (row.player_id || row.playerId)) || "Hidden player",
            score: betbyText(row && row.score) || "0",
            prize: betbyText(row && row.prize),
            isCurrent: !!(row && (row.is_current || row.isCurrent))
          };
        })
      };
    }).filter(function (tournament) {
      return !!tournament.rows.length;
    });
  }

  function betbyScoreText(score) {
    var row = score || {};
    return scoreValue(row.home_score) + " - " + scoreValue(row.away_score);
  }

  function betbyPeriodRows(score) {
    var periods = Array.isArray(score && score.period_scores) ? score.period_scores : [];

    return periods.slice(-8).map(function (period, index) {
      var number = period.number || (index + 1);
      var code = betbyText(period.match_status_code || period.type);

      return {
        label: code ? "P" + number + " / " + code : "P" + number,
        home: scoreValue(period.home_score),
        away: scoreValue(period.away_score)
      };
    });
  }

  function betbyStatPairs(score) {
    var stats = score && score.statistics || {};
    var rows = [];

    Object.keys(stats).forEach(function (key) {
      var value = stats[key];
      var home;
      var away;

      if (Array.isArray(value)) {
        home = value[0];
        away = value[1];
      } else if (value && typeof value === "object") {
        home = value.home || value.home_score || value.homeScore || value[0];
        away = value.away || value.away_score || value.awayScore || value[1];
      }

      if (home == null && away == null) return;
      rows.push({ label: statLabel(key), home: scoreValue(home), away: scoreValue(away) });
    });

    return rows.slice(0, 10);
  }

  function betbyStatusText(value) {
    var text = betbyText(value);

    if (!text || text === "0") return "";
    return "Status " + text;
  }

  function betbyStatsRows(snapshot, config) {
    var panel = config || {};
    var maxStats = Number(panel.maxStats);
    var limit = isFinite(maxStats) && maxStats > 0 ? Math.min(maxStats, 20) : 8;
    var sports = snapshot && snapshot.sports || {};
    var tournaments = snapshot && snapshot.tournaments || {};
    var events = snapshot && snapshot.events || {};
    var rows = [];

    Object.keys(events).some(function (id) {
      var ev = events[id] || {};
      var desc = ev.desc || {};
      var comps = Array.isArray(desc.competitors) ? desc.competitors : [];
      var score = ev.score || null;
      var state = ev.state || {};
      var home = betbyText(comps[0] && comps[0].name);
      var away = betbyText(comps[1] && comps[1].name);
      var sportInfo = sports[desc.sport] || {};
      var tournamentInfo = tournaments[desc.tournament] || {};
      var gameScore = "";

      if (!home || !away || !score || (desc.type && desc.type !== "match")) return false;
      if (score.home_gamescore != null || score.away_gamescore != null) {
        gameScore = scoreValue(score.home_gamescore) + " - " + scoreValue(score.away_gamescore);
      }

      rows.push({
        id: String(id),
        sportName: betbyText(sportInfo.name) || "Sport",
        tournamentName: betbyText(tournamentInfo.name) || "Tournament",
        home: home,
        away: away,
        score: betbyScoreText(score),
        gameScore: gameScore,
        server: score.current_server ? String(score.current_server) : "",
        clock: betbyText(state.clock && state.clock.match_time),
        clockTimestamp: state.clock && state.clock.timestamp,
        matchStatus: betbyStatusText(state.match_status),
        provider: betbyText(state.provider),
        periods: betbyPeriodRows(score),
        stats: betbyStatPairs(score)
      });

      return rows.length >= limit;
    });

    return rows;
  }

  function betbyTrackerRows(config) {
    var panel = config || {};
    var trackers = Array.isArray(panel.trackers) ? panel.trackers : [];

    return trackers.map(function (tracker, index) {
      var row = copyObject(tracker || {});
      var title = betbyText(row.title) || betbyText(row.name) || "Live animation tracker";
      var provider = betbyText(row.provider || row.id || "statscore");

      return {
        id: betbyText(row.id || row.betbyEventId || row.eventId) || String(index + 1),
        title: title,
        subtitle: betbyText(row.subtitle || row.tournament || row.sportName) || provider,
        providerLabel: statLabel(provider),
        openUrl: betbyText(row.openUrl || row.url),
        url: betbyTrackerUrl(null, panel, row)
      };
    }).filter(function (row) {
      return !!row.url;
    });
  }

  function betbyType(value) {
    var text = betbyText(value || "bet").replace(/[_-]+/g, " ").toLowerCase();

    return text ? text.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : "Bet";
  }

  function betbySelectionLabel(selection) {
    var eventName = betbyText(selection.eventName || selection.event_name || selection.name || selection.event);
    var parts = [];

    if (eventName) return eventName;
    if (selection.eventId) parts.push("Event " + selection.eventId);
    if (selection.marketId) parts.push("Market " + selection.marketId);
    if (selection.outcomeId) parts.push("Outcome " + selection.outcomeId);

    return parts.join(" · ") || "Selection";
  }

  function betbySelectionRow(selection) {
    var row = selection || {};
    var out = {
      eventId: betbyText(row.event_id || row.eventId || row.eventID),
      marketId: betbyText(row.market_id || row.marketId || row.marketID),
      outcomeId: betbyText(row.outcome_id || row.outcomeId || row.outcomeID),
      odds: betbyText(row.k || row.odds || row.price)
    };

    out.label = betbySelectionLabel(out);
    return out;
  }

  function betbyFeedRows(payload, config) {
    var panel = config || {};
    var maxItems = Number(panel.maxItems);
    var limit = isFinite(maxItems) && maxItems > 0 ? Math.min(maxItems, 20) : 8;
    var items = Array.isArray(payload) ? payload : (
      (payload && Array.isArray(payload.items) && payload.items) ||
      (payload && Array.isArray(payload.bets) && payload.bets) ||
      (payload && Array.isArray(payload.data) && payload.data) ||
      []
    );

    return items.slice(0, limit).map(function (item, index) {
      var selections = Array.isArray(item && item.selections) ? item.selections.map(betbySelectionRow).slice(0, 4) : [];

      return {
        id: betbyText(item && item.id) || String(index + 1),
        odds: betbyText(item && (item.odds || item.k || item.price)),
        stake: betbyText(item && (item.stake || item.amount)),
        potentialWin: betbyText(item && (item.pot_win || item.potentialWin || item.possibleWin || item.win)),
        player: betbyText(item && (item.player || item.player_mask || item.playerMask)) || "****",
        type: betbyType(item && item.type),
        selectionCount: selections.length,
        selections: selections
      };
    });
  }

  function betbyVersions(data) {
    var versions = [];

    if (data && Array.isArray(data.top_events_versions)) versions = versions.concat(data.top_events_versions);
    if (data && Array.isArray(data.rest_events_versions)) versions = versions.concat(data.rest_events_versions);

    return versions.filter(function (v, i) {
      return v != null && versions.indexOf(v) === i;
    });
  }

  function betbyFirstMarket(ev) {
    var markets = ev && ev.markets || {};
    var marketIds = Object.keys(markets);
    var i;
    var j;

    for (i = 0; i < marketIds.length; i++) {
      var marketId = marketIds[i];
      var specs = markets[marketId] || {};
      var specKeys = Object.keys(specs);

      for (j = 0; j < specKeys.length; j++) {
        var outcomes = specs[specKeys[j]] || {};
        var outcomeIds = Object.keys(outcomes);
        if (outcomeIds.length) {
          return {
            marketId: marketId,
            specifier: specKeys[j],
            outcomes: outcomeIds.slice(0, 4).map(function (outcomeId) {
              return {
                outcomeId: outcomeId,
                odds: betbyText(outcomes[outcomeId] && outcomes[outcomeId].k)
              };
            }).filter(function (row) {
              return !!row.odds;
            })
          };
        }
      }
    }

    return null;
  }

  function betbyOutcomeLabel(marketId, outcomeId, teams) {
    var id = String(outcomeId || "");
    var mid = String(marketId || "");

    if (mid === "1") {
      if (id === "1") return teams.home;
      if (id === "2") return "Draw";
      if (id === "3") return teams.away;
    }

    if (mid === "186" || mid === "340") {
      if (id === "4") return teams.home;
      if (id === "5") return teams.away;
    }

    return "Outcome " + id;
  }

  function betbyEventRows(snapshot, config, mode) {
    var panel = config || {};
    var maxEvents = Number(panel.maxEvents);
    var limit = isFinite(maxEvents) && maxEvents > 0 ? Math.min(maxEvents, 20) : 6;
    var sports = snapshot && snapshot.sports || {};
    var tournaments = snapshot && snapshot.tournaments || {};
    var events = snapshot && snapshot.events || {};
    var rows = [];

    Object.keys(events).some(function (id) {
      var ev = events[id] || {};
      var desc = ev.desc || {};
      var comps = Array.isArray(desc.competitors) ? desc.competitors : [];
      var home = betbyText(comps[0] && comps[0].name);
      var away = betbyText(comps[1] && comps[1].name);
      var market = betbyFirstMarket(ev);
      var score = ev.score || {};
      var state = ev.state || {};
      var sportInfo = sports[desc.sport] || {};
      var tournamentInfo = tournaments[desc.tournament] || {};
      var teams;

      if (!home || !away || !market || !market.outcomes.length) return false;
      if (mode === "live" && !ev.score) return false;
      if (mode === "prematch" && desc.type && desc.type !== "match") return false;

      teams = { home: home, away: away };
      rows.push({
        id: String(id),
        sportName: betbyText(sportInfo.name) || "Sport",
        tournamentName: betbyText(tournamentInfo.name) || "Tournament",
        home: home,
        away: away,
        status: mode === "live" ? "Live" : "Prematch",
        score: ev.score ? scoreValue(score.home_score) + " - " + scoreValue(score.away_score) : "",
        clock: betbyText(state.clock && state.clock.match_time),
        scheduled: desc.scheduled || 0,
        odds: market.outcomes.map(function (outcome) {
          return {
            label: betbyOutcomeLabel(market.marketId, outcome.outcomeId, teams),
            odds: outcome.odds
          };
        })
      });

      return rows.length >= limit;
    });

    return rows;
  }

  function betbyComboRows(payload, config) {
    var panel = config || {};
    var maxCombos = Number(panel.maxCombos);
    var limit = isFinite(maxCombos) && maxCombos > 0 ? Math.min(maxCombos, 12) : 4;
    var rows = [];

    Object.keys(payload || {}).some(function (section) {
      var widgets = Array.isArray(payload[section]) ? payload[section] : [];

      widgets.some(function (widget) {
        var items = Array.isArray(widget && widget.payload) ? widget.payload : [];
        if (widget && widget.view && widget.view !== "combo_of_the_day") return false;

        items.some(function (item, index) {
          var selections = Array.isArray(item && item.event_bet_data) ? item.event_bet_data : [];

          rows.push({
            id: String((widget && widget.id) || section) + "-" + index,
            title: "Combo of the day",
            multiplier: betbyText(item && item.multiplier),
            bonusId: betbyText(item && item.bonus_id),
            legs: selections.length,
            selections: selections.slice(0, 5).map(function (selection) {
              var row = {
                eventId: betbyText(selection.event_id || selection.eventId),
                marketId: betbyText(selection.market_id || selection.marketId),
                outcomeId: betbyText(selection.outcome_id || selection.outcomeId),
                specifier: betbyText(selection.specifier),
                betBuilder: selection.is_bet_builder === true
              };
              var labelParts = ["Event " + row.eventId, "Market " + row.marketId, "Outcome " + row.outcomeId];
              if (row.specifier) labelParts.push(row.specifier);
              if (row.betBuilder) labelParts.push("Builder");
              row.label = labelParts.join(" · ");
              return row;
            })
          });

          return rows.length >= limit;
        });

        return rows.length >= limit;
      });

      return rows.length >= limit;
    });

    return rows;
  }

  function betboomMatchConfig(widget) {
    var config = panelConfig(widget || currentDmboWidget, "betboomMatch");
    var pollMs = Number(config.pollMs);
    var maxStats = Number(config.maxStats);
    var maxImages = Number(config.maxImages);

    config.title = config.title || "BetBoom Match Center";
    config.catalogPath = config.catalogPath || "/betboom/catalog";
    config.workerPath = config.workerPath || "/betboom/statshub";
    config.lang = String(config.lang || "en").replace(/[^a-z-]/gi, "") || "en";
    config.theme = config.theme || "THEMES_BLACK";
    config.pollMs = isFinite(pollMs) && pollMs >= 60000 ? pollMs : 600000;
    config.catalogLimit = Math.min(Math.max(Number(config.catalogLimit) || 42, 4), 96);
    config.catalogMaxTournaments = Math.min(Math.max(Number(config.catalogMaxTournaments) || 12, 1), 18);
    config.catalogMaxMatchesPerTournament = Math.min(Math.max(Number(config.catalogMaxMatchesPerTournament) || 8, 1), 12);
    config.catalogSportIds = Array.isArray(config.catalogSportIds) && config.catalogSportIds.length ? config.catalogSportIds : [2, 4, 5, 1, 11, 10];
    config.catalogModes = Array.isArray(config.catalogModes) && config.catalogModes.length ? config.catalogModes : ["all", "live", "prematch", "history"];
    config.catalogDefaultMode = config.catalogModes.indexOf(config.catalogDefaultMode) >= 0 ? config.catalogDefaultMode : "all";
    config.maxStats = isFinite(maxStats) && maxStats > 0 ? Math.min(maxStats, 20) : 12;
    config.maxImages = isFinite(maxImages) && maxImages > 0 ? Math.min(maxImages, 20) : 14;
    config.tabs = Array.isArray(config.tabs) && config.tabs.length ? config.tabs : ["overview", "players", "stats", "timeline", "images", "sources"];
    config.matches = Array.isArray(config.matches) && config.matches.length ? config.matches : [
      {
        id: "merida-medvedev-wimbledon",
        matchId: "5146706",
        title: "Merida Aguilar D. vs Medvedev D.",
        subtitle: "Wimbledon tennis match center",
        openUrl: "https://betboom.ru/sport/tennis/365/5019/5146706",
        players: [
          {
            side: "away",
            name: "Medvedev",
            imageUrl: "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/11411252-f30c-474d-9d95-4a4e2b285338.webp"
          }
        ],
        imageUrls: [
          "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/47759e63-4ac3-4ed3-a8a5-64325f9fbaa7.webp",
          "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/11411252-f30c-474d-9d95-4a4e2b285338.webp"
        ]
      }
    ];

    return config;
  }

  function betboomMatchUrl(c, config, match) {
    var panel = config || {};
    var item = match || {};
    var matchId = betbyText(item.matchId || item.match_id || item.id || panel.matchId);
    var imageUrls = [];
    var homeImageUrl = betboomSafeUrl(item.homeImageUrl || panel.homeImageUrl);
    var awayImageUrl = betboomSafeUrl(item.awayImageUrl || panel.awayImageUrl);

    function collectImages(list) {
      (Array.isArray(list) ? list : []).forEach(function (image) {
        imageUrls.push(typeof image === "string" ? image : image && (image.url || image.src || image.imageUrl));
      });
    }

    function collectPlayerImages(list) {
      (Array.isArray(list) ? list : []).forEach(function (player, index) {
        var side = betboomText(player && player.side).toLowerCase();
        var image = betboomSafeUrl(player && (player.imageUrl || player.image || player.logoUrl));

        if (!image) return;
        imageUrls.push(image);
        if (!homeImageUrl && (side === "home" || side === "competitor1" || (!side && index === 0))) homeImageUrl = image;
        if (!awayImageUrl && (side === "away" || side === "competitor2" || (!side && index === 1))) awayImageUrl = image;
      });
    }

    collectImages(panel.imageUrls);
    collectImages(panel.images);
    collectImages(item.imageUrls);
    collectImages(item.images);
    collectPlayerImages(panel.players);
    collectPlayerImages(item.players);

    return proxy(c || cfg(), panel.workerPath || "/betboom/statshub", {
      matchId: matchId,
      lang: panel.lang || "en",
      theme: panel.theme || "THEMES_BLACK",
      openUrl: item.openUrl || panel.openUrl || "",
      homeImageUrl: homeImageUrl,
      awayImageUrl: awayImageUrl,
      imageUrls: imageUrls.filter(Boolean).join("|")
    });
  }

  function betboomCatalogUrl(c, config) {
    var panel = config || {};
    var sportIds = Array.isArray(panel.catalogSportIds) ? panel.catalogSportIds.join(",") : "";
    var mode = betboom.mode || panel.catalogDefaultMode || "all";

    return proxy(c || cfg(), panel.catalogPath || "/betboom/catalog", {
      lang: panel.lang || "en",
      q: betboom.query || "",
      mode: mode,
      sportIds: sportIds,
      limit: panel.catalogLimit || 42,
      maxTournaments: panel.catalogMaxTournaments || 12,
      maxMatchesPerTournament: panel.catalogMaxMatchesPerTournament || 8
    });
  }

  function betboomSafeUrl(value) {
    var text = betbyText(value);

    if (!/^https?:\/\//i.test(text)) return "";
    return text;
  }

  function betboomText(value) {
    return betbyText(value);
  }

  function betboomScoreText(score) {
    if (!score) return "";
    if (typeof score === "string") return betboomText(score);
    return betboomText(score.text || [score.home, score.away].filter(function (value) {
      return value !== "" && value != null;
    }).join("-"));
  }

  function betboomCatalogRow(row) {
    var item = row || {};
    var players = Array.isArray(item.players) ? item.players.map(function (player, index) {
      return betboomPlayer(player, index === 0 ? "home" : "away");
    }).filter(function (player) {
      return !!(player.name || player.imageUrl || player.flagUrl);
    }) : [];
    var home = players[0] || {};
    var away = players[1] || {};
    var score = betboomScoreText(item.score);

    return {
      id: betboomText(item.matchId || item.id),
      matchId: betboomText(item.matchId || item.id),
      title: betboomText(item.title) || [home.name, away.name].filter(Boolean).join(" vs "),
      subtitle: betboomText(item.subtitle),
      sport: betboomText(item.sport),
      sportId: betboomText(item.sportId),
      category: betboomText(item.category),
      categoryId: betboomText(item.categoryId),
      tournament: betboomText(item.tournament),
      tournamentId: betboomText(item.tournamentId),
      startTime: betboomText(item.startTime),
      startTimeText: betboomText(item.startTimeText),
      status: betboomText(item.status),
      catalogMode: betboomText(item.catalogMode || item.mode),
      score: score,
      openUrl: betboomSafeUrl(item.openUrl),
      homeImageUrl: betboomSafeUrl(item.homeImageUrl || (home && home.imageUrl)),
      awayImageUrl: betboomSafeUrl(item.awayImageUrl || (away && away.imageUrl)),
      backgroundImageUrl: betboomSafeUrl(item.backgroundImageUrl || item.sportIconUrl || item.categoryIconUrl || item.homeImageUrl || item.awayImageUrl),
      sportIconUrl: betboomSafeUrl(item.sportIconUrl),
      categoryIconUrl: betboomSafeUrl(item.categoryIconUrl),
      players: players,
      facts: Array.isArray(item.facts) ? item.facts : [],
      stats: Array.isArray(item.stats) ? item.stats : [],
      timeline: Array.isArray(item.timeline) ? item.timeline : [],
      images: Array.isArray(item.images) ? item.images : []
    };
  }

  function betboomCatalogRows(payload) {
    return (Array.isArray(payload && payload.matches) ? payload.matches : [])
      .map(betboomCatalogRow)
      .filter(function (row) {
        return !!row.matchId;
      });
  }

  function betboomPlayer(player, side) {
    var row = player || {};

    return {
      side: betboomText(row.side || side || ""),
      name: betboomText(row.name || row.fullName || row.title),
      fullName: betboomText(row.fullName || row.mediumName || row.displayName),
      country: betboomText(row.country || row.countryName),
      countryCode: betboomText(row.countryCode || row.cc),
      rank: betboomText(row.rank || row.ranking || row.atpRank || row.wtaRank),
      seed: betboomText(row.seed || row.seeding),
      form: betboomText(row.form || row.formScore),
      age: betboomText(row.age),
      birthDate: betboomText(row.birthDate || row.dateOfBirth),
      height: betboomText(row.height),
      weight: betboomText(row.weight),
      handedness: betboomText(row.handedness || row.hand),
      coach: betboomText(row.coach || row.manager),
      favoriteSurface: betboomText(row.favoriteSurface || row.favouriteSurface),
      turnedPro: betboomText(row.turnedPro),
      teamUid: betboomText(row.teamUid || row.uid),
      imageUrl: betboomSafeUrl(row.imageUrl || row.image || row.logoUrl),
      flagUrl: betboomSafeUrl(row.flagUrl || row.flag || row.countryFlagUrl)
    };
  }

  function betboomConfiguredPlayers(config) {
    var matchConfig = config && config.matchConfig || {};
    var rows = [];

    if (Array.isArray(config && config.players)) rows = rows.concat(config.players);
    if (Array.isArray(matchConfig.players)) rows = rows.concat(matchConfig.players);
    return rows.map(function (player, index) {
      return betboomPlayer(player, index === 0 ? "home" : "away");
    }).filter(function (player) {
      return !!(player.name || player.imageUrl || player.flagUrl);
    });
  }

  function betboomMergeConfiguredPlayers(players, config) {
    var rows = players || [];
    var configured = betboomConfiguredPlayers(config || {});

    configured.forEach(function (source, index) {
      var side = clean(source.side);
      var target = rows.filter(function (player) {
        return side && clean(player.side) === side;
      })[0];

      if (!target && source.name) {
        target = rows.filter(function (player) {
          return clean(player.name) === clean(source.name) || clean(player.fullName) === clean(source.name);
        })[0];
      }

      if (!target && rows[index]) target = rows[index];

      if (target) {
        if (source.imageUrl) target.imageUrl = source.imageUrl;
        if (source.flagUrl && !target.flagUrl) target.flagUrl = source.flagUrl;
        if (source.fullName && !target.fullName) target.fullName = source.fullName;
      } else if (source.name || source.imageUrl) {
        rows.push(source);
      }
    });

    return rows;
  }

  function betboomStatRow(row) {
    var item = row || {};
    var label = betboomText(item.label || item.name || item.type);
    var home = betboomText(item.home || item.homeValue || item.value1);
    var away = betboomText(item.away || item.awayValue || item.value2);

    if (!label || (!home && !away)) return null;
    return { label: label, home: home || "-", away: away || "-" };
  }

  function betboomImageRows(payload, players, config) {
    var panel = config || {};
    var maxImages = Number(panel.maxImages);
    var limit = isFinite(maxImages) && maxImages > 0 ? Math.min(maxImages, 20) : 8;
    var images = Array.isArray(payload && payload.images) ? payload.images : [];
    var rows = [];
    var seen = {};

    function add(label, url) {
      var cleanUrl = betboomSafeUrl(url);
      var key = cleanUrl.toLowerCase();

      if (!cleanUrl || seen[key] || rows.length >= limit) return;
      seen[key] = true;
      rows.push({ label: betboomText(label) || "Image", url: cleanUrl });
    }

    images.forEach(function (image) {
      if (typeof image === "string") {
        add("Image", image);
      } else {
        add(image && (image.label || image.title || image.name), image && (image.url || image.src || image.imageUrl));
      }
    });

    (players || []).forEach(function (player) {
      add(player && player.name, player && player.imageUrl);
      add((player && player.country) || (player && player.name), player && player.flagUrl);
    });

    add("Home player", panel.homeImageUrl || (panel.matchConfig && panel.matchConfig.homeImageUrl));
    add("Away player", panel.awayImageUrl || (panel.matchConfig && panel.matchConfig.awayImageUrl));

    return rows;
  }

  function betboomFactRows(match, payloadFacts) {
    var row = match || {};
    var facts = [];
    var seen = {};

    function add(label, value) {
      var cleanLabel = betboomText(label);
      var cleanValue = betboomText(value);
      var key;

      if (!cleanLabel || !cleanValue) return;
      key = (cleanLabel + ":" + cleanValue).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      facts.push({ label: cleanLabel, value: cleanValue });
    }

    (Array.isArray(payloadFacts) ? payloadFacts : []).forEach(function (fact) {
      if (Array.isArray(fact)) add(fact[0], fact[1]);
      else add(fact && (fact.label || fact.name), fact && (fact.value || fact.text));
    });

    [
      ["Start", row.startTimeText || row.startText || row.startTime],
      ["Status", row.status],
      ["Tournament", row.tournament],
      ["Category", row.category],
      ["Round", row.round],
      ["Surface", row.surface],
      ["City", row.city],
      ["Country", row.country],
      ["Venue", row.venue],
      ["Sport", row.sport]
    ].forEach(function (item) {
      add(item[0], item[1]);
    });

    return facts;
  }

  function betboomMatchSummary(payload, config) {
    var panel = config || {};
    var data = payload && payload.data && typeof payload.data === "object" ? payload.data : (payload || {});
    var match = data.match || {};
    var players = Array.isArray(data.players) ? data.players.map(function (player, index) {
      return betboomPlayer(player, index === 0 ? "home" : "away");
    }).filter(function (player) {
      return !!player.name;
    }) : [];
    players = betboomMergeConfiguredPlayers(players, panel);
    var home = players[0] && players[0].name;
    var away = players[1] && players[1].name;
    var stats = (Array.isArray(data.stats) ? data.stats : Array.isArray(data.comparisons) ? data.comparisons : [])
      .map(betboomStatRow)
      .filter(Boolean)
      .slice(0, panel.maxStats || 8);
    var title = betboomText(match.title || data.title);
    var subtitle = [
      betboomText(match.tournament || data.tournament),
      betboomText(match.round),
      betboomText(match.surface)
    ].filter(Boolean).join(" · ");

    if (!title && home && away) title = home + " vs " + away;

    return {
      id: betboomText(match.matchId || data.matchId || data.id),
      title: title || betboomText(panel.title) || "BetBoom match",
      subtitle: subtitle || betboomText(match.subtitle || data.subtitle || panel.subtitle),
      status: betboomText(match.status || data.status),
      score: betboomScoreText(match.score || data.score || panel.score || (panel.matchConfig && panel.matchConfig.score)),
      statUrl: betboomSafeUrl(match.statUrl || data.statUrl || data.stat_url),
      openUrl: betboomSafeUrl(match.openUrl || data.openUrl || panel.openUrl),
      homeImageUrl: betboomSafeUrl(match.homeImageUrl || data.homeImageUrl || panel.homeImageUrl || (panel.matchConfig && panel.matchConfig.homeImageUrl)),
      awayImageUrl: betboomSafeUrl(match.awayImageUrl || data.awayImageUrl || panel.awayImageUrl || (panel.matchConfig && panel.matchConfig.awayImageUrl)),
      backgroundImageUrl: betboomSafeUrl(match.backgroundImageUrl || data.backgroundImageUrl || panel.backgroundImageUrl || (panel.matchConfig && panel.matchConfig.backgroundImageUrl)),
      facts: betboomFactRows(match, data.facts),
      players: players,
      stats: stats,
      images: betboomImageRows(data, players, panel),
      timeline: Array.isArray(data.timeline) ? data.timeline : [],
      feeds: Array.isArray(data.feeds) ? data.feeds : [],
      sources: data.sources || {},
      ids: data.ids || {},
      feedCount: Array.isArray(data.feeds) ? data.feeds.filter(function (feed) { return feed && feed.ok; }).length : 0,
      timelineCount: Array.isArray(data.timeline) ? data.timeline.length : 0,
      sourceCount: data.sources && Array.isArray(data.sources.apiEndpoints) ? data.sources.apiEndpoints.length : 0,
      rawAvailable: !!(data.raw || data.gismo || data.details || data.sources)
    };
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

  function firstText() {
    var i;
    var v;

    for (i = 0; i < arguments.length; i += 1) {
      v = arguments[i];
      if (v == null) continue;
      if (typeof v === "object") continue;
      v = String(v).replace(/\s+/g, " ").trim();
      if (v) return v;
    }

    return "";
  }

  function matchClockSeconds(value) {
    var text;
    var parts;
    var minutes;
    var seconds;

    if (value == null || value === "") return null;

    text = String(value).trim();
    if (/^\d+:\d{1,2}$/.test(text)) {
      parts = text.split(":");
      minutes = Number(parts[0]);
      seconds = Number(parts[1]);
      if (isFinite(minutes) && isFinite(seconds) && seconds >= 0) return Math.floor(minutes * 60 + seconds);
    }

    seconds = Number(value);
    if (!isFinite(seconds) || seconds < 0) return null;

    return Math.floor(seconds);
  }

  function formatMatchClock(value) {
    var seconds = matchClockSeconds(value);
    var minutes;
    var rest;

    if (seconds == null) return "";
    minutes = Math.floor(seconds / 60);
    rest = seconds % 60;

    return String(minutes) + ":" + (rest < 10 ? "0" : "") + String(rest);
  }

  function tickingMatchClockText(baseSeconds, startedAt, now) {
    var seconds = matchClockSeconds(baseSeconds);
    var elapsed = Math.floor((Number(now) - Number(startedAt)) / 1000);

    if (seconds == null) return "";
    if (!isFinite(elapsed) || elapsed < 0) elapsed = 0;

    return formatMatchClock(seconds + elapsed);
  }

  function matchMinute(value) {
    var seconds = Number(value);

    if (!isFinite(seconds) || seconds < 0) return "";
    return String(Math.floor(seconds / 60) + 1) + "'";
  }

  function weatherText(value) {
    var w = value || {};
    var temp = firstText(w.temperature, w.temperatureText, w.temp, w.temperature_2m);
    var condition = firstText(w.condition, w.description, w.summary, w.weather);
    var wind = firstText(w.wind, w.windText, w.wind_speed_10m);
    var parts = [];

    if (temp) parts.push(temp);
    if (condition) parts.push(condition);
    if (wind) parts.push("Wind " + wind);
    return parts.join(" · ");
  }

  function infoRows(rows) {
    var out = [];

    (rows || []).forEach(function (row) {
      var value = firstText(row && row.value);
      if (row && row.label && value) out.push({ label: row.label, value: value });
    });

    return out;
  }

  function liveEventSummary(data, fallbackTeams) {
    var ev = data || {};
    var score = ev.score || {};
    var tm = teams(ev);
    var fallback = fallbackTeams || {};
    var extra = score.liveExtraData || {};
    var server = "";
    var clockSeconds = matchClockSeconds(score.matchClock != null ? score.matchClock : ev.matchClock);
    var clock = formatMatchClock(clockSeconds);
    var venue = ev.venue || ev.stadium || ev.location || {};
    var venueName = firstText(ev.stadiumName, ev.venueName, ev.groundName, venue.name, venue.stadium, venue.venue);
    var cityName = firstText(ev.cityName, ev.city, venue.city, venue.town, venue.location);
    var weather = weatherText(ev.weather || ev.weatherConditions || ev.currentWeather);
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
      clockText: clock,
      clockSeconds: clockSeconds,
      serviceText: server,
      periodRows: periods,
      statRows: stats,
      streamText: streamStatus ? "Stream " + String(streamStatus).toLowerCase() : "",
      venueName: venueName,
      cityName: cityName,
      weatherText: weather,
      infoRows: infoRows([
        { label: "Status", value: status || "-" },
        { label: "Clock", value: clock },
        { label: "Start", value: dateText(ev.startTime) },
        { label: "Sport", value: ev.sportName },
        { label: "Region", value: ev.regionName },
        { label: "Tournament", value: ev.tournamentName },
        { label: "Venue", value: venueName },
        { label: "City", value: cityName },
        { label: "Weather", value: weather },
        { label: "Stream", value: streamStatus ? String(streamStatus).toLowerCase() : "" }
      ])
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

  function monitorAbsoluteUrl(value) {
    var text = String(value || "");

    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.charAt(0) === "/") return "https://ui-monitor.lynon.online" + text;
    return "";
  }

  function liveAnimationUrlFromResolver(data) {
    var src = data && (data.url || data.animationUrl || data.trackerUrl || "");

    if (src) return String(src);
    return "";
  }

  function liveVideoUrlFromResolver(data) {
    return monitorAbsoluteUrl(data && (data.broadcastUrl || data.videoUrl || data.streamUrl || ""));
  }

  function liveVisualSourcesFromResolver(data) {
    return {
      animation: liveAnimationUrlFromResolver(data),
      video: liveVideoUrlFromResolver(data)
    };
  }

  function normalizeLiveVisualSources(value) {
    if (!value) return { animation: "", video: "" };
    if (typeof value === "string") return { animation: value, video: "" };

    return {
      animation: value.animation || "",
      video: value.video || ""
    };
  }

  function liveVisualMode(sources, preferred) {
    var src = normalizeLiveVisualSources(sources);

    if (preferred && src[preferred]) return preferred;
    if (src.animation) return "animation";
    if (src.video) return "video";
    return "";
  }

  function liveVisualSignature(sources) {
    var src = normalizeLiveVisualSources(sources);

    return src.animation + "||" + src.video;
  }

  function sportscastIdFromAnimationUrl(value) {
    var text = String(value || "");
    var match = text.match(/\/tracker\/get\/(\d+)/i) || text.match(/[?&]eventId=(\d+)/i);

    return match ? match[1] : "";
  }

  function sportscastActransUrl(id) {
    return id ? "https://line-lb61-w.bk6bba-resources.com/ma/sportscast/actrans?fonid=" + encodeURIComponent(id) : "";
  }

  function sportscastEventsUrl(code) {
    return code ? "https://line-lb61-w.bk6bba-resources.com/ma/sportscast/events?code=" + encodeURIComponent(code) + "&lastid=0" : "";
  }

  function sportscastBestItem(data) {
    var items = (data && data.items) || [];
    var best = null;

    items.forEach(function (item) {
      if (!best || ((item.players || []).length > (best.players || []).length)) best = item;
    });

    return best || {};
  }

  function playerMapFromSportscast(actrans, eventsPayload) {
    var item = sportscastBestItem(actrans);
    var players = (item.players || (eventsPayload && eventsPayload.extraInfo && eventsPayload.extraInfo.players) || []);
    var map = {};

    players.forEach(function (p) {
      if (p && p.playerId != null) map[String(p.playerId)] = p;
    });

    return map;
  }

  function sportscastTeamName(number, summary, reverse) {
    var n = String(number || "");

    if (reverse) {
      if (n === "1") return summary.awayName;
      if (n === "2") return summary.homeName;
    }
    if (n === "1") return summary.homeName;
    if (n === "2") return summary.awayName;
    return "";
  }

  function sportscastGoalTimeline(actrans, eventsPayload, summary) {
    var events = (eventsPayload && eventsPayload.events) || [];
    var players = playerMapFromSportscast(actrans, eventsPayload);
    var reverse = !!(eventsPayload && eventsPayload.extraInfo && eventsPayload.extraInfo.teamsReverse);
    var canceled = {};
    var goals = [];
    var homeScore = 0;
    var awayScore = 0;

    events.forEach(function (ev) {
      if (ev && ev.type === 1020 && ev.i2 != null) canceled[String(ev.i2)] = true;
    });

    events.forEach(function (ev, index) {
      var scorerEvent;
      var scorer;
      var assist;
      var teamNumber;
      var next;
      var i;

      if (!ev) return;
      if (ev.type === 1200) {
        if (String(ev.i1) === "1") homeScore = Number(ev.i2) || 0;
        if (String(ev.i1) === "2") awayScore = Number(ev.i2) || 0;
        return;
      }

      if (ev.type !== 1100 || canceled[String(ev.id)]) return;

      teamNumber = String(ev.i1 || "");
      for (i = index + 1; i < events.length && i < index + 24; i += 1) {
        next = events[i];
        if (!next) continue;
        if (next.type === 1100) break;
        if (next.type === 1200) {
          if (String(next.i1) === "1") homeScore = Number(next.i2) || homeScore;
          if (String(next.i1) === "2") awayScore = Number(next.i2) || awayScore;
        }
        if (!scorerEvent && (next.type === 1867 || next.type === 1866) && String(next.i1) === String(ev.id)) scorerEvent = next;
      }

      scorer = scorerEvent && players[String(scorerEvent.i3)];
      assist = scorerEvent && players[String(scorerEvent.i4)];
      goals.push({
        team: sportscastTeamName(teamNumber, summary || {}, reverse) || (teamNumber ? "Team " + teamNumber : ""),
        teamNumber: teamNumber,
        time: formatMatchClock(ev.i3),
        minute: matchMinute(ev.i3),
        scorer: firstText(scorer && scorer.playerName) || "Scorer unavailable",
        assist: firstText(assist && assist.playerName),
        score: String(homeScore) + " - " + String(awayScore)
      });
    });

    return goals.slice(-8);
  }

  function sportscastProviderRows(actrans, eventsPayload) {
    var item = sportscastBestItem(actrans);
    var extraInfo = (eventsPayload && eventsPayload.extraInfo) || {};
    var sportscastExtra = extraInfo.sportscastExtra || item.extra || {};
    var players = item.players || extraInfo.players || [];
    var events = (eventsPayload && eventsPayload.events) || [];
    var rows = [];
    var coverage = firstText(sportscastExtra.coverage, item.extra && item.extra.coverage);
    var duration = firstText(sportscastExtra.duration, item.extra && item.extra.duration);
    var version = firstText(extraInfo.version, item.version);

    if (coverage) rows.push({ label: "Coverage", value: statLabel(coverage) });
    if (duration) rows.push({ label: "Duration", value: String(duration) + " min" });
    if (players.length) rows.push({ label: "Roster", value: String(players.length) + " players" });
    if (events.length) rows.push({ label: "Timeline", value: String(events.length) + " events" });
    if (version) rows.push({ label: "Provider Version", value: version });

    return rows;
  }

  function sportscastEventTime(ev) {
    if (!ev) return "";
    if (ev.type === 2681 && ev.i5 != null) return formatMatchClock(ev.i5);
    if (ev.i3 != null && (ev.type === 1100 || ev.type === 1106 || ev.type === 1107 || ev.type === 1116 || ev.type === 1149 || ev.type === 1164)) return formatMatchClock(ev.i3);
    return "";
  }

  function sportscastEventLabel(ev) {
    var type = ev && ev.type;
    var labels = {
      "1020": "Cancelled event",
      "1100": "Goal",
      "1200": "Score update",
      "1866": "Player detail",
      "1867": "Goal detail",
      "2681": "Field position"
    };

    return labels[String(type)] || ("Action " + String(type || ""));
  }

  function sportscastEventTeam(ev, summary, reverse) {
    var type = ev && ev.type;
    var teamNumber = "";

    if (type === 2681) teamNumber = ev.i4;
    else teamNumber = ev && ev.i1;

    return sportscastTeamName(teamNumber, summary || {}, reverse);
  }

  function sportscastCompactFields(ev, skip) {
    var out = [];
    var skipped = skip || {};

    ["i1", "i2", "i3", "i4", "i5", "i6"].forEach(function (key) {
      if (skipped[key] || !ev || ev[key] == null || ev[key] === "") return;
      out.push(key + " " + ev[key]);
    });

    return out.slice(0, 3).join(" · ");
  }

  function sportscastTimelineDetail(ev, players) {
    var scorer;
    var assist;

    if (!ev) return "";
    if (ev.type === 2681) return "X " + ev.i1 + " · Y " + ev.i2;
    if (ev.type === 1200) return "Score " + scoreValue(ev.i2);
    if (ev.type === 1867 || ev.type === 1866) {
      scorer = players[String(ev.i3)];
      assist = players[String(ev.i4)];
      return [firstText(scorer && scorer.playerName), assist ? "Assist " + firstText(assist.playerName) : ""].filter(Boolean).join(" · ") || sportscastCompactFields(ev, { i1: true });
    }
    if (ev.type === 1100) return "Goal event";

    return sportscastCompactFields(ev, { i1: true, i3: true });
  }

  function sportscastTimelineRows(actrans, eventsPayload, summary, limit) {
    var events = (eventsPayload && eventsPayload.events) || [];
    var players = playerMapFromSportscast(actrans, eventsPayload);
    var reverse = !!(eventsPayload && eventsPayload.extraInfo && eventsPayload.extraInfo.teamsReverse);
    var max = Math.max(1, Math.min(Number(limit) || 20, 50));

    return events.slice(-max).reverse().map(function (ev) {
      return {
        id: String(ev && ev.id || ""),
        label: sportscastEventLabel(ev),
        time: sportscastEventTime(ev),
        team: sportscastEventTeam(ev, summary || {}, reverse),
        detail: sportscastTimelineDetail(ev, players),
        type: String(ev && ev.type || "")
      };
    });
  }

  function sportscastTeamCoach(item, extraInfo, teamNumber) {
    var home = String(teamNumber) === "1";
    var sources = [item || {}, extraInfo || {}, (extraInfo && extraInfo.sportscastExtra) || {}];
    var keys = home ?
      ["homeCoach", "homeCoachName", "coachHome", "team1Coach", "team1CoachName", "fonTeam1Coach"] :
      ["awayCoach", "awayCoachName", "coachAway", "team2Coach", "team2CoachName", "fonTeam2Coach"];
    var i;
    var k;
    var v;

    for (i = 0; i < sources.length; i += 1) {
      for (k = 0; k < keys.length; k += 1) {
        v = firstText(sources[i][keys[k]]);
        if (v) return v;
      }
    }

    return "";
  }

  function sportscastPlayerName(p) {
    var shirt = firstText(p && p.shirtNumber);
    var name = firstText(p && p.playerName);

    return (shirt ? shirt + " " : "") + (name || "Player");
  }

  function sportscastTeamRows(actrans, eventsPayload, summary) {
    var item = sportscastBestItem(actrans);
    var extraInfo = (eventsPayload && eventsPayload.extraInfo) || {};
    var players = item.players || extraInfo.players || [];
    var out = [
      { team: (summary && summary.homeName) || "Home", coach: sportscastTeamCoach(item, extraInfo, "1"), starters: [], substitutes: [] },
      { team: (summary && summary.awayName) || "Away", coach: sportscastTeamCoach(item, extraInfo, "2"), starters: [], substitutes: [] }
    ];

    players.forEach(function (p) {
      var index = String(p && p.teamNumber) === "2" ? 1 : 0;
      var row = sportscastPlayerName(p);

      if (p && p.isSubstitute) out[index].substitutes.push(row);
      else out[index].starters.push(row);
    });

    return out.filter(function (team) {
      return team.coach || team.starters.length || team.substitutes.length;
    });
  }

  function newsQuery(summary) {
    return [summary.homeName, summary.awayName, summary.tournament || summary.sportName || "sports"].join(" ").replace(/\s+/g, " ").trim();
  }

  function newsSearchUrl(summary) {
    var q = newsQuery(summary);

    return q ? "https://news.google.com/search?q=" + encodeURIComponent(q) + "&hl=en-US&gl=US&ceid=US:en" : "";
  }

  function newsFeedUrl(summary) {
    var q = newsQuery(summary);
    var rss;

    if (!q) return "";
    rss = "news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-US&gl=US&ceid=US:en";
    return "https://r.jina.ai/http://" + rss;
  }

  function parseJinaNews(text) {
    var rows = [];
    var re = /###\s+\[([^\]]+)\]\(([^)]+)\)/g;
    var match;

    while ((match = re.exec(String(text || ""))) && rows.length < 4) {
      rows.push({
        title: match[1].replace(/\s+/g, " ").trim(),
        url: match[2],
        source: "Google News"
      });
    }

    return rows;
  }

  function weatherCodeText(code) {
    var map = {
      "0": "Clear",
      "1": "Mainly clear",
      "2": "Partly cloudy",
      "3": "Overcast",
      "45": "Fog",
      "48": "Rime fog",
      "51": "Light drizzle",
      "53": "Drizzle",
      "55": "Dense drizzle",
      "61": "Light rain",
      "63": "Rain",
      "65": "Heavy rain",
      "71": "Light snow",
      "73": "Snow",
      "75": "Heavy snow",
      "80": "Rain showers",
      "81": "Rain showers",
      "82": "Heavy showers",
      "95": "Thunderstorm"
    };

    return map[String(code)] || "";
  }

  function weatherFromOpenMeteo(data) {
    var current = data && data.current;
    var units = data && data.current_units || {};
    var temp = current && current.temperature_2m;
    var wind = current && current.wind_speed_10m;
    var condition = current ? weatherCodeText(current.weather_code) : "";

    return weatherText({
      temperature: temp != null ? String(temp) + (units.temperature_2m || " C") : "",
      wind: wind != null ? String(wind) + (units.wind_speed_10m || " km/h") : "",
      condition: condition
    });
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
    if (live.clockTimer) {
      clearInterval(live.clockTimer);
      live.clockTimer = 0;
    }
    live.clock = {};

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

  function infoRowsHtml(rows) {
    if (!rows || !rows.length) return '<div class="live-empty">No extra info yet.</div>';

    return '<div class="live-info-list">' + rows.map(function (row) {
      var clockId = row.label === "Clock" ? ' id="dmbo-live-info-clock"' : "";

      return '<div><span>' + esc(row.label) + '</span><b' + clockId + '>' + esc(row.value) + '</b></div>';
    }).join("") + '</div>';
  }

  function goalRowsHtml(rows) {
    if (!rows || !rows.length) return '<div class="live-empty">Goal details are not available for this match yet.</div>';

    return '<div class="live-goals">' + rows.map(function (row, index) {
      return '<div class="' + (index === rows.length - 1 ? "latest" : "") + '"><b>' + esc(row.minute || row.time || "") + '</b><span>' + esc(row.team || "") + '</span><strong>' + esc(row.scorer || "Scorer unavailable") + '</strong><em>' + esc((row.assist ? "Assist: " + row.assist + " · " : "") + (row.score || "")) + '</em></div>';
    }).join("") + '</div>';
  }

  function latestGoalHtml(rows) {
    var row;

    if (!rows || !rows.length) return "";
    row = rows[rows.length - 1] || {};

    return '<span>Latest goal</span><b>' + esc((row.minute || row.time || "") + " " + (row.scorer || "Scorer unavailable")) + '</b><em>' + esc(row.score || "") + '</em>';
  }

  function weatherPanelHtml(summary, weather, pending) {
    var rows = [];

    if (summary && summary.weatherText) rows.push({ label: "Current", value: summary.weatherText });
    if (weather) rows.push({ label: "Current", value: weather });
    if (summary && summary.venueName) rows.push({ label: "Venue", value: summary.venueName });
    if (summary && summary.cityName) rows.push({ label: "City", value: summary.cityName });
    if (weather) rows.push({ label: "Source", value: "Open-Meteo" });

    if (rows.length) return infoRowsHtml(rows);
    if (pending) return '<div class="live-empty">Weather is loading.</div>';
    if (summary && summary.cityName) return '<div class="live-empty">Weather is unavailable for this city right now.</div>';

    return '<div class="live-empty">Weather needs city or venue data from this event feed.</div>';
  }

  function timelineRowsHtml(rows, count) {
    var html = "";

    if (count) html += '<div class="live-timeline-total">' + esc(count) + ' provider events</div>';
    if (!rows || !rows.length) return html + '<div class="live-empty">Timeline is loading or unavailable.</div>';

    return html + '<div class="live-timeline-list">' + rows.map(function (row) {
      return '<div><b>' + esc(row.time || "--") + '</b><span>' + esc(row.label || "Event") + '</span><strong>' + esc(row.team || "") + '</strong><em>' + esc(row.detail || ("Type " + row.type)) + '</em></div>';
    }).join("") + '</div>';
  }

  function timelineStripHtml(rows) {
    if (!rows || !rows.length) return "";

    return rows.slice(0, 5).map(function (row) {
      return '<div class="live-tick"><b>' + esc(row.time || "--") + '</b><span>' + esc(row.label || "Event") + '</span><em>' + esc([row.team, row.detail].filter(Boolean).join(" · ")) + '</em></div>';
    }).join("");
  }

  function teamRowsHtml(rows) {
    if (!rows || !rows.length) return '<div class="live-empty">Team roster or coach data is unavailable in this feed.</div>';

    return '<div class="live-team-list">' + rows.map(function (team) {
      var starters = (team.starters || []).slice(0, 12);
      var subs = (team.substitutes || []).slice(0, 8);

      return '<div><h4>' + esc(team.team || "Team") + '</h4>' +
        (team.coach ? '<p><b>Coach</b><span>' + esc(team.coach) + '</span></p>' : '') +
        '<p><b>Starters</b><span>' + esc(starters.join(", ") || "-") + '</span></p>' +
        '<p><b>Substitutes</b><span>' + esc(subs.join(", ") || "-") + '</span></p></div>';
    }).join("") + '</div>';
  }

  function newsRowsHtml(rows, queryUrl) {
    var html = "";

    if (rows && rows.length) {
      html = '<div class="live-news-list">' + rows.map(function (row) {
        return '<a href="' + esc(row.url) + '" target="_blank" rel="noopener noreferrer">' + esc(row.title) + '<span>' + esc(row.source || "News") + '</span></a>';
      }).join("") + '</div>';
    } else {
      html = '<div class="live-empty">Live news is loading or unavailable.</div>';
    }

    if (queryUrl) html += '<a class="live-open-news" href="' + esc(queryUrl) + '" target="_blank" rel="noopener noreferrer">Open latest news</a>';
    return html;
  }

  function setLiveUpdateTab(item, mode) {
    var root = qs("dmbo-live-updates");
    var selected = /^(weather|timeline|teams)$/.test(String(mode || "")) ? mode : "news";

    if (!item || !root || !root.querySelectorAll) return;
    live.updateTab[item.key] = selected;

    Array.prototype.forEach.call(root.querySelectorAll("[data-dmbo-live-update]"), function (button) {
      var on = button.getAttribute("data-dmbo-live-update") === selected;

      button.className = on ? "on" : "";
      button.setAttribute("aria-selected", on ? "true" : "false");
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-dmbo-live-pane]"), function (pane) {
      pane.style.display = pane.getAttribute("data-dmbo-live-pane") === selected ? "block" : "none";
    });
  }

  function bindLiveUpdateTabs(item) {
    var root = qs("dmbo-live-updates");

    if (!item || !root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-dmbo-live-update]"), function (button) {
      if (button.__DMBO_LIVE_UPDATE_BOUND__) return;
      button.__DMBO_LIVE_UPDATE_BOUND__ = true;
      button.onclick = function () {
        setLiveUpdateTab(item, button.getAttribute("data-dmbo-live-update"));
      };
    });

    setLiveUpdateTab(item, live.updateTab[item.key] || "news");
  }

  function updateLiveClock() {
    var text;
    var clock = live.clock || {};
    var clockEl = qs("dmbo-live-clock");
    var infoClock = qs("dmbo-live-info-clock");

    if (!clock.key || clock.key !== live.activeKey) return;
    text = tickingMatchClockText(clock.baseSeconds, clock.startedAt, Date.now()) || clock.text || "";
    if (clockEl && text) clockEl.textContent = text;
    if (infoClock && text) infoClock.textContent = text;
  }

  function startLiveClock(item, summary) {
    if (live.clockTimer) {
      clearInterval(live.clockTimer);
      live.clockTimer = 0;
    }

    live.clock = {
      key: item && item.key,
      baseSeconds: summary && summary.clockSeconds,
      startedAt: Date.now(),
      text: summary && summary.clockText
    };
    updateLiveClock();

    if (summary && summary.clockSeconds != null) {
      live.clockTimer = setInterval(updateLiveClock, 1000);
    }
  }

  function pulseLiveGoalChange(item, count) {
    var card = qs("dmbo-live-score-card");
    var previous = item && live.goalCounts[item.key];

    if (item && previous != null && count > previous && card && card.classList) {
      card.classList.remove("goal-pulse");
      try { void card.offsetWidth; } catch (e) {}
      card.classList.add("goal-pulse");
    }
    if (item) live.goalCounts[item.key] = count;
  }

  function liveVisualTabsHtml(sources, mode) {
    var src = normalizeLiveVisualSources(sources);

    if (!src.animation && !src.video) return "";
    return '<div class="live-tabs" role="tablist" aria-label="Live visual source">' +
      (src.animation && src.video ? '<button type="button" data-dmbo-live-visual="animation" class="' + (mode === "animation" ? "on" : "") + '">Animation</button><button type="button" data-dmbo-live-visual="video" class="' + (mode === "video" ? "on" : "") + '">Video</button>' : '') +
      '<span></span><button type="button" data-dmbo-live-fullscreen>Full screen</button>' +
      '</div>';
  }

  function liveVisualFrameHtml(src, mode) {
    var title = mode === "video" ? "Live match video" : "Live match animation";

    return '<iframe title="' + esc(title) + '" src="' + esc(src) + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer"></iframe>';
  }

  function bindLiveVisualTabs(item, slot, sources) {
    if (!slot || !slot.querySelectorAll) return;

    Array.prototype.forEach.call(slot.querySelectorAll("[data-dmbo-live-visual]"), function (button) {
      button.onclick = function () {
        var mode = button.getAttribute("data-dmbo-live-visual");

        live.visualMode[item.key] = mode;
        setLiveVisualSlot(slot, item, sources);
      };
    });

    Array.prototype.forEach.call(slot.querySelectorAll("[data-dmbo-live-fullscreen]"), function (button) {
      button.onclick = function () {
        var frame = slot.querySelector && slot.querySelector("iframe");
        var request = frame && (frame.requestFullscreen || frame.webkitRequestFullscreen || frame.mozRequestFullScreen || frame.msRequestFullscreen);

        if (request) {
          try { request.call(frame); return; } catch (e) {}
        }
        if (frame && frame.src) window.open(frame.src, "_blank", "noopener,noreferrer");
      };
    });
  }

  function setLiveVisualSlot(slot, item, sources) {
    var src = normalizeLiveVisualSources(sources);
    var mode = liveVisualMode(src, live.visualMode[item.key]);
    var frameSrc = mode ? src[mode] : "";
    var frame = slot && slot.querySelector && slot.querySelector("iframe");
    var signature = liveVisualSignature(src);

    if (!slot) return;
    if (!frameSrc) {
      slot.innerHTML = '<div class="live-empty">Animation is not available for this event yet.</div>';
      return;
    }

    if (
      frame &&
      slot.getAttribute("data-dmbo-live-mode") === mode &&
      slot.getAttribute("data-dmbo-live-sources") === signature &&
      sameLiveSrc(frame.src, frameSrc)
    ) {
      return;
    }

    live.visualMode[item.key] = mode;
    slot.setAttribute("data-dmbo-live-mode", mode);
    slot.setAttribute("data-dmbo-live-sources", signature);
    slot.innerHTML = liveVisualTabsHtml(src, mode) + liveVisualFrameHtml(frameSrc, mode);
    bindLiveVisualTabs(item, slot, src);
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
    var cached = normalizeLiveVisualSources(live.animationCache[item.key]);
    var sources = {
      animation: preset || cached.animation,
      video: cached.video
    };
    var resolverUrl;

    if (!slot) return;

    if (sources.animation || sources.video) {
      setLiveVisualSlot(slot, item, sources);
      loadLiveTimeline(item, summary, sources.animation);
      return;
    }

    if (live.animationMiss[item.key]) {
      slot.innerHTML = '<div class="live-empty">Animation is not available for this event yet.</div>';
      return;
    }

    if (live.animationPending[item.key]) return;

    resolverUrl = liveAnimationResolverUrl(c, item.config, item.event, {
      h: summary.homeName,
      a: summary.awayName
    });

    if (!resolverUrl) {
      live.animationMiss[item.key] = true;
      slot.innerHTML = '<div class="live-empty">Animation resolver is not configured for this event.</div>';
      return;
    }

    live.animationPending[item.key] = true;
    slot.innerHTML = '<div class="live-empty">Resolving live animation...</div>';
    getJson(resolverUrl, "omit", function (e, d) {
      var resolved = e ? { animation: "", video: "" } : liveVisualSourcesFromResolver(d);

      delete live.animationPending[item.key];
      if (live.activeKey !== item.key) return;
      if (resolved.animation || resolved.video) {
        live.animationCache[item.key] = resolved;
        setLiveVisualSlot(slot, item, resolved);
        loadLiveTimeline(item, summary, resolved.animation);
      } else {
        live.animationMiss[item.key] = true;
        slot.innerHTML = '<div class="live-empty">Animation unavailable until the Worker allows the matchtracker resolver.</div>';
      }
    });
  }

  function renderLiveExtras(item, summary) {
    var goals = qs("dmbo-live-goals");
    var latest = qs("dmbo-live-latest");
    var ticker = qs("dmbo-live-ticker");
    var info = qs("dmbo-live-info");
    var news = qs("dmbo-live-news");
    var weatherSlot = qs("dmbo-live-weather");
    var timelineSlot = qs("dmbo-live-timeline");
    var teamsSlot = qs("dmbo-live-teams");
    var timeline = live.timelineCache[item.key] || {};
    var newsRows = live.newsCache[item.key] || [];
    var weather = live.weatherCache[item.key];
    var rows = (summary.infoRows || []).slice();
    var goalRows = timeline.goals || [];
    var timelineRows = timeline.timelineRows || [];

    rows = rows.concat(timeline.providerRows || []);
    if (weather && !summary.weatherText) rows.push({ label: "Weather", value: weather });
    if (goals) goals.innerHTML = goalRowsHtml(goalRows);
    if (latest) {
      latest.innerHTML = latestGoalHtml(goalRows);
      latest.style.display = goalRows.length ? "flex" : "none";
    }
    if (ticker) {
      ticker.innerHTML = timelineStripHtml(timelineRows);
      ticker.style.display = timelineRows.length ? "grid" : "none";
    }
    if (info) info.innerHTML = infoRowsHtml(rows);
    if (news) news.innerHTML = newsRowsHtml(newsRows, newsSearchUrl(summary));
    if (weatherSlot) weatherSlot.innerHTML = weatherPanelHtml(summary, weather, !!live.weatherPending[item.key]);
    if (timelineSlot) timelineSlot.innerHTML = timelineRowsHtml(timelineRows, timeline.eventCount || 0);
    if (teamsSlot) teamsSlot.innerHTML = teamRowsHtml(timeline.teamRows || []);
    pulseLiveGoalChange(item, goalRows.length);
    bindLiveUpdateTabs(item);
    updateLiveClock();
  }

  function loadLiveTimeline(item, summary, animationUrl) {
    var id = sportscastIdFromAnimationUrl(animationUrl);
    var cached = item && live.timelineCache[item.key];

    if (!id || live.timelinePending[item.key]) return;
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < Math.max(5000, (item.config && item.config.pollMs) || 8000)) return;

    live.timelinePending[item.key] = true;
    getJson(sportscastActransUrl(id), "omit", function (e, actrans) {
      var best = sportscastBestItem(actrans);

      if (e || !best.code) {
        delete live.timelinePending[item.key];
        live.timelineCache[item.key] = {
          goals: [],
          providerRows: sportscastProviderRows(actrans, null),
          timelineRows: [],
          teamRows: sportscastTeamRows(actrans, null, summary),
          eventCount: 0,
          fetchedAt: Date.now()
        };
        if (live.activeKey === item.key) renderLiveExtras(item, summary);
        return;
      }

      getJson(sportscastEventsUrl(best.code), "omit", function (err2, eventsPayload) {
        delete live.timelinePending[item.key];
        live.timelineCache[item.key] = {
          goals: err2 ? [] : sportscastGoalTimeline(actrans, eventsPayload, summary),
          providerRows: sportscastProviderRows(actrans, err2 ? null : eventsPayload),
          timelineRows: err2 ? [] : sportscastTimelineRows(actrans, eventsPayload, summary, 20),
          teamRows: sportscastTeamRows(actrans, err2 ? null : eventsPayload, summary),
          eventCount: err2 ? 0 : ((eventsPayload && eventsPayload.events) || []).length,
          fetchedAt: Date.now()
        };
        if (live.activeKey === item.key) renderLiveExtras(item, summary);
      });
    });
  }

  function loadLiveNews(item, summary) {
    var url = newsFeedUrl(summary);

    if (!url || live.newsCache[item.key] || live.newsPending[item.key]) return;
    live.newsPending[item.key] = true;

    try {
      fetch(url, { credentials: "omit" }).then(function (r) {
        if (!r.ok) throw new Error("news " + r.status);
        return r.text();
      }).then(function (text) {
        delete live.newsPending[item.key];
        live.newsCache[item.key] = parseJinaNews(text);
        if (live.activeKey === item.key) renderLiveExtras(item, summary);
      }).catch(function () {
        delete live.newsPending[item.key];
        live.newsCache[item.key] = [];
        if (live.activeKey === item.key) renderLiveExtras(item, summary);
      });
    } catch (e) {
      delete live.newsPending[item.key];
      live.newsCache[item.key] = [];
    }
  }

  function loadLiveWeather(item, summary) {
    var city = summary.cityName;
    var url;

    if (!city || summary.weatherText || live.weatherCache[item.key] || live.weatherPending[item.key]) return;
    live.weatherPending[item.key] = true;
    url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";

    getJson(url, "omit", function (e, geo) {
      var place = geo && geo.results && geo.results[0];
      var forecastUrl;

      if (e || !place) {
        delete live.weatherPending[item.key];
        return;
      }

      forecastUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(place.latitude) + "&longitude=" + encodeURIComponent(place.longitude) + "&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto";
      getJson(forecastUrl, "omit", function (err2, weather) {
        delete live.weatherPending[item.key];
        if (!err2) live.weatherCache[item.key] = weatherFromOpenMeteo(weather);
        if (live.activeKey === item.key) renderLiveExtras(item, summary);
      });
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
    var period = qs("dmbo-live-period");
    var clock = qs("dmbo-live-clock");
    var liveText = qs("dmbo-live-text");
    var result = qs("dmbo-live-result");
    var stats = qs("dmbo-live-stats");
    var goals = qs("dmbo-live-goals");
    var latest = qs("dmbo-live-latest");
    var ticker = qs("dmbo-live-ticker");
    var info = qs("dmbo-live-info");
    var news = qs("dmbo-live-news");
    var weatherSlot = qs("dmbo-live-weather");
    var timelineSlot = qs("dmbo-live-timeline");
    var teamsSlot = qs("dmbo-live-teams");
    var errorBox = qs("dmbo-live-error");

    if (!modal || !body) return;

    if (title) title.textContent = item.config.title || "Live Match Center";
    if (meta) meta.textContent = summary.tournament + (summary.status && summary.status !== "-" ? " · " + summary.status : "");

    if (!home || !away || !score || !sub || !period || !clock || !result || !stats || !goals || !latest || !ticker || !info || !news || !weatherSlot || !timelineSlot || !teamsSlot || !qs("dmbo-live-updates") || !qs("dmbo-live-animation")) {
      body.innerHTML = '<div class="live-score" id="dmbo-live-score-card"><div class="live-team" id="dmbo-live-home"></div><div class="live-score-num" id="dmbo-live-score-num"></div><div class="live-team away" id="dmbo-live-away"></div></div>' +
        '<div class="live-sub" id="dmbo-live-sub"><i class="live-dot" aria-hidden="true"></i><span id="dmbo-live-period"></span><span class="live-clock-chip" id="dmbo-live-clock"></span><span class="live-live-text" id="dmbo-live-text"></span></div>' +
        '<div class="live-latest" id="dmbo-live-latest"></div>' +
        '<div class="live-ticker" id="dmbo-live-ticker"></div>' +
        '<div class="live-error" id="dmbo-live-error" style="display:none"></div>' +
        '<div class="live-grid"><div class="live-panel"><h3>Result</h3><div id="dmbo-live-result"></div></div><div class="live-panel"><h3>Stats</h3><div id="dmbo-live-stats"></div></div></div>' +
        '<div class="live-grid"><div class="live-panel"><h3>Goals</h3><div id="dmbo-live-goals"></div></div><div class="live-panel"><h3>Match Info</h3><div id="dmbo-live-info"></div></div></div>' +
        '<div class="live-panel" id="dmbo-live-updates" style="margin-top:10px"><div class="live-panel-head"><h3>Match Updates</h3><div class="live-update-tabs" role="tablist" aria-label="Match updates"><button type="button" data-dmbo-live-update="news" class="on" aria-selected="true">News</button><button type="button" data-dmbo-live-update="weather" aria-selected="false">Weather</button><button type="button" data-dmbo-live-update="timeline" aria-selected="false">Timeline</button><button type="button" data-dmbo-live-update="teams" aria-selected="false">Teams</button></div></div><div data-dmbo-live-pane="news"><div id="dmbo-live-news"></div></div><div data-dmbo-live-pane="weather" style="display:none"><div id="dmbo-live-weather"></div></div><div data-dmbo-live-pane="timeline" style="display:none"><div id="dmbo-live-timeline"></div></div><div data-dmbo-live-pane="teams" style="display:none"><div id="dmbo-live-teams"></div></div></div>' +
        '<div class="live-animation" id="dmbo-live-animation"><div class="live-empty">Loading animation...</div></div>';
      home = qs("dmbo-live-home");
      away = qs("dmbo-live-away");
      score = qs("dmbo-live-score-num");
      sub = qs("dmbo-live-sub");
      period = qs("dmbo-live-period");
      clock = qs("dmbo-live-clock");
      liveText = qs("dmbo-live-text");
      result = qs("dmbo-live-result");
      stats = qs("dmbo-live-stats");
      goals = qs("dmbo-live-goals");
      latest = qs("dmbo-live-latest");
      ticker = qs("dmbo-live-ticker");
      info = qs("dmbo-live-info");
      news = qs("dmbo-live-news");
      weatherSlot = qs("dmbo-live-weather");
      timelineSlot = qs("dmbo-live-timeline");
      teamsSlot = qs("dmbo-live-teams");
      errorBox = qs("dmbo-live-error");
    }

    if (home) home.textContent = summary.homeName;
    if (away) away.textContent = summary.awayName;
    if (score) score.textContent = summary.scoreText;
    if (period) period.textContent = summary.period || "Live";
    if (clock) {
      clock.textContent = summary.clockText || "--:--";
      clock.style.display = summary.clockText ? "inline-flex" : "none";
    }
    if (liveText) liveText.textContent = [summary.serviceText, summary.streamText].filter(Boolean).join(" · ");
    if (sub && !period) sub.textContent = summary.period + (summary.clockText ? " · " + summary.clockText : "") + (summary.serviceText ? " · " + summary.serviceText : "") + (summary.streamText ? " · " + summary.streamText : "");
    if (result) result.innerHTML = tableRows(summary.periodRows);
    if (stats) stats.innerHTML = tableRows(summary.statRows);
    if (errorBox) {
      errorBox.textContent = error ? "Live update failed. Showing latest known event data." : "";
      errorBox.style.display = error ? "block" : "none";
    }

    startLiveClock(item, summary);
    renderLiveExtras(item, summary);
    loadLiveNews(item, summary);
    loadLiveWeather(item, summary);
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
    if (live.clockTimer) {
      clearInterval(live.clockTimer);
      live.clockTimer = 0;
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

  function sportImageUrl(c, item) {
    var path = item && (item.imageUrlPath || item.imageUrl || item.iconUrl || item.icon);

    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (String(path).charAt(0) === "/") return proxy(c, path);
    return "";
  }

  function sportWindowOptions() {
    return [
      ["all", "All", 0],
      ["1h", "1 hour", 1],
      ["2h", "2 hours", 2],
      ["3h", "3 hours", 3],
      ["6h", "6 hours", 6],
      ["12h", "12 hours", 12],
      ["1d", "1d", 24]
    ];
  }

  function sportWindowHours(key) {
    var hit = sportWindowOptions().filter(function (item) {
      return item[0] === key;
    })[0];

    return hit ? hit[2] : 0;
  }

  function eventStartMs(ev) {
    var raw = ev && (ev.startTime || ev.startDate || ev.startDttm || ev.scheduled);
    var n = Number(raw);
    var parsed;

    if (isFinite(n) && n > 0) return n < 10000000000 ? n * 1000 : n;
    parsed = Date.parse(raw || "");
    return isFinite(parsed) ? parsed : 0;
  }

  function sportFilterRowsForWindow(rows, service, windowKey) {
    var hours = sportWindowHours(windowKey);
    var now = Date.now();

    if (!hours) return rows || [];
    return (rows || []).filter(function (ev) {
      var start = eventStartMs(ev);

      if (!start) return true;
      if (service === "LIVE") return start >= now - hours * 60 * 60 * 1000;
      return start >= now && start <= now + hours * 60 * 60 * 1000;
    });
  }

  function sportFilterEvents(rows) {
    return sportFilterRowsForWindow(rows, sport.service, sport.window);
  }

  function sportServiceButton(service, label) {
    var on = sport.service === service;

    return '<button type="button" data-dmbo-sport-service="' + esc(service) + '" class="' + (on ? "on" : "") + '">' + esc(label) + '</button>';
  }

  function sportWindowButton(item) {
    var on = sport.window === item[0];

    return '<button type="button" data-dmbo-sport-window="' + esc(item[0]) + '" class="' + (on ? "on" : "") + '">' + esc(item[1]) + '</button>';
  }

  function sportsRailHtml(c, list) {
    if (!list.length) return '<div class="m">No sports returned from the sportsbook API.</div>';

    return '<div class="sports-rail" aria-label="Sports">' + list.map(function (item) {
      var id = betbyText(item.id);
      var name = betbyText(item.name || item.title || "Sport");
      var image = sportImageUrl(c, item);
      var active = String(id) === String(sport.sportId);

      return '<button type="button" class="sports-card ' + (active ? "on" : "") + '" data-dmbo-sport-id="' + esc(id) + '" data-dmbo-sport-name="' + esc(name) + '">' +
        '<i class="sports-live">LIVE</i><div class="sports-icon">' + (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" onload="if(this.nextSibling)this.nextSibling.style.display=\'none\'" onerror="this.style.display=\'none\'"><b>' + esc(initials(name)) + '</b>' : '<b>' + esc(initials(name)) + '</b>') + '</div><span>' + esc(name) + '</span></button>';
    }).join("") + '</div>';
  }

  function sportsControlsHtml(count) {
    return '<div class="sports-controls">' +
      '<div class="sports-seg">' + sportServiceButton("LIVE", "Live") + sportServiceButton("PREMATCH", "Pre") + '</div>' +
      '<div class="sports-times">' + sportWindowOptions().map(sportWindowButton).join("") + '</div>' +
      '<div class="sports-summary">' + esc(sport.sportName) + " · " + esc(sport.service === "LIVE" ? "Live" : "Prematch") + " · " + count + " events</div>" +
      '</div>';
  }

  function sportsEventClock(ev) {
    var start = eventStartMs(ev);
    var text = start ? dateText(start) : "";
    var time = text ? text.split(",").pop() : "";
    var status = sport.service === "LIVE" ? "Live" : "Pre";

    if (ev && ev.matchStatusName) status = ev.matchStatusName;
    if (ev && ev.eventStatusName) status = ev.eventStatusName;

    return '<div class="sports-clock"><b>' + esc(sport.service === "LIVE" ? "Live" : time || "Pre") + '</b><span>' + esc(status + (text ? " · " + text : "")) + '</span></div>';
  }

  function sportsEventHtml(c, ev, index) {
    var tm = teams(ev);
    var odds = (ev.market && ev.market.outcomes) || [];
    var href = eventHref(ev, tm, accountSignals());
    var liveKey = registerLiveEvent(ev, tm);
    var liveButton = liveStatsButtonHtml(liveKey, tm.h + " vs " + tm.a);
    var p = "dmbo-sports-event-" + index;
    var html = '<div class="sports-event">' +
      '<div class="match"><div class="team"><span id="' + p + '-hi" class="init">' + esc(initials(tm.h)) + '</span><img id="' + p + '-hl" class="logo" style="display:none"><span>' + esc(tm.h) + '</span></div><span class="m">vs</span><div class="team"><span id="' + p + '-ai" class="init">' + esc(initials(tm.a)) + '</span><img id="' + p + '-al" class="logo" style="display:none"><span>' + esc(tm.a) + '</span></div>' + liveButton + '</div>' +
      sportsEventClock(ev) +
      '<div class="sports-odds">';

    odds.slice(0, 3).forEach(function (o) {
      html += '<a href="' + esc(href) + '"><b>' + esc(o.shortName || o.name || "Odd") + '</b>' + esc(o.odds || "-") + '</a>';
    });
    if (!odds.length) html += '<span><b>Odds</b>-</span><span><b>More</b>Open</span>';

    return html + '</div></div>';
  }

  function renderSportsbookEvents(c) {
    var box = qs("dmbo-sport-events");
    var rows = sportFilterEvents(sport.events || []);
    var grouped = [];
    var byKey = {};
    var html = "";
    var i = 0;

    if (!box) return;
    if (sport.loading && !sport.events.length) {
      box.innerHTML = '<div class="m">Loading ' + esc(sport.sportName) + ' events...</div>';
      return;
    }
    if (!rows.length) {
      box.innerHTML = '<div class="m">No ' + esc(sport.sportName) + ' events for this filter.</div>';
      return;
    }

    rows.slice(0, 24).forEach(function (ev) {
      var key = ev.tournamentName || ev.regionName || "Other";
      if (!byKey[key]) {
        byKey[key] = { title: key, events: [] };
        grouped.push(byKey[key]);
      }
      byKey[key].events.push(ev);
    });

    html = '<div class="sports-groups">';
    grouped.forEach(function (group) {
      html += '<div class="sports-group"><div class="sports-group-head"><span>' + esc(group.title) + '</span><b>' + group.events.length + '</b></div>';
      group.events.forEach(function (ev) {
        html += sportsEventHtml(c, ev, i++);
      });
      html += '</div>';
    });
    html += '</div>';
    html += sport.done ? '<div class="m" style="margin-top:8px">End of list</div>' : '<button class="btn btn2" id="dmbo-more-sport" type="button" style="margin-top:8px">Load more</button>';

    box.innerHTML = html;
    bindLiveButtons(c, box);
    rows.slice(0, 24).forEach(function (ev, index) {
      var tm = teams(ev);
      var p = "dmbo-sports-event-" + index;
      setLogo(c, ev.sportId || sport.sportId, tm.h, p + "-hl", p + "-hi");
      setLogo(c, ev.sportId || sport.sportId, tm.a, p + "-al", p + "-ai");
    });

    var more = qs("dmbo-more-sport");
    if (more) more.onclick = function () {
      loadSportEvents(c, false);
    };
  }

  function bindSportsControls(c) {
    var box = qs("dmbo-sports");

    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-sport-id]"), function (button) {
      button.onclick = function () {
        sport.sportId = button.getAttribute("data-dmbo-sport-id");
        sport.sportName = button.getAttribute("data-dmbo-sport-name");
        loadSportEvents(c, true);
      };
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-sport-service]"), function (button) {
      button.onclick = function () {
        sport.service = button.getAttribute("data-dmbo-sport-service") || "PREMATCH";
        sports(c, true);
      };
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-sport-window]"), function (button) {
      button.onclick = function () {
        sport.window = button.getAttribute("data-dmbo-sport-window") || "all";
        sportsRender(c);
        renderSportsbookEvents(c);
      };
    });
  }

  function sportsRender(c) {
    var box = qs("dmbo-sports");
    var rows = sportFilterEvents(sport.events || []);
    var status = sport.loading ? "Loading" : rows.length + "/" + (sport.events || []).length;

    if (!box) return;
    box.innerHTML = '<div class="t"><span>All Sports</span><span class="m">' + esc(status) + '</span></div>' +
      sportsRailHtml(c, sport.sports || []) +
      sportsControlsHtml(rows.length) +
      '<div id="dmbo-sport-events"><div class="m">Loading ' + esc(sport.sportName) + ' events...</div></div>';
    bindSportsControls(c);
  }

  function sports(c, keepSport) {
    var params = { sportService: sport.service };

    if (sport.service === "LIVE") {
      params.onlyHotOrBestOdds = "false";
      params.onlyBestOdds = "false";
    }

    getJson(proxy(c, "/partner-api/sportsbook/public/v2/sports", params), "omit", function (e, d) {
      var list = e ? [] : d.sports || [];
      var current;

      sport.sports = list;
      current = list.filter(function (item) {
        return String(item.id) === String(sport.sportId);
      })[0];

      if (!keepSport || !current) {
        current = list[0] || { id: sport.sportId, name: sport.sportName };
        sport.sportId = betbyText(current.id || sport.sportId || "1");
        sport.sportName = betbyText(current.name || sport.sportName || "Football");
      }

      sportsRender(c);
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
    sportsRender(c);

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
        sport.loading = false;
        sportsRender(c);
        renderSportsbookEvents(c);
      });
    });
  }

  function betbyTabLabel(tab) {
    var labels = {
      players: "Players are betting now",
      live: "Hot live events",
      prematch: "Popular prematch odds",
      combo: "Combo of the day",
      leaderboard: "Full Leaderboard",
      stats: "Live Stats",
      tracker: "Animation Tracker"
    };

    return labels[tab] || "Betby";
  }

  function betbyActiveTab(config) {
    var tabs = config.tabs || ["players", "live", "prematch", "combo", "leaderboard", "stats", "tracker"];

    if (tabs.indexOf(betby.tab) < 0) betby.tab = tabs[0] || "players";
    return betby.tab;
  }

  function betbyTabsHtml(config, active) {
    return '<div class="bet-tabs" role="tablist" aria-label="Betby feed tabs">' + (config.tabs || []).map(function (tab) {
      var on = tab === active;
      return '<button type="button" data-dmbo-betby-tab="' + esc(tab) + '" class="' + (on ? "on" : "") + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' + esc(betbyTabLabel(tab)) + '</button>';
    }).join("") + '</div>';
  }

  function betbyPlayersHtml(rows, config) {
    var html;

    if (!rows.length) return '<div class="m">Loading public Betby bets feed...</div>';

    html = '<div class="bet-feed-list">';
    rows.forEach(function (row) {
      var first = row.selections && row.selections[0] || {};
      var openUrl = config.openUrl || "https://demo.betby.com/sportsbook/tile/bets-feed";

      html += '<div class="bet-row">' +
        '<div class="bet-top"><div class="bet-player"><i aria-hidden="true"></i><span>' + esc(row.player) + '</span></div><div class="bet-type">' + esc(row.type) + '</div></div>' +
        '<div class="bet-metrics">' +
        '<div class="bet-metric"><span>Stake</span><b>' + esc(row.stake || "-") + '</b></div>' +
        '<div class="bet-metric bet-odd"><span>Odds</span><b>' + esc(row.odds || "-") + '</b></div>' +
        '<div class="bet-metric"><span>Possible Win</span><b>' + esc(row.potentialWin || "-") + '</b></div>' +
        '</div>' +
        '<div class="bet-selection"><span>' + esc(first.label || row.selectionCount + " selections") + '</span><a class="pill" href="' + esc(openUrl) + '" target="_blank" rel="noopener noreferrer">Open</a></div>' +
        '</div>';
    });

    return html + '</div>';
  }

  function betbyEventsHtml(rows, emptyText, config) {
    var html;
    var openUrl = (config && config.openUrl) || "https://demo.betby.com/sportsbook/tile/bets-feed";

    if (!rows.length) return '<div class="m">' + esc(emptyText) + '</div>';

    html = '<div class="bet-event-list">';
    rows.forEach(function (row) {
      html += '<div class="bet-event">' +
        '<div class="bet-event-head"><div style="min-width:0"><div class="bet-event-title">' + esc(row.home + " vs " + row.away) + '</div><div class="bet-event-meta">' + esc(row.sportName + " · " + row.tournamentName + (row.clock ? " · " + row.clock : "")) + '</div></div>' +
        (row.score ? '<div class="bet-score">' + esc(row.score) + '</div>' : '<div class="bet-score">' + esc(row.status) + '</div>') + '</div>' +
        '<div class="bet-odds">' + row.odds.map(function (odd) {
          return '<a href="' + esc(openUrl) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(odd.label) + '</b> ' + esc(odd.odds) + '</a>';
        }).join("") + '</div>' +
        '</div>';
    });

    return html + '</div>';
  }

  function betbyCombosHtml(rows, config) {
    var html;
    var openUrl = config.openUrl || "https://demo.betby.com/sportsbook/tile/bets-feed";

    if (!rows.length) return '<div class="m">Loading combo of the day promos...</div>';

    html = '<div class="bet-combo-list">';
    rows.forEach(function (row) {
      html += '<div class="bet-combo">' +
        '<div class="bet-combo-head"><div class="bet-combo-title">' + esc(row.title) + '</div><div class="bet-combo-mult">' + esc(row.multiplier ? row.multiplier + "x boost" : row.legs + " legs") + '</div></div>' +
        '<div class="m">' + esc(row.legs + " selections" + (row.bonusId ? " · Bonus " + row.bonusId : "")) + '</div>' +
        '<div class="bet-legs">' + row.selections.map(function (selection) {
          return '<div class="bet-leg"><span>' + esc(selection.label) + '</span></div>';
        }).join("") + '</div>' +
        '<div><a class="pill" href="' + esc(openUrl) + '" target="_blank" rel="noopener noreferrer">Open promo</a></div>' +
        '</div>';
    });

    return html + '</div>';
  }

  function betbyLeaderboardHtml(tournaments) {
    var active;
    var html;

    if (!tournaments.length) return '<div class="m">Loading full leaderboard...</div>';

    active = tournaments.filter(function (board) { return board.id === betby.leaderboardId; })[0] || tournaments[0];
    if (active) betby.leaderboardId = active.id;

    html = '<div class="bet-board-tabs">';
    tournaments.forEach(function (board) {
      html += '<button type="button" data-dmbo-betby-board="' + esc(board.id) + '" class="' + (active && board.id === active.id ? "on" : "") + '">' +
        '<span>' + esc(board.name) + '</span><b>' + esc(board.count + " rows") + '</b></button>';
    });
    html += '</div>';

    html += '<div class="bet-board-meta">' +
      '<span>' + esc(active.status) + '</span>' +
      (active.startsText || active.endsText ? '<span>' + esc([active.startsText, active.endsText].filter(Boolean).join(" - ")) + '</span>' : '') +
      '<span>' + esc(active.rows.length + " shown") + '</span>' +
      '</div>';

    html += '<div class="bet-leaderboard">';
    active.rows.forEach(function (row) {
      html += '<div class="bet-lrow ' + (row.isCurrent ? "current" : "") + '">' +
        '<span class="bet-rank">' + esc(row.place) + '</span>' +
        '<span class="bet-player-id">' + esc(row.playerId) + '</span>' +
        '<span class="bet-score-points">' + esc(row.score) + '</span>' +
        '<span class="bet-prize">' + esc(row.prize || "-") + '</span>' +
        '</div>';
    });
    html += '</div>';

    return html;
  }

  function betbyStatsHtml(rows) {
    var html;

    if (!rows.length) return '<div class="m">Loading live score and stats...</div>';

    html = '<div class="bet-stat-list">';
    rows.forEach(function (row) {
      html += '<div class="bet-stat">' +
        '<div class="bet-stat-head"><div style="min-width:0"><div class="bet-event-title">' + esc(row.home + " vs " + row.away) + '</div><div class="bet-event-meta">' + esc(row.sportName + " · " + row.tournamentName) + '</div></div>' +
        '<div class="bet-score pulse">' + esc(row.score) + '</div></div>' +
        '<div class="bet-stat-strip">' +
        (row.clock ? '<span><b>Clock</b>' + esc(row.clock) + '</span>' : '') +
        (row.gameScore ? '<span><b>Game</b>' + esc(row.gameScore) + '</span>' : '') +
        (row.server ? '<span><b>Server</b>' + esc(row.server) + '</span>' : '') +
        (row.matchStatus ? '<span><b>Status</b>' + esc(row.matchStatus) + '</span>' : '') +
        '</div>';

      if (row.periods && row.periods.length) {
        html += '<div class="bet-periods">' + row.periods.map(function (period) {
          return '<span><b>' + esc(period.label) + '</b>' + esc(period.home + " - " + period.away) + '</span>';
        }).join("") + '</div>';
      }

      if (row.stats && row.stats.length) {
        html += '<div class="bet-stat-grid">' + row.stats.map(function (stat) {
          return '<div><span>' + esc(stat.home) + '</span><b>' + esc(stat.label) + '</b><span>' + esc(stat.away) + '</span></div>';
        }).join("") + '</div>';
      } else {
        html += '<div class="m">Sport-specific stat feed not published for this event yet.</div>';
      }

      html += '</div>';
    });

    return html + '</div>';
  }

  function betbyTrackerHtml(rows) {
    var row = rows && rows[0];
    var html;

    if (!row) return '<div class="m">No configured public tracker is available for this event yet.</div>';

    html = '<div class="bet-tracker">' +
      '<div class="bet-tracker-head"><div style="min-width:0"><div class="bet-event-title">' + esc(row.title) + '</div><div class="bet-event-meta">' + esc(row.subtitle + " · " + row.providerLabel) + '</div></div>' +
      '<div class="bet-tracker-actions">' +
      (row.openUrl ? '<a class="pill" href="' + esc(row.openUrl) + '" target="_blank" rel="noopener noreferrer">Open event</a>' : '') +
      '<button type="button" class="pill" data-dmbo-betby-fullscreen="1">Fullscreen</button>' +
      '</div></div>' +
      '<div class="bet-tracker-frame" id="dmbo-betby-tracker-frame">' +
      '<iframe src="' + esc(row.url) + '" title="' + esc(row.title + " animation tracker") + '" loading="lazy" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>' +
      '</div>' +
      '<div class="m">Statscore tracker iframe is shown when the provider mapping is public for the selected event.</div>' +
      '</div>';

    return html;
  }

  function betbyTabBodyHtml(active, config) {
    if (active === "live") return betbyEventsHtml(betby.liveRows || [], "Loading hot live events...", config);
    if (active === "prematch") return betbyEventsHtml(betby.prematchRows || [], "Loading popular prematch odds...", config);
    if (active === "combo") return betbyCombosHtml(betby.comboRows || [], config);
    if (active === "leaderboard") return betbyLeaderboardHtml(betby.leaderboardTournaments || []);
    if (active === "stats") return betbyStatsHtml(betby.statsRows || []);
    if (active === "tracker") return betbyTrackerHtml(betby.trackerRows || []);
    return betbyPlayersHtml(betby.rows || [], config);
  }

  function betbyBindTabs(c, widget) {
    var box = qs("dmbo-betby-feed");

    if (!box) return;

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betby-tab]"), function (button) {
      button.onclick = function () {
        betby.tab = button.getAttribute("data-dmbo-betby-tab") || "players";
        betbyFeedRender(c, widget);
      };
    });

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betby-board]"), function (button) {
      button.onclick = function () {
        betby.leaderboardId = button.getAttribute("data-dmbo-betby-board") || "";
        betbyFeedRender(c, widget);
      };
    });

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betby-fullscreen]"), function (button) {
      button.onclick = function () {
        var frame = qs("dmbo-betby-tracker-frame");
        var target = frame || button.closest(".bet-tracker");
        var request = target && (target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen);

        if (request) {
          try { request.call(target); } catch (e) {}
        }
      };
    });
  }

  function betbyFeedRender(c, widget) {
    var box = qs("dmbo-betby-feed");
    var config = betbyFeedConfig(widget);
    var active = betbyActiveTab(config);
    var activeCount = active === "live" ? (betby.liveRows || []).length :
      active === "prematch" ? (betby.prematchRows || []).length :
      active === "combo" ? (betby.comboRows || []).length :
      active === "leaderboard" ? ((betby.leaderboardTournaments || [])[0] && (betby.leaderboardTournaments || [])[0].count || 0) :
      active === "stats" ? (betby.statsRows || []).length :
      active === "tracker" ? (betby.trackerRows || []).length :
      (betby.rows || []).length;
    var updated = betby.updatedAt ? dateText(betby.updatedAt) : "";
    var html;

    if (!box) return;

    html = '<div class="t"><span>' + esc(config.title) + '</span><span class="m">' + esc(activeCount ? activeCount + " items" : (betby.loading ? "Live" : "Demo")) + '</span></div>';
    html += betbyTabsHtml(config, active);

    if (betby.error && !activeCount && !betby.loading) {
      box.innerHTML = html + '<div class="m">Betby feed is unavailable right now.</div>';
      betbyBindTabs(c, widget);
      return;
    }

    html += betbyTabBodyHtml(active, config);
    if (updated) html += '<div class="m" style="margin-top:8px">Updated ' + esc(updated) + (betby.loading ? " · refreshing" : "") + '</div>';

    box.innerHTML = html;
    betbyBindTabs(c, widget);
  }

  function betbySnapshotLoad(c, config, mode, cb) {
    getJson(betbySnapshotUrl(c, config, mode, "0"), "omit", function (e, versionsData) {
      var versions;

      if (e) return cb(e);

      versions = betbyVersions(versionsData);
      if (!versions.length) return cb(new Error("missing " + mode + " version"));

      getJson(betbySnapshotUrl(c, config, mode, versions[0]), "omit", cb);
    });
  }

  function betbyFeedLoad(c, widget) {
    var config = betbyFeedConfig(widget);
    var pending = 5;
    var failures = 0;

    if (betby.loading) return;

    betby.trackerRows = betbyTrackerRows(config);
    betby.loading = true;
    betbyFeedRender(c, widget);

    function done(e) {
      if (e) failures += 1;
      pending -= 1;
      if (pending > 0) return;

      betby.loading = false;
      betby.error = failures >= 5 ? "all Betby feeds failed" : "";
      betby.updatedAt = Date.now();
      betbyFeedRender(c, widget);
    }

    getJson(betbyFeedUrl(c, config), "omit", function (e, data) {
      if (!e) {
        betby.rows = betbyFeedRows(data, config);
      }
      done(e);
    });

    betbySnapshotLoad(c, config, "live", function (e, data) {
      if (!e) {
        betby.liveRows = betbyEventRows(data, config, "live");
        betby.statsRows = betbyStatsRows(data, config);
      }
      done(e);
    });

    betbySnapshotLoad(c, config, "prematch", function (e, data) {
      if (!e) betby.prematchRows = betbyEventRows(data, config, "prematch");
      done(e);
    });

    getJson(betbyPromoUrl(c, config), "omit", function (e, data) {
      if (!e) betby.comboRows = betbyComboRows(data, config);
      done(e);
    });

    getJson(betbyLeaderboardUrl(c, config), "omit", function (e, data) {
      if (!e) betby.leaderboardTournaments = betbyLeaderboardRows(data, config);
      done(e);
    });
  }

  function betbyFeedStart(c, widget) {
    var config = betbyFeedConfig(widget);

    if (betby.timer) {
      clearInterval(betby.timer);
      betby.timer = 0;
    }

    betbyFeedLoad(c, widget);
    betby.timer = setInterval(function () {
      betbyFeedLoad(c, widget);
    }, config.pollMs);
  }

  function betboomTabLabel(tab) {
    var labels = {
      overview: "Overview",
      players: "Players",
      stats: "Stats",
      timeline: "Timeline",
      images: "Images",
      sources: "Sources"
    };

    return labels[tab] || "Overview";
  }

  function betboomModeLabel(mode) {
    var labels = {
      all: "All",
      live: "Live",
      prematch: "Prematch",
      history: "Historical"
    };

    return labels[mode] || mode || "All";
  }

  function betboomActiveMode(config) {
    var modes = config.catalogModes || ["all", "live", "prematch", "history"];

    if (!betboom.mode) betboom.mode = config.catalogDefaultMode || modes[0] || "all";
    if (modes.indexOf(betboom.mode) < 0) betboom.mode = modes[0] || "all";
    return betboom.mode;
  }

  function betboomModeTabsHtml(config) {
    var modes = config.catalogModes || ["all", "live", "prematch", "history"];
    var active = betboomActiveMode(config);
    var counts = betboom.catalogMeta && betboom.catalogMeta.counts && betboom.catalogMeta.counts.modes || {};

    return '<div class="bb-mode-tabs" role="tablist" aria-label="BetBoom catalog filters">' + modes.map(function (mode) {
      var on = active === mode;
      var count = counts[mode];
      var label = betboomModeLabel(mode) + (count != null ? " " + count : "");

      return '<button type="button" data-dmbo-betboom-mode="' + esc(mode) + '" class="' + (on ? "on" : "") + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' + esc(label) + '</button>';
    }).join("") + '</div>';
  }

  function betboomSummaryHtml() {
    var meta = betboom.catalogMeta || {};
    var counts = meta.counts || {};
    var rows = [
      meta.source || "betboom-result-statistics",
      counts.tournaments != null ? counts.tournaments + " tournaments" : "",
      counts.searchMatches != null ? counts.searchMatches + " searchable" : "",
      counts.rawMatches != null ? counts.rawMatches + " fetched" : ""
    ].filter(Boolean);

    if (!rows.length) return "";
    return '<div class="bb-summary">' + rows.map(function (row) {
      return '<span>' + esc(row) + '</span>';
    }).join("") + '</div>';
  }

  function betboomActiveTab(config) {
    var tabs = config.tabs || ["overview", "players", "stats", "timeline", "images", "sources"];

    if (tabs.indexOf(betboom.tab) < 0) betboom.tab = tabs[0] || "overview";
    return betboom.tab;
  }

  function betboomTabsHtml(config, active) {
    return '<div class="bb-tabs" role="tablist" aria-label="BetBoom match tabs">' + (config.tabs || []).map(function (tab) {
      var on = tab === active;
      return '<button type="button" data-dmbo-betboom-tab="' + esc(tab) + '" class="' + (on ? "on" : "") + '" role="tab" aria-selected="' + (on ? "true" : "false") + '">' + esc(betboomTabLabel(tab)) + '</button>';
    }).join("") + '</div>';
  }

  function betboomSearchBlob(row) {
    var parts = [
      row && row.id,
      row && row.title,
      row && row.subtitle,
      row && row.status,
      row && row.score,
      row && row.sport,
      row && row.category,
      row && row.tournament,
      /world cup/i.test(String((row && row.title || "") + " " + (row && row.subtitle || "") + " " + (row && row.tournament || ""))) ? "fifa fifa world cup" : ""
    ];

    (row && row.players || []).forEach(function (player) {
      parts.push(player.name, player.fullName, player.country, player.rank, player.seed, player.coach);
    });
    (row && row.facts || []).forEach(function (fact) {
      parts.push(fact.label, fact.value);
    });
    Object.keys(row && row.ids || {}).forEach(function (key) {
      parts.push(key, row.ids[key]);
    });

    return clean(parts.filter(Boolean).join(" "));
  }

  function betboomFilteredMatches(rows) {
    var query = clean(betboom.query);

    if (!query) return rows || [];
    return (rows || []).filter(function (row) {
      return betboomSearchBlob(row).indexOf(query) >= 0;
    });
  }

  function betboomFilteredCatalog() {
    return betboomFilteredMatches(betboom.catalog || []);
  }

  function betboomSelectedCatalog() {
    var rows = betboom.catalog || [];
    var selected = betboom.selectedId;
    var found = null;

    rows.some(function (row) {
      if (String(row.matchId || row.id) === String(selected)) {
        found = row;
        return true;
      }
      return false;
    });

    return found || rows[0] || null;
  }

  function betboomSuggestionRows(rows) {
    var query = clean(betboom.query);

    if (!query) return [];
    return (rows || []).slice(0, 8);
  }

  function betboomSuggestionsHtml(rows) {
    var suggestions = betboomSuggestionRows(rows);

    if (!suggestions.length) return "";
    return '<div class="bb-ac" role="listbox">' + suggestions.map(function (row) {
      var image = row.homeImageUrl || row.awayImageUrl || row.sportIconUrl || row.categoryIconUrl || row.backgroundImageUrl;
      return '<button type="button" data-dmbo-betboom-suggest="' + esc(row.matchId || row.id) + '">' +
        (image ? '<img src="' + esc(image) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="init">' + esc(initials(row.title)) + '</span>') +
        '<b>' + esc(row.title || "BetBoom match") + '</b>' +
        '<span>' + esc(row.score || row.sport || row.status || "") + '</span>' +
        '</button>';
    }).join("") + '</div>';
  }

  function betboomCatalogCardHtml(row) {
    var selected = String(row.matchId || row.id) === String(betboom.selectedId || "");
    var home = row.players && row.players[0] || {};
    var away = row.players && row.players[1] || {};
    var bg = row.backgroundImageUrl ? " style=\"--bb-bg:url('" + esc(row.backgroundImageUrl) + "')\"" : "";

    return '<button type="button" class="bb-event-card ' + (selected ? "on" : "") + '" data-dmbo-betboom-select="' + esc(row.matchId || row.id) + '"' + bg + '>' +
      '<div class="bb-event-top"><div class="bb-event-title">' + esc(row.title || "BetBoom match") + '</div>' +
      (row.score ? '<div class="bb-score">' + esc(row.score) + '</div>' : '') + '</div>' +
      '<div class="bb-event-meta">' + esc(row.subtitle || row.startTimeText || row.status || "") + '</div>' +
      '<div class="bb-teams">' +
        '<div class="bb-team">' + (home.imageUrl ? '<img src="' + esc(home.imageUrl) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="init">' + esc(initials(home.name || row.title)) + '</span>') + '<span>' + esc(home.name || "Home") + '</span></div>' +
        '<div class="bb-team">' + (away.imageUrl ? '<img src="' + esc(away.imageUrl) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="init">' + esc(initials(away.name || row.title)) + '</span>') + '<span>' + esc(away.name || "Away") + '</span></div>' +
      '</div>' +
      '</button>';
  }

  function betboomCatalogHtml(rows) {
    if (!rows.length) return '<div class="m">No BetBoom matches match this search.</div>';
    return '<div class="bb-catalog">' + rows.map(betboomCatalogCardHtml).join("") + '</div>';
  }

  function betboomPlayerHtml(players, detailed) {
    if (!players || !players.length) return "";

    return '<div class="bb-players">' + players.slice(0, 2).map(function (player) {
      var meta = [
        player.seed ? "Seed " + player.seed : "",
        player.rank ? "Rank " + player.rank : "",
        player.age ? "Age " + player.age : "",
        player.country,
        player.form ? "Form " + player.form : "",
        player.handedness,
        player.favoriteSurface ? "Fav " + player.favoriteSurface : "",
        player.height ? player.height + "cm" : "",
        player.coach ? "Coach " + player.coach : ""
      ].filter(Boolean).join(" · ");
      var media = player.imageUrl ?
        '<img class="bb-avatar" src="' + esc(player.imageUrl) + '" alt="' + esc(player.name || "Player") + '" loading="lazy" onerror="this.style.display=\'none\'">' :
        (player.flagUrl ? '<img class="bb-avatar" src="' + esc(player.flagUrl) + '" alt="' + esc(player.country || player.name || "Flag") + '" loading="lazy" onerror="this.style.display=\'none\'">' :
        '<span class="init" style="width:38px;height:38px">' + esc(initials(player.name)) + '</span>');
      var details = [
        ["Full name", player.fullName],
        ["Country", player.countryCode ? player.country + " (" + player.countryCode + ")" : player.country],
        ["Birth", player.birthDate],
        ["Turned pro", player.turnedPro],
        ["Favorite", player.favoriteSurface],
        ["Height", player.height ? player.height + "cm" : ""],
        ["Weight", player.weight ? player.weight + "kg" : ""],
        ["Coach", player.coach],
        ["Team UID", player.teamUid]
      ].filter(function (item) { return !!item[1]; });

      return '<div class="bb-player ' + (detailed ? "detail" : "") + '">' + media + '<div><b>' + esc(player.name) + '</b><span>' + esc(meta || player.side || "") + '</span>' +
        (detailed && details.length ? '<div class="bb-player-kv">' + details.map(function (item) {
          return '<em><strong>' + esc(item[0]) + '</strong>' + esc(item[1]) + '</em>';
        }).join("") + '</div>' : '') +
        '</div></div>';
    }).join("") + '</div>';
  }

  function betboomFactsHtml(facts) {
    if (!facts || !facts.length) return "";

    return '<div class="bb-facts">' + facts.slice(0, 14).map(function (fact) {
      return '<span><b>' + esc(fact.label) + '</b> ' + esc(fact.value) + '</span>';
    }).join("") + '</div>';
  }

  function betboomStatsHtml(stats) {
    if (!stats || !stats.length) return "";

    return '<div class="bb-stats">' + stats.map(function (stat) {
      return '<div class="bb-stat"><span>' + esc(stat.home) + '</span><b>' + esc(stat.label) + '</b><span>' + esc(stat.away) + '</span></div>';
    }).join("") + '</div>';
  }

  function betboomImagesHtml(images) {
    if (!images || !images.length) return "";

    return '<div class="bb-images">' + images.map(function (image) {
      return '<a href="' + esc(image.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(image.label || "") + '">' +
        '<img src="' + esc(image.url) + '" alt="' + esc(image.label || "BetBoom image") + '" loading="lazy" onerror="this.closest(\'a\').style.display=\'none\'">' +
        '<span>' + esc(image.label || "Image") + '</span></a>';
    }).join("") + '</div>';
  }

  function betboomTimelineHtml(row) {
    var timeline = row && row.timeline || [];

    if (!timeline.length) return '<div class="m">No public timeline events are available for this match yet.</div>';

    return '<div class="bb-timeline">' + timeline.slice(0, 12).map(function (event) {
      var score = event.score && typeof event.score === "object" ? Object.keys(event.score).map(function (key) {
        return key + " " + event.score[key];
      }).join(" · ") : betboomText(event.score);

      return '<div class="bb-time-row">' +
        '<b>' + esc(event.time || event.seconds || "-") + '</b>' +
        '<span>' + esc(event.name || event.type || "Event") + '</span>' +
        '<strong>' + esc(event.team || event.gameStatus || "") + '</strong>' +
        '<em>' + esc(score || event.pointType || "") + '</em>' +
        '</div>';
    }).join("") + '</div>';
  }

  function betboomSourcesHtml(row) {
    var endpoints = row && row.sources && Array.isArray(row.sources.apiEndpoints) ? row.sources.apiEndpoints : [];
    var feeds = row && row.feeds || [];
    var sourceRows = endpoints.length ? endpoints : feeds.map(function (feed) {
      return {
        label: "StatsHub feed " + feed.feed,
        method: "GET",
        ok: feed.ok,
        feed: feed.feed,
        args: feed.args,
        error: feed.error
      };
    });

    if (!sourceRows.length) return '<div class="m">No endpoint inventory is available from the current Worker response.</div>';

    return '<div class="bb-sources">' + sourceRows.slice(0, 24).map(function (source) {
      var state = source.ok === false ? (source.error || "Unavailable") : source.ok === true ? "OK" : (source.method || "GET");
      var sourceUrl = source.url && String(source.url).indexOf("<") < 0 ? betboomSafeUrl(source.url) : "";
      return '<div class="bb-source">' +
        '<span>' + esc(source.method || "GET") + '</span>' +
        '<b>' + esc(source.label || source.feed || "Endpoint") + '</b>' +
        '<em>' + esc(state) + '</em>' +
        (sourceUrl ? '<a href="' + esc(sourceUrl) + '" target="_blank" rel="noopener noreferrer">Open</a>' : '') +
        (source.args ? '<small>' + esc(source.args) + '</small>' : '') +
        '</div>';
    }).join("") + '</div>';
  }

  function betboomOverviewHtml(row) {
    var quickStats = row.stats && row.stats.length ? row.stats.slice(0, 4) : [];

    return betboomPlayerHtml(row.players, false) +
      betboomFactsHtml(row.facts) +
      (quickStats.length ? betboomStatsHtml(quickStats) : "");
  }

  function betboomTabBodyHtml(row, active) {
    if (active === "players") return betboomPlayerHtml(row.players, true) || '<div class="m">No public player profile data is available yet.</div>';
    if (active === "stats") return betboomStatsHtml(row.stats) || '<div class="m">No public comparison stats are available yet.</div>';
    if (active === "timeline") return betboomTimelineHtml(row);
    if (active === "images") return betboomImagesHtml(row.images) || '<div class="m">No usable public images were found for this match.</div>';
    if (active === "sources") return betboomSourcesHtml(row);
    return betboomOverviewHtml(row);
  }

  function betboomCardHtml(row) {
    var actions = [];
    var config = betboomMatchConfig(currentDmboWidget);
    var active = betboomActiveTab(config);
    var badges = [
      row.feedCount ? row.feedCount + " feeds" : "",
      row.timelineCount ? row.timelineCount + " timeline" : "",
      row.sourceCount ? row.sourceCount + " endpoints" : ""
    ].filter(Boolean).join(" · ");

    if (row.openUrl) actions.push('<a class="pill" href="' + esc(row.openUrl) + '" target="_blank" rel="noopener noreferrer">Open BetBoom</a>');
    if (row.statUrl) actions.push('<a class="pill" href="' + esc(row.statUrl) + '" target="_blank" rel="noopener noreferrer">Open StatsHub</a>');

    return '<div class="bb-card">' +
      '<div class="bb-head"><div style="min-width:0"><div class="bb-title">' + esc(row.title) + '</div><div class="bb-sub">' + esc(row.subtitle || "BetBoom public match data") + (badges ? " · " + esc(badges) : "") + '</div></div><div class="bb-tag">' + esc(row.status || "Stats") + '</div></div>' +
      betboomTabsHtml(config, active) +
      '<div class="bb-pane">' + betboomTabBodyHtml(row, active) + '</div>' +
      (actions.length ? '<div class="bb-actions">' + actions.join("") + '</div>' : "") +
      '</div>';
  }

  function betboomCatalogFallbackDetail(match, config) {
    var row = betboomCatalogRow(match || {});

    return betboomMatchSummary({
      match: {
        matchId: row.matchId,
        title: row.title,
        subtitle: row.subtitle,
        tournament: row.tournament,
        category: row.category,
        sport: row.sport,
        status: row.status || "Catalog",
        score: row.score,
        openUrl: row.openUrl,
        homeImageUrl: row.homeImageUrl,
        awayImageUrl: row.awayImageUrl,
        backgroundImageUrl: row.backgroundImageUrl
      },
      players: row.players || [],
      stats: row.stats || [],
      facts: row.facts || [],
      timeline: row.timeline || [],
      images: row.images || []
    }, {
      openUrl: row.openUrl || (config && config.openUrl),
      matchConfig: row,
      maxStats: config && config.maxStats,
      maxImages: config && config.maxImages
    });
  }

  function betboomBindControls(c, widget, focusSearch) {
    var box = qs("dmbo-betboom-match");
    var input;
    var config = betboomMatchConfig(widget);

    if (!box) return;

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betboom-tab]"), function (button) {
      button.onclick = function () {
        betboom.tab = button.getAttribute("data-dmbo-betboom-tab") || "overview";
        betboomMatchRender(c, widget);
      };
    });

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betboom-mode]"), function (button) {
      button.onclick = function () {
        betboom.mode = button.getAttribute("data-dmbo-betboom-mode") || "all";
        betboom.selectedId = "";
        betboom.matches = [];
        betboom.detailsById = {};
        betboomMatchLoad(c, widget, true);
      };
    });

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betboom-select],[data-dmbo-betboom-suggest]"), function (button) {
      button.onclick = function () {
        var id = button.getAttribute("data-dmbo-betboom-select") || button.getAttribute("data-dmbo-betboom-suggest") || "";
        var row = (betboom.catalog || []).filter(function (item) {
          return String(item.matchId || item.id) === String(id);
        })[0];

        betboom.selectedId = id;
        if (button.getAttribute("data-dmbo-betboom-suggest") && row) betboom.query = row.title || "";
        betboomLoadSelectedDetail(c, widget, row || betboomSelectedCatalog());
      };
    });

    input = box.querySelector("[data-dmbo-betboom-search]");
    if (input) {
      input.oninput = function () {
        betboom.query = input.value || "";
        betboomMatchRender(c, widget, true);
      };
      input.onkeydown = function (event) {
        var rows = betboomFilteredCatalog();
        if (event.key === "Enter" && rows[0]) {
          event.preventDefault();
          betboom.selectedId = rows[0].matchId || rows[0].id;
          betboomLoadSelectedDetail(c, widget, rows[0]);
        }
      };
      if (focusSearch) {
        try {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (e) {}
      }
    }

    Array.prototype.forEach.call(box.querySelectorAll("[data-dmbo-betboom-refresh]"), function (button) {
      button.onclick = function () {
        betboomMatchLoad(c, widget, true);
      };
    });

    if (config && !config.tabs) return;
  }

  function betboomMatchRender(c, widget, focusSearch) {
    var box = qs("dmbo-betboom-match");
    var config = betboomMatchConfig(widget);
    var updated = betboom.updatedAt ? dateText(betboom.updatedAt) : "";
    var catalogRows = betboomFilteredCatalog();
    var catalogCount = (betboom.catalog || []).length;
    var selected = betboomSelectedCatalog();
    var details = betboom.matches || [];
    var status = betboom.loading ? "Loading" : (catalogCount ? catalogRows.length + "/" + catalogCount + " matches" : "Ready");
    var html;

    if (!box) return;

    betboomActiveMode(config);
    html = '<div class="t"><span>' + esc(config.title) + '</span><span class="m">' + esc(status) + '</span></div>';
    html += betboomModeTabsHtml(config);
    html += betboomSummaryHtml();
    html += '<div class="bb-tools"><input type="search" data-dmbo-betboom-search="1" value="' + esc(betboom.query || "") + '" placeholder="' + esc(config.searchPlaceholder || "Search BetBoom matches, FIFA, football, players") + '" autocomplete="off"><button class="btn btn2" type="button" data-dmbo-betboom-refresh="1">Refresh</button>' + betboomSuggestionsHtml(catalogRows) + '</div>';

    if (betboom.error) {
      html += '<div class="m" style="margin-bottom:8px">' + esc(betboom.error) + '</div>';
    }

    if (!catalogCount && betboom.loading) {
      box.innerHTML = html + '<div class="m">Loading BetBoom match catalog...</div>';
      betboomBindControls(c, widget, focusSearch);
      return;
    }

    if (!catalogCount && details.length) {
      html += '<div class="bb-list">' + details.map(betboomCardHtml).join("") + '</div>';
      box.innerHTML = html;
      betboomBindControls(c, widget, focusSearch);
      return;
    }

    if (!catalogCount) {
      box.innerHTML = html + '<div class="m">' + esc(betboom.emptyMessage || "No BetBoom catalog rows loaded yet.") + '</div>';
      betboomBindControls(c, widget, focusSearch);
      return;
    }

    html += '<div class="bb-layout"><div>' + betboomCatalogHtml(catalogRows) + '</div><div class="bb-list">';
    if (betboom.detailLoading && !details.length) {
      html += '<div class="m">Loading selected match details...</div>';
    } else if (details.length) {
      html += details.map(betboomCardHtml).join("");
    } else if (selected) {
      html += betboomCardHtml(betboomCatalogFallbackDetail(selected, config));
    } else {
      html += '<div class="m">Select a BetBoom match.</div>';
    }
    html += '</div></div>';
    if (updated) html += '<div class="m" style="margin-top:8px">Updated ' + esc(updated) + (betboom.loading || betboom.detailLoading ? " · refreshing" : "") + '</div>';

    box.innerHTML = html;
    betboomBindControls(c, widget, focusSearch);
  }

  function betboomFallbackMatches(config) {
    return (config.matches || []).map(function (match) {
      return betboomMatchSummary({
        match: {
          matchId: match.matchId,
          title: match.title,
          subtitle: match.subtitle,
          openUrl: match.openUrl,
          statUrl: match.statUrl,
          status: "Configured"
        },
        players: match.players || [],
        stats: match.stats || [],
        images: (match.images || []).concat(match.imageUrls || [])
      }, {
        openUrl: match.openUrl || config.openUrl,
        matchConfig: match,
        maxStats: config.maxStats,
        maxImages: config.maxImages
      });
    });
  }

  function betboomLoadSelectedDetail(c, widget, match) {
    var config = betboomMatchConfig(widget);
    var selected = match || betboomSelectedCatalog();
    var id = selected && (selected.matchId || selected.id);

    if (!selected || !id) {
      betboom.matches = [];
      betboomMatchRender(c, widget);
      return;
    }

    betboom.selectedId = String(id);
    if (betboom.detailsById[id]) {
      betboom.matches = [betboom.detailsById[id]];
      betboomMatchRender(c, widget);
      return;
    }

    betboom.detailLoading = true;
    betboom.matches = [betboomCatalogFallbackDetail(selected, config)];
    betboomMatchRender(c, widget);

    getJson(betboomMatchUrl(c, config, selected), "omit", function (error, data) {
      var summary;

      betboom.detailLoading = false;
      if (error) {
        summary = betboomCatalogFallbackDetail(selected, config);
        betboom.error = "";
      } else {
        summary = betboomMatchSummary(data, {
          openUrl: selected.openUrl || config.openUrl,
          matchConfig: selected,
          score: selected.score,
          homeImageUrl: selected.homeImageUrl,
          awayImageUrl: selected.awayImageUrl,
          backgroundImageUrl: selected.backgroundImageUrl,
          maxStats: config.maxStats,
          maxImages: config.maxImages
        });
        betboom.error = "";
      }

      betboom.detailsById[id] = summary;
      betboom.matches = [summary];
      betboom.updatedAt = Date.now();
      betboomMatchRender(c, widget);
    });
  }

  function betboomMatchLoad(c, widget, force) {
    var config = betboomMatchConfig(widget);

    if (betboom.loading && !force) return;
    betboom.loading = true;
    betboom.error = "";
    betboomMatchRender(c, widget);

    getJson(betboomCatalogUrl(c, config), "omit", function (error, data) {
      var rows;
      var selected;

      betboom.loading = false;
      if (error) {
        betboom.error = "BetBoom catalog Worker route is pending or unavailable. Showing configured fallback.";
        betboom.catalog = [];
        betboom.catalogMeta = {};
        betboom.emptyMessage = "";
        betboom.matches = betboomFallbackMatches(config);
        betboom.updatedAt = Date.now();
        betboomMatchRender(c, widget);
        return;
      }

      rows = betboomCatalogRows(data);
      betboom.catalogMeta = data && typeof data === "object" ? {
        source: data.source,
        mode: data.mode,
        query: data.query,
        counts: data.counts,
        modes: data.modes
      } : {};
      betboom.catalog = rows;
      if (!rows.length) {
        betboom.matches = [];
        betboom.emptyMessage = "No BetBoom " + betboomModeLabel(betboom.mode || config.catalogDefaultMode || "all").toLowerCase() + " matches are exposed by the public catalog right now.";
        betboom.error = "";
        betboom.updatedAt = Date.now();
        betboomMatchRender(c, widget);
        return;
      }
      betboom.emptyMessage = "";

      selected = betboomSelectedCatalog();
      if (!selected || !betboom.selectedId) {
        selected = rows[0];
        betboom.selectedId = selected.matchId || selected.id;
      }

      betboom.updatedAt = Date.now();
      betboomLoadSelectedDetail(c, widget, selected);
    });
  }

  function betboomMatchStart(c, widget) {
    var config = betboomMatchConfig(widget);

    if (betboom.timer) {
      clearInterval(betboom.timer);
      betboom.timer = 0;
    }

    betboomMatchLoad(c, widget);
    betboom.timer = setInterval(function () {
      betboomMatchLoad(c, widget);
    }, config.pollMs);
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
      return '<div class="b" id="dmbo-video-panel"><div class="video-empty">' + esc(title) + '</div></div>';
    }

    return '<div class="b" id="dmbo-video-panel"><div class="video-wrap"><video id="dmbo-video" preload="metadata" playsinline ' + (poster ? 'poster="' + esc(poster) + '" ' : "") + '>' +
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
      html += '<div class="b" id="dmbo-lottie-panel"><div id="dmbo-lottie" style="width:100%;height:176px"></div></div>';
    }

    if (panelEnabled(widget, "video")) {
      html += videoPanelHtml(c, widget);
    }

    if (panelEnabled(widget, "youtube")) {
      html += '<div class="b" id="dmbo-youtube"><iframe title="YouTube" src="' + esc(c.youtubeEmbedUrl) + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    }

    if (panelEnabled(widget, "iframe")) {
      html += '<div class="b" id="dmbo-iframe"><iframe title="' + esc(c.iframeTitle) + '" src="' + esc(c.iframeUrl) + '" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="note">External iframe may be blocked. <a href="' + esc(c.iframeUrl) + '" target="_blank" rel="noopener noreferrer">Open</a></div></div>';
    }

    if (panelEnabled(widget, "betbyFeed")) {
      html += '<div class="b d s2" id="dmbo-betby-feed"><div class="t">Live Bets Feed</div><div class="m">Loading...</div></div>';
    }

    if (panelEnabled(widget, "betboomMatch")) {
      html += '<div class="b d s3" id="dmbo-betboom-match"><div class="t">BetBoom Match Center</div><div class="m">Loading...</div></div>';
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
    installExpandControls();

    qs("dmbo-v12-close").onclick = function () {
      window.__DMBO_WIDGET_CLOSED__ = true;
      closeExpandedPanel();
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
    if (panelEnabled(widget, "betbyFeed")) betbyFeedStart(c, widget);
    if (panelEnabled(widget, "betboomMatch")) betboomMatchStart(c, widget);
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
      betboomCatalogRows: betboomCatalogRows,
      betboomCatalogUrl: betboomCatalogUrl,
      betboomMatchConfig: betboomMatchConfig,
      betboomMatchSummary: betboomMatchSummary,
      betboomMatchUrl: betboomMatchUrl,
      betbyComboRows: betbyComboRows,
      betbyEventRows: betbyEventRows,
      betbyFeedRows: betbyFeedRows,
      betbyFeedUrl: betbyFeedUrl,
      betbyLeaderboardRows: betbyLeaderboardRows,
      betbyLeaderboardUrl: betbyLeaderboardUrl,
      betbyPromoUrl: betbyPromoUrl,
      betbySnapshotUrl: betbySnapshotUrl,
      betbyStatsRows: betbyStatsRows,
      betbyTrackerRows: betbyTrackerRows,
      betbyTrackerUrl: betbyTrackerUrl,
      createDefaultManifest: createDefaultManifest,
      eventHref: eventHref,
      eventStartMs: eventStartMs,
      formatMatchClock: formatMatchClock,
      getActiveLayers: getActiveLayers,
      liveAnimationUrlFromResolver: liveAnimationUrlFromResolver,
      liveAnimationResolverUrl: liveAnimationResolverUrl,
      liveEventSummary: liveEventSummary,
      liveVisualMode: liveVisualMode,
      liveVisualSourcesFromResolver: liveVisualSourcesFromResolver,
      matchClockSeconds: matchClockSeconds,
      matchesPath: matchesPath,
      normalizePagePath: normalizePagePath,
      pageMatches: pageMatches,
      panelConfig: panelConfig,
      panelEnabled: panelEnabled,
      sameLiveSrc: sameLiveSrc,
      shouldFetchAccountData: shouldFetchAccountData,
      sportFilterEvents: sportFilterEvents,
      sportFilterRowsForWindow: sportFilterRowsForWindow,
      sportWindowHours: sportWindowHours,
      sportscastGoalTimeline: sportscastGoalTimeline,
      sportscastIdFromAnimationUrl: sportscastIdFromAnimationUrl,
      sportscastProviderRows: sportscastProviderRows,
      sportscastTeamRows: sportscastTeamRows,
      sportscastTimelineRows: sportscastTimelineRows,
      summarizeAccountData: summarizeAccountData,
      tickingMatchClockText: tickingMatchClockText
    };
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
