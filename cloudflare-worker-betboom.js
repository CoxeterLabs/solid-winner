const TARGET_BASE = "https://ui-monitor.lynon.online/sportsbook-new";
const PROJECT_ID = "1006";
const WORKER_URL = "https://sports.hypercubik.workers.dev/";

const WIDGET_SOURCE_URL =
  "https://raw.githubusercontent.com/CoxeterLabs/solid-winner/refs/heads/main/widget-v12.js";

const WIDGET_VERSION = "20260701-stable-live-visuals-1";

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
const BETBOOM_CATALOG_DEFAULT_SPORT_IDS = [2, 4, 5, 1, 11, 10];
const BETBOOM_CATALOG_MAX_SPORTS = 8;
const BETBOOM_CATALOG_MAX_TOURNAMENTS = 18;
const BETBOOM_CATALOG_MAX_MATCHES_PER_TOURNAMENT = 12;
const BETBOOM_CATALOG_MAX_MATCHES = 96;
const BETBOOM_CATALOG_MODES = new Set(["all", "live", "prematch", "history"]);
const STATSHUB_CDN_BASE = "https://st-cdn001.akamaized.net";
const STATSHUB_APP_BASE = "https://sh-cdn001.akamaized.net";
const STATSHUB_FEED_REFERER = "https://sh-cdn001.akamaized.net/";
const STATSHUB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const BETBOOM_STATIC_TEAM_SAMPLE =
  "https://static.sporthub.bet/aa3d3491a0d2a4774baa3b1863918115/multifeed/teams/47759e63-4ac3-4ed3-a8a5-64325f9fbaa7.webp";

const STATSHUB_PUBLIC_FEEDS = [
  "match_info_statshub",
  "stats_match_get",
  "match_details",
  "match_detailsextended",
  "match_timeline",
  "match_timelinedelta",
  "stats_match_timeline",
  "stats_match_stats",
  "stats_match_head2head",
  "match_playerdetails",
  "tennis_competitors",
  "stats_team_info",
  "stats_team_lastx",
  "stats_team_versus",
  "stats_team_versusrecent"
];

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
    path === "/betboom/catalog" ||
    path === "/betboom/match-details" ||
    path === "/betboom/statshub" ||
    path.startsWith("/partner-api/sportsbook/public/v2/") ||
    path.startsWith("/partner-api/opensearch-gateway/sportsbooks/search") ||
    path.startsWith("/team-logos/") ||
    path.startsWith("/sportsbook/sport/") ||
    path.startsWith("/league-icons/") ||
    path.startsWith("/region-flags/") ||
    path.startsWith("/api/cms/league-icons")
  );
}

function isAssetPath(path) {
  return (
    path.startsWith("/team-logos/") ||
    path.startsWith("/sportsbook/sport/") ||
    path.startsWith("/league-icons/") ||
    path.startsWith("/region-flags/")
  );
}

function cacheControlForPath(path) {
  if (path === MATCHTRACKER_RESOLVER_PATH) return "no-store";
  if (path === "/betboom/catalog") return "public, max-age=45";
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
  const lang = String(value || "en").toLowerCase();
  if (lang.startsWith("en")) return "LANGUAGES_EN";
  return "LANGUAGES_RU";
}

function statshubLang(value) {
  const lang = String(value || "en").toLowerCase();
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

function safeImageUrl(value, base) {
  const url = safeUrl(value, base);
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const allowedHost = (
      host === "static.sporthub.bet" ||
      host === "img-cdn001.akamaized.net" ||
      host === "sh-cdn001.akamaized.net" ||
      host === "site-static-blue2.betboom.ru"
    );
    const allowedExt = /\.(png|jpe?g|webp|gif|svg)$/i.test(path);

    return allowedHost && allowedExt ? parsed.toString() : "";
  } catch (e) {
    return "";
  }
}

function statshubAssetUrl(path) {
  return safeImageUrl(path, STATSHUB_APP_BASE);
}

function countryFlagUrl(country) {
  const a2 = cleanText(country && (country.a2 || country.code || country.cc)).toLowerCase();

  if (a2 && a2 !== "int") {
    return `https://img-cdn001.akamaized.net/ls/crest/4x3/${encodeURIComponent(a2)}.svg`;
  }

  return "https://img-cdn001.akamaized.net/ls/crest/medium/int.png";
}

function teamLogoCandidates(team) {
  const uid = cleanText(team && team.uid);
  if (!uid || !/^\d+$/.test(uid)) return [];

  return [
    {
      label: cleanText(team.surname || team.name || "Team") + " medium logo",
      url: `https://img-cdn001.akamaized.net/ls/teams/medium/${uid}.png`
    },
    {
      label: cleanText(team.surname || team.name || "Team") + " large logo",
      url: `https://img-cdn001.akamaized.net/ls/teams/large/${uid}.png`
    }
  ];
}

function imageCandidatesFromParams(requestUrl, keys, label) {
  const rows = [];
  const rawValues = [];

  keys.forEach((key) => {
    requestUrl.searchParams.getAll(key).forEach((value) => rawValues.push(value));
  });

  rawValues.forEach((value) => {
    String(value || "").split(/[\s|]+/).forEach((part) => {
      const url = safeImageUrl(part);
      if (url) rows.push({ label, url });
    });
  });

  return rows;
}

function extraImageCandidates(requestUrl) {
  return imageCandidatesFromParams(requestUrl, ["imageUrl", "imageUrls", "extraImageUrl"], "SportHub image");
}

