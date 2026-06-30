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
    "top",
    "worldcup",
    "sports",
    "casino"
  ]);
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
  assert.equal(
    api.accountDataEndpoints(accountPanel).balances[0],
    "/api/platform/api/v1.0/user/balances?currency={currency}"
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
