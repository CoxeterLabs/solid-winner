/*!
 * Injects YouTube videos + FIFA World Cup 2026 outrights.
 * Single-file safe, no external libraries, no document.write/eval.
 * Version: 1.0.1
 */
(function () {
  'use strict';

  var CFG = {
    id: 'wr-custom-sections',
    debug: false,
    mainSelector: 'main[data-mj="page-content"], main',
    afterSelector: '[data-mj="widget-banner-container"]',
    beforeSelector: '[data-mj="widget-phoenix-sport-header"], [data-mj="widget-game-slider"]',
    videos: [
      { title: 'FIFA World Cup 2026 Official Trailer', channel: 'FIFA', videoId: '68Ov7NZNzfc' },
      { title: 'FIFA World Cup 26 Final Draw', channel: 'FIFA', videoId: '9HX_tQBA-Iw' },
      { title: 'FIFA World Cup 2026 Stadiums', channel: 'Football', videoId: 'XejscwNpvLU' },
      { title: 'Road to FIFA World Cup 2026', channel: 'Football', videoId: 'o-3F-YCjp8U' }
    ],
    outrights: {
      timeoutMs: 5000,
      cacheMs: 600000,
      maxItems: 8,
      fallback: [
        { name: 'Brazil', probability: 0.15 },
        { name: 'France', probability: 0.14 },
        { name: 'England', probability: 0.11 },
        { name: 'Spain', probability: 0.10 },
        { name: 'Argentina', probability: 0.09 },
        { name: 'Germany', probability: 0.07 },
        { name: 'Portugal', probability: 0.06 },
        { name: 'Netherlands', probability: 0.05 }
      ]
    }
  };

  var mounted = false;
  var tries = 0;
  var maxTries = 40;

  function log() {
    if (!CFG.debug || !window.console) return;
    try { console.log.apply(console, ['[WinraiCustom]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function q(sel, root) { return (root || document).querySelector(sel); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || typeof v === 'undefined') return;
      if (k === 'className') n.className = v;
      else if (k === 'text') n.textContent = String(v);
      else if (k === 'style') Object.keys(v).forEach(function (sk) { n.style[sk] = v[sk]; });
      else if (k.indexOf('data-') === 0 || k.indexOf('aria-') === 0) n.setAttribute(k, String(v));
      else n[k] = v;
    });
    (kids || []).forEach(function (kid) {
      if (kid === null || typeof kid === 'undefined') return;
      n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return n;
  }

  function addCss() {
    if (document.getElementById(CFG.id + '-css')) return;
    var css = '' +
      '#' + CFG.id + '{width:100%;box-sizing:border-box}' +
      '.' + CFG.id + '-section{max-width:1348px;margin:24px auto;padding:0 16px;box-sizing:border-box}' +
      '.' + CFG.id + '-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin:0 0 14px}' +
      '.' + CFG.id + '-title{margin:0;color:#fff;font:800 22px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.02em}' +
      '.' + CFG.id + '-sub{margin:4px 0 0;color:rgba(255,255,255,.58);font:500 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-pill{color:rgba(255,255,255,.82);background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.10);border-radius:999px;padding:8px 12px;font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-videos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}' +
      '.' + CFG.id + '-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#171a20 0%,#101217 48%,#090b0f 100%);border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 14px 34px rgba(0,0,0,.24)}' +
      '.' + CFG.id + '-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 20% 0%,rgba(255,184,79,.12),transparent 34%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.055),transparent 32%)}' +
      '.' + CFG.id + '-frame{position:relative;width:100%;aspect-ratio:16/9;background:#05070a}' +
      '.' + CFG.id + '-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
      '.' + CFG.id + '-meta{position:relative;padding:12px 13px 14px}' +
      '.' + CFG.id + '-name{margin:0 0 5px;color:#fff;font:800 14px/1.28 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-channel{color:rgba(255,255,255,.56);font:600 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-odds{display:grid;grid-template-columns:1.05fr .95fr;gap:14px}' +
      '.' + CFG.id + '-hero{min-height:260px;padding:22px;display:flex;flex-direction:column;justify-content:space-between}' +
      '.' + CFG.id + '-big{margin:0;color:#fff;font:900 34px/1.05 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.04em}' +
      '.' + CFG.id + '-small{margin:10px 0 0;max-width:560px;color:rgba(255,255,255,.64);font:600 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-status{position:relative;color:rgba(255,255,255,.54);font:600 12px/1.3 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-teams{display:grid;gap:8px;padding:14px}' +
      '.' + CFG.id + '-teamrow{position:relative;display:grid;grid-template-columns:30px 1fr 64px;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.075);overflow:hidden}' +
      '.' + CFG.id + '-bar{position:absolute;left:0;bottom:0;height:2px;background:linear-gradient(90deg,#ffc36a,rgba(255,195,106,.15))}' +
      '.' + CFG.id + '-rank{position:relative;color:rgba(255,255,255,.74);font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.' + CFG.id + '-team{position:relative;color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.' + CFG.id + '-prob{position:relative;text-align:right;color:#ffd08a;font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '@media(max-width:1100px){.' + CFG.id + '-videos{grid-template-columns:repeat(2,minmax(0,1fr))}.' + CFG.id + '-odds{grid-template-columns:1fr}}' +
      '@media(max-width:640px){.' + CFG.id + '-section{margin:18px auto;padding:0 12px}.' + CFG.id + '-head{align-items:flex-start;flex-direction:column;gap:10px}.' + CFG.id + '-videos{grid-template-columns:1fr}.' + CFG.id + '-big{font-size:28px}.' + CFG.id + '-hero{min-height:220px;padding:18px}}';
    var s = el('style', { id: CFG.id + '-css' });
    s.textContent = css;
    document.head.appendChild(s);
  }

  function header(title, sub, pill) {
    return el('div', { className: CFG.id + '-head' }, [
      el('div', {}, [el('h2', { className: CFG.id + '-title', text: title }), el('p', { className: CFG.id + '-sub', text: sub })]),
      pill ? el('div', { className: CFG.id + '-pill', text: pill }) : null
    ]);
  }

  function makeVideos() {
    var sec = el('section', { id: CFG.id + '-youtube', className: CFG.id + '-section', 'data-winrai-section': 'youtube' });
    sec.appendChild(header('World Cup 2026 Videos', 'Official trailers, draw updates and football stories', 'Video'));
    var grid = el('div', { className: CFG.id + '-videos' });
    CFG.videos.forEach(function (v) {
      var iframe = el('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.videoId) + '?rel=0&modestbranding=1&playsinline=1', title: v.title, loading: 'lazy', allowFullscreen: true });
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      grid.appendChild(el('article', { className: CFG.id + '-card' }, [
        el('div', { className: CFG.id + '-frame' }, [iframe]),
        el('div', { className: CFG.id + '-meta' }, [el('p', { className: CFG.id + '-name', text: v.title }), el('div', { className: CFG.id + '-channel', text: v.channel || 'YouTube' })])
      ]));
    });
    sec.appendChild(grid);
    return sec;
  }

  function percent(p) { return Math.round(Math.max(0, Math.min(1, Number(p) || 0)) * 1000) / 10; }

  function normal(rows) {
    return (rows || []).map(function (r) { return { name: String(r.name || r.title || '').trim(), probability: Number(r.probability || r.price || 0) }; })
      .filter(function (r) { return r.name && r.probability > 0; })
      .sort(function (a, b) { return b.probability - a.probability; })
      .slice(0, CFG.outrights.maxItems);
  }

  function makeOdds(rows, source, live) {
    rows = normal(rows && rows.length ? rows : CFG.outrights.fallback);
    var sec = el('section', { id: CFG.id + '-outrights', className: CFG.id + '-section', 'data-winrai-section': 'outrights' });
    sec.appendChild(header('FIFA World Cup 2026 Outrights', 'Market-implied title chances. Live data when available, fallback when blocked.', live ? 'Live' : 'Fallback'));
    var panel = el('div', { className: CFG.id + '-odds' });
    panel.appendChild(el('article', { className: CFG.id + '-card ' + CFG.id + '-hero' }, [
      el('div', {}, [el('p', { className: CFG.id + '-big', text: 'Who wins 2026?' }), el('p', { className: CFG.id + '-small', text: 'Outright winner board for FIFA World Cup 2026. Values are shown as implied chance, not betting advice.' })]),
      el('div', { className: CFG.id + '-status', text: 'Source: ' + source })
    ]));
    var list = el('article', { className: CFG.id + '-card' });
    var teams = el('div', { className: CFG.id + '-teams' });
    rows.forEach(function (r, i) {
      var pc = percent(r.probability);
      teams.appendChild(el('div', { className: CFG.id + '-teamrow' }, [
        el('div', { className: CFG.id + '-bar', style: { width: Math.min(100, pc * 4) + '%' } }),
        el('div', { className: CFG.id + '-rank', text: String(i + 1).padStart(2, '0') }),
        el('div', { className: CFG.id + '-team', text: r.name }),
        el('div', { className: CFG.id + '-prob', text: pc + '%' })
      ]));
    });
    list.appendChild(teams);
    panel.appendChild(list);
    sec.appendChild(panel);
    return sec;
  }

  function parseArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return [];
    try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
  }

  function fetchTimeout(url, ms) {
    if (!window.fetch || !window.AbortController) return Promise.reject(new Error('fetch unavailable'));
    var c = new AbortController();
    var t = setTimeout(function () { try { c.abort(); } catch (e) {} }, ms);
    return fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: c.signal, headers: { accept: 'application/json' } })
      .then(function (res) { clearTimeout(t); if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .catch(function (err) { clearTimeout(t); throw err; });
  }

  function loadPolymarket() {
    var key = CFG.id + ':polymarket:v1';
    try {
      var cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached && cached.ts && cached.rows && Date.now() - cached.ts < CFG.outrights.cacheMs) return Promise.resolve({ rows: cached.rows, source: 'Polymarket cached', live: true });
    } catch (e) {}
    var url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=50&search=' + encodeURIComponent('2026 world cup winner');
    return fetchTimeout(url, CFG.outrights.timeoutMs).then(function (json) {
      var markets = Array.isArray(json) ? json : (json && Array.isArray(json.markets) ? json.markets : []);
      var market = null;
      markets.some(function (m) {
        var txt = String(m.question || m.title || m.slug || '').toLowerCase();
        if (txt.indexOf('world cup') !== -1 && txt.indexOf('2026') !== -1 && (txt.indexOf('winner') !== -1 || txt.indexOf('win') !== -1)) { market = m; return true; }
        return false;
      });
      if (!market) throw new Error('market not found');
      var outcomes = parseArray(market.outcomes);
      var prices = parseArray(market.outcomePrices || market.outcome_prices);
      var rows = normal(outcomes.map(function (name, i) { return { name: name, probability: Number(prices[i] || 0) }; }));
      if (!rows.length) throw new Error('empty prices');
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), rows: rows })); } catch (e) {}
      return { rows: rows, source: 'Polymarket public market', live: true };
    });
  }

  function mount() {
    if (mounted || document.getElementById(CFG.id)) { mounted = true; return true; }
    var main = q(CFG.mainSelector);
    if (!main) { tries += 1; return false; }
    addCss();
    var root = el('div', { id: CFG.id, 'data-winrai-custom-sections': 'true' });
    root.appendChild(makeVideos());
    root.appendChild(makeOdds(CFG.outrights.fallback, 'Fallback board', false));
    var after = q(CFG.afterSelector, main);
    var before = q(CFG.beforeSelector, main);
    if (after && after.parentNode) after.insertAdjacentElement('afterend', root);
    else if (before && before.parentNode) before.parentNode.insertBefore(root, before);
    else main.insertBefore(root, main.firstChild);
    mounted = true;
    loadPolymarket().then(function (r) {
      var current = document.getElementById(CFG.id + '-outrights');
      if (current && current.parentNode) current.parentNode.replaceChild(makeOdds(r.rows, r.source, r.live), current);
    }).catch(function (err) { log('Live odds unavailable', err && err.message ? err.message : err); });
    return true;
  }

  function boot() {
    try {
      if (mount()) return;
      var mo = window.MutationObserver ? new MutationObserver(function () { if (!mounted && tries <= maxTries) mount(); }) : null;
      if (mo) mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      var timer = setInterval(function () {
        if (mounted || tries > maxTries) { clearInterval(timer); if (mo) mo.disconnect(); return; }
        mount();
      }, 350);
    } catch (e) {
      if (window.console && console.warn) console.warn('[WinraiCustom] disabled after error:', e);
    }
  }

  onReady(boot);
})();
