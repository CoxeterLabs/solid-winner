const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const widgetPath = path.join(repoRoot, "widget-v12.js");

function loadWidgetTestApi() {
  const source = fs.readFileSync(widgetPath, "utf8");
  const context = {
    URL,
    clearTimeout,
    console,
    setTimeout,
    window: {
      __DMBO_WIDGET_TEST_MODE__: true,
      location: {
        href: "https://winrai1.com/en/home/adv",
        pathname: "/en/home/adv"
      },
      addEventListener() {},
      dispatchEvent() {}
    },
    document: {
      readyState: "loading",
      addEventListener() {},
      createElement(tag) {
        return {
          tagName: String(tag || "").toUpperCase(),
          set textContent(value) {
            this._textContent = value;
          },
          get textContent() {
            return this._textContent || "";
          }
        };
      },
      documentElement: {
        appendChild() {}
      },
      head: {
        appendChild() {}
      },
      body: null,
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    }
  };

  context.window.window = context.window;
  context.window.document = context.document;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: widgetPath });

  assert.ok(
    context.window.__DMBO_WIDGET_TESTS__,
    "widget-v12.js should expose route helpers when __DMBO_WIDGET_TEST_MODE__ is true"
  );

  return context.window.__DMBO_WIDGET_TESTS__;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("normalizes localized Winrai paths for route matching", () => {
  const api = loadWidgetTestApi();

  assert.equal(api.normalizePagePath("/en/home/adv/"), "/home/adv");
  assert.equal(api.normalizePagePath("/tr/g-casino/casino?m=login"), "/g-casino/casino");
  assert.equal(api.normalizePagePath("https://winrai1.com/en/home/adv#x"), "/home/adv");
  assert.equal(api.normalizePagePath("/home"), "/home");
});

test("resolves global and page-scoped layers from a manifest", () => {
  const api = loadWidgetTestApi();
  const manifest = {
    global: {
      styles: [{ id: "global-style", css: "body{}" }],
      scripts: [{ id: "global-script", code: "window.globalScript = true;" }]
    },
    pages: [
      {
        id: "adv",
        paths: ["/home/adv"],
        widgets: [{ id: "dmbo-adv", type: "dmbo-v12", panels: ["top", "casino"] }],
        styles: [{ id: "adv-style", css: ".adv{}" }],
        scripts: [{ id: "adv-script", code: "window.advScript = true;" }]
      },
      {
        id: "sports",
        paths: ["/g-sport/*"],
        widgets: [{ id: "sports-extra", type: "external" }]
      }
    ]
  };

  const adv = api.getActiveLayers(manifest, "/en/home/adv");
  assert.deepEqual(plain(adv.pageIds), ["adv"]);
  assert.deepEqual(plain(adv.styles.map((item) => item.id)), ["global-style", "adv-style"]);
  assert.deepEqual(plain(adv.scripts.map((item) => item.id)), ["global-script", "adv-script"]);
  assert.deepEqual(plain(adv.widgets.map((item) => item.id)), ["dmbo-adv"]);
  assert.deepEqual(plain(adv.dmboWidget.panels), ["top", "casino"]);

  const sport = api.getActiveLayers(manifest, "/en/g-sport/sport/demo");
  assert.deepEqual(plain(sport.pageIds), ["sports"]);
  assert.deepEqual(plain(sport.widgets.map((item) => item.id)), ["sports-extra"]);
});

test("default manifest mounts the DMBO widget only on the Advanced Features page", () => {
  const api = loadWidgetTestApi();
  const manifest = api.createDefaultManifest();

  const home = api.getActiveLayers(manifest, "/en/home");
  assert.equal(home.dmboWidget, null);
  assert.equal(home.widgets.length, 0);

  const adv = api.getActiveLayers(manifest, "/en/home/adv");
  assert.equal(adv.title, "Advanced Features | Winrai");
  assert.equal(adv.dmboWidget.type, "dmbo-v12");
  assert.deepEqual(plain(adv.dmboWidget.panels.map((panel) => typeof panel === "string" ? panel : panel.name || panel.type)), [
    "account",
    "lottie",
    "video",
    "youtube",
    "iframe",
    "liveMatch",
    "top",
    "worldcup",
    "sports",
    "casino"
  ]);
});

