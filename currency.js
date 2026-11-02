/* ==========================================================================
   Price Check - currency.js
   The customer-facing Currency Conversion view.

   Kept apart from script.js on purpose: this is the only part of the app
   that touches the internet, and the main calculator never waits for it.
   Every word shown here comes from i18n.js, which loads first.
   Plain (vanilla) JavaScript only - no frameworks, no libraries.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CURRENCIES
   Add a line to extend the list:
     code      the three-letter code the rate is quoted against
     name      the English name, used when the browser cannot translate it
     decimals  how many decimal places to show; 0 for currencies normally
               quoted as whole numbers
     narrow    true to show the short symbol (¥906.25 rather than CN¥906.25).
               Left off for every other dollar, so CA$, MX$, A$, HK$ and NT$
               keep the prefix that tells them apart from the US dollar.
   -------------------------------------------------------------------------- */
var CURRENCIES = [
  { code: "USD", name: "US Dollar", decimals: 2, narrow: true },
  { code: "EUR", name: "Euro", decimals: 2, narrow: true },
  { code: "GBP", name: "British Pound", decimals: 2, narrow: true },
  { code: "JPY", name: "Japanese Yen", decimals: 0, narrow: true },
  { code: "KRW", name: "South Korean Won", decimals: 0, narrow: true },
  { code: "CNY", name: "Chinese Yuan", decimals: 2, narrow: true },
  { code: "CAD", name: "Canadian Dollar", decimals: 2 },
  { code: "MXN", name: "Mexican Peso", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", decimals: 2 },
  { code: "BRL", name: "Brazilian Real", decimals: 2, narrow: true },
  { code: "CHF", name: "Swiss Franc", decimals: 2, narrow: true },
  { code: "SGD", name: "Singapore Dollar", decimals: 2 },
  { code: "HKD", name: "Hong Kong Dollar", decimals: 2 },
  { code: "TWD", name: "Taiwan Dollar", decimals: 0 },
  { code: "INR", name: "Indian Rupee", decimals: 2, narrow: true },
  { code: "THB", name: "Thai Baht", decimals: 2, narrow: true },
  { code: "VND", name: "Vietnamese Dong", decimals: 0, narrow: true },
  { code: "RUB", name: "Russian Ruble", decimals: 2, narrow: true },
  { code: "AED", name: "UAE Dirham", decimals: 2 }
];

/* --------------------------------------------------------------------------
   Where the rates come from
   Both are free, need no account and no key, and are quoted against USD.
   The first one that answers wins; the second is only tried if the first
   fails. Neither is ever needed for the calculator itself to work.
   -------------------------------------------------------------------------- */
var RATE_SOURCES = [
  {
    url: "https://open.er-api.com/v6/latest/USD",
    read: function (data) {
      if (!data || data.result !== "success" || !data.rates) {
        return null;
      }
      return { rates: data.rates, updated: data.time_last_update_utc || "" };
    }
  },
  {
    url: "https://api.frankfurter.dev/v1/latest?base=USD",
    read: function (data) {
      if (!data || !data.rates) {
        return null;
      }
      var rates = {};
      for (var code in data.rates) {
        if (Object.prototype.hasOwnProperty.call(data.rates, code)) {
          rates[code] = data.rates[code];
        }
      }
      rates.USD = 1;
      return { rates: rates, updated: data.date || "" };
    }
  }
];

/* How long to wait on each source before giving up on it. */
var RATE_TIMEOUT_MS = 8000;

/* Name of the saved copy of the last rates that loaded successfully. */
var RATE_STORE_KEY = "priceCheckRates";

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
/* True once the currency has been picked from the list by hand. Until then
   the currency is only ever a suggestion made from the chosen language, and
   a new language is free to replace it. */
var currencyChosenByHand = false;

/* The one set of rates in hand, whether it was downloaded a minute ago or
   read back off the phone this morning:
   { rates: {...}, updated: "...", fetchedAt: 1762..., fetchedDay: "2026-11-01" } */
var autoRates = null;

var rateLoading = false;

/* True when the last attempt to download rates came back with nothing. On
   its own that is not an error - there may be a perfectly good saved rate
   to carry on with. */
var lastAttemptFailed = false;

/* True only when there is nothing usable at all: the download failed and
   nothing was saved. */
var rateFailed = false;

/* --------------------------------------------------------------------------
   Element references
   -------------------------------------------------------------------------- */
var viewPriceCheck = document.getElementById("viewPriceCheck");
var viewCurrency = document.getElementById("viewCurrency");
var openCurrencyBtn = document.getElementById("openCurrencyBtn");
var convertNative = document.getElementById("convertNative");
var backBtn = document.getElementById("backBtn");

var langGrid = document.getElementById("langGrid");
var usdAmountInput = document.getElementById("usdAmount");
var currencySelect = document.getElementById("currencySelect");

var ccUsd = document.getElementById("ccUsd");
var ccPrice = document.getElementById("ccPrice");
var ccSource = document.getElementById("ccSource");
var ccRateTime = document.getElementById("ccRateTime");

var rateValue = document.getElementById("rateValue");
var rateUpdated = document.getElementById("rateUpdated");
var rateStatus = document.getElementById("rateStatus");
var refreshBtn = document.getElementById("refreshBtn");

var autoRateNote = document.getElementById("autoRateNote");
var manualRateInput = document.getElementById("manualRateInput");
var manualRateCode = document.getElementById("manualRateCode");
var useAutoBtn = document.getElementById("useAutoBtn");

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function findCurrency(code) {
  for (var i = 0; i < CURRENCIES.length; i++) {
    if (CURRENCIES[i].code === code) {
      return CURRENCIES[i];
    }
  }
  return null;
}

/* Typed amounts are read with parseNumber from script.js, which loads
   first - one set of rules for every field in the app, including which
   way round a comma is meant. */
function toNumber(text) {
  return parseNumber(text);
}

/* True when the symbol a format would use is a bare "$" for something that
   is not the US dollar. That happens in a currency's home language - Taiwan
   writes NT$ as plain "$" - and on this screen, right under a US dollar
   total, a bare "$" is exactly the wrong thing to show a customer. */
function symbolIsBareDollar(locale, options, code) {
  if (code === "USD") {
    return false;
  }
  try {
    var parts = new Intl.NumberFormat(locale, options).formatToParts(1);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "currency") {
        return parts[i].value === "$";
      }
    }
  } catch (error) {
    /* No formatToParts: leave the format alone. */
  }
  return false;
}

