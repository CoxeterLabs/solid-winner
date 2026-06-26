/**
 * Version: 1.0.0
 *
 * Single-file production injector for:
 * 1) A responsive YouTube videos section.
 * 2) A FIFA World Cup 2026 outrights section.
 *
 * Default outrights provider: Polymarket public market-data API, keyless.
 * Optional bookmaker provider: The Odds API, free tier with an API key.
 *
 * Drop this file into the site's custom JS slot. No external JS/CSS dependencies.
 */
(function winraiCustomSections(window, document) {
  'use strict';

  var DEFAULT_CONFIG = {
    debug: false,
    enabled: true,

    // Keep injection scoped to the home page. Adjust if this file is loaded only on one page.
    allowedPathPattern: '^/(?:[a-z]{2}/)?home(?:[/?#]|$)',

    selectors: {
      pageContent: 'main[data-mj="page-content"], main',
      insertAfter: '[data-mj="widget-banner-container"]'
    },

    videos: {
      sectionId: 'wrx-youtube-section',
      title: 'FIFA World Cup 2026 Videos',
      eyebrow: 'Featured videos',
      subtitle: 'Watch trailers, draw coverage and recent highlights.',
      maxItems: 4,
      items: [
        {
          title: 'FIFA World Cup 2026™ | Official Trailer',
          videoId: '68Ov7NZNzfc'
        },
        {
          title: 'Final Draw | FIFA World Cup 2026™',
          videoId: '9HX_tQBA-Iw'
        },
        {
          title: 'Highlights | France 3-0 Iraq | FIFA World Cup 2026™',
          videoId: 'XejscwNpvLU'
        },
        {
          title: 'Japan vs Sweden | Match Highlights | FIFA World Cup 2026™',
          videoId: 'o-3F-YCjp8U'
        }
      ]
    },

    outrights: {
      sectionId: 'wrx-worldcup-outrights-section',
      title: 'FIFA World Cup 2026 Outrights',
      eyebrow: 'Live market',
      subtitle: 'Prediction-market implied probabilities for the tournament winner.',
      maxItems: 10,
      cacheTtlMs: 5 * 60 * 1000,
      refreshIntervalMs: 5 * 60 * 1000,
      requestTimeoutMs: 8000,

      // Use 'polymarket' for a keyless client-side widget.
      // Use 'theOddsApi' for bookmaker odds after adding an API key below.
      provider: 'polymarket',

      polymarket: {
        eventSlug: 'world-cup-winner',
        gammaBaseUrl: 'https://gamma-api.polymarket.com',
        sourceUrl: 'https://polymarket.com/event/world-cup-winner',
        sourceName: 'Polymarket'
      },

      theOddsApi: {
        apiKey: window.WINRAI_ODDS_API_KEY || '',
        baseUrl: 'https://api.the-odds-api.com',
        sportKey: 'soccer_fifa_world_cup_winner',
        regions: 'us,uk,eu',
        markets: 'outrights',
        oddsFormat: 'decimal',
        sourceUrl: 'https://the-odds-api.com/',
        sourceName: 'The Odds API'
      }
    }
  };

  var CONFIG = deepMerge(DEFAULT_CONFIG, window.WINRAI_CUSTOM_SECTIONS_CONFIG || {});
  var allowedPathRegex = safeRegExp(CONFIG.allowedPathPattern);
  var state = {
    observer: null,
    renderTimer: null,
    refreshTimer: null,
    inFlightController: null,
    historyPatched: false
  };

  function init() {
    if (!CONFIG.enabled) return;
    injectStylesOnce();
    patchHistoryEvents();
    scheduleRender();

    if (document.body) {
      state.observer = new MutationObserver(scheduleRender);
      state.observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    }

    window.addEventListener('popstate', scheduleRender);
    window.addEventListener('wrx:route-change', scheduleRender);
  }

  function scheduleRender() {
    if (state.renderTimer) window.clearTimeout(state.renderTimer);
    state.renderTimer = window.setTimeout(render, 80);
  }

  function render() {
    state.renderTimer = null;

    if (!shouldRenderOnCurrentPage()) {
      removeInjectedSections();
      stopAutoRefresh();
      return;
    }

    var pageContent = qs(CONFIG.selectors.pageContent);
    if (!pageContent) return;

    var videoSection = ensureVideoSection(pageContent);
    var outrightsSection = ensureOutrightsSection(pageContent, videoSection);

    loadOutrights(outrightsSection, { force: false });
    startAutoRefresh();
  }

  function shouldRenderOnCurrentPage() {
    var path = window.location.pathname + window.location.search + window.location.hash;
    return allowedPathRegex ? allowedPathRegex.test(path) : true;
  }

  function ensureVideoSection(pageContent) {
    var existing = document.getElementById(CONFIG.videos.sectionId);
    if (existing) return existing;

    var section = createSectionShell({
      id: CONFIG.videos.sectionId,
      className: 'wrx-section wrx-video-section',
      eyebrow: CONFIG.videos.eyebrow,
      title: CONFIG.videos.title,
      subtitle: CONFIG.videos.subtitle
    });

    var grid = el('div', 'wrx-video-grid');
    CONFIG.videos.items.slice(0, CONFIG.videos.maxItems).forEach(function addVideo(video) {
      grid.appendChild(createVideoCard(video));
    });

    section.appendChild(grid);
    insertAfterAnchor(pageContent, section);
    return section;
  }

  function createVideoCard(video) {
    var article = el('article', 'wrx-video-card');
    var frame = el('div', 'wrx-video-frame');
    var iframe = el('iframe');

    iframe.src = buildYouTubeEmbedUrl(video.videoId);
    iframe.title = video.title || 'YouTube video';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;

    var title = el('div', 'wrx-video-title');
    title.textContent = video.title || 'Video';

    frame.appendChild(iframe);
    article.appendChild(frame);
    article.appendChild(title);
    return article;
  }

  function buildYouTubeEmbedUrl(videoId) {
    return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?rel=0&modestbranding=1&playsinline=1';
  }

  function ensureOutrightsSection(pageContent, afterElement) {
    var existing = document.getElementById(CONFIG.outrights.sectionId);
    if (existing) return existing;

    var section = createSectionShell({
      id: CONFIG.outrights.sectionId,
      className: 'wrx-section wrx-outrights-section',
      eyebrow: CONFIG.outrights.eyebrow,
      title: CONFIG.outrights.title,
      subtitle: CONFIG.outrights.subtitle
    });

    var actions = el('div', 'wrx-header-actions');
    var source = el('a', 'wrx-source-link', {
      href: getOutrightsSourceUrl(),
      target: '_blank',
      rel: 'noopener noreferrer'
    });
    source.textContent = 'Source';

    var refresh = el('button', 'wrx-refresh-button', { type: 'button' });
    refresh.textContent = 'Refresh';
    refresh.addEventListener('click', function handleRefreshClick() {
      loadOutrights(section, { force: true });
    });

    actions.appendChild(source);
    actions.appendChild(refresh);
    section.querySelector('.wrx-section-header').appendChild(actions);

    var body = el('div', 'wrx-outrights-body');
    body.setAttribute('data-wrx-outrights-body', '');
    section.appendChild(body);

    var footnote = el('p', 'wrx-footnote');
    footnote.textContent = '18+. Odds/probabilities are informational only and are not betting advice. Availability may depend on your jurisdiction.';
    section.appendChild(footnote);

    if (afterElement && afterElement.parentNode) {
      insertAfter(afterElement, section);
    } else {
      insertAfterAnchor(pageContent, section);
    }

    renderOutrightsLoading(section);
    return section;
  }

  function createSectionShell(options) {
    var section = el('section', options.className, {
      id: options.id,
      'aria-labelledby': options.id + '-title'
    });

    var header = el('div', 'wrx-section-header');
    var copy = el('div', 'wrx-section-copy');
    var eyebrow = el('div', 'wrx-eyebrow');
    var title = el('h2', 'wrx-section-title', { id: options.id + '-title' });
    var subtitle = el('p', 'wrx-section-subtitle');

    eyebrow.textContent = options.eyebrow || '';
    title.textContent = options.title || '';
    subtitle.textContent = options.subtitle || '';

    copy.appendChild(eyebrow);
    copy.appendChild(title);
    copy.appendChild(subtitle);
    header.appendChild(copy);
    section.appendChild(header);

    return section;
  }

  async function loadOutrights(section, options) {
    var force = !!(options && options.force);
    if (!section || section.getAttribute('data-loading') === 'true') return;
    if (!force && section.getAttribute('data-loaded') === 'true') return;

    section.setAttribute('data-loading', 'true');
    section.removeAttribute('data-error');
    renderOutrightsLoading(section);

    if (state.inFlightController) state.inFlightController.abort();
    state.inFlightController = new AbortController();

    try {
      var data = await getOutrightsData({ force: force, signal: state.inFlightController.signal });
      renderOutrightsSuccess(section, data);
      section.setAttribute('data-loaded', 'true');
    } catch (error) {
      log('warn', 'Outrights failed', error);
      section.setAttribute('data-error', 'true');
      renderOutrightsError(section, error);
    } finally {
      section.setAttribute('data-loading', 'false');
      state.inFlightController = null;
    }
  }

  async function getOutrightsData(options) {
    var provider = CONFIG.outrights.provider;
    var cacheKey = 'wrx:worldcup-outrights:' + provider + ':v1';
    var freshCache = !options.force ? readCache(cacheKey, CONFIG.outrights.cacheTtlMs) : null;
    if (freshCache) return Object.assign({}, freshCache, { fromCache: true });

    try {
      var data;
      if (provider === 'theOddsApi') {
        data = await fetchTheOddsApiOutrights(options.signal);
      } else {
        data = await fetchPolymarketOutrights(options.signal);
      }

      writeCache(cacheKey, data);
      return data;
    } catch (error) {
      var staleCache = readCache(cacheKey, Infinity);
      if (staleCache && staleCache.items && staleCache.items.length) {
        return Object.assign({}, staleCache, {
          isStale: true,
          warning: 'Showing cached data because the latest request failed.'
        });
      }
      throw error;
    }
  }

  async function fetchPolymarketOutrights(signal) {
    var cfg = CONFIG.outrights.polymarket;
    var endpoint = cfg.gammaBaseUrl.replace(/\/$/, '') + '/events/slug/' + encodeURIComponent(cfg.eventSlug);
    var event = await fetchJson(endpoint, signal);
    var items = normalizePolymarketEvent(event);

    if (!items.length) {
      throw new Error('No active World Cup winner markets were found.');
    }

    return {
      provider: 'polymarket',
      sourceName: cfg.sourceName,
      sourceUrl: cfg.sourceUrl,
      title: event.title || 'World Cup Winner',
      subtitle: 'Prediction-market implied probability',
      updatedAt: new Date().toISOString(),
      items: items.slice(0, CONFIG.outrights.maxItems)
    };
  }

  function normalizePolymarketEvent(event) {
    var markets = Array.isArray(event && event.markets) ? event.markets : [];
    var items = [];

    markets.forEach(function normalizeMarket(market) {
      if (!market || market.closed || market.archived) return;

      var outcomes = parseArrayField(market.outcomes);
      var prices = parseArrayField(market.outcomePrices);
      var hasBinaryYesNo = outcomes.some(isYesOutcome) && outcomes.some(isNoOutcome);

      if (hasBinaryYesNo) {
        var yesIndex = outcomes.findIndex(isYesOutcome);
        var probability = normalizeProbability(prices[yesIndex] != null ? prices[yesIndex] : market.lastTradePrice);
        var teamName = getTeamNameFromBinaryMarket(market);

        if (teamName && probability != null) {
          items.push(buildProbabilityItem({
            name: teamName,
            probability: probability,
            volume: firstNumber(market.volumeNum, market.volume, market.volume24hr),
            liquidity: firstNumber(market.liquidityNum, market.liquidity),
            sourceDetail: 'Yes price',
            url: CONFIG.outrights.polymarket.sourceUrl
          }));
        }
        return;
      }

      if (outcomes.length && prices.length && outcomes.length === prices.length) {
        outcomes.forEach(function normalizeOutcome(outcomeName, index) {
          var probability = normalizeProbability(prices[index]);
          var normalizedName = normalizeTeamName(outcomeName);
          if (normalizedName && probability != null) {
            items.push(buildProbabilityItem({
              name: normalizedName,
              probability: probability,
              volume: firstNumber(market.volumeNum, market.volume, market.volume24hr),
              liquidity: firstNumber(market.liquidityNum, market.liquidity),
              sourceDetail: 'Outcome price',
              url: CONFIG.outrights.polymarket.sourceUrl
            }));
          }
        });
      }
    });

    return dedupeAndSortItems(items);
  }

  async function fetchTheOddsApiOutrights(signal) {
    var cfg = CONFIG.outrights.theOddsApi;
    if (!cfg.apiKey) {
      throw new Error('The Odds API requires an API key. Use provider "polymarket" for keyless mode or set CONFIG.outrights.theOddsApi.apiKey.');
    }

    var params = new URLSearchParams({
      apiKey: cfg.apiKey,
      regions: cfg.regions,
      markets: cfg.markets,
      oddsFormat: cfg.oddsFormat
    });
    var endpoint = cfg.baseUrl.replace(/\/$/, '') + '/v4/sports/' + encodeURIComponent(cfg.sportKey) + '/odds/?' + params.toString();
    var payload = await fetchJson(endpoint, signal);
    var items = normalizeTheOddsApiPayload(payload);

    if (!items.length) {
      throw new Error('No bookmaker outrights were returned by The Odds API.');
    }

    return {
      provider: 'theOddsApi',
      sourceName: cfg.sourceName,
      sourceUrl: cfg.sourceUrl,
      title: 'FIFA World Cup 2026 Winner',
      subtitle: 'Best decimal odds across returned bookmakers',
      updatedAt: new Date().toISOString(),
      items: items.slice(0, CONFIG.outrights.maxItems)
    };
  }

  function normalizeTheOddsApiPayload(payload) {
    var events = Array.isArray(payload) ? payload : [payload];
    var byTeam = new Map();

    events.forEach(function inspectEvent(event) {
      var bookmakers = Array.isArray(event && event.bookmakers) ? event.bookmakers : [];
      bookmakers.forEach(function inspectBook(bookmaker) {
        var markets = Array.isArray(bookmaker.markets) ? bookmaker.markets : [];
        markets.forEach(function inspectMarket(market) {
          if (!market || market.key !== 'outrights') return;
          var outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
          outcomes.forEach(function inspectOutcome(outcome) {
            var teamName = normalizeTeamName(outcome && outcome.name);
            var decimalOdds = toNumber(outcome && outcome.price);
            if (!teamName || !decimalOdds || decimalOdds <= 1) return;

            var current = byTeam.get(teamName);
            if (!current || decimalOdds > current.decimalOdds) {
              byTeam.set(teamName, buildProbabilityItem({
                name: teamName,
                decimalOdds: decimalOdds,
                probability: 1 / decimalOdds,
                sourceDetail: bookmaker.title || bookmaker.key || 'Bookmaker',
                url: CONFIG.outrights.theOddsApi.sourceUrl
              }));
            }
          });
        });
      });
    });

    return dedupeAndSortItems(Array.from(byTeam.values()));
  }

  function buildProbabilityItem(input) {
    var probability = clamp(input.probability, 0, 1);
    return {
      name: input.name,
      probability: probability,
      decimalOdds: input.decimalOdds || probabilityToDecimalOdds(probability),
      volume: input.volume,
      liquidity: input.liquidity,
      sourceDetail: input.sourceDetail || '',
      url: input.url || '#'
    };
  }

  function renderOutrightsLoading(section) {
    var body = getOutrightsBody(section);
    clear(body);

    var skeleton = el('div', 'wrx-outrights-grid wrx-skeleton-grid');
    for (var i = 0; i < Math.min(4, CONFIG.outrights.maxItems); i += 1) {
      skeleton.appendChild(el('div', 'wrx-skeleton-card'));
    }
    body.appendChild(skeleton);
  }

  function renderOutrightsSuccess(section, data) {
    var body = getOutrightsBody(section);
    clear(body);

    updateOutrightsSubtitle(section, data);

    if (data.warning) {
      var warning = el('div', 'wrx-warning');
      warning.textContent = data.warning;
      body.appendChild(warning);
    }

    var grid = el('div', 'wrx-outrights-grid');
    data.items.slice(0, CONFIG.outrights.maxItems).forEach(function addItem(item, index) {
      grid.appendChild(createOutrightCard(item, index + 1));
    });
    body.appendChild(grid);
  }

  function renderOutrightsError(section, error) {
    var body = getOutrightsBody(section);
    clear(body);

    var card = el('div', 'wrx-error-card');
    var title = el('strong');
    var message = el('span');

    title.textContent = 'Outrights unavailable';
    message.textContent = error && error.message ? error.message : 'The latest data could not be loaded.';

    card.appendChild(title);
    card.appendChild(message);
    body.appendChild(card);
  }

  function createOutrightCard(item, rank) {
    var card = el('a', 'wrx-outright-card', {
      href: item.url || getOutrightsSourceUrl(),
      target: '_blank',
      rel: 'noopener noreferrer'
    });

    var top = el('div', 'wrx-outright-topline');
    var badge = el('span', 'wrx-rank-badge');
    var team = el('strong', 'wrx-team-name');
    badge.textContent = '#' + rank;
    team.textContent = item.name;
    top.appendChild(badge);
    top.appendChild(team);

    var probability = el('div', 'wrx-probability');
    probability.textContent = formatPercent(item.probability);

    var label = el('div', 'wrx-card-label');
    label.textContent = CONFIG.outrights.provider === 'theOddsApi' ? 'Implied probability' : 'Market probability';

    var bar = el('div', 'wrx-probability-bar');
    var fill = el('span', 'wrx-probability-fill');
    fill.style.width = Math.max(2, Math.round(item.probability * 100)) + '%';
    bar.appendChild(fill);

    var meta = el('div', 'wrx-outright-meta');
    var odds = el('span');
    odds.textContent = 'Decimal ' + formatDecimal(item.decimalOdds);
    meta.appendChild(odds);

    if (item.volume != null) {
      var volume = el('span');
      volume.textContent = 'Vol ' + formatCompactNumber(item.volume);
      meta.appendChild(volume);
    } else if (item.sourceDetail) {
      var detail = el('span');
      detail.textContent = item.sourceDetail;
      meta.appendChild(detail);
    }

    card.appendChild(top);
    card.appendChild(probability);
    card.appendChild(label);
    card.appendChild(bar);
    card.appendChild(meta);
    return card;
  }

  function updateOutrightsSubtitle(section, data) {
    var subtitle = section.querySelector('.wrx-section-subtitle');
    if (!subtitle) return;

    var freshness = data.updatedAt ? 'Updated ' + formatDateTime(data.updatedAt) : 'Updated just now';
    var cacheNote = data.fromCache ? ' • cached' : '';
    var staleNote = data.isStale ? ' • stale cache' : '';
    subtitle.textContent = (data.subtitle || CONFIG.outrights.subtitle) + ' • ' + data.sourceName + ' • ' + freshness + cacheNote + staleNote;
  }

  function getOutrightsBody(section) {
    return section.querySelector('[data-wrx-outrights-body]');
  }

  function getOutrightsSourceUrl() {
    if (CONFIG.outrights.provider === 'theOddsApi') return CONFIG.outrights.theOddsApi.sourceUrl;
    return CONFIG.outrights.polymarket.sourceUrl;
  }

  function startAutoRefresh() {
    if (state.refreshTimer || !CONFIG.outrights.refreshIntervalMs) return;
    state.refreshTimer = window.setInterval(function refreshVisibleOutrights() {
      var section = document.getElementById(CONFIG.outrights.sectionId);
      if (section && shouldRenderOnCurrentPage()) loadOutrights(section, { force: true });
    }, CONFIG.outrights.refreshIntervalMs);
  }

  function stopAutoRefresh() {
    if (!state.refreshTimer) return;
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }

  function removeInjectedSections() {
    [CONFIG.videos.sectionId, CONFIG.outrights.sectionId].forEach(function removeById(id) {
      var node = document.getElementById(id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
  }

  function insertAfterAnchor(pageContent, node) {
    var anchor = qs(CONFIG.selectors.insertAfter, pageContent) || pageContent.firstElementChild;
    if (anchor && anchor.parentNode) {
      insertAfter(anchor, node);
    } else {
      pageContent.insertBefore(node, pageContent.firstChild);
    }
  }

  function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  async function fetchJson(url, signal) {
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function abortRequest() {
      controller.abort();
    }, CONFIG.outrights.requestTimeoutMs);

    if (signal) {
      if (signal.aborted) controller.abort();
      signal.addEventListener('abort', function onAbort() {
        controller.abort();
      }, { once: true });
    }

    try {
      var response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Request failed with HTTP ' + response.status);
      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function injectStylesOnce() {
    if (document.getElementById('wrx-custom-sections-style')) return;

    var style = el('style', null, { id: 'wrx-custom-sections-style' });
    style.textContent = [
      '#wrx-youtube-section, #wrx-worldcup-outrights-section { box-sizing: border-box; width: 100%; max-width: 1348px; margin: 24px auto; padding: 0 16px; font-family: inherit; }',
      '#wrx-youtube-section *, #wrx-worldcup-outrights-section * { box-sizing: border-box; }',
      '.wrx-section-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }',
      '.wrx-section-copy { min-width: 0; }',
      '.wrx-eyebrow { margin-bottom: 5px; color: #f5c451; font-size: 12px; font-weight: 800; line-height: 1.2; letter-spacing: .08em; text-transform: uppercase; }',
      '.wrx-section-title { margin: 0; color: #fff; font-size: clamp(20px, 2.1vw, 28px); font-weight: 800; line-height: 1.15; }',
      '.wrx-section-subtitle { margin: 6px 0 0; color: rgba(255,255,255,.68); font-size: 14px; line-height: 1.45; }',
      '.wrx-header-actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }',
      '.wrx-source-link, .wrx-refresh-button { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #fff; font-size: 13px; font-weight: 700; line-height: 1; text-decoration: none; cursor: pointer; transition: transform .18s ease, background .18s ease, border-color .18s ease; }',
      '.wrx-source-link:hover, .wrx-refresh-button:hover, .wrx-outright-card:hover { transform: translateY(-1px); background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.22); }',
      '.wrx-refresh-button:disabled { cursor: default; opacity: .6; transform: none; }',
      '.wrx-video-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }',
      '.wrx-video-card { overflow: hidden; border: 1px solid rgba(255,255,255,.10); border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035)); box-shadow: 0 16px 36px rgba(0,0,0,.24); }',
      '.wrx-video-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #05070d; }',
      '.wrx-video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }',
      '.wrx-video-title { min-height: 48px; padding: 12px 14px 14px; color: #fff; font-size: 14px; font-weight: 700; line-height: 1.35; }',
      '.wrx-outrights-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }',
      '.wrx-outright-card { min-height: 154px; padding: 14px; border: 1px solid rgba(255,255,255,.10); border-radius: 18px; background: linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.035)); color: #fff; text-decoration: none; box-shadow: 0 16px 36px rgba(0,0,0,.20); transition: transform .18s ease, background .18s ease, border-color .18s ease; }',
      '.wrx-outright-topline { display: flex; align-items: center; gap: 8px; min-width: 0; }',
      '.wrx-rank-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 24px; padding: 0 8px; border-radius: 999px; background: rgba(245,196,81,.16); color: #f5c451; font-size: 12px; font-weight: 900; }',
      '.wrx-team-name { overflow: hidden; color: #fff; font-size: 15px; font-weight: 800; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }',
      '.wrx-probability { margin-top: 18px; color: #fff; font-size: 28px; font-weight: 900; letter-spacing: -.03em; line-height: 1; }',
      '.wrx-card-label { margin-top: 5px; color: rgba(255,255,255,.60); font-size: 12px; font-weight: 700; }',
      '.wrx-probability-bar { position: relative; height: 7px; margin-top: 13px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.12); }',
      '.wrx-probability-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f5c451, #ffe7a3); }',
      '.wrx-outright-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; color: rgba(255,255,255,.66); font-size: 12px; font-weight: 700; }',
      '.wrx-outright-meta span { display: inline-flex; }',
      '.wrx-footnote { margin: 12px 0 0; color: rgba(255,255,255,.48); font-size: 12px; line-height: 1.45; }',
      '.wrx-warning, .wrx-error-card { margin-bottom: 12px; border: 1px solid rgba(245,196,81,.22); border-radius: 14px; background: rgba(245,196,81,.08); color: rgba(255,255,255,.82); font-size: 13px; line-height: 1.45; }',
      '.wrx-warning { padding: 10px 12px; }',
      '.wrx-error-card { display: grid; gap: 4px; padding: 14px; }',
      '.wrx-error-card strong { color: #fff; }',
      '.wrx-skeleton-card { min-height: 154px; border-radius: 18px; background: linear-gradient(90deg, rgba(255,255,255,.055), rgba(255,255,255,.11), rgba(255,255,255,.055)); background-size: 220% 100%; animation: wrxSkeleton 1.35s infinite linear; }',
      '@keyframes wrxSkeleton { 0% { background-position: 120% 0; } 100% { background-position: -120% 0; } }',
      '@media (max-width: 1200px) { .wrx-video-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .wrx-outrights-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }',
      '@media (max-width: 760px) { #wrx-youtube-section, #wrx-worldcup-outrights-section { margin: 20px auto; padding: 0 12px; } .wrx-section-header { align-items: flex-start; flex-direction: column; } .wrx-video-grid, .wrx-outrights-grid { grid-template-columns: 1fr; } .wrx-header-actions { width: 100%; } .wrx-source-link, .wrx-refresh-button { flex: 1 1 0; } }'
    ].join('\n');

    (document.head || document.documentElement).appendChild(style);
  }

  function patchHistoryEvents() {
    if (state.historyPatched || !window.history) return;
    ['pushState', 'replaceState'].forEach(function patch(methodName) {
      var original = window.history[methodName];
      if (typeof original !== 'function') return;
      window.history[methodName] = function patchedHistoryMethod() {
        var result = original.apply(this, arguments);
        window.dispatchEvent(new Event('wrx:route-change'));
        return result;
      };
    });
    state.historyPatched = true;
  }

  function deepMerge(target, source) {
    var output = Array.isArray(target) ? target.slice() : Object.assign({}, target);
    if (!source || typeof source !== 'object') return output;

    Object.keys(source).forEach(function mergeKey(key) {
      var sourceValue = source[key];
      var targetValue = output[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    });

    return output;
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tagName, className, attrs) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function setAttr(name) {
        if (attrs[name] == null) return;
        node.setAttribute(name, attrs[name]);
      });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function log(level) {
    if (!CONFIG.debug || !window.console) return;
    var args = Array.prototype.slice.call(arguments, 1);
    (window.console[level] || window.console.log).apply(window.console, ['[wrx-custom-sections]'].concat(args));
  }

  function parseArrayField(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      var parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function isYesOutcome(value) {
    return /^yes$/i.test(String(value || '').trim());
  }

  function isNoOutcome(value) {
    return /^no$/i.test(String(value || '').trim());
  }

  function getTeamNameFromBinaryMarket(market) {
    return normalizeTeamName(
      market.groupItemTitle ||
      market.groupItem ||
      market.outcome ||
      market.question ||
      market.title ||
      market.slug ||
      ''
    );
  }

  function normalizeTeamName(value) {
    var name = String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    name = name
      .replace(/^will\s+/i, '')
      .replace(/\s+(?:win|wins|be\s+the\s+winner\s+of)\s+(?:the\s+)?(?:2026\s+)?(?:fifa\s+)?world\s+cup.*$/i, '')
      .replace(/\s+(?:winner|champion)\??$/i, '')
      .replace(/^2026\s+fifa\s+world\s+cup\s+/i, '')
      .replace(/^world\s+cup\s+/i, '')
      .replace(/\?$/g, '')
      .trim();

    if (!name || /^yes$/i.test(name) || /^no$/i.test(name) || /world cup winner/i.test(name)) return '';
    return titleCaseKnownName(name);
  }

  function titleCaseKnownName(name) {
    var keepUpper = { USA: true, USMNT: true, UAE: true, DR: true, VAR: true };
    return name.split(' ').map(function formatToken(token) {
      var cleaned = token.replace(/[^A-Za-z]/g, '').toUpperCase();
      if (keepUpper[cleaned]) return cleaned;
      if (/^[A-Z]{2,}$/.test(token) && token.length <= 4) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    }).join(' ')
      .replace(/Cote D'Ivoire/i, "Cote d'Ivoire")
      .replace(/Congo Dr/i, 'Congo DR');
  }

  function normalizeProbability(value) {
    var number = toNumber(value);
    if (number == null) return null;
    if (number > 1) number = number / 100;
    return clamp(number, 0, 1);
  }

  function probabilityToDecimalOdds(probability) {
    if (!probability || probability <= 0) return null;
    return 1 / probability;
  }

  function toNumber(value) {
    if (value == null || value === '') return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function firstNumber() {
    for (var i = 0; i < arguments.length; i += 1) {
      var number = toNumber(arguments[i]);
      if (number != null) return number;
    }
    return null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function dedupeAndSortItems(items) {
    var byName = new Map();
    items.forEach(function dedupe(item) {
      var key = item.name.toLowerCase();
      var current = byName.get(key);
      if (!current || item.probability > current.probability) byName.set(key, item);
    });

    return Array.from(byName.values())
      .filter(function validItem(item) { return item.probability != null && item.probability > 0; })
      .sort(function sortDesc(a, b) { return b.probability - a.probability; });
  }

  function readCache(key, ttlMs) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || !cached.savedAt || !cached.data) return null;
      if (Date.now() - cached.savedAt > ttlMs) return null;
      return cached.data;
    } catch (error) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      if (!window.localStorage) return;
      window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: data }));
    } catch (error) {
      // Ignore storage quota/privacy failures.
    }
  }

  function safeRegExp(pattern) {
    try {
      return new RegExp(pattern, 'i');
    } catch (error) {
      log('warn', 'Invalid allowedPathPattern; injection will run everywhere.', error);
      return null;
    }
  }

  function formatPercent(value) {
    return new Intl.NumberFormat(getLocale(), {
      style: 'percent',
      maximumFractionDigits: value >= 0.1 ? 1 : 2
    }).format(value || 0);
  }

  function formatDecimal(value) {
    if (!value) return '—';
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatCompactNumber(value) {
    if (value == null) return '—';
    return new Intl.NumberFormat(getLocale(), {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }

  function formatDateTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'just now';
    return new Intl.DateTimeFormat(getLocale(), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function getLocale() {
    return document.documentElement.lang || window.navigator.language || 'en-US';
  }

  init();
})(window, document);