test("default live match panel config enables per-event stats modal", () => {
  const api = loadWidgetTestApi();
  const manifest = api.createDefaultManifest();
  const panels = manifest.pages[0].widgets[0].panels;
  const liveMatch = panels.find((panel) => panel && typeof panel === "object" && panel.name === "liveMatch");

  assert.equal(api.panelEnabled(manifest.pages[0].widgets[0], "liveMatch"), true);
  assert.equal(liveMatch.title, "Live Match Center");
  assert.equal(liveMatch.pollMs, 8000);
  assert.equal(liveMatch.resolverPath, "/matchtracker-resolver/resolve");
});

test("live event summary maps score, periods, stats, and animation hints", () => {
  const api = loadWidgetTestApi();

  const summary = api.liveEventSummary({
    eventId: "4542851",
    eventName: "Serena Williams vs Maya Joint",
    eventStatus: "LIVE",
    sportName: "Tennis",
    tournamentName: "WTA Wimbledon | Women | Singles",
    participants: [
      { qualifier: "away", translatedName: "Maya Joint" },
      { qualifier: "home", translatedName: "Serena Williams" }
    ],
    score: {
      homeScore: 1,
      awayScore: 1,
      currentPeriodName: "3rd Set",
      matchClock: "3465",
      liveExtraData: { TURN: "1", SERVE_NUMBER: "1" }
    },
    periodScoreInfo: {
      scores: [
        { periodName: "1st Set", homeScore: 3, awayScore: 6 },
        { periodName: "Game", homeScore: 0, awayScore: 15 }
      ]
    },
    eventStatistics: {
      statistics: [
        { type: "ACES", home: 7, away: 8 },
        { type: "FIRST_SERVE_WINS", home: 35, away: 50 }
      ]
    },
    videoStreaming: { status: "started", streamId: "959206810" }
  }, { h: "Fallback Home", a: "Fallback Away" });

  assert.equal(summary.eventId, "4542851");
  assert.equal(summary.title, "Serena Williams vs Maya Joint");
  assert.equal(summary.status, "LIVE");
  assert.equal(summary.homeName, "Serena Williams");
  assert.equal(summary.awayName, "Maya Joint");
  assert.equal(summary.scoreText, "1 - 1");
  assert.equal(summary.period, "3rd Set");
  assert.equal(summary.clockText, "57:45");
  assert.equal(summary.clockSeconds, 3465);
  assert.equal(summary.serviceText, "Server: Serena Williams · Serve 1");
  assert.deepEqual(plain(summary.periodRows), [
    { label: "1st Set", home: "3", away: "6" },
    { label: "Game", home: "0", away: "15" }
  ]);
  assert.deepEqual(plain(summary.statRows), [
    { label: "Aces", home: "7", away: "8" },
    { label: "First Serve Wins", home: "35", away: "50" }
  ]);
  assert.equal(summary.streamText, "Stream started");
});

test("live event summary includes optional venue and weather fields", () => {
  const api = loadWidgetTestApi();
  const summary = api.liveEventSummary({
    eventName: "France vs Sweden",
    sportName: "Football",
    regionName: "World Cup",
    tournamentName: "2026 FIFA World Cup",
    startTime: 1782853200000,
    participants: [
      { qualifier: "home", translatedName: "France" },
      { qualifier: "away", translatedName: "Sweden" }
    ],
    score: { homeScore: 2, awayScore: 0, currentPeriodName: "2nd Half", matchClock: "3133" },
    venue: { name: "MetLife Stadium", city: "East Rutherford" },
    weather: { temperature: "24 C", condition: "Clear" }
  });

  assert.equal(summary.clockText, "52:13");
  assert.equal(summary.venueName, "MetLife Stadium");
  assert.equal(summary.cityName, "East Rutherford");
  assert.equal(summary.weatherText, "24 C · Clear");
  assert.deepEqual(plain(summary.infoRows).filter((row) => ["Clock", "Venue", "City", "Weather"].includes(row.label)), [
    { label: "Clock", value: "52:13" },
    { label: "Venue", value: "MetLife Stadium" },
    { label: "City", value: "East Rutherford" },
    { label: "Weather", value: "24 C · Clear" }
  ]);
});

