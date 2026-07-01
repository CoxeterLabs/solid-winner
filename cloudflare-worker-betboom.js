const TARGET_BASE = "https://ui-monitor.lynon.online/sportsbook-new";
const PROJECT_ID = "1006";
const WORKER_URL = "https://sports.hypercubik.workers.dev/";

const WIDGET_SOURCE_URL =
  "https://raw.githubusercontent.com/CoxeterLabs/solid-winner/refs/heads/main/widget-v12.js";

const WIDGET_VERSION = "20260701-betboom-stats-1";

const MATCHTRACKER_RESOLVER_PATH = "/matchtracker-resolver/resolve";
const MATCHTRACKER_QUERY_KEYS = new Set([
  "eventId",
  "event_id",
  "matchId",
  "match_id",
  "home",
  "away",
  "h",
  "a",
  "lang",
  "language",
  "nocache"
]);

const BETBOOM_API_BASE = "https://siteapi.betboom.ru/api/site_api/v1";
const STATSHUB_CDN_BASE = "https://st-cdn001.akamaized.net";
const STATSHUB_APP_BASE = "https://sh-cdn001.akamaized.net";
const STATSHUB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const ALLOWED_ORIGINS = new Set([
  "https://winrai1.com",
  "https://www.winrai1.com",
  "https://dmbobet.com",
  "https://www.dmbobet.com"
]);

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://winrai1.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "accept, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status, cors, cacheControl) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      ...cors,
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "no-store"
    }
  });
}

function textResponse(text, status, cors, contentType, cacheControl) {
  return new Response(text, {
    status: status || 200,
    headers: {
      ...cors,
      "content-type": contentType || "text/plain; charset=utf-8",
      "cache-control": cacheControl || "no-store"
    }
  });
}

function isAllowedPath(path) {
  if (!path || path.charAt(0) !== "/" || path.indexOf("..") >= 0) return false;

  return (
    path === MATCHTRACKER_RESOLVER_PATH ||
    path === "/betboom/match-details" ||
    path === "/betboom/statshub" ||
    path.startsWith("/partner-api/sportsbook/public/v2/") ||
    path.startsWith("/partner-api/opensearch-gateway/sportsbooks/search") ||
    path.startsWith("/team-logos/") ||
    path.startsWith("/league-icons/") ||
    path.startsWith("/region-flags/") ||
    path.startsWith("/api/cms/league-icons")
  );
}

function isAssetPath(path) {
  return (
    path.startsWith("/team-logos/") ||
    path.startsWith("/league-icons/") ||
    path.startsWith("/region-flags/")
  );
}

function cacheControlForPath(path) {
  if (path === MATCHTRACKER_RESOLVER_PATH) return "no-store";
  if (path === "/betboom/match-details" || path === "/betboom/statshub") return "public, max-age=60";
  return isAssetPath(path) ? "public, max-age=86400" : "public, max-age=5";
}

function shouldForwardParam(path, key) {
  if (key === "path") return false;
  if (path === MATCHTRACKER_RESOLVER_PATH) return MATCHTRACKER_QUERY_KEYS.has(key);
  return true;
}

function configJs() {
  return `
(function () {
  window.DMBO_MEDIA_WIDGET_CONFIG = {
    triggerSelector: "body",

    containerId: "dmbo-media-widget-v12",
    styleId: "dmbo-media-widget-v12-style",

    lottiePath: "https://assets10.lottiefiles.com/packages/lf20_jcikwtux.json",

    youtubeEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",

    iframeUrl: "https://react-view-transitions-demo.labs.vercel.dev",
    iframeTitle: "Vercel",

    sportsProxyUrl: "${WORKER_URL}",

    casinoGamesUrl: "/api/integration/api/v1.0/webSites/pages/casino/lobby-games",
    casinoMaxPages: 20
  };

  try {
    window.dispatchEvent(new Event("dmbo-media-config-ready"));
  } catch (e) {}
})();
`;
}

