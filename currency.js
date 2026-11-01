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

/* How old a rate may be before the view quietly fetches a new one. The
   screen can be left open for a whole shift, and a rate from this morning
   should not still be the one shown to a customer this evening. */
var RATE_MAX_AGE_MS = 30 * 60 * 1000;

/* Name of the saved copy of the last rates that loaded successfully. */
var RATE_STORE_KEY = "priceCheckRates";

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
/* True once the currency has been picked from the list by hand. Until then
   the currency is only ever a suggestion made from the chosen language, and
   a new language is free to replace it. */
var currencyChosenByHand = false;

var autoRates = null;      /* { rates: {...}, updated: "..." } or null */
var ratesAreSaved = false; /* true when autoRates came off the phone, not the network */
var rateLoading = false;
var rateFailed = false;
var hasLoadedOnce = false;

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

/* "Sat, 31 Oct 2026 00:02:31 +0000" or "2026-10-30" -> a short local date. */
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
   Saving the last good rates on the phone
   So the view still shows something useful on a dead signal. Wrapped in
   try/catch because private browsing can refuse storage outright.
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
  render();

  var index = 0;

  function tryNext() {
    if (index >= RATE_SOURCES.length) {
      rateLoading = false;
      /* Only a hard failure if there is nothing saved to fall back on. */
      rateFailed = autoRates === null;
      render();
      return;
    }

    var source = RATE_SOURCES[index];
    index = index + 1;

    fetchSource(source).then(function (result) {
      if (result) {
        /* When it was taken, not just the day it is quoted for: that is
           what decides whether it is worth asking again. */
        result.fetchedAt = Date.now();
        autoRates = result;
        ratesAreSaved = false;
        rateLoading = false;
        rateFailed = false;
        saveRates(result);
        render();
        return;
      }
      tryNext();
    });
  }

  tryNext();
}

/* True when there is no rate yet, when the one in hand came off the phone
   rather than the network, or when it is simply old. */
function ratesAreStale() {
  if (!autoRates || ratesAreSaved) {
    return true;
  }
  if (typeof autoRates.fetchedAt !== "number") {
    return true;
  }
  return Date.now() - autoRates.fetchedAt > RATE_MAX_AGE_MS;
}

function refreshIfStale() {
  if (ratesAreStale()) {
    fetchRates();
  }
}

/* --------------------------------------------------------------------------
   The rate actually in use
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

  /* The rate rows. */
  if (currency && rate) {
    rateValue.textContent = "1 USD = " + formatRate(rate.rate) + " " + code;
    rateUpdated.textContent = rate.manual
      ? t("manualInUse")
      : formatUpdated(autoRates ? autoRates.updated : "");
  } else {
    rateValue.textContent = rateLoading ? t("loading") : "—";
    rateUpdated.textContent = "—";
  }

  /* One short status line under the rate, whichever applies. */
  var status = "";
  if (rateLoading && !rate) {
    status = t("loading");
  } else if (rateFailed) {
    status = t("rateError");
  } else if (currency && !rate && autoRates) {
    status = t("rateMissing");
  } else if (rate && !rate.manual && ratesAreSaved) {
    status = t("savedRate");
  } else if (!hasUsd) {
    status = t("enterAmount");
  }

  rateStatus.textContent = status;
  rateStatus.hidden = status === "";
  rateStatus.classList.toggle("is-error", rateFailed);

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

  if (!hasLoadedOnce) {
    hasLoadedOnce = true;

    /* Show the saved rate straight away, then refresh it. */
    var saved = loadSavedRates();
    if (saved) {
      autoRates = saved;
      ratesAreSaved = true;
    }
  }

  suggestCurrency();
  render();

  /* Every opening checks the age of the rate, not just the first one. */
  refreshIfStale();
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

/* Coming back to a phone that has been asleep, or to a tab left open all
   shift, is the usual way a stale rate ends up in front of a customer. */
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && !viewCurrency.hidden) {
    refreshIfStale();
  }
});

/* --------------------------------------------------------------------------
   Start up
   Only the labels are drawn now. Nothing is fetched until the view is
   opened, so the calculator never waits on the network.
   -------------------------------------------------------------------------- */
buildLanguageButtons();
applyLanguage();
updateConvertButton();