/* Formats an amount in its own currency, in the customer's language:
   19530 JPY in Japanese -> "￥19,530", 109.32 EUR in German -> "109,32 €".
   Falls back to "CODE 123.45" on any browser that refuses the options. */
function formatCurrency(amount, currency) {
  var locale = currentLocale();
  var options = {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  };

  /* The short symbol keeps the big number short and recognisable: ¥906.25
     rather than CN¥906.25. Only for currencies whose short symbol stands on
     its own - every other dollar keeps its CA$ / HK$ / NT$ prefix. Older
     browsers reject the option, so they get the plain form instead. */
  if (currency.narrow) {
    try {
      options.currencyDisplay = "narrowSymbol";
      return new Intl.NumberFormat(locale, options).format(amount);
    } catch (error) {
      delete options.currencyDisplay;
    }
  }

  /* If even the full symbol would come out as a bare "$", show the code
     instead: "TWD 5,216" can never be mistaken for US dollars. */
  if (symbolIsBareDollar(locale, options, currency.code)) {
    options.currencyDisplay = "code";
  }

  try {
    return new Intl.NumberFormat(locale, options).format(amount);
  } catch (error) {
    return currency.code + " " + amount.toFixed(currency.decimals);
  }
}

/* Formats the rate itself: big numbers to 2 places, small ones to 4, so
   both "157.49" and "0.8956" read sensibly. */
function formatRate(rate) {
  var places = rate >= 100 ? 2 : 4;
  try {
    return new Intl.NumberFormat(currentLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: places
    }).format(rate);
  } catch (error) {
    return rate.toFixed(places);
  }
}

/* --------------------------------------------------------------------------
   Dates and times
   "Today" means the day on the phone in front of you, not UTC: rates
   downloaded at 8am in Las Vegas are still this morning's rates at 6pm,
   even though it is already tomorrow in London.
   -------------------------------------------------------------------------- */

function pad2(number) {
  return (number < 10 ? "0" : "") + number;
}

/* A moment in time as the phone's own calendar day: "2026-11-01". Written
   out rather than compared with Date objects so that two days are the same
   day only when the phone says they are. */
