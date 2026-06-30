(function () {
  if (window.__DMBO_ADV_COMPAT_V1__) return;
  window.__DMBO_ADV_COMPAT_V1__ = true;

  var accountBusy = false;
  var accountDone = false;
  var lastAccountParts = null;
  var timer = 0;

  function clean(v) {
    return String(v || "").trim().toLowerCase();
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function accountBalanceMode() {
    return window.__DMBO_ACCOUNT_BALANCE_MODE__ === "all" ? "all" : "base";
  }

  function accountBalanceDisplay(summary, mode) {
    var activeMode = mode === "all" ? "all" : "base";
    var baseValue = summary && summary.balance ? summary.balance : "-";
    var allValue = summary && summary.allBalances ? summary.allBalances : "-";
    var value = activeMode === "all" ? allValue : baseValue;

    if (!value || value === "-") {
      activeMode = "base";
      value = baseValue || "-";
    }

    return {
      label: activeMode === "all" ? "All Balances" : "Base Balance",
      value: value || "-",
      mode: activeMode
    };
  }

  function renderBalanceToggle(mode) {
    return '<div class="bal-toggle" role="group" aria-label="Balance display">' +
      '<button type="button" data-dmbo-balance-mode="base" class="' + (mode === "base" ? "on" : "") + '">Base</button>' +
      '<button type="button" data-dmbo-balance-mode="all" class="' + (mode === "all" ? "on" : "") + '">All</button>' +
      '</div>';
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

  function preferredValue(data, keys) {
    var value = "";

    (keys || []).some(function (key) {
      value = directValue(data, [key]);
      return !!value;
    });

    return value;
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

  function preferredRawValue(data, keys) {
    var value;

    (keys || []).some(function (key) {
      value = rawValue(data, [key]);
      return value !== undefined && value !== null && scalar(value) !== "";
    });

    return value;
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

  function cleanCurrencyCode(v) {
    var code = String(v || "").trim().toUpperCase();

    if (!code || code.length > 12 || !/^[A-Z0-9._-]+$/.test(code)) return "";

    return code;
  }

  function addCurrencyAmount(out, currency, amount) {
    var code = cleanCurrencyCode(currency);
    var value = amount == null ? "" : String(amount);

    if (!code || value === "" || typeof amount === "object") return;

    out[code] = value;
  }

  function addCurrencyMap(out, raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

    Object.keys(raw).forEach(function (key) {
      if (raw[key] != null && typeof raw[key] !== "object") addCurrencyAmount(out, key, raw[key]);
    });
  }

  function mergeCurrencyAmounts(out, source) {
    Object.keys(source || {}).forEach(function (key) {
      addCurrencyAmount(out, key, source[key]);
    });
  }

  function itemAmount(v, keys) {
    var amount = "";

    (keys || []).some(function (key) {
      if (v && v[key] != null) {
        amount = mapAmount(v[key], "");
        return !!amount;
      }
      return false;
    });

    return amount;
  }

  function collectCurrencyAmounts(data, wantedType, mapKeys, itemKeys) {
    var out = {};
    var wanted = accountTypeKey(wantedType);

    (mapKeys || []).forEach(function (key) {
      addCurrencyMap(out, rawValue(data, [key]));
    });

    function walk(v) {
      var itemType;
      var currency;
      var amount;

      if (v == null) return;
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      if (typeof v !== "object") return;

      itemType = accountTypeKey(v.type || v.balanceType || v.accountType || v.name || v.code);
      if (!wanted || itemType === wanted) {
        currency = v.currency || v.currencyCode || v.currencyName || v.displayCurrency || v.id;
        amount = itemAmount(v, itemKeys);
        addCurrencyAmount(out, currency, amount);
      }

      Object.keys(v).forEach(function (key) {
        walk(v[key]);
      });
    }

    walk(data);
    return out;
  }

  function formatCurrencyAmounts(map, preferredCurrency) {
    var preferred = cleanCurrencyCode(preferredCurrency);
    var keys = Object.keys(map || {}).filter(function (key) {
      return map[key] != null && map[key] !== "";
    }).sort();

    if (preferred && keys.indexOf(preferred) > 0) {
      keys.splice(keys.indexOf(preferred), 1);
      keys.unshift(preferred);
    }

    return keys.length ? keys.map(function (key) {
      return key + " " + map[key];
    }).join(" · ") : "-";
  }

  function prettyStatus(value) {
    var raw = scalar(value);
    var text;

    if (raw === "true") return "Verified";
    if (raw === "false") return "Unverified";
    if (!raw) return "";

    text = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!text) return "";

    return text.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
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

  function renderAccount(profile, userInfo, balances, accounts, baseBalanceData, bonuses, level) {
    var box = document.getElementById("dmbo-account");
    var profileData = { userInfo: userInfo || {}, profile: profile || {} };
    var currency = preferredValue(profileData, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]) || directValue(balances, ["currency", "currencyCode", "activeCurrency", "displayCurrency"]) || directValue(accounts, ["currency", "currencyCode", "activeCurrency", "displayCurrency"]) || directValue(bonuses, ["currency", "currencyCode", "activeCurrency", "displayCurrency"]);
    var baseCurrency = directValue(baseBalanceData, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]) || currency;
    var balanceMap = collectCurrencyAmounts(balances, "playerAccount", ["used", "playerAccount", "balance"], ["balance", "amount", "availableAmount", "availableBalance", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "total", "totalBalance"]);
    mergeCurrencyAmounts(balanceMap, collectCurrencyAmounts(accounts, "playerAccount", ["used", "playerAccount", "balance"], ["balance", "amount", "availableAmount", "availableBalance", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "total", "totalBalance"]));
    var baseBalance = entryAmount(baseBalanceData, "playerAccount", baseCurrency) || amount(baseBalanceData, ["balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "amount", "total", "totalBalance"], baseCurrency);
    var baseBonus = entryAmount(baseBalanceData, "playerUnusedBalance", baseCurrency) || amount(baseBalanceData, ["bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance"], baseCurrency);
    if (!baseBalance && currency && balanceMap[cleanCurrencyCode(currency)] != null) {
      baseBalance = balanceMap[cleanCurrencyCode(currency)];
      baseCurrency = currency;
    }
    if (baseBalance) addCurrencyAmount(balanceMap, baseCurrency || currency, baseBalance);
    var balance = baseBalance || entryAmount(balances, "playerAccount", currency) || amount(balances, ["used", "playerAccount", "balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash", "amount", "total", "totalBalance"], currency) || amount(profileData, ["balance", "availableBalance", "availableAmount", "realBalance", "realAmount", "currentBalance", "mainBalance", "cash"], currency);
    var bonus = baseBonus || entryAmount(balances, "playerUnusedBalance", currency) || amount(balances, ["unUsed", "unused", "playerUnusedBalance", "bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance"], currency) || amount(bonuses, ["bonusBalance", "bonus", "bonusAmount", "activeBonus", "activeBonusBalance", "wageringBalance", "freeBetBalance", "freeSpinBalance", "amount", "total", "count"], currency);
    var allBalances = formatCurrencyAmounts(balanceMap, currency);
    var name = preferredValue(profileData, ["userName", "username", "email", "phone", "firstName", "name"]) || "Signed in";
    var uid = preferredValue(profileData, ["walletNumber", "walletNo", "accountNumber", "accountNo", "customerNumber", "clientNumber", "playerNumber", "publicId", "publicID", "id", "uid", "playerId", "userId"]) || "-";
    var lvl = directValue(level, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]) || directValue(profileData, ["level", "levelName", "currentLevel", "currentLevelName", "playerLevel", "loyaltyLevel", "loyaltyLevelName", "levelTitle", "rank", "tier", "vipLevel"]) || "-";
    var category = directValue(level, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]) || directValue(profileData, ["category", "categoryName", "segment", "playerCategory", "vipCategory"]) || "-";
    var status = prettyStatus(preferredRawValue(profileData, ["verificationStatus", "kycStatus", "kycVerificationStatus", "accountStatus", "playerStatus", "isVerified", "verified", "status"])) || prettyStatus(preferredRawValue(level, ["verificationStatus", "kycStatus", "kycVerificationStatus", "accountStatus", "playerStatus", "isVerified", "verified", "status"])) || "Live";
    var balanceValue = balance ? balance + (baseCurrency ? " " + baseCurrency : "") : "-";
    var bonusValue = bonus ? bonus + (baseCurrency ? " " + baseCurrency : "") : "-";
    var balanceDisplay = accountBalanceDisplay({
      balance: balanceValue,
      allBalances: allBalances
    }, accountBalanceMode());

    if (!box || hasLoginCta()) return;
    lastAccountParts = [profile, userInfo, balances, accounts, baseBalanceData, bonuses, level];

    box.innerHTML = '<div class="t"><span>Player Status</span><span class="m">' + esc(status) + '</span></div>' +
      '<div class="kv">' +
      '<div><span>User</span><b>' + esc(name) + '</b></div>' +
      '<div><span>ID</span><b>' + esc(uid) + '</b></div>' +
      '<div class="wide"><span>' + esc(balanceDisplay.label) + '</span><b>' + esc(balanceDisplay.value) + '</b>' + renderBalanceToggle(balanceDisplay.mode) + '</div>' +
      '<div><span>Bonus</span><b>' + esc(bonusValue) + '</b></div>' +
      '<div><span>Level</span><b>' + esc(lvl) + '</b></div>' +
      '<div><span>Category</span><b>' + esc(category) + '</b></div>' +
      '</div>';
  }

  function installBalanceToggle() {
    if (window.__DMBO_ACCOUNT_BALANCE_TOGGLE__) return;
    window.__DMBO_ACCOUNT_BALANCE_TOGGLE__ = true;

    document.addEventListener("click", function (ev) {
      var target = ev && ev.target;
      var btn = null;
      var mode;

      try {
        btn = target && target.closest ? target.closest("[data-dmbo-balance-mode]") : null;
      } catch (e) {
        btn = null;
      }

      if (!btn || !lastAccountParts) return;
      mode = btn.getAttribute("data-dmbo-balance-mode") === "all" ? "all" : "base";
      window.__DMBO_ACCOUNT_BALANCE_MODE__ = mode;
      renderAccount(lastAccountParts[0], lastAccountParts[1], lastAccountParts[2], lastAccountParts[3], lastAccountParts[4], lastAccountParts[5], lastAccountParts[6]);
    }, true);
  }

  function refreshAccount() {
    if (accountBusy || accountDone || hasLoginCta() || !document.getElementById("dmbo-account")) return;

    accountBusy = true;
    getJson("/api/v1/me")
      .then(function (profile) {
        return getFirst(["/api/user/api/v1.0/users/userinfo"]).then(function (userInfo) {
          var profileData = { userInfo: userInfo || {}, profile: profile || {} };
          var currency = preferredValue(profileData, ["preferredCurrency", "preferredCurrencyCode", "currency", "currencyCode", "activeCurrency", "displayCurrency"]);
          var encoded = currency ? encodeURIComponent(currency) : "";

          return Promise.all([
            Promise.resolve(profile),
            Promise.resolve(userInfo),
            getFirst([
              encoded ? "/api/platform/api/v1.0/user/balances?currency=" + encoded : "",
              "/api/platform/api/v1.0/user/balances",
              "/api/v1/me/balances",
              "/api/v1/balance"
            ]),
            getFirst([
              encoded ? "/api/platform/api/v1.0/user/accounts?currency=" + encoded : "",
              "/api/platform/api/v1.0/user/accounts"
            ]),
            getFirst([
              encoded ? "/api/platform/api/v1.0/user/balance?currency=" + encoded : "",
              "/api/platform/api/v1.0/user/balance"
            ]),
            getFirst([
              encoded ? "/api/bonusengine/api/v1/BonusSite/campaignAssignments/currency/" + encoded : "",
              "/api/v1/me/bonuses"
            ]),
            getFirst(["/api/v1/me/level", "/api/v1/me/category"])
          ]);
        });
      })
      .then(function (parts) {
        accountDone = true;
        renderAccount(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]);
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

  installBalanceToggle();
  document.addEventListener("click", rewriteSportsLinks, true);
  setInterval(tick, 2000);
  schedule();
})();
