(function () {
  if (window.__DMBO_ADV_COMPAT_V1__) return;
  window.__DMBO_ADV_COMPAT_V1__ = true;

  var accountBusy = false;
  var accountDone = false;
  var timer = 0;

  function clean(v) {
    return String(v || "").trim().toLowerCase();
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function visible(el) {
    var r;

    try {
      r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
    } catch (e) {
      return true;
    }
  }

  function hasLoginCta() {
    var found = false;

    try {
      Array.prototype.some.call(document.querySelectorAll('a[href*="m=login"],a[href*="login"],button,[role="button"]'), function (el) {
        var text = clean(el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("href") || "");

        if (visible(el) && (text.indexOf("login") !== -1 || text.indexOf("log in") !== -1 || text.indexOf("register") !== -1)) {
          found = true;
          return true;
        }

        return false;
      });
    } catch (e) {}

    return found;
  }

  function localePrefix() {
    var parts = [];

    try {
      parts = String(location.pathname || "").split("/").filter(Boolean);
    } catch (e) {}

    return parts.length && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0]) ? "/" + parts[0] : "";
  }

  function slug(value, kind) {
    var s = clean(value);

    if (kind === "tournament") s = s.replace(/\b20\d{2}\b/g, " ").replace(/\bfifa\b/g, " ");

    s = s.replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    return s || (kind === "sport" ? "football" : "");
  }

  function sportsbookHref(oldHref) {
    var url;
    var params;
    var oldPath;
    var parts;
    var sport;
    var tournament;
    var payload;

    try {
      url = new URL(oldHref, location.origin);
      params = JSON.parse(url.searchParams.get("additionalParams") || "{}");
      oldPath = String(params.argument && params.argument.path || "");
    } catch (e) {
      return "";
    }

    if (oldPath.indexOf("sport/") !== 0) return "";

    parts = oldPath.split("/");
    sport = parts[1] || "Football";
    tournament = parts[2] || "";
    payload = {
      argument: {
        path: "/sportsbook-newsport/" + slug(sport, "sport") + (tournament ? "/" + slug(tournament, "tournament") : "") + "?projectId=1006"
      }
    };

    return localePrefix() + "/g-sport/sport?additionalParams=" + encodeURIComponent(JSON.stringify(payload));
  }

  function rewriteSportsLinks() {
    if (hasLoginCta()) return;

    try {
      Array.prototype.forEach.call(document.querySelectorAll('#dmbo-media-widget-v12 a[href*="/home/game/demo/170142"]'), function (a) {
        var next = sportsbookHref(a.href);

        if (next) a.href = next;
      });
    } catch (e) {}
  }

  function scalar(v) {
    var picked = "";

    if (v == null) return "";
    if (typeof v !== "object") return String(v);

    ["name", "title", "label", "value", "amount", "balance", "availableAmount", "availableBalance", "realBalance", "bonusBalance", "totalBalance"].some(function (key) {
      if (v[key] != null && typeof v[key] !== "object") {
        picked = String(v[key]);
        return true;
      }
      return false;
    });

    return picked;
  }

  function accountTypeKey(v) {
    return clean(v).replace(/[^a-z0-9]+/g, "");
  }

  function directValue(data, keys) {
    var found = "";
    var wanted = {};

    (keys || []).forEach(function (key) {
      wanted[String(key).toLowerCase()] = true;
    });

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
      objectKeys.some(function (key) {
        if (!wanted[String(key).toLowerCase()]) return false;
        found = scalar(v[key]);
        return !!found;
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

  function rawValue(data, keys) {
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

  function mapAmount(v, currency) {
    var keys;
    var wanted;

    if (v == null) return "";
    if (typeof v !== "object") return String(v);
    if (currency && v[currency] != null && typeof v[currency] !== "object") return String(v[currency]);

    wanted = clean(currency);
    keys = Object.keys(v);
    if (wanted) {
      for (var i = 0; i < keys.length; i += 1) {
        if (clean(keys[i]) === wanted && v[keys[i]] != null && typeof v[keys[i]] !== "object") return String(v[keys[i]]);
      }
    }
    for (var j = 0; j < keys.length; j += 1) {
      if (v[keys[j]] != null && typeof v[keys[j]] !== "object") return String(v[keys[j]]);
    }

    return scalar(v);
  }

  function entryAmount(data, wantedType, currency) {
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
        if (!currency || !itemCurrency || clean(itemCurrency) === clean(currency)) {
          found = mapAmount(v.balance, currency) ||
            mapAmount(v.amount, currency) ||
            mapAmount(v.availableAmount, currency) ||
            mapAmount(v.availableBalance, currency) ||
            mapAmount(v.realBalance, currency) ||
            mapAmount(v.total, currency) ||
            mapAmount(v.totalBalance, currency);
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

  function amount(data, keys, currency) {
    return mapAmount(rawValue(data, keys), currency);
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

  function getJson(url) {
    return fetch(url, { credentials: "include", headers: { accept: "application/json" } }).then(function (r) {
      accountDebug({ url: url, status: r.status, ok: r.ok });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (data) {
      accountDebug({ url: url, keys: responseKeys(data) });
      return data;
    });
  }

  function getFirst(urls) {
    var list = urls.filter(Boolean);

    function next() {
      var url = list.shift();

      if (!url) return Promise.resolve({});

      return getJson(url).catch(function () {
        accountDebug({ url: url, failed: true });
        return next();
      });
    }

    return next();
  }

  function renderAccount(profile, balances, bonuses, level) {
    var box = document.getElementById("dmbo-account");
    var currency = directValue(profile, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]) || directValue(balances, ["currency", "currencyCode", "activeCurrency", "displayCurrency"]) || directValue(bonuses, ["currency", "currencyCode", "activeCurrency", "displayCurrency"]);
    var balance = entryAmount(balances, "playerAccount", currency) || amount(balances, ["used", "playerAccount", "balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "amount", "total", "totalBalance"], currency) || amount(profile, ["balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash"], currency);
    var bonus = entryAmount(balances, "playerUnusedBalance", currency) || amount(balances, ["unUsed", "unused", "playerUnusedBalance", "bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance"], currency) || amount(bonuses, ["bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance", "amount", "total", "count"], currency);
    var name = directValue(profile, ["username", "userName", "name", "firstName", "email", "phone"]) || "Signed in";
    var uid = directValue(profile, ["id", "uid", "playerId", "userId"]) || "-";
    var lvl = directValue(level, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]) || directValue(profile, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]) || "-";
    var category = directValue(level, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]) || directValue(profile, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]) || "-";

    if (!box || hasLoginCta()) return;

    box.innerHTML = '<div class="t"><span>Player Status</span><span class="m">Live</span></div>' +
      '<div class="kv">' +
      '<div><span>User</span><b>' + esc(name) + '</b></div>' +
      '<div><span>ID</span><b>' + esc(uid) + '</b></div>' +
      '<div><span>Balance</span><b>' + esc(balance ? balance + (currency ? " " + currency : "") : "-") + '</b></div>' +
      '<div><span>Bonus</span><b>' + esc(bonus ? bonus + (currency ? " " + currency : "") : "-") + '</b></div>' +
      '<div><span>Level</span><b>' + esc(lvl) + '</b></div>' +
      '<div><span>Category</span><b>' + esc(category) + '</b></div>' +
      '</div>';
  }

  function refreshAccount() {
    if (accountBusy || accountDone || hasLoginCta() || !document.getElementById("dmbo-account")) return;

    accountBusy = true;
    getJson("/api/v1/me")
      .then(function (profile) {
        var currency = directValue(profile, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]);
        var encoded = currency ? encodeURIComponent(currency) : "";

        return Promise.all([
          Promise.resolve(profile),
          getFirst([
            encoded ? "/api/platform/api/v1.0/user/balances?currency=" + encoded : "",
            encoded ? "/api/platform/api/v1.0/user/accounts?currency=" + encoded : "",
            encoded ? "/api/platform/api/v1.0/user/balance?currency=" + encoded : "",
            "/api/platform/api/v1.0/user/balances",
            "/api/platform/api/v1.0/user/accounts",
            "/api/platform/api/v1.0/user/balance",
            "/api/v1/me/balances",
            "/api/v1/balance"
          ]),
          getFirst([
            encoded ? "/api/bonusengine/api/v1/BonusSite/campaignAssignments/currency/" + encoded : "",
            "/api/v1/me/bonuses"
          ]),
          getFirst(["/api/v1/me/level", "/api/v1/me/category"])
        ]);
      })
      .then(function (parts) {
        accountDone = true;
        renderAccount(parts[0], parts[1], parts[2], parts[3]);
      })
      .catch(function () {})
      .then(function () {
        accountBusy = false;
      });
  }

  function tick() {
    rewriteSportsLinks();
    refreshAccount();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(tick, 250);
  }

  try {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  document.addEventListener("click", rewriteSportsLinks, true);
  setInterval(tick, 2000);
  schedule();
})();