function localDay(ms) {
  var when = new Date(ms);
  return when.getFullYear() + "-" + pad2(when.getMonth() + 1) + "-" + pad2(when.getDate());
}

/* The clock time on the phone: "08:15". Saved purely so the stored record
   is readable; nothing is decided from it. */
function localTime(ms) {
  var when = new Date(ms);
  return pad2(when.getHours()) + ":" + pad2(when.getMinutes());
}

/* "Nov 1, 2026, 8:15 AM" in the customer's language. */
function formatDateTime(ms) {
  var when = new Date(ms);
  try {
    return when.toLocaleString(currentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch (error) {
    return when.toString();
  }
}

/* "Oct 31, 2026" - the day on its own, for the old-rate warning. */
function formatDay(ms) {
  var when = new Date(ms);
  try {
    return when.toLocaleDateString(currentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return when.toDateString();
  }
}

/* "Sat, 31 Oct 2026 00:02:31 +0000" or "2026-10-30" -> a short local date.
   Only used for rates saved by an older version of the app, which recorded
   the day the rate was quoted for but not when it was downloaded. */
function formatUpdated(text) {
  if (!text) {
    return "—";
  }
  var when = new Date(text);
  if (isNaN(when.getTime())) {
    return text;
  }
  try {
    return when.toLocaleDateString(currentLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return when.toDateString();
  }
}

/* The currency's own name in the customer's language where the browser
   knows it ("Japanese Yen" -> "日本円"), otherwise the English name. */
function currencyLabel(currency) {
  var name = currency.name;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
      var names = new Intl.DisplayNames([currentLocale()], { type: "currency" });
      var translated = names.of(currency.code);
      if (translated && translated !== currency.code) {
        name = translated;
      }
    }
  } catch (error) {
    /* Older browser: the English name is perfectly readable. */
  }
  return currency.code + " — " + name;
}

/* --------------------------------------------------------------------------
   Saving the day's rates on the phone

   This is what makes the converter work through a shift with no signal:
   load the rates once in the morning and they stay on the phone, through
   closing the app, reopening it, and opening it from the Home Screen.

   Saved alongside the rates are the day and the time they were downloaded.
   The day is what decides whether they still count as today's; the time is
   there so the screen can say exactly how old they are.

   Wrapped in try/catch because private browsing can refuse storage outright.
   -------------------------------------------------------------------------- */
function saveRates(result) {
  try {
    window.localStorage.setItem(RATE_STORE_KEY, JSON.stringify(result));
  } catch (error) {
    /* Nothing saved is not a problem; the rate just will not be there next time. */
  }
}

function loadSavedRates() {
  try {
    var stored = window.localStorage.getItem(RATE_STORE_KEY);
    if (!stored) {
      return null;
    }
    var parsed = JSON.parse(stored);
    if (parsed && parsed.rates && typeof parsed.rates === "object") {
      return parsed;
    }
  } catch (error) {
    /* Unreadable or blocked: carry on without it. */
  }
  return null;
}

/* --------------------------------------------------------------------------
   Fetching the rates
   -------------------------------------------------------------------------- */

/* One source, with its own time limit. Resolves with the rates or null. */
function fetchSource(source) {
  return new Promise(function (resolve) {
    var done = false;

    function finish(value) {
      if (!done) {
        done = true;
        resolve(value);
      }
    }

    var timer = setTimeout(function () {
      finish(null);
    }, RATE_TIMEOUT_MS);

    fetch(source.url, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("bad response");
        }
        return response.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        finish(source.read(data));
      })
      .catch(function () {
        clearTimeout(timer);
        finish(null);
      });
  });
}

/* Tries each source in turn and stops at the first that answers. */
function fetchRates() {
  if (rateLoading) {
    return;
  }
  rateLoading = true;
  rateFailed = false;
  lastAttemptFailed = false;
  render();

  var index = 0;

  function tryNext() {
    if (index >= RATE_SOURCES.length) {
      rateLoading = false;
      lastAttemptFailed = true;
      /* Only a hard failure if there is nothing saved to fall back on. A
         saved rate means the conversion still works, so the screen says
         the update did not go through rather than showing an error. */
      rateFailed = autoRates === null;
      render();
      return;
    }

    var source = RATE_SOURCES[index];
    index = index + 1;

    fetchSource(source).then(function (result) {
      if (result) {
        /* When it was downloaded, not just the day it is quoted for: that
           is what decides whether it still counts as today's rate. */
        var now = Date.now();
        result.fetchedAt = now;
        result.fetchedDay = localDay(now);
        result.fetchedTime = localTime(now);

        autoRates = result;
        rateLoading = false;
        rateFailed = false;
        lastAttemptFailed = false;
        saveRates(result);

        /* The price on screen is redrawn from the new rate straight away. */
        render();
        return;
      }
      tryNext();
    });
  }

  tryNext();
}