function playerImageCandidates(requestUrl, side, player) {
  const label = cleanText(player && player.name) || side + " image";
  const prefix = side === "away" ? "away" : "home";

  return imageCandidatesFromParams(requestUrl, [
    prefix + "ImageUrl",
    prefix + "ImageUrls",
    prefix + "PlayerImageUrl",
    prefix + "PlayerImageUrls"
  ], label);
}

function firstImageByCandidate(images, candidates) {
  const urls = new Set((candidates || []).map((row) => safeImageUrl(row && row.url)).filter(Boolean));
  const found = (images || []).find((image) => urls.has(safeImageUrl(image && image.url)));

  return found && found.url ? found.url : "";
}

function usableImageMeta(headers) {
  const contentType = String(headers.get("content-type") || "").toLowerCase();
  const contentLength = Number(headers.get("content-length") || 0);

  if (!contentType.startsWith("image/")) return null;
  if (contentType !== "image/svg+xml" && contentLength && contentLength <= 128) return null;

  return {
    contentType,
    bytes: contentLength || null
  };
}

async function probeUsableImages(rows) {
  const candidates = uniqueImages(rows).slice(0, 40);
  const out = [];

  await Promise.all(candidates.map(async (row) => {
    const url = safeImageUrl(row.url);
    if (!url) return;

    try {
      let upstream = await fetch(url, {
        method: "HEAD",
        headers: {
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          referer: "https://betboom.ru/",
          "user-agent": STATSHUB_UA
        }
      });
      let meta = usableImageMeta(upstream.headers);

      if ((!upstream.ok || !meta) && upstream.status === 405) {
        upstream = await fetch(url, {
          method: "GET",
          headers: {
            accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            range: "bytes=0-1023",
            referer: "https://betboom.ru/",
            "user-agent": STATSHUB_UA
          }
        });
        meta = usableImageMeta(upstream.headers);
      }

      if (upstream.ok && meta) {
        out.push({
          label: cleanText(row.label || "Image"),
          url,
          contentType: meta.contentType,
          bytes: meta.bytes
        });
      }
    } catch (e) {}
  }));

  return uniqueImages(out).map((row) => {
    const found = out.find((item) => item.url === row.url) || row;
    return {
      label: row.label,
      url: row.url,
      contentType: found.contentType || "",
      bytes: found.bytes || null
    };
  });
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

async function betboomApiPost(path, body) {
  const upstream = await fetch(BETBOOM_API_BASE + path, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-platform": "web",
      origin: "https://betboom.ru",
      referer: "https://betboom.ru/",
      "user-agent": STATSHUB_UA
    },
    body: JSON.stringify(body || {})
  });
  const text = await upstream.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  if (!upstream.ok || (data && Number(data.code) >= 400)) {
    throw new Error("BetBoom API " + path + " HTTP " + upstream.status + " code " + cleanText(data && data.code));
  }

  return data || {};
}

function numericListParam(requestUrl, key, fallback, limit) {
  const values = [];
  const seen = new Set();
  const max = Math.max(1, Number(limit) || 20);

  function add(value) {
    const id = Number(String(value || "").trim());
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
    seen.add(id);
    values.push(id);
  }

  requestUrl.searchParams.getAll(key).forEach((value) => {
    String(value || "").split(/[,\s|]+/).forEach(add);
  });

  if (!values.length && Array.isArray(fallback)) {
    fallback.forEach(add);
  }

  return values.slice(0, max);
}

function boundedNumberParam(requestUrl, key, fallback, min, max) {
  const value = Number(requestUrl.searchParams.get(key));
  const out = Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, out));
}

function sportSlug(name) {
  const text = cleanText(name).toLowerCase();
  const aliases = {
    "ice hockey": "ice-hockey",
    "table tennis": "table-tennis",
    "american football": "american-football",
    "australian rules": "australian-rules",
    "esports": "esport",
    "e-sport": "esport"
  };

  return aliases[text] || text.replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sport";
}

function firstIconUrl(icon) {
  if (!icon || typeof icon !== "object") return "";
  return safeImageUrl(icon.svg || icon.webp || icon.png || icon.url || icon.image || "");
}

function betboomOpenUrl(row, tournament) {
  const sport = sportSlug(row.sport_name || tournament.sportName || tournament.sport);
  const categoryId = cleanText(row.category_id || tournament.categoryId);
  const tournamentId = cleanText(row.tournament_id || tournament.tournamentId);
  const matchId = cleanText(row.match_id);

  if (!categoryId || !tournamentId || !matchId) return "";
  return `https://betboom.ru/sport/${encodeURIComponent(sport)}/${encodeURIComponent(categoryId)}/${encodeURIComponent(tournamentId)}/${encodeURIComponent(matchId)}`;
}

function formatBetboomDateText(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return cleanText(value);

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false
    }).format(date) + " UTC";
  } catch (e) {
    return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  }
}

function scorePair(row) {
  const scores = Array.isArray(row && row.scores) ? row.scores : [];
  const total = scores.find((score) => cleanText(score.type) === "SCORE_TYPES_TOTAL") || scores[0] || {};
  const home = cleanText(total.home_score_str || total.home_score);
  const away = cleanText(total.away_score_str || total.away_score);

  return {
    home: home || "",
    away: away || "",
    text: home || away ? `${home || "0"}-${away || "0"}` : ""
  };
}

function periodScoreRows(row) {
  const periods = Array.isArray(row && row.period_scores) ? row.period_scores : [];

  return periods.map((period) => {
    const score = (Array.isArray(period.scores) ? period.scores : [])[0] || {};
    return statPair(
      "Period " + cleanText(period.number || period.id || ""),
      score.home_score_str || score.home_score,
      score.away_score_str || score.away_score,
      ""
    );
  }).filter(Boolean);
}