test("match clock helpers parse static clocks and tick from a base second", () => {
  const api = loadWidgetTestApi();

  assert.equal(api.matchClockSeconds("68:47"), 4127);
  assert.equal(api.matchClockSeconds("3465"), 3465);
  assert.equal(api.tickingMatchClockText(4127, 1000, 4500), "68:50");
});

test("sportscast goal timeline extracts scorers and ignores cancelled goals", () => {
  const api = loadWidgetTestApi();
  const summary = { homeName: "France", awayName: "Sweden" };
  const players = [
    { playerId: "796046", playerName: "Mbappe, Kylian", teamNumber: 1 },
    { playerId: "361350", playerName: "Dembele, Ousmane", teamNumber: 1 },
    { playerId: "1948356", playerName: "Barcola, Bradley", teamNumber: 1 },
    { playerId: "1717779", playerName: "Olise, Michael", teamNumber: 1 }
  ];
  const goals = api.sportscastGoalTimeline({
    items: [{ code: 115629700, players }]
  }, {
    extraInfo: { teamsReverse: false },
    events: [
      { id: 11, type: 1100, i1: 1, i2: 1, i3: 100 },
      { id: 12, type: 1200, i1: 1, i2: 1 },
      { id: 13, type: 1020, i2: 11 },
      { id: 21, type: 1100, i1: 1, i2: 1, i3: 2687 },
      { id: 22, type: 1200, i1: 1, i2: 1 },
      { id: 23, type: 1200, i1: 2, i2: 0 },
      { id: 24, type: 1867, i1: 21, i3: 796046, i4: 361350 },
      { id: 31, type: 1100, i1: 1, i2: 2, i3: 3133 },
      { id: 32, type: 1200, i1: 1, i2: 2 },
      { id: 33, type: 1867, i1: 31, i3: 1948356, i4: 1717779 }
    ]
  }, summary);

  assert.deepEqual(plain(goals), [
    {
      team: "France",
      teamNumber: "1",
      time: "44:47",
      minute: "45'",
      scorer: "Mbappe, Kylian",
      assist: "Dembele, Ousmane",
      score: "1 - 0"
    },
    {
      team: "France",
      teamNumber: "1",
      time: "52:13",
      minute: "53'",
      scorer: "Barcola, Bradley",
      assist: "Olise, Michael",
      score: "2 - 0"
    }
  ]);
});

test("sportscast provider rows expose safe feed metadata", () => {
  const api = loadWidgetTestApi();
  const rows = api.sportscastProviderRows({
    items: [
      {
        code: 115629700,
        players: new Array(51).fill(null).map((_, index) => ({ playerId: String(index + 1) })),
        extra: { coverage: "stadium", duration: 90 }
      }
    ]
  }, {
    extraInfo: {
      version: "6691048591",
      sportscastExtra: { coverage: "stadium", duration: 90 }
    },
    events: [{ type: 2003 }, { type: 2681 }, { type: 1100 }]
  });

  assert.deepEqual(plain(rows), [
    { label: "Coverage", value: "Stadium" },
    { label: "Duration", value: "90 min" },
    { label: "Roster", value: "51 players" },
    { label: "Timeline", value: "3 events" },
    { label: "Provider Version", value: "6691048591" }
  ]);
});

test("sportscast id is read from top-parser animation URLs", () => {
  const api = loadWidgetTestApi();

  assert.equal(
    api.sportscastIdFromAnimationUrl("https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66096007?s=1&lang=en"),
    "66096007"
  );
  assert.equal(
    api.sportscastIdFromAnimationUrl("https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/view?specificApplication=matchCenter&eventId=66096007&providerId=6"),
    "66096007"
  );
});