async function serveWidget(cors, ctx) {
  const cacheKey = new Request(WORKER_URL + "__widget-cache/" + WIDGET_VERSION);
  const cached = await caches.default.match(cacheKey);

  if (cached) {
    const headers = new Headers(cached.headers);
    Object.keys(cors).forEach((key) => headers.set(key, cors[key]));

    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers
    });
  }

  const upstream = await fetch(WIDGET_SOURCE_URL, {
    headers: { accept: "text/plain,*/*" }
  });

  if (!upstream.ok) {
    return textResponse(
      "console.error('[DMBO] widget source unavailable');",
      502,
      cors,
      "application/javascript; charset=utf-8",
      "no-store"
    );
  }

  const js = await upstream.text();
  const response = new Response(js, {
    status: 200,
    headers: {
      ...cors,
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  }

  return response;
}

function cleanText(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return cleanText(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function safeMatchId(value) {
  const id = String(value || "").trim();
  return /^\d{3,30}$/.test(id) ? id : "";
}

function languageCode(value) {
  const lang = String(value || "ru").toLowerCase();
  if (lang.startsWith("en")) return "LANGUAGES_EN";
  return "LANGUAGES_RU";
}

function statshubLang(value) {
  const lang = String(value || "ru").toLowerCase();
  return lang.startsWith("en") ? "en" : "ru";
}

function safeBetboomOpenUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.origin !== "https://betboom.ru") return "";
    if (!url.pathname.startsWith("/sport/")) return "";
    return url.toString();
  } catch (e) {
    return "";
  }
}

function safeUrl(value, base) {
  if (!value) return "";

  try {
    const url = new URL(String(value), base || undefined);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch (e) {
    return "";
  }
}

async function fetchBetboomDetails(matchId, lang, theme) {
  const upstream = await fetch(BETBOOM_API_BASE + "/sporthub/tree/get_match_details_info", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-platform": "web",
      origin: "https://betboom.ru",
      referer: "https://betboom.ru/",
      "user-agent": STATSHUB_UA
    },
    body: JSON.stringify({
      match_id: Number(matchId),
      language: languageCode(lang),
      theme: theme || "THEMES_BLACK"
    })
  });

  const text = await upstream.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  if (!upstream.ok || data.code >= 400) {
    throw new Error("BetBoom details HTTP " + upstream.status);
  }

  return data;
}

function detailsStatUrl(details) {
  let statUrl = safeUrl(details && details.stat_url);

  if (statUrl) return statUrl;

  (details && details.widget_groups || []).some((group) => {
    return (group.widgets || []).some((widget) => {
      statUrl = safeUrl(widget.url);
      return !!statUrl;
    });
  });

  return statUrl;
}

function detailsImages(details) {
  const rows = [];

  (details && details.widget_groups || []).forEach((group) => {
    (group.widgets || []).forEach((widget) => {
      const url = safeUrl(widget.icon);
      if (url) {
        rows.push({
          label: cleanText(widget.state || widget.group || "Widget"),
          url
        });
      }
    });
  });

  return rows;
}

function uniqueImages(rows) {
  const out = [];
  const seen = new Set();

  rows.forEach((row) => {
    const url = safeUrl(row && row.url);
    const key = url.toLowerCase();
    if (!url || seen.has(key)) return;
    seen.add(key);
    out.push({ label: cleanText(row.label || "Image"), url });
  });

  return out.slice(0, 20);
}

function extractTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(match && match[1] ? match[1] : "");
}

function splitTitlePlayers(title) {
  const clean = cleanText(String(title || "").replace(/\s+\|.*$/, ""));
  const parts = clean.split(/\s+-\s+/);

  if (parts.length < 2) return [];
  return [
    { side: "home", name: parts[0] },
    { side: "away", name: parts.slice(1).join(" - ") }
  ].filter((player) => player.name);
}

function labelForImage(url) {
  if (/\/es\.(svg|png|webp)$/i.test(url)) return "Spain";
  if (/\/int\.(svg|png|webp)$/i.test(url)) return "Neutral";
  if (/Statistic\.webp/i.test(url)) return "Statistic";
  if (/tennis/i.test(url)) return "Tennis";
  return "StatsHub";
}

