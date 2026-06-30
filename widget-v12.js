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
  var DEFAULT_PANELS = ["lottie", "youtube", "iframe", "top", "worldcup", "sports", "casino"];

  var logoIndex = null;
  var logoWaiters = [];
  var logoLoading = false;
  var manifest = null;
  var currentRouteKey = "";
  var currentDmboWidget = null;
  var lottieReady = false;
  var routeHooked = false;
  var loadedScriptIds = {};
  var casino = { page: 0, query: "", loading: false, done: false, games: [] };
  var sport = { service: "PREMATCH", sportId: "1", sportName: "Football", offset: 0, limit: 20, events: [], loading: false, done: false };

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
      version: "20260630-adv-router-1",
      global: {
        styles: [],
        scripts: []
      },
      pages: [
        {
          id: "advanced-features",
          paths: ["/home/adv"],
          widgets: [
            {
              id: "dmbo-media-widget-v12",
              type: "dmbo-v12",
              panels: DEFAULT_PANELS.slice(0)
            }
          ],
          styles: [],
          scripts: []
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
    if (!Array.isArray(panels) || !panels.length) return true;
    return panels.indexOf(name) !== -1;
  }

  function needsLottie(widget) {
    return panelEnabled(widget, "lottie");
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

    if (!item || item.enabled === false) return;

    id = assetDomId(item, "style");
    if (qs(id)) return;

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
      "#" + c.containerId + " .btn{border:0;border-radius:7px;background:#fd224e;color:#fff;font-size:11px;font-weight:800;padding:6px 8px;cursor:pointer}#" + c.containerId + " .btn2{background:#24314f}" +
      "#" + c.containerId + " .search{display:flex;gap:6px;margin-bottom:8px}#" + c.containerId + " input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.15);background:#101827;color:#fff;border-radius:7px;padding:7px;font-size:12px}" +
      "#" + c.containerId + " .grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}#" + c.containerId + " .game{border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#111827;overflow:hidden}" +
      "#" + c.containerId + " .gimg{display:block;width:100%;aspect-ratio:1.33;object-fit:cover;background:#1f2937}#" + c.containerId + " .gb{padding:8px}#" + c.containerId + " .gn{font-size:12px;font-weight:800;line-height:1.25;min-height:30px}" +
      "#dmbo-v12-close{position:absolute;top:6px;right:6px;z-index:2;width:28px;height:28px;border:0;border-radius:50%;background:#fd224e;color:#fff;font-weight:900;cursor:pointer}" +
      "@media(max-width:980px){#" + c.containerId + "{grid-template-columns:1fr;max-height:calc(100vh - 36px);overflow:auto}#" + c.containerId + " .s2,#" + c.containerId + " .s3{grid-column:auto}#" + c.containerId + " .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}";

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

    if (!events.length) html += '<div class="m">No events found.</div>';

    events.slice(0, max).forEach(function (ev, i) {
      var tm = teams(ev);
      var fl = flag(ev.regionName);
      var odds = (ev.market && ev.market.outcomes) || [];
      var p = id + "-" + i;

      html += '<div class="ev"><div class="m">' + (fl ? '<img class="flag" src="' + fl + '"> ' : '') + esc(ev.tournamentName || ev.regionName || "") + ' · ' + esc(dateText(ev.startTime)) + '</div>';
      html += '<div class="match"><div class="team"><span id="' + p + '-hi" class="init">' + esc(initials(tm.h)) + '</span><img id="' + p + '-hl" class="logo" style="display:none"><span>' + esc(tm.h) + '</span></div><span class="m">vs</span><div class="team"><span id="' + p + '-ai" class="init">' + esc(initials(tm.a)) + '</span><img id="' + p + '-al" class="logo" style="display:none"><span>' + esc(tm.a) + '</span></div></div><div class="od">';

      odds.slice(0, 4).forEach(function (o) {
        html += '<span class="pill"><b>' + esc(o.shortName || o.name) + '</b> ' + esc(o.odds) + '</span>';
      });

      if (!odds.length) html += '<span class="m">Odds loading or unavailable</span>';
      html += '</div></div>';
    });

    box.innerHTML = html;

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

    if (panelEnabled(widget, "lottie")) {
      html += '<div class="b"><div id="dmbo-lottie" style="width:100%;height:176px"></div></div>';
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
      createDefaultManifest: createDefaultManifest,
      getActiveLayers: getActiveLayers,
      matchesPath: matchesPath,
      normalizePagePath: normalizePagePath,
      pageMatches: pageMatches,
      panelEnabled: panelEnabled
    };
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