function betboomCatalogMode(value) {
  const mode = cleanText(value || "all").toLowerCase();

  return BETBOOM_CATALOG_MODES.has(mode) ? mode : "all";
}

function betboomCatalogKind(startTime, scoreText, statusText) {
  const status = cleanText(statusText).toLowerCase();
  const startsAt = Date.parse(startTime || "");
  const now = Date.now();

  if (/\blive\b|in[- ]?play|running|started/.test(status)) return "live";
  if (Number.isFinite(startsAt) && startsAt > now) return "prematch";
  if (Number.isFinite(startsAt) && startsAt <= now && startsAt >= now - 8 * 60 * 60 * 1000 && !scoreText) return "live";
  if (scoreText || (Number.isFinite(startsAt) && startsAt < now)) return "history";

  return "prematch";
}

function betboomModeCounts(rows) {
  const counts = {
    all: rows.length,
    live: 0,
    prematch: 0,
    history: 0
  };

  rows.forEach((row) => {
    const mode = betboomCatalogMode(row && row.catalogMode);
    if (mode !== "all") counts[mode] += 1;
  });

  return counts;
}

function normalizeBetboomTournament(row) {
  const tournamentId = cleanText(row && (row.tournament_id || row.tournamentId || row.id));
  const sportId = cleanText(row && (row.sport_id || row.sportId));
  const categoryId = cleanText(row && (row.category_id || row.categoryId));

  return {
    id: tournamentId,
    tournamentId,
    title: cleanText(row && (row.tournament_title || row.tournamentTitle || row.title || row.name)),
    sport: cleanText(row && (row.sport_name || row.sportName)),
    sportId,
    category: cleanText(row && (row.category_name || row.categoryName)),
    categoryId,
    countMatches: Number(row && (row.count_matches || row.countMatches)) || 0,
    order: Number(row && (row.tournament_order_index || row.order)) || 999999,
    showCategory: !!(row && row.show_category),
    sportIconUrl: firstIconUrl(row && row.sport_icon),
    categoryIconUrl: firstIconUrl(row && row.category_icon)
  };
}

function normalizeBetboomCatalogMatch(row, tournament) {
  const source = row || {};
  const parent = tournament || {};
  const matchId = cleanText(source.match_id || source.matchId || source.id);
  const homeName = cleanText(source.home_team_name || source.homeTeamName);
  const awayName = cleanText(source.away_team_name || source.awayTeamName);
  const homeImageUrl = safeImageUrl(source.home_team_logo_url || source.homeTeamLogoUrl);
  const awayImageUrl = safeImageUrl(source.away_team_logo_url || source.awayTeamLogoUrl);
  const score = scorePair(source);
  const sport = cleanText(source.sport_name || parent.sport);
  const category = cleanText(source.category_name || parent.category);
  const tournamentName = cleanText(source.tournament_title || parent.title);
  const sportIconUrl = safeImageUrl(parent.sportIconUrl);
  const categoryIconUrl = safeImageUrl(parent.categoryIconUrl);
  const startTime = cleanText(source.start_dttm || source.startTime);
  const catalogMode = betboomCatalogKind(startTime, score.text, source.status || source.status_name || source.match_status);
  const status = catalogMode === "prematch" ? "Scheduled" : catalogMode === "live" ? "Live" : (score.text ? "Result " + score.text : "Listed");
  const stats = [score.text ? statPair("Score", score.home, score.away, "") : null].concat(periodScoreRows(source)).filter(Boolean);
  const images = [
    { label: homeName || "Home", url: homeImageUrl },
    { label: awayName || "Away", url: awayImageUrl },
    { label: sport || "Sport", url: sportIconUrl },
    { label: category || "Category", url: categoryIconUrl }
  ].filter((image) => image.url);
  const backgroundImageUrl = homeImageUrl || awayImageUrl || sportIconUrl || categoryIconUrl;

  return {
    id: matchId,
    matchId,
    title: [homeName, awayName].filter(Boolean).join(" vs ") || tournamentName || "BetBoom match",
    subtitle: [tournamentName, category, sport].filter(Boolean).join(" · "),
    sport,
    sportId: cleanText(source.sport_id || parent.sportId),
    category,
    categoryId: cleanText(source.category_id || parent.categoryId),
    tournament: tournamentName,
    tournamentId: cleanText(source.tournament_id || parent.tournamentId),
    startTime,
    startTimeText: formatBetboomDateText(startTime),
    status,
    catalogMode,
    score,
    homeImageUrl,
    awayImageUrl,
    backgroundImageUrl,
    sportIconUrl,
    categoryIconUrl,
    openUrl: betboomOpenUrl(source, parent),
    players: [
      {
        side: "home",
        name: homeName,
        fullName: cleanText(source.home_team_short_name || homeName),
        country: cleanText(source.home_team_description),
        teamUid: cleanText(source.home_team_id),
        imageUrl: homeImageUrl
      },
      {
        side: "away",
        name: awayName,
        fullName: cleanText(source.away_team_short_name || awayName),
        country: cleanText(source.away_team_description),
        teamUid: cleanText(source.away_team_id),
        imageUrl: awayImageUrl
      }
    ].filter((player) => player.name || player.imageUrl),
    facts: [
      { label: "Start", value: formatBetboomDateText(startTime) },
      { label: "Status", value: status },
      { label: "Tournament", value: tournamentName },
      { label: "Category", value: category },
      { label: "Sport", value: sport }
    ].filter((item) => item.value),
    stats,
    timeline: (Array.isArray(source.game_log) ? source.game_log : []).slice(-10).reverse().map((event) => ({
      type: cleanText(event.type || event.name),
      name: cleanText(event.name || event.type || "Game log"),
      time: cleanText(event.time || event.match_time),
      score: event.score || null
    })),
    images,
    source: "betboom-result-statistics"
  };
}