function extractHtmlImages(html) {
  const source = String(html || "");
  const rows = [];
  const re = /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = re.exec(source))) {
    const raw = decodeHtml(match[1]);
    let url = "";

    if (/^https:\/\/img-cdn001\.akamaized\.net\//i.test(raw)) {
      url = raw;
    } else if (/^https:\/\/static\.sporthub\.bet\//i.test(raw)) {
      url = raw;
    } else if (/^\/assets\/(?:shadow|highlight|tennis|broadcast|favorites|soccer|basketball|ice-hockey|baseball|handball|volleyball)/i.test(raw)) {
      url = safeUrl(raw, STATSHUB_APP_BASE);
    }

    if (url) rows.push({ label: labelForImage(url), url });
  }

  return uniqueImages(rows);
}

function regexValue(source, re) {
  const match = String(source || "").match(re);
  return decodeHtml(match && match[1] ? match[1] : "");
}

function parseStatsHubHtml(html, matchId, statUrl, openUrl, details) {
  const source = String(html || "").replace(/\\"/g, "\"").replace(/\\\//g, "/");
  const title = extractTitle(html);
  const players = splitTitlePlayers(title);
  const statTitle = cleanText(title.replace(/\s+\|.*$/, ""));
  const round = regexValue(source, /"displaynumber","([^"]+)"/);
  const matchSegment = source.indexOf("\"displaynumber\"") >= 0 ? source.slice(source.indexOf("\"displaynumber\""), source.indexOf("\"displaynumber\"") + 3000) : source;
  const city = regexValue(source, /"city","([^"]+)"/);
  const surface = regexValue(source, /"3","([^"]+)","mainid"/);
  const time = regexValue(matchSegment, /"(\d{2}:\d{2})","\d{2}\/\d{2}\/\d{2}",\d{10}/);
  const date = regexValue(matchSegment, /"\d{2}:\d{2}","(\d{2}\/\d{2}\/\d{2})",\d{10}/);
  const images = uniqueImages(detailsImages(details).concat(extractHtmlImages(html)));
  const facts = [];

  if (time || date) facts.push({ label: "Start", value: cleanText([date, time].filter(Boolean).join(" ")) });
  if (round) facts.push({ label: "Round", value: round });
  if (surface) facts.push({ label: "Surface", value: surface });
  if (city) facts.push({ label: "City", value: city });
  if (source.indexOf("\"hasstats\"") >= 0) facts.push({ label: "Stats coverage", value: "Available" });
  if (source.indexOf("\"liveodds\"") >= 0) facts.push({ label: "Live odds", value: "Available" });
  if (source.indexOf("\"inlivescore\"") >= 0) facts.push({ label: "Live score", value: "Available" });

  return {
    match: {
      matchId,
      title: statTitle,
      tournament: regexValue(source, /"tournamentInfo".*?"name","([^"]+)"/) || "Wimbledon",
      round,
      surface,
      city,
      startTimeText: cleanText([date, time].filter(Boolean).join(" ")),
      statUrl,
      openUrl,
      status: "StatsHub"
    },
    players,
    stats: [],
    facts,
    images,
    details
  };
}

async function fetchStatsHubHtml(statUrl) {
  const upstream = await fetch(statUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ru,en;q=0.8",
      referer: "https://betboom.ru/",
      "user-agent": STATSHUB_UA
    }
  });

  if (!upstream.ok) {
    throw new Error("StatsHub HTTP " + upstream.status);
  }

  return upstream.text();
}