/* When the rates in hand were downloaded, or null if that is not recorded
   (a rate saved by a much older version of the app). */
function ratesFetchedAt() {
  if (autoRates && typeof autoRates.fetchedAt === "number" && !isNaN(autoRates.fetchedAt)) {
    return autoRates.fetchedAt;
  }
  return null;
}

/* True when the rates in hand were downloaded today, on this phone's own
   calendar. This is the whole point of the daily cache: while it is true,
   nothing is downloaded. */
function ratesAreFromToday() {
  if (!autoRates) {
    return false;
  }
  var today = localDay(Date.now());

  /* The day written down at the moment of downloading is the honest
     answer, so it wins over working it out again now. */
  if (typeof autoRates.fetchedDay === "string") {
    return autoRates.fetchedDay === today;
  }

  var when = ratesFetchedAt();
  return when !== null && localDay(when) === today;
}

/* The phone's own opinion of whether it is connected. Only ever used to
   skip an attempt nobody asked for: it is wrong often enough - hotel wifi,
   a sign-in page - that it must never be what stops someone who has
   deliberately pressed Update Rate. */
function looksOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/* Downloads today's rates, but only if they are not already here. Pressing
   Update Rate calls fetchRates directly and ignores all of this. */
function refreshIfNeeded() {
  if (ratesAreFromToday()) {
    return;
  }
  if (looksOffline()) {
    return;
  }
  fetchRates();
}

/* --------------------------------------------------------------------------
   The rate actually in use

   In order of preference:
     1. a rate typed in by hand, for as long as it is in the box
     2. the saved rates, if they were downloaded today
     3. the saved rates from whichever day they are from
     4. nothing - and then a download is attempted, if there is a signal

   2 and 3 are the same saved set; only one is ever kept, so the choice
   between them is really only about what the screen says about its age.
   Nothing here touches the network: a conversion never waits on it.
   -------------------------------------------------------------------------- */

/* Returns { rate, manual } or null when no usable rate exists yet. */
function activeRate(code) {
  var typed = toNumber(manualRateInput.value);
  if (!isNaN(typed) && typed > 0) {
    return { rate: typed, manual: true };
  }
  if (autoRates && typeof autoRates.rates[code] === "number") {
    return { rate: autoRates.rates[code], manual: false };
  }
  return null;
}

/* --------------------------------------------------------------------------
   Drawing the view
   render() redraws every label and number from the current state, so one
   function covers a language change, a new amount, and a new rate alike.
   -------------------------------------------------------------------------- */

/* The language buttons, one per entry in LANGUAGES, each in its own name. */
function buildLanguageButtons() {
  for (var i = 0; i < LANGUAGES.length; i++) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lang-btn";
    button.setAttribute("data-lang", LANGUAGES[i].code);
    button.lang = LANGUAGES[i].code;
    button.textContent = LANGUAGES[i].name;
    langGrid.appendChild(button);
  }
}

/* The way in from the calculator carries the chosen language under the
   English, so the customer can read it. English alone when English is the
   chosen language - there is nothing to add. */
function updateConvertButton() {
  if (appLanguage === "en") {
    convertNative.textContent = "";
    convertNative.hidden = true;
    return;
  }
  convertNative.textContent = t("title");
  convertNative.hidden = false;
}

/* Puts every translated label in place. */
function applyLanguage() {
  applyTranslations(viewCurrency);
  applyDirection(viewCurrency);

  var buttons = langGrid.querySelectorAll(".lang-btn");
  for (var j = 0; j < buttons.length; j++) {
    var isOn = buttons[j].getAttribute("data-lang") === appLanguage;
    buttons[j].classList.toggle("is-selected", isOn);
    buttons[j].setAttribute("aria-pressed", isOn ? "true" : "false");
  }

  /* The picker is rebuilt because the currency names are translated too. */
  var chosen = currencySelect.value;
  currencySelect.textContent = "";

  var prompt = document.createElement("option");
  prompt.value = "";
  prompt.textContent = t("selectPrompt");
  currencySelect.appendChild(prompt);

  for (var k = 0; k < CURRENCIES.length; k++) {
    var option = document.createElement("option");
    option.value = CURRENCIES[k].code;
    option.textContent = currencyLabel(CURRENCIES[k]);
    currencySelect.appendChild(option);
  }

  currencySelect.value = chosen;
}