function catalogSearchBlob(row) {
  const text = [
    row && row.title,
    row && row.subtitle,
    row && row.sport,
    row && row.category,
    row && row.tournament,
    row && row.matchId,
    row && row.status,
    /world cup/i.test(cleanText(row && (row.title + " " + row.subtitle + " " + row.tournament))) ? "fifa fifa world cup" : ""
  ];

  (row && row.players || []).forEach((player) => {
    text.push(player.name, player.fullName, player.country, player.teamUid);
  });

  return cleanText(text.filter(Boolean).join(" ")).toLowerCase();
}

async function fetchBetboomTournamentsBySport(sportId, lang, page, limit) {
  const data = await betboomApiPost("/sporthub/match_result_statistics/tournaments/get_by_sport_id", {
    sport_ids: [Number(sportId)],
    language: languageCode(lang),
    page: page || 1,
    limit: limit || 20
  });

  return (Array.isArray(data.tournaments) ? data.tournaments : []).map(normalizeBetboomTournament);
}

async function fetchBetboomMatchesByTournament(tournament, lang, limit) {
  const data = await betboomApiPost("/sporthub/match_result_statistics/matches/get_by_tournament_id", {
    tournament_ids: [Number(tournament.tournamentId || tournament.id)],
    language: languageCode(lang),
    page: 1,
    limit: limit || BETBOOM_CATALOG_MAX_MATCHES_PER_TOURNAMENT,
    is_long_period: true
  });

  return (Array.isArray(data.results) ? data.results : [])
    .map((row) => normalizeBetboomCatalogMatch(row, tournament))
    .filter((row) => row.matchId);
}