async function handleBetboomMatchDetails(requestUrl, cors) {
  const matchId = safeMatchId(requestUrl.searchParams.get("matchId"));
  const lang = requestUrl.searchParams.get("lang") || "ru";
  const theme = requestUrl.searchParams.get("theme") || "THEMES_BLACK";
  const openUrl = safeBetboomOpenUrl(requestUrl.searchParams.get("openUrl"));

  if (!matchId) {
    return jsonResponse({ error: "invalid matchId" }, 400, cors);
  }

  try {
    const details = await fetchBetboomDetails(matchId, lang, theme);
    const statUrl = detailsStatUrl(details);

    return jsonResponse({
      ok: true,
      match: {
        matchId,
        statUrl,
        openUrl,
        status: "Details"
      },
      images: detailsImages(details),
      details
    }, 200, cors, "public, max-age=60");
  } catch (error) {
    return jsonResponse({ error: error.message || "BetBoom details failed" }, 502, cors);
  }
}

async function handleBetboomStatsHub(requestUrl, cors) {
  const matchId = safeMatchId(requestUrl.searchParams.get("matchId"));
  const lang = requestUrl.searchParams.get("lang") || "ru";
  const theme = requestUrl.searchParams.get("theme") || "THEMES_BLACK";
  const openUrl = safeBetboomOpenUrl(requestUrl.searchParams.get("openUrl"));

  if (!matchId) {
    return jsonResponse({ error: "invalid matchId" }, 400, cors);
  }

  try {
    const details = await fetchBetboomDetails(matchId, lang, theme);
    const statUrl = detailsStatUrl(details) ||
      `${STATSHUB_CDN_BASE}/bingoboom/${statshubLang(lang)}/match/m${encodeURIComponent(matchId)}`;
    let normalized = {
      match: {
        matchId,
        statUrl,
        openUrl,
        status: "Details"
      },
      players: [],
      stats: [],
      facts: [],
      images: detailsImages(details),
      details
    };

    try {
      const html = await fetchStatsHubHtml(statUrl);
      normalized = parseStatsHubHtml(html, matchId, statUrl, openUrl, details);
    } catch (error) {
      normalized.error = error.message || "StatsHub unavailable";
    }

    return jsonResponse(normalized, 200, cors, "public, max-age=60");
  } catch (error) {
    return jsonResponse({ error: error.message || "BetBoom StatsHub failed" }, 502, cors);
  }
}

async function handleLynonProxy(request, requestUrl, path, cors) {
  const target = new URL(TARGET_BASE + path);

  requestUrl.searchParams.forEach((value, key) => {
    if (shouldForwardParam(path, key)) target.searchParams.set(key, value);
  });

  if (path === MATCHTRACKER_RESOLVER_PATH && !target.searchParams.get("projectId")) {
    target.searchParams.set("projectId", PROJECT_ID);
  }

  const upstream = await fetch(target.toString(), {
    method: request.method,
    headers: {
      accept: request.headers.get("accept") || "application/json",
      "accept-language": request.headers.get("accept-language") || "en",
      "x-project-id": PROJECT_ID
    }
  });

  const headers = new Headers(cors);
  headers.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
  headers.set("cache-control", cacheControlForPath(path));

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (requestUrl.pathname === "/health") {
      return textResponse("ok", 200, cors);
    }

    if (requestUrl.pathname === "/config.js") {
      return textResponse(configJs(), 200, cors, "application/javascript; charset=utf-8", "public, max-age=60");
    }

    if (requestUrl.pathname === "/widget.js") {
      return serveWidget(cors, ctx);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return textResponse("Only GET/HEAD allowed", 405, cors);
    }

    if (requestUrl.pathname === "/betboom/match-details") {
      return handleBetboomMatchDetails(requestUrl, cors);
    }

    if (requestUrl.pathname === "/betboom/statshub") {
      return handleBetboomStatsHub(requestUrl, cors);
    }

    const path = requestUrl.searchParams.get("path") || "";

    if (!isAllowedPath(path)) {
      return textResponse("Path not allowed", 400, cors);
    }

    if (path === "/betboom/match-details") {
      return handleBetboomMatchDetails(requestUrl, cors);
    }

    if (path === "/betboom/statshub") {
      return handleBetboomStatsHub(requestUrl, cors);
    }

    return handleLynonProxy(request, requestUrl, path, cors);
  }
};