test("live match resolver URL uses the Worker proxy with event teams", () => {
  const api = loadWidgetTestApi();
  const url = api.liveAnimationResolverUrl(
    { sportsProxyUrl: "https://sports.hypercubik.workers.dev/" },
    { resolverPath: "/matchtracker-resolver/resolve" },
    { eventId: "4542851" },
    { h: "Serena Williams", a: "Maya Joint" }
  );

  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://sports.hypercubik.workers.dev/");
  assert.equal(parsed.searchParams.get("path"), "/matchtracker-resolver/resolve");
  assert.equal(parsed.searchParams.get("home"), "Serena Williams");
  assert.equal(parsed.searchParams.get("away"), "Maya Joint");
  assert.equal(parsed.searchParams.get("nocache"), "1");

  const sanitized = new URL(api.liveAnimationResolverUrl(
    { sportsProxyUrl: "https://sports.hypercubik.workers.dev/" },
    { resolverPath: "/matchtracker-resolver/resolve" },
    { eventId: "4567882" },
    { h: "Angela Ho", a: "Smith, Kiana" }
  ));

  assert.equal(sanitized.searchParams.get("home"), "Angela Ho");
  assert.equal(sanitized.searchParams.get("away"), "Smith Kiana");
});

test("live animation keeps an existing iframe when the resolved source is unchanged", () => {
  const api = loadWidgetTestApi();

  assert.equal(
    api.sameLiveSrc(
      "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66127216?s=3&lang=en",
      "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66127216?s=3&lang=en"
    ),
    true
  );
  assert.equal(
    api.sameLiveSrc(
      "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66127216?s=3&lang=en",
      "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66127217?s=3&lang=en"
    ),
    false
  );
});

test("live visual resolver keeps animation default and video optional", () => {
  const api = loadWidgetTestApi();
  const animationUrl = "https://video-translations.top-parser.com/p/https://bet-broadcast.com/tracker/get/66127216?s=3&lang=en";
  const sources = api.liveVisualSourcesFromResolver({
    url: animationUrl,
    broadcastUrl: "/sportsbook-new/tp-stream/sm/iframe?ref=redacted&t=1782849600&lang=en"
  });

  assert.deepEqual(plain(sources), {
    animation: animationUrl,
    video: "https://ui-monitor.lynon.online/sportsbook-new/tp-stream/sm/iframe?ref=redacted&t=1782849600&lang=en"
  });
  assert.equal(api.liveVisualMode(sources), "animation");
});

test("resolves object panel settings for modular widgets", () => {
  const api = loadWidgetTestApi();
  const widget = {
    type: "dmbo-v12",
    panels: [
      "top",
      { name: "video", title: "Feature film", source: "https://cdn.example/video.mp4" },
      { type: "account", enabled: false }
    ]
  };

  assert.equal(api.panelEnabled(widget, "top"), true);
  assert.equal(api.panelEnabled(widget, "video"), true);
  assert.equal(api.panelEnabled(widget, "account"), false);
  assert.deepEqual(plain(api.panelConfig(widget, "video")), {
    name: "video",
    title: "Feature film",
    source: "https://cdn.example/video.mp4"
  });
});

test("account data fetches are gated to likely logged-in sessions", () => {
  const api = loadWidgetTestApi();

  assert.equal(api.shouldFetchAccountData({ enabled: true }, { hasLoginCta: true }), false);
  assert.equal(api.shouldFetchAccountData({ enabled: true }, { hasLoginCta: false }), true);
  assert.equal(api.shouldFetchAccountData({ enabled: false }, { hasLoginCta: false }), false);
});

test("account data endpoints can stay backward compatible with the stale worker runtime", () => {
  const api = loadWidgetTestApi();
  const accountPanel = api.createDefaultManifest().pages[0].widgets[0].panels[0];

  assert.deepEqual(plain(accountPanel.endpoints.balances), ["/api/v1/me/balances", "/api/v1/balance"]);
  assert.ok(accountPanel.dataEndpoints.userInfo.includes("/api/user/api/v1.0/users/userinfo"));
  assert.ok(accountPanel.dataEndpoints.balances.includes("/api/platform/api/v1.0/user/balances"));
  assert.ok(accountPanel.dataEndpoints.accounts.includes("/api/platform/api/v1.0/user/accounts?currency={currency}"));
  assert.ok(accountPanel.dataEndpoints.baseBalance.includes("/api/platform/api/v1.0/user/balance?currency={currency}"));
  assert.equal(accountPanel.baseCurrency, "EUR");
  assert.equal(
    api.accountDataEndpoints(accountPanel).balances[0],
    "/api/platform/api/v1.0/user/balances?currency={currency}"
  );
  assert.equal(
    api.accountDataEndpoints(accountPanel).baseBalance[0],
    "/api/platform/api/v1.0/user/balance?currency={baseCurrency}"
  );
});