async function handleBetboomCatalog(requestUrl, cors) {
  const lang = requestUrl.searchParams.get("lang") || "en";
  const query = cleanText(requestUrl.searchParams.get("q") || requestUrl.searchParams.get("query")).toLowerCase();
  const mode = betboomCatalogMode(requestUrl.searchParams.get("mode"));
  const limit = boundedNumberParam(requestUrl, "limit", 42, 4, BETBOOM_CATALOG_MAX_MATCHES);
  const sportIds = numericListParam(requestUrl, "sportIds", BETBOOM_CATALOG_DEFAULT_SPORT_IDS, BETBOOM_CATALOG_MAX_SPORTS);
  const tournamentIds = numericListParam(requestUrl, "tournamentIds", [], BETBOOM_CATALOG_MAX_TOURNAMENTS);
  const maxTournaments = boundedNumberParam(requestUrl, "maxTournaments", 12, 1, BETBOOM_CATALOG_MAX_TOURNAMENTS);
  const maxMatchesPerTournament = boundedNumberParam(
    requestUrl,
    "maxMatchesPerTournament",
    8,
    1,
    BETBOOM_CATALOG_MAX_MATCHES_PER_TOURNAMENT
  );
  const tournamentLimitPerSport = boundedNumberParam(requestUrl, "tournamentLimit", 8, 1, 30);
  const tournaments = [];
  const seenTournaments = new Set();

  try {
    if (tournamentIds.length) {
      tournamentIds.forEach((id) => {
        tournaments.push({ id: String(id), tournamentId: String(id), title: "Tournament " + id, order: 0 });
      });
    } else {
      for (const sportId of sportIds) {
        try {
          const rows = await fetchBetboomTournamentsBySport(sportId, lang, 1, tournamentLimitPerSport);
          rows.forEach((row) => {
            const key = row.tournamentId;
            if (!key || seenTournaments.has(key)) return;
            seenTournaments.add(key);
            tournaments.push(row);
          });
        } catch (e) {}
      }
    }

    const tournamentMatchesQuery = (row) => {
      if (!query) return false;
      return catalogSearchBlob({
        title: row.title,
        subtitle: [row.category, row.sport].join(" "),
        tournament: row.title,
        sport: row.sport,
        category: row.category
      }).indexOf(query) >= 0;
    };
    const sportRank = new Map();
    sportIds.forEach((sportId, index) => sportRank.set(String(sportId), index));
    const prioritized = tournaments
      .slice()
      .sort((a, b) => {
        const aSport = sportRank.has(cleanText(a.sportId)) ? sportRank.get(cleanText(a.sportId)) : 999;
        const bSport = sportRank.has(cleanText(b.sportId)) ? sportRank.get(cleanText(b.sportId)) : 999;

        return aSport - bSport || (a.order || 999999) - (b.order || 999999) || cleanText(a.title).localeCompare(cleanText(b.title));
      });
    const matchedTournaments = query ? prioritized.filter(tournamentMatchesQuery) : [];
    const selectedTournaments = [];
    const selectedSeen = new Set();

    matchedTournaments.concat(prioritized).forEach((row) => {
      const key = row.tournamentId || row.id;
      if (!key || selectedSeen.has(key) || selectedTournaments.length >= maxTournaments) return;
      selectedSeen.add(key);
      selectedTournaments.push(row);
    });

    const matches = [];
    for (const tournament of selectedTournaments) {
      try {
        const rows = await fetchBetboomMatchesByTournament(tournament, lang, maxMatchesPerTournament);
        rows.forEach((row) => matches.push(row));
      } catch (e) {}
      if (matches.length >= limit * 2) break;
    }

    let searchFiltered = matches;
    if (query) {
      searchFiltered = matches.filter((row) => catalogSearchBlob(row).indexOf(query) >= 0);
      if (!searchFiltered.length && matchedTournaments.length) {
        const matchedTournamentIds = new Set(matchedTournaments.map((row) => row.tournamentId || row.id));
        searchFiltered = matches.filter((row) => matchedTournamentIds.has(row.tournamentId));
      }
    }

    const modeCounts = betboomModeCounts(searchFiltered);
    let filtered = mode === "all" ? searchFiltered : searchFiltered.filter((row) => row.catalogMode === mode);

    const tournamentRank = new Map();
    selectedTournaments.forEach((row, index) => {
      tournamentRank.set(cleanText(row.tournamentId || row.id), index);
    });
    filtered = filtered
      .sort((a, b) => {
        const aRank = tournamentRank.has(cleanText(a.tournamentId)) ? tournamentRank.get(cleanText(a.tournamentId)) : 999;
        const bRank = tournamentRank.has(cleanText(b.tournamentId)) ? tournamentRank.get(cleanText(b.tournamentId)) : 999;
        const dateDelta = Date.parse(b.startTime || "") - Date.parse(a.startTime || "");

        return aRank - bRank || dateDelta || cleanText(a.title).localeCompare(cleanText(b.title));
      })
      .slice(0, limit);

    return jsonResponse({
      ok: true,
      source: "betboom-result-statistics",
      mode,
      query,
      sportIds,
      tournaments: selectedTournaments,
      matches: filtered,
      counts: {
        sports: sportIds.length,
        tournaments: selectedTournaments.length,
        matches: filtered.length,
        rawMatches: matches.length,
        searchMatches: searchFiltered.length,
        modes: modeCounts
      },
      modes: ["all", "live", "prematch", "history"],
      endpoints: [
        BETBOOM_API_BASE + "/sporthub/match_result_statistics/tournaments/get_by_sport_id",
        BETBOOM_API_BASE + "/sporthub/match_result_statistics/matches/get_by_tournament_id"
      ],
      updatedAt: new Date().toISOString()
    }, 200, cors, "public, max-age=45");
  } catch (error) {
    return jsonResponse({ error: error.message || "BetBoom catalog failed" }, 502, cors);
  }
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

function decodeRouterWire(wire) {
  const memo = new Map();
  const special = new Map([
    [-1, undefined],
    [-2, NaN],
    [-3, Infinity],
    [-4, -Infinity],
    [-5, undefined],
    [-6, -0],
    [-7, null]
  ]);

  function value(ref) {
    if (typeof ref === "number" && Number.isInteger(ref)) {
      if (ref < 0) return special.has(ref) ? special.get(ref) : undefined;
      return decode(ref);
    }

    return ref;
  }

  function decode(index) {
    const node = wire[index];

    if (memo.has(index)) return memo.get(index);

    if (Array.isArray(node)) {
      const arr = [];
      memo.set(index, arr);
      node.forEach((item) => arr.push(value(item)));
      return arr;
    }

    if (node && typeof node === "object") {
      const obj = {};
      memo.set(index, obj);
      Object.keys(node).forEach((key) => {
        const decodedKey = key.startsWith("_") ? value(Number(key.slice(1))) : key;
        obj[decodedKey] = value(node[key]);
      });
      return obj;
    }

    return node;
  }

  return decode(0);
}

function decodeStatsHubRouterData(html) {
  const match = String(html || "").match(/streamController\.enqueue\(("(?:\\.|[^"\\])*")\)/);
  if (!match) return null;

  try {
    const payload = JSON.parse(match[1]);
    return decodeRouterWire(JSON.parse(payload));
  } catch (e) {
    return null;
  }
}

function overviewRoute(root) {
  return root && root.loaderData && root.loaderData["routes/_sh.match.$matchId/index/_overview"];
}

function rootRoute(root) {
  return root && root.loaderData && root.loaderData.root;
}

function matchRootRoute(root) {
  return root && root.loaderData && root.loaderData["routes/_sh.match.$matchId/_matchRoot"];
}

function firstFeedDoc(payload) {
  return payload && Array.isArray(payload.doc) ? payload.doc[0] : null;
}

function firstFeedData(payload) {
  const doc = firstFeedDoc(payload);
  if (!doc || !doc.data || doc.event === "exception" || doc.data._doc === "exception") return null;
  return doc.data;
}

function feedError(payload) {
  const doc = firstFeedDoc(payload);
  if (!doc || !doc.data || (doc.event !== "exception" && doc.data._doc !== "exception")) return "";
  return cleanText([doc.data.code, doc.data.message || doc.data.name].filter(Boolean).join(" "));
}

function statshubFeedEndpoint(cctx, feed, args) {
  const base = cleanText(cctx && cctx.fishnetUrl) || "https://sh-fn-cdn001.akamaized.net";
  const client = cleanText(cctx && cctx.fishnetClientAlias) || "bingoboom";
  const lang = cleanText(cctx && cctx.language) || "en";
  const token = cleanText(cctx && cctx.fishnetToken);
  const url = `${base}/${client}/${lang}/Etc:UTC/gismo/${feed}/${args}`;

  return token ? `${url}?T=${token}` : url;
}

async function fetchStatsHubFeed(cctx, feed, args) {
  if (!STATSHUB_PUBLIC_FEEDS.includes(feed)) return null;

  const upstream = await fetch(statshubFeedEndpoint(cctx, feed, args), {
    headers: {
      accept: "application/json",
      referer: STATSHUB_FEED_REFERER,
      "user-agent": STATSHUB_UA
    }
  });
  const text = await upstream.text();
  let data = null;

  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return {
    ok: upstream.ok && !feedError(data),
    status: upstream.status,
    feed,
    args: cleanText(args),
    event: cleanText(firstFeedDoc(data) && firstFeedDoc(data).event),
    maxage: firstFeedDoc(data) && firstFeedDoc(data)._maxage,
    error: feedError(data),
    data: firstFeedData(data),
    raw: data
  };
}

async function fetchStatsHubFeeds(cctx, matchData) {
  const match = matchData && matchData.match;
  const teams = match && match.teams ? match.teams : {};
  const matchId = cleanText(match && match._id);
  const homeUid = cleanText(teams.home && teams.home.uid);
  const awayUid = cleanText(teams.away && teams.away.uid);
  const calls = [];

  if (!matchId) return {};

  [
    ["match_info_statshub", matchId],
    ["stats_match_get", matchId],
    ["match_details", matchId],
    ["match_detailsextended", matchId],
    ["match_timeline", matchId],
    ["match_timelinedelta", matchId],
    ["stats_match_timeline", matchId],
    ["stats_match_stats", matchId],
    ["stats_match_head2head", matchId],
    ["match_playerdetails", matchId],
    ["tennis_competitors", matchId]
  ].forEach((item) => calls.push(item));

  if (homeUid) calls.push(["stats_team_info", homeUid]);
  if (awayUid) calls.push(["stats_team_info", awayUid]);
  if (homeUid) calls.push(["stats_team_lastx", `${homeUid}/10`]);
  if (awayUid) calls.push(["stats_team_lastx", `${awayUid}/10`]);
  if (homeUid && awayUid) {
    calls.push(["stats_team_versus", `${homeUid}/${awayUid}/10`]);
    calls.push(["stats_team_versusrecent", `${homeUid}/${awayUid}/10`]);
  }

  const rows = await Promise.all(calls.map(([feed, args]) => {
    return fetchStatsHubFeed(cctx, feed, args).catch((error) => ({
      ok: false,
      feed,
      args: cleanText(args),
      error: error.message || "feed failed"
    }));
  }));
  const out = {
    rows,
    byFeed: {}
  };

  rows.forEach((row) => {
    if (!row) return;
    if (!out.byFeed[row.feed]) out.byFeed[row.feed] = [];
    out.byFeed[row.feed].push(row);
  });

  return out;
}

function playerDisplayName(team, info) {
  return cleanText(
    (info && info.team && (info.team.surname || info.team.mediumname || info.team.name)) ||
    (team && (team.surname || team.mediumname || team.name))
  );
}

function playerRank(info) {
  return cleanText(info && (info.singlesrank || info.rank || info.ranking));
}

function playerAge(info) {
  const date = cleanText(info && info.dateofbirth);
  if (!date) return "";

  const time = Date.parse(date + "T00:00:00Z");
  if (!Number.isFinite(time)) return "";

  const now = Date.now();
  const age = Math.floor((now - time) / 31557600000);
  return age > 0 && age < 100 ? String(age) : "";
}

function normalizePlayer(side, team, info) {
  const country = (info && (info.countrycode || info.team && info.team.cc)) || (team && (team.countrycode || team.cc)) || {};
  const flagUrl = countryFlagUrl(country);

  return {
    side,
    name: playerDisplayName(team, info),
    fullName: cleanText((info && info.team && (info.team.mediumname || info.team.name)) || (team && (team.mediumname || team.name))),
    country: cleanText(info && info.nationality) || cleanText(country.name),
    countryCode: cleanText(country.a2 || info && info.cc).toUpperCase(),
    rank: playerRank(info),
    seed: cleanText(team && team.seed && team.seed.seeding),
    age: playerAge(info),
    birthDate: cleanText(info && info.dateofbirth),
    height: cleanText(info && info.height),
    weight: cleanText(info && info.weight),
    handedness: cleanText(info && info.plays),
    coach: cleanText(info && info.coachname),
    favoriteSurface: cleanText(info && info.favouritesurface),
    turnedPro: cleanText(info && info.turnedpro),
    teamUid: cleanText(team && team.uid),
    teamId: cleanText(team && team._id),
    flagUrl
  };
}

function statPair(label, home, away, suffix) {
  const left = cleanText(home);
  const right = cleanText(away);
  if (!label || (!left && !right)) return null;

  return {
    label,
    home: left ? left + (suffix || "") : "-",
    away: right ? right + (suffix || "") : "-"
  };
}

function groundStat(teamInfo, groundName) {
  const rows = Array.isArray(teamInfo && teamInfo.groundstats) ? teamInfo.groundstats : [];
  const wanted = cleanText(groundName).toLowerCase();

  return rows.find((row) => cleanText(row.ground).toLowerCase() === wanted) ||
    rows.find((row) => cleanText(row.ground).toLowerCase() === "all surfaces") ||
    null;
}

function normalizeStats(homeInfo, awayInfo, matchData) {
  const surface = cleanText(matchData && matchData.tournament && matchData.tournament.ground && matchData.tournament.ground.name);
  const homeGround = groundStat(homeInfo, surface);
  const awayGround = groundStat(awayInfo, surface);
  const homeAll = groundStat(homeInfo, "All surfaces");
  const awayAll = groundStat(awayInfo, "All surfaces");
  const rows = [
    statPair(`${surface || "Surface"} win rate`, homeGround && homeGround.matcheswon_percent, awayGround && awayGround.matcheswon_percent, "%"),
    statPair(`${surface || "Surface"} wins`, homeGround && homeGround.matcheswon, awayGround && awayGround.matcheswon, ""),
    statPair("All-surface win rate", homeAll && homeAll.matcheswon_percent, awayAll && awayAll.matcheswon_percent, "%"),
    statPair("Singles rank", homeInfo && homeInfo.singlesrank, awayInfo && awayInfo.singlesrank, ""),
    statPair("Highest ranking", homeInfo && homeInfo.highestranking && homeInfo.highestranking.singles && homeInfo.highestranking.singles.ranking, awayInfo && awayInfo.highestranking && awayInfo.highestranking.singles && awayInfo.highestranking.singles.ranking, ""),
    statPair("Age started", homeInfo && homeInfo.agestarted, awayInfo && awayInfo.agestarted, ""),
    statPair("Turned pro", homeInfo && homeInfo.turnedpro, awayInfo && awayInfo.turnedpro, "")
  ];

  return rows.filter(Boolean);
}

function normalizeTimeline(feed) {
  const data = feed && feed.data;
  const events = Array.isArray(data && data.events) ? data.events : [];

  return events.slice(-8).reverse().map((event) => ({
    type: cleanText(event.type || event.name || event._doctype),
    name: cleanText(event.name || event.type || event._doctype),
    time: cleanText(event.time),
    seconds: cleanText(event.seconds),
    team: cleanText(event.team),
    score: event.setscore || event.score || null,
    pointType: cleanText(event.lastpointtype && event.lastpointtype.type),
    gameStatus: cleanText(event.currentgamestatus && event.currentgamestatus.status)
  }));
}

function normalizeSources(cctx, feeds, statUrl, openUrl) {
  const feedRows = Array.isArray(feeds && feeds.rows) ? feeds.rows : [];

  return {
    apiEndpoints: [
      {
        label: "BetBoom match details",
        method: "POST",
        url: BETBOOM_API_BASE + "/sporthub/tree/get_match_details_info"
      },
      {
        label: "StatsHub page",
        method: "GET",
        url: statUrl
      }
    ].concat(feedRows.map((row) => ({
      label: "StatsHub feed " + row.feed,
      method: "GET",
      feed: row.feed,
      args: row.args,
      ok: row.ok === true,
      event: row.event || "",
      maxage: row.maxage || null,
      error: row.error || "",
      url: statshubFeedEndpoint(cctx, row.feed, row.args).replace(/\?T=.*/, "?T=<public-page-token>")
    }))),
    imageEndpoints: [
      "https://static.sporthub.bet/{hash}/multifeed/states/Statistic.webp",
      "https://static.sporthub.bet/{hash}/multifeed/teams/{uuid}.webp",
      "https://img-cdn001.akamaized.net/ls/crest/4x3/{country}.svg",
      "https://img-cdn001.akamaized.net/ls/crest/medium/int.png",
      "https://img-cdn001.akamaized.net/ls/teams/{size}/{teamUid}.png",
      "https://sh-cdn001.akamaized.net/assets/{assetName}"
    ],
    statUrl,
    openUrl
  };
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

async function normalizeStatsHubPayload(html, matchId, statUrl, openUrl, details, requestUrl) {
  const root = decodeStatsHubRouterData(html);
  const route = overviewRoute(root);
  const rootData = rootRoute(root);
  const matchRoot = matchRootRoute(root);
  const matchData = route && route.matchInfo && route.matchInfo.data;
  const cctx = rootData && rootData.cctx;

  if (!matchData || !matchData.match) {
    const fallback = parseStatsHubHtml(html, matchId, statUrl, openUrl, details);
    fallback.images = await probeUsableImages((fallback.images || []).concat(extraImageCandidates(requestUrl)));
    return fallback;
  }

  const feeds = await fetchStatsHubFeeds(cctx || {}, matchData);
  const feedList = feeds.byFeed || {};
  const homeInfo = firstFeedData((feedList.stats_team_info || [])[0] && (feedList.stats_team_info || [])[0].raw) ||
    ((feedList.stats_team_info || [])[0] && (feedList.stats_team_info || [])[0].data);
  const awayInfo = firstFeedData((feedList.stats_team_info || [])[1] && (feedList.stats_team_info || [])[1].raw) ||
    ((feedList.stats_team_info || [])[1] && (feedList.stats_team_info || [])[1].data);
  const match = matchData.match;
  const teams = match.teams || {};
  const home = normalizePlayer("home", teams.home, homeInfo);
  const away = normalizePlayer("away", teams.away, awayInfo);
  const tournament = matchData.tournament || {};
  const tennisInfo = tournament.tennisinfo || {};
  const stadium = matchData.stadium || {};
  const coverage = match.coverage || {};
  const title = [home.name, away.name].filter(Boolean).join(" vs ");
  const startTime = match._dt || match.time || {};
  const status = cleanText(match.status && (match.status.name || match.status.shortName)) || "StatsHub";
  const homeImageCandidates = playerImageCandidates(requestUrl, "home", home);
  const awayImageCandidates = playerImageCandidates(requestUrl, "away", away);
  const extraImages = extraImageCandidates(requestUrl);
  const facts = [
    { label: "Start", value: cleanText([startTime.date, startTime.time, startTime.tz].filter(Boolean).join(" ")) },
    { label: "Status", value: status },
    { label: "Tournament", value: cleanText((matchData.uniquetournament && matchData.uniquetournament.name) || tournament.name) },
    { label: "Round", value: cleanText(match.roundname && (match.roundname.shortname || match.roundname.name)) },
    { label: "Surface", value: cleanText(tournament.ground && tournament.ground.name) },
    { label: "Venue", value: cleanText(stadium.name) },
    { label: "City", value: cleanText([stadium.city, stadium.country].filter(Boolean).join(", ")) },
    { label: "Category", value: cleanText(matchData.realcategory && matchData.realcategory.name) },
    { label: "Level", value: cleanText(tournament.tournamentlevelname) },
    { label: "Best of", value: cleanText(match.bestofsets || match.bestof || tennisInfo.sets) },
    { label: "Prize", value: cleanText(tennisInfo.prize && [tennisInfo.prize.amount, tennisInfo.prize.currency].filter(Boolean).join(" ")) },
    { label: "Stats coverage", value: coverage.hasstats ? "Available" : "" },
    { label: "Live score", value: coverage.inlivescore ? "Available" : "" },
    { label: "Live odds", value: coverage.liveodds ? "Available" : "" },
    { label: "Media", value: coverage.mediacoverage ? "Available" : "" },
    { label: "LMT support", value: cleanText(coverage.lmtsupport) }
  ].filter((item) => item.value);
  const imageCandidates = homeImageCandidates
    .concat(awayImageCandidates)
    .concat(extraImages)
    .concat(detailsImages(details))
    .concat(extractHtmlImages(html))
    .concat([
      { label: home.country || home.name, url: home.flagUrl },
      { label: away.country || away.name, url: away.flagUrl },
      { label: "Tournament country", url: countryFlagUrl(tennisInfo.cc || stadium.cc) },
      { label: "StatsHub shadow", url: statshubAssetUrl("/assets/shadow-BUyighge.png") },
      { label: "StatsHub highlight", url: statshubAssetUrl("/assets/highlight-DIJTM9SR.png") },
      { label: "StatsHub tennis", url: statshubAssetUrl("/assets/tennis-BJZRFddm.jpg") },
      { label: "SportHub team image", url: BETBOOM_STATIC_TEAM_SAMPLE }
    ])
    .concat(teamLogoCandidates(teams.home))
    .concat(teamLogoCandidates(teams.away));
  const images = await probeUsableImages(imageCandidates);
  const stats = normalizeStats(homeInfo, awayInfo, matchData);
  const timeline = normalizeTimeline((feedList.match_timeline || [])[0] || (feedList.match_timelinedelta || [])[0]);

  home.imageUrl = firstImageByCandidate(images, homeImageCandidates) || (images.find((image) => image.label === home.name) || {}).url || "";
  away.imageUrl = firstImageByCandidate(images, awayImageCandidates) || (images.find((image) => image.label === away.name) || {}).url || "";

  return {
    match: {
      matchId,
      statshubMatchId: cleanText(match._id),
      title: title || cleanText(matchData.uniquetournament && matchData.uniquetournament.name) || "BetBoom match",
      tournament: cleanText((matchData.uniquetournament && matchData.uniquetournament.name) || tournament.name),
      tournamentFullName: cleanText(tournament.name),
      category: cleanText(matchData.realcategory && matchData.realcategory.name),
      sport: cleanText(matchData.sport && matchData.sport.name),
      round: cleanText(match.roundname && (match.roundname.shortname || match.roundname.name)),
      surface: cleanText(tournament.ground && tournament.ground.name),
      venue: cleanText(stadium.name),
      city: cleanText(stadium.city),
      country: cleanText(stadium.country || tennisInfo.country),
      startTimeText: cleanText([startTime.date, startTime.time, startTime.tz].filter(Boolean).join(" ")),
      startTimestamp: startTime.uts || null,
      status,
      result: match.result || {},
      coverage,
      statUrl,
      openUrl
    },
    players: [home, away].filter((player) => player.name),
    stats,
    facts,
    timeline,
    images,
    feeds: (feeds.rows || []).map((row) => ({
      feed: row.feed,
      args: row.args,
      ok: row.ok === true,
      event: row.event || "",
      maxage: row.maxage || null,
      error: row.error || ""
    })),
    sources: normalizeSources(cctx || {}, feeds, statUrl, openUrl),
    ids: {
      betboomMatchId: matchId,
      statshubPathMatchId: "m" + matchId,
      statshubMatchId: cleanText(match._id),
      homeUid: cleanText(teams.home && teams.home.uid),
      awayUid: cleanText(teams.away && teams.away.uid),
      tournamentId: cleanText(match._tid),
      uniqueTournamentId: cleanText(match._utid),
      seasonId: cleanText(match._seasonid),
      sportId: cleanText(match._sid),
      realCategoryId: cleanText(match._rcid || (matchRoot && matchRoot.rcid))
    },
    details
  };
}

async function fetchStatsHubHtml(statUrl) {
  const upstream = await fetch(statUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en,en-US;q=0.9,ru;q=0.5",
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
  const lang = requestUrl.searchParams.get("lang") || "en";
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
  const lang = requestUrl.searchParams.get("lang") || "en";
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
      normalized = await normalizeStatsHubPayload(html, matchId, statUrl, openUrl, details, requestUrl);
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

    if (requestUrl.pathname === "/betboom/catalog") {
      return handleBetboomCatalog(requestUrl, cors);
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

    if (path === "/betboom/catalog") {
      return handleBetboomCatalog(requestUrl, cors);
    }

    if (path === "/betboom/statshub") {
      return handleBetboomStatsHub(requestUrl, cors);
    }

    return handleLynonProxy(request, requestUrl, path, cors);
  }
};