/* Keeps the big number readable however long it is. */
function sizePrice(text) {
  ccPrice.classList.remove("is-long", "is-xlong");
  if (text.length > 12) {
    ccPrice.classList.add("is-xlong");
  } else if (text.length > 9) {
    ccPrice.classList.add("is-long");
  }
}

function render() {
  applyLanguage();

  var usd = toNumber(usdAmountInput.value);
  var hasUsd = !isNaN(usd) && usd >= 0;
  var code = currencySelect.value;
  var currency = findCurrency(code);

  /* The USD line above the big number. */
  var usdCurrency = findCurrency("USD");
  ccUsd.textContent = hasUsd ? formatCurrency(usd, usdCurrency) : "—";

  var rate = currency ? activeRate(code) : null;

  manualRateCode.textContent = currency ? currency.code : "";

  /* The automatic rate, shown inside the manual panel for comparison. */
  if (currency && autoRates && typeof autoRates.rates[code] === "number") {
    autoRateNote.textContent =
      t("automaticRate") + ": 1 USD = " +
      formatRate(autoRates.rates[code]) + " " + code;
  } else {
    autoRateNote.textContent = t("automaticRate") + ": —";
  }

  var fetchedAt = ratesFetchedAt();
  var fromToday = ratesAreFromToday();

  /* The rate rows. */
  if (currency && rate) {
    rateValue.textContent = "1 USD = " + formatRate(rate.rate) + " " + code;
    if (rate.manual) {
      rateUpdated.textContent = t("manualInUse");
    } else if (fetchedAt !== null) {
      rateUpdated.textContent = formatDateTime(fetchedAt);
    } else {
      rateUpdated.textContent = formatUpdated(autoRates ? autoRates.updated : "");
    }
  } else {
    rateValue.textContent = rateLoading ? t("loading") : "—";
    rateUpdated.textContent = "—";
  }

  /* Where the number being shown to the customer came from, in their own
     language and kept small: it belongs under the price, not beside it. */
  var source = "";
  var sourceIsOld = false;
  if (currency && rate) {
    if (rate.manual) {
      source = t("manualInUse");
    } else if (fromToday) {
      source = t("savedRateToday");
    } else if (fetchedAt !== null) {
      /* Still perfectly usable - just worth saying out loud how old it is. */
      source = tf("oldRate", formatDay(fetchedAt));
      sourceIsOld = true;
    } else {
      source = t("savedRate");
    }
  }

  ccSource.textContent = source;
  ccSource.hidden = source === "";
  ccSource.classList.toggle("is-old", sourceIsOld);

  var showTime = currency && rate && !rate.manual && fetchedAt !== null;
  ccRateTime.textContent = showTime ? tf("rateUpdatedAt", formatDateTime(fetchedAt)) : "";
  ccRateTime.hidden = !showTime;

  /* One short status line under the rate, whichever applies. It is for
     whoever is holding the phone, so it says what to do about it. */
  var usable = Boolean(currency && rate);
  var status = "";
  var isError = false;

  if (rateLoading && !usable) {
    status = t("loading");
  } else if (!usable && rateFailed) {
    /* Nothing saved and the download failed: no conversion is possible. */
    status = t("rateError");
    isError = true;
  } else if (!usable && !autoRates && !rateLoading) {
    /* Never downloaded on this phone - offline on the very first run. */
    status = t("noSavedRate");
  } else if (!usable && currency && autoRates) {
    status = t("rateMissing");
  } else if (usable && !rate.manual && lastAttemptFailed) {
    /* The saved rate is carrying on; only the update failed. */
    status = t("rateUpdateFailed");
  } else if (!hasUsd) {
    status = t("enterAmount");
  }

  rateStatus.textContent = status;
  rateStatus.hidden = status === "";
  rateStatus.classList.toggle("is-error", isError);

  /* The button is always there. After a failure it asks to try again;
     otherwise it offers a newer rate than the one on screen. */
  refreshBtn.textContent = rateFailed ? t("tryAgain") : t("refreshRate");
  refreshBtn.disabled = rateLoading;

  /* The big customer-facing number. */
  if (currency && rate && hasUsd) {
    var converted = usd * rate.rate;
    var text = formatCurrency(converted, currency);
    ccPrice.textContent = text;
    sizePrice(text);
  } else {
    ccPrice.textContent = "—";
    sizePrice("—");
  }
}