test("account summary reads Lynon balance and bonus response shapes", () => {
  const api = loadWidgetTestApi();

  const mapped = api.summarizeAccountData({}, {
    profile: {
      id: 70,
      email: "player@example.com",
      preferredCurrency: "USD",
      playerCategory: { name: "VIP GOLD" }
    },
    balances: {
      currency: "USD",
      balance: { USD: 125.5 },
      bonusBalance: { USD: 14 }
    }
  });

  assert.equal(mapped.name, "player@example.com");
  assert.equal(mapped.uid, "70");
  assert.equal(mapped.balance, "125.5 USD");
  assert.equal(mapped.bonus, "14 USD");
  assert.equal(mapped.category, "VIP GOLD");

  const listed = api.summarizeAccountData({}, {
    profile: { preferredCurrency: "EUR" },
    balances: [
      { type: "playerUnusedBalance", currency: "EUR", balance: 3 },
      { type: "playerAccount", currency: "EUR", balance: 42 }
    ]
  });

  assert.equal(listed.balance, "42 EUR");
  assert.equal(listed.bonus, "3 EUR");
});

test("account summary reads wrapped Winrai balance and account payloads", () => {
  const api = loadWidgetTestApi();

  const wrapped = api.summarizeAccountData({}, {
    profile: {
      data: {
        player: {
          id: 70,
          walletNumber: "00007622",
          email: "player@example.com",
          preferredCurrency: "USD",
          currentLevel: "Gold 3",
          verificationStatus: "verified"
        }
      }
    },
    balances: {
      data: {
        currencyCode: "USD",
        realBalance: 3.47,
        bonusBalance: 1.25
      }
    }
  });

  assert.equal(wrapped.uid, "00007622");
  assert.equal(wrapped.balance, "3.47 USD");
  assert.equal(wrapped.bonus, "1.25 USD");
  assert.equal(wrapped.level, "Gold 3");
  assert.equal(wrapped.status, "Verified");

  const accounts = api.summarizeAccountData({}, {
    profile: { player: { preferredCurrency: "EUR" } },
    balances: {
      data: [
        { type: "PLAYER_UNUSED_BALANCE", currencyCode: "EUR", amount: 8 },
        { type: "PLAYER_ACCOUNT", currencyCode: "EUR", availableAmount: 54 }
      ]
    }
  });

  assert.equal(accounts.balance, "54 EUR");
  assert.equal(accounts.bonus, "8 EUR");

  const transformed = api.summarizeAccountData({}, {
    profile: { preferredCurrency: "GBP" },
    balances: {
      used: { GBP: 19.5 },
      unUsed: { GBP: 2 }
    }
  });

  assert.equal(transformed.balance, "19.5 GBP");
  assert.equal(transformed.bonus, "2 GBP");
});

test("account summary prefers rich user info over shallow internal ids", () => {
  const api = loadWidgetTestApi();

  const summary = api.summarizeAccountData({}, {
    profile: {
      id: 70,
      player: {
        email: "player@example.com",
        preferredCurrency: "EUR",
        verificationStatus: "notVerified"
      }
    },
    userInfo: {
      walletNumber: "00007622",
      userName: "cryptoreio",
      verificationStatus: "verified"
    }
  });

  assert.equal(summary.uid, "00007622");
  assert.equal(summary.name, "cryptoreio");
  assert.equal(summary.status, "Verified");
});

