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