/* Points the currency picker at the one a speaker of the chosen language
   usually asks for.

   A currency picked from the list by hand is never overwritten - that is a
   decision, and switching language must not undo it. A currency that is only
   there because an earlier language suggested it is not a decision, and it
   does follow: going from Español to 日本語 has to leave yen, not pesos. */
function suggestCurrency() {
  if (currencyChosenByHand) {
    return;
  }
  var suggested = languageInfo(appLanguage).currency;
  if (suggested && findCurrency(suggested)) {
    currencySelect.value = suggested;
  }
}

/* --------------------------------------------------------------------------
   Opening and closing the view
   Both views live in the same page, so going back leaves the Price Check
   calculation exactly as it was.
   -------------------------------------------------------------------------- */
function openCurrency() {
  /* Carry the Final Total over as the USD amount. */
  var carried = window.PriceCheck ? window.PriceCheck.finalTotal : null;
  if (typeof carried === "number" && !isNaN(carried)) {
    usdAmountInput.value = carried.toFixed(2);
  }

  viewPriceCheck.hidden = true;
  viewCurrency.hidden = false;
  window.scrollTo(0, 0);

  suggestCurrency();
  render();

  /* Nothing is downloaded if today's rates are already on the phone. The
     usual day is one download in the morning and none after that. */
  refreshIfNeeded();
}

function closeCurrency() {
  viewCurrency.hidden = true;
  viewPriceCheck.hidden = false;
  /* The way back in should always read in the language just used. */
  updateConvertButton();
  window.scrollTo(0, 0);
}

/* --------------------------------------------------------------------------
   Wiring
   -------------------------------------------------------------------------- */
openCurrencyBtn.addEventListener("click", openCurrency);
backBtn.addEventListener("click", closeCurrency);

langGrid.addEventListener("click", function (event) {
  var button = event.target.closest ? event.target.closest(".lang-btn") : null;
  if (!button) {
    return;
  }
  /* Nothing reloads: the amount, the currency and the rate all stay put. */
  setLanguage(button.getAttribute("data-lang"));
});

/* Whichever screen the language was chosen on, this view follows. */
onLanguageChange(function () {
  suggestCurrency();
  updateConvertButton();
  render();
});

currencySelect.addEventListener("change", function () {
  /* Picking from the list is a decision; going back to the blank entry is
     not, so the suggestion takes over again. */
  currencyChosenByHand = currencySelect.value !== "";

  /* A rate typed in by hand belongs to the currency it was typed for.
     Carrying 150 from yen over to euros would quietly convert at
     1 USD = 150 EUR, so it is cleared and the automatic rate takes over. */
  manualRateInput.value = "";

  render();
});
usdAmountInput.addEventListener("input", render);
manualRateInput.addEventListener("input", render);

useAutoBtn.addEventListener("click", function () {
  manualRateInput.value = "";
  render();
});

refreshBtn.addEventListener("click", fetchRates);

/* Coming back to a phone that has been asleep is how a screen left open
   overnight ends up showing yesterday's rate. Still nothing is downloaded
   unless the day has actually turned over. */
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && !viewCurrency.hidden) {
    refreshIfNeeded();
  }
});

/* A signal coming back is the moment to pick up today's rates, if the app
   opened without them. */
window.addEventListener("online", function () {
  if (!viewCurrency.hidden) {
    refreshIfNeeded();
  }
});

/* --------------------------------------------------------------------------
   Start up
   The saved rates are read off the phone now - that is a local read, not a
   download, so it costs nothing and works with no signal. Nothing is
   fetched until the view is opened, and the calculator never waits on the
   network for anything.
   -------------------------------------------------------------------------- */
autoRates = loadSavedRates();

buildLanguageButtons();
applyLanguage();
updateConvertButton();