test("account summary separates base balance from all currency balances", () => {
  const api = loadWidgetTestApi();

  const summary = api.summarizeAccountData({}, {
    profile: { player: { preferredCurrency: "EUR" } },
    balances: {
      data: [
        { type: "PLAYER_ACCOUNT", currencyCode: "USDT", balance: 4 },
        { type: "PLAYER_ACCOUNT", currencyCode: "ETH", balance: "0.25" },
        { type: "PLAYER_UNUSED_BALANCE", currencyCode: "USDT", balance: 1.5 }
      ]
    },
    baseBalance: {
      data: {
        currencyCode: "EUR",
        balance: 3.62,
        bonusBalance: 0.5
      }
    }
  });

  assert.equal(summary.balance, "3.62 EUR");
  assert.equal(summary.bonus, "0.5 EUR");
  assert.equal(summary.allBalances, "EUR 3.62 · ETH 0.25 · USDT 4");
});

test("account summary labels base balance with configured currency when payload omits currency", () => {
  const api = loadWidgetTestApi();

  const summary = api.summarizeAccountData({ baseCurrency: "EUR" }, {
    profile: { player: { preferredCurrency: "USDT" } },
    balances: {
      data: [
        { type: "PLAYER_ACCOUNT", currencyCode: "USDT", balance: 4 }
      ]
    },
    baseBalance: {
      data: {
        balance: 3.62
      }
    }
  });

  assert.equal(summary.balance, "3.62 EUR");
  assert.equal(summary.allBalances, "EUR 3.62 · USDT 4");
});

test("account summary combines balance and account endpoints", () => {
  const api = loadWidgetTestApi();

  const summary = api.summarizeAccountData({}, {
    profile: { player: { preferredCurrency: "EUR" } },
    balances: {
      balance: { EUR: 3.62 },
      bonusBalance: { EUR: 0.5 }
    },
    accounts: {
      data: [
        { type: "PLAYER_ACCOUNT", currencyCode: "USDT", balance: 4 },
        { type: "PLAYER_ACCOUNT", currencyCode: "ETH", balance: "0.25" }
      ]
    }
  });

  assert.equal(summary.balance, "3.62 EUR");
  assert.equal(summary.bonus, "0.5 EUR");
  assert.equal(summary.allBalances, "EUR 3.62 · ETH 0.25 · USDT 4");
});

test("account balance display defaults to base and can toggle all balances", () => {
  const api = loadWidgetTestApi();
  const summary = {
    balance: "3.62 EUR",
    allBalances: "EUR 3.62 · ETH 0.25 · USDT 4"
  };

  const base = api.accountBalanceDisplay(summary, "base");
  const all = api.accountBalanceDisplay(summary, "all");

  assert.equal(base.label, "Base Balance");
  assert.equal(base.value, "3.62 EUR");
  assert.equal(base.mode, "base");
  assert.equal(all.label, "All Balances");
  assert.equal(all.value, "EUR 3.62 · ETH 0.25 · USDT 4");
  assert.equal(all.mode, "all");
});

test("event links use the signed-in sportsbook route when login CTA is absent", () => {
  const api = loadWidgetTestApi();

  const href = api.eventHref(
    {
      sportName: "Football",
      tournamentName: "2026 FIFA World Cup",
      regionName: "World",
      eventId: 4545444
    },
    { h: "Ivory Coast", a: "Norway" },
    { hasLoginCta: false }
  );

  const url = new URL(href, "https://winrai1.com");
  const params = JSON.parse(url.searchParams.get("additionalParams"));

  assert.equal(url.pathname, "/en/g-sport/sport");
  assert.equal(params.argument.path, "/sportsbook-newsport/football/world-cup?projectId=1006");

  const guestHref = api.eventHref(
    {
      sportName: "Football",
      tournamentName: "2026 FIFA World Cup",
      eventId: 4545444
    },
    { h: "Ivory Coast", a: "Norway" },
    { hasLoginCta: true }
  );
  const guestUrl = new URL(guestHref, "https://winrai1.com");
  const guestParams = JSON.parse(guestUrl.searchParams.get("additionalParams"));

  assert.equal(guestUrl.pathname, "/en/home/game/demo/170142");
  assert.equal(guestParams.argument.path, "sport/Football/2026 FIFA World Cup/Ivory Coast vs Norway-4545444");
});
