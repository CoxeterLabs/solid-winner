/*  Home Sections - SAFE MODE v1.1.0
 * Single-file custom JS injection.
 * No external libraries. No innerHTML. No document.write. ES5-compatible.
 * Adds YouTube videos + FIFA World Cup 2026 outrights fallback board.
 */
(function () {
  'use strict';

  var CFG = {
    rootId: 'wrx-custom-home-sections',
    styleId: 'wrx-custom-home-styles',
    mainSelector: 'main[data-mj="page-content"], main',
    insertAfterSelector: '[data-mj="widget-banner-container"]',
    videos: [
      { title: 'FIFA World Cup 2026 Official Trailer', channel: 'FIFA', id: '68Ov7NZNzfc' },
      { title: 'FIFA World Cup 26 Final Draw', channel: 'FIFA', id: '9HX_tQBA-Iw' },
      { title: 'FIFA World Cup 2026 Stadiums', channel: 'Football', id: 'XejscwNpvLU' },
      { title: 'Road to FIFA World Cup 2026', channel: 'Football', id: 'o-3F-YCjp8U' }
    ],
    outrights: [
      { name: 'Brazil', chance: '15.0%' },
      { name: 'France', chance: '14.0%' },
      { name: 'England', chance: '11.0%' },
      { name: 'Spain', chance: '10.0%' },
      { name: 'Argentina', chance: '9.0%' },
      { name: 'Germany', chance: '7.0%' },
      { name: 'Portugal', chance: '6.0%' },
      { name: 'Netherlands', chance: '5.0%' }
    ]
  };

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.appendChild(document.createTextNode(text));
    return node;
  }

  function setAttr(node, attrs) {
    var key;
    for (key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function addStyles() {
    var css, s;
    if (document.getElementById(CFG.styleId)) return;

    css = '' +
      '#' + CFG.rootId + '{width:100%;box-sizing:border-box;}' +
      '.wrx-section{max-width:1348px;margin:24px auto;padding:0 16px;box-sizing:border-box;}' +
      '.wrx-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 14px;}' +
      '.wrx-title{margin:0;color:#fff;font:800 22px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.02em;}' +
      '.wrx-sub{margin:5px 0 0;color:rgba(255,255,255,.58);font:600 13px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-pill{flex:0 0 auto;color:rgba(255,255,255,.85);background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:8px 12px;font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}' +
      '.wrx-card{position:relative;overflow:hidden;background:linear-gradient(145deg,#171a20 0%,#101217 50%,#090b0f 100%);border:1px solid rgba(255,255,255,.1);border-radius:18px;box-shadow:0 14px 34px rgba(0,0,0,.24);}' +
      '.wrx-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 20% 0%,rgba(255,184,79,.12),transparent 35%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.055),transparent 32%);}' +
      '.wrx-frame{position:relative;width:100%;aspect-ratio:16/9;background:#05070a;}' +
      '.wrx-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}' +
      '.wrx-meta{position:relative;padding:12px 13px 14px;}' +
      '.wrx-name{margin:0 0 5px;color:#fff;font:800 14px/1.28 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-channel{color:rgba(255,255,255,.56);font:700 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-odds{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;}' +
      '.wrx-hero{min-height:250px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;}' +
      '.wrx-big{position:relative;margin:0;color:#fff;font:900 34px/1.05 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.04em;}' +
      '.wrx-desc{position:relative;margin:10px 0 0;max-width:560px;color:rgba(255,255,255,.64);font:600 14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-source{position:relative;color:rgba(255,255,255,.54);font:700 12px/1.3 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-list{position:relative;display:grid;gap:8px;padding:14px;}' +
      '.wrx-row{position:relative;display:grid;grid-template-columns:30px 1fr 64px;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.075);overflow:hidden;}' +
      '.wrx-rank,.wrx-prob{position:relative;color:rgba(255,255,255,.74);font:800 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '.wrx-team{position:relative;color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.wrx-prob{text-align:right;color:#ffd08a;}' +
      '@media(max-width:1100px){.wrx-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.wrx-odds{grid-template-columns:1fr;}}' +
      '@media(max-width:640px){.wrx-section{margin:18px auto;padding:0 12px;}.wrx-head{align-items:flex-start;flex-direction:column;gap:10px;}.wrx-grid{grid-template-columns:1fr;}.wrx-big{font-size:28px;}.wrx-hero{min-height:210px;padding:18px;}}';

    s = document.createElement('style');
    s.id = CFG.styleId;
    s.type = 'text/css';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  }

  function makeHeader(title, sub, pill) {
    var h = el('div', 'wrx-head');
    var left = el('div');
    left.appendChild(el('h2', 'wrx-title', title));
    left.appendChild(el('p', 'wrx-sub', sub));
    h.appendChild(left);
    h.appendChild(el('div', 'wrx-pill', pill));
    return h;
  }

  function makeVideos() {
    var section = el('section', 'wrx-section');
    var grid = el('div', 'wrx-grid');
    var i, v, card, frame, iframe, meta;

    section.setAttribute('data-wrx-section', 'youtube');
    section.appendChild(makeHeader('World Cup 2026 Videos', 'Official trailers, draw updates and football stories', 'Video'));

    for (i = 0; i < CFG.videos.length; i += 1) {
      v = CFG.videos[i];
      card = el('article', 'wrx-card');
      frame = el('div', 'wrx-frame');
      iframe = document.createElement('iframe');
      setAttr(iframe, {
        src: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) + '?rel=0&modestbranding=1&playsinline=1',
        title: v.title,
        loading: 'lazy',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        referrerpolicy: 'strict-origin-when-cross-origin'
      });
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      meta = el('div', 'wrx-meta');
      meta.appendChild(el('p', 'wrx-name', v.title));
      meta.appendChild(el('div', 'wrx-channel', v.channel));
      card.appendChild(frame);
      card.appendChild(meta);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    return section;
  }

  function makeOutrights() {
    var section = el('section', 'wrx-section');
    var panel = el('div', 'wrx-odds');
    var hero = el('article', 'wrx-card wrx-hero');
    var heroTop = el('div');
    var listCard = el('article', 'wrx-card');
    var list = el('div', 'wrx-list');
    var i, o, row;

    section.setAttribute('data-wrx-section', 'outrights');
    section.appendChild(makeHeader('FIFA World Cup 2026 Outrights', 'Winner board. Static fallback version to avoid browser/CORS/API breakage.', 'Safe'));

    heroTop.appendChild(el('p', 'wrx-big', 'Who wins 2026?'));
    heroTop.appendChild(el('p', 'wrx-desc', 'This safe build shows a non-live fallback board. Use a backend/proxy for real bookmaker outrights to avoid CORS and key exposure.'));
    hero.appendChild(heroTop);
    hero.appendChild(el('div', 'wrx-source', 'Source: static fallback board'));

    for (i = 0; i < CFG.outrights.length; i += 1) {
      o = CFG.outrights[i];
      row = el('div', 'wrx-row');
      row.appendChild(el('div', 'wrx-rank', String(i + 1)));
      row.appendChild(el('div', 'wrx-team', o.name));
      row.appendChild(el('div', 'wrx-prob', o.chance));
      list.appendChild(row);
    }

    listCard.appendChild(list);
    panel.appendChild(hero);
    panel.appendChild(listCard);
    section.appendChild(panel);
    return section;
  }

  function mount() {
    var main, after, root;
    if (document.getElementById(CFG.rootId)) return true;

    main = q(CFG.mainSelector);
    if (!main) return false;

    addStyles();

    root = el('div');
    root.id = CFG.rootId;
    root.setAttribute('data-wrx-mounted', 'true');
    root.appendChild(makeVideos());
    root.appendChild(makeOutrights());

    after = q(CFG.insertAfterSelector, main);
    if (after && after.parentNode) {
      after.parentNode.insertBefore(root, after.nextSibling);
    } else {
      main.insertBefore(root, main.firstChild);
    }

    return true;
  }

  function boot() {
    var tries = 0;
    var timer;

    if (mount()) return;

    timer = window.setInterval(function () {
      tries += 1;
      if (mount() || tries > 40) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
}());
