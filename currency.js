/* ==========================================================================
   Price Check - currency.js
   The customer-facing Currency Conversion view.

   Kept apart from script.js on purpose: this is the only part of the app
   that touches the internet, and the main calculator never waits for it.
   Plain (vanilla) JavaScript only - no frameworks, no libraries.
   ========================================================================== */

/* --------------------------------------------------------------------------
   TRANSLATIONS  --  SINGLE SOURCE OF TRUTH
   One block per language, same keys in each. English is the fallback: any
   key missing from a language falls back to the English wording, so a gap
   shows readable text rather than nothing. Nothing here is fetched or
   translated at run time.
   -------------------------------------------------------------------------- */
var TRANSLATIONS = {
  en: {
    chooseLanguage: "Choose your language",
    title: "Currency Conversion",
    usdAmount: "USD Amount",
    selectCurrency: "Select Currency",
    selectPrompt: "Choose a currency",
    exchangeRate: "Exchange Rate",
    lastUpdated: "Last Updated",
    usdTotal: "USD Total",
    customerPrice: "Customer Price",
    back: "Back to Price Check",
    loading: "Loading…",
    rateError: "Unable to retrieve exchange rate",
    tryAgain: "Try Again",
    disclaimer: "Estimated conversion. Your bank or card issuer may use a different exchange rate.",
    manualRate: "Manual Rate",
    automaticRate: "Automatic Rate",
    useAutomaticRate: "Use Automatic Rate",
    manualInUse: "Manual rate in use",
    savedRate: "Saved rate — no connection right now",
    enterAmount: "Enter a USD amount",
    rateMissing: "This currency is not available right now"
  },

  es: {
    chooseLanguage: "Elige tu idioma",
    title: "Conversión de moneda",
    usdAmount: "Importe en USD",
    selectCurrency: "Selecciona la moneda",
    selectPrompt: "Elige una moneda",
    exchangeRate: "Tipo de cambio",
    lastUpdated: "Última actualización",
    usdTotal: "Total en USD",
    customerPrice: "Precio para el cliente",
    back: "Volver a Price Check",
    loading: "Cargando…",
    rateError: "No se pudo obtener el tipo de cambio",
    tryAgain: "Intentar de nuevo",
    disclaimer: "Conversión estimada. Tu banco o la entidad emisora de tu tarjeta puede aplicar un tipo de cambio diferente.",
    manualRate: "Tipo de cambio manual",
    automaticRate: "Tipo de cambio automático",
    useAutomaticRate: "Usar el tipo de cambio automático",
    manualInUse: "Se está usando el tipo de cambio manual",
    savedRate: "Tipo de cambio guardado: ahora no hay conexión",
    enterAmount: "Introduce un importe en USD",
    rateMissing: "Esta moneda no está disponible ahora mismo"
  },

  zh: {
    chooseLanguage: "请选择语言",
    title: "货币换算",
    usdAmount: "美元金额",
    selectCurrency: "选择货币",
    selectPrompt: "请选择货币",
    exchangeRate: "汇率",
    lastUpdated: "最后更新",
    usdTotal: "美元总额",
    customerPrice: "顾客价格",
    back: "返回 Price Check",
    loading: "加载中…",
    rateError: "无法获取汇率",
    tryAgain: "重试",
    disclaimer: "换算金额仅供参考。您的银行或发卡机构可能使用不同的汇率。",
    manualRate: "手动汇率",
    automaticRate: "自动汇率",
    useAutomaticRate: "使用自动汇率",
    manualInUse: "正在使用手动汇率",
    savedRate: "已保存的汇率 — 当前没有网络连接",
    enterAmount: "请输入美元金额",
    rateMissing: "此货币暂时无法使用"
  },

  ja: {
    chooseLanguage: "言語を選んでください",
    title: "通貨換算",
    usdAmount: "米ドル金額",
    selectCurrency: "通貨を選択",
    selectPrompt: "通貨を選んでください",
    exchangeRate: "為替レート",
    lastUpdated: "最終更新",
    usdTotal: "米ドル合計",
    customerPrice: "お客様価格",
    back: "Price Check に戻る",
    loading: "読み込み中…",
    rateError: "為替レートを取得できませんでした",
    tryAgain: "もう一度試す",
    disclaimer: "概算の換算額です。ご利用の銀行やカード会社では異なる為替レートが適用される場合があります。",
    manualRate: "手動レート",
    automaticRate: "自動レート",
    useAutomaticRate: "自動レートを使う",
    manualInUse: "手動レートを使用中",
    savedRate: "保存されたレート（現在オフライン）",
    enterAmount: "米ドル金額を入力してください",
    rateMissing: "この通貨は現在ご利用いただけません"
  },

  ko: {
    chooseLanguage: "언어를 선택하세요",
    title: "환율 변환",
    usdAmount: "미국 달러 금액",
    selectCurrency: "통화 선택",
    selectPrompt: "통화를 선택하세요",
    exchangeRate: "환율",
    lastUpdated: "마지막 업데이트",
    usdTotal: "미국 달러 합계",
    customerPrice: "고객 가격",
    back: "Price Check로 돌아가기",
    loading: "불러오는 중…",
    rateError: "환율을 가져올 수 없습니다",
    tryAgain: "다시 시도",
    disclaimer: "예상 환산 금액입니다. 거래 은행이나 카드사에서는 다른 환율이 적용될 수 있습니다.",
    manualRate: "수동 환율",
    automaticRate: "자동 환율",
    useAutomaticRate: "자동 환율 사용",
    manualInUse: "수동 환율 사용 중",
    savedRate: "저장된 환율 — 현재 연결되지 않았습니다",
    enterAmount: "미국 달러 금액을 입력하세요",
    rateMissing: "이 통화는 현재 사용할 수 없습니다"
  },

  fr: {
    chooseLanguage: "Choisissez votre langue",
    title: "Conversion de devises",
    usdAmount: "Montant en USD",
    selectCurrency: "Choisir la devise",
    selectPrompt: "Choisissez une devise",
    exchangeRate: "Taux de change",
    lastUpdated: "Dernière mise à jour",
    usdTotal: "Total en USD",
    customerPrice: "Prix pour le client",
    back: "Retour à Price Check",
    loading: "Chargement…",
    rateError: "Impossible d'obtenir le taux de change",
    tryAgain: "Réessayer",
    disclaimer: "Conversion estimée. Votre banque ou l'émetteur de votre carte peut appliquer un taux de change différent.",
    manualRate: "Taux manuel",
    automaticRate: "Taux automatique",
    useAutomaticRate: "Utiliser le taux automatique",
    manualInUse: "Taux manuel utilisé",
    savedRate: "Taux enregistré — aucune connexion pour le moment",
    enterAmount: "Saisissez un montant en USD",
    rateMissing: "Cette devise n'est pas disponible pour le moment"
  },

  pt: {
    chooseLanguage: "Escolha o seu idioma",
    title: "Conversão de moeda",
    usdAmount: "Valor em USD",
    selectCurrency: "Selecionar moeda",
    selectPrompt: "Escolha uma moeda",
    exchangeRate: "Taxa de câmbio",
    lastUpdated: "Última atualização",
    usdTotal: "Total em USD",
    customerPrice: "Preço para o cliente",
    back: "Voltar ao Price Check",
    loading: "Carregando…",
    rateError: "Não foi possível obter a taxa de câmbio",
    tryAgain: "Tentar novamente",
    disclaimer: "Conversão estimada. O seu banco ou a operadora do cartão pode usar uma taxa de câmbio diferente.",
    manualRate: "Taxa manual",
    automaticRate: "Taxa automática",
    useAutomaticRate: "Usar a taxa automática",
    manualInUse: "Taxa manual em uso",
    savedRate: "Taxa salva — sem conexão neste momento",
    enterAmount: "Informe um valor em USD",
    rateMissing: "Esta moeda não está disponível neste momento"
  },

  de: {
    chooseLanguage: "Wählen Sie Ihre Sprache",
    title: "Währungsumrechnung",
    usdAmount: "Betrag in USD",
    selectCurrency: "Währung auswählen",
    selectPrompt: "Währung wählen",
    exchangeRate: "Wechselkurs",
    lastUpdated: "Zuletzt aktualisiert",
    usdTotal: "Gesamtbetrag in USD",
    customerPrice: "Kundenpreis",
    back: "Zurück zu Price Check",
    loading: "Wird geladen…",
    rateError: "Wechselkurs konnte nicht abgerufen werden",
    tryAgain: "Erneut versuchen",
    disclaimer: "Geschätzte Umrechnung. Ihre Bank oder Ihr Kartenanbieter kann einen anderen Wechselkurs verwenden.",
    manualRate: "Manueller Kurs",
    automaticRate: "Automatischer Kurs",
    useAutomaticRate: "Automatischen Kurs verwenden",
    manualInUse: "Manueller Kurs wird verwendet",
    savedRate: "Gespeicherter Kurs – derzeit keine Verbindung",
    enterAmount: "Geben Sie einen Betrag in USD ein",
    rateMissing: "Diese Währung ist derzeit nicht verfügbar"
  }
};

/* Which locale each language uses for number and date formatting, and the
   currency a customer speaking it most often asks for. The currency is only
   ever used to fill an empty picker, never to change one already chosen. */
var LANGUAGES = {
  en: { locale: "en-US", currency: "" },
  es: { locale: "es-MX", currency: "MXN" },
  zh: { locale: "zh-CN", currency: "CNY" },
  ja: { locale: "ja-JP", currency: "JPY" },
  ko: { locale: "ko-KR", currency: "KRW" },
  fr: { locale: "fr-FR", currency: "EUR" },
  pt: { locale: "pt-BR", currency: "BRL" },
  de: { locale: "de-DE", currency: "EUR" }
};

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
  { code: "INR", name: "Indian Rupee", decimals: 2, narrow: true }
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
var language = "en";
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
var backBtn = document.getElementById("backBtn");

var langGrid = document.getElementById("langGrid");
var usdAmountInput = document.getElementById("usdAmount");
var currencySelect = document.getElementById("currencySelect");

var ccUsd = document.getElementById("ccUsd");
var ccPrice = document.getElementById("ccPrice");

var rateValue = document.getElementById("rateValue");
var rateUpdated = document.getElementById("rateUpdated");
var rateStatus = document.getElementById("rateStatus");
var retryBtn = document.getElementById("retryBtn");

var autoRateNote = document.getElementById("autoRateNote");
var manualRateInput = document.getElementById("manualRateInput");
var manualRateCode = document.getElementById("manualRateCode");
var useAutoBtn = document.getElementById("useAutoBtn");

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

/* Looks up a label in the chosen language, falling back to English. */
function t(key) {
  var pack = TRANSLATIONS[language];
  if (pack && typeof pack[key] === "string") {
    return pack[key];
  }
  return TRANSLATIONS.en[key] || "";
}

function currentLocale() {
  return (LANGUAGES[language] || LANGUAGES.en).locale;
}

function findCurrency(code) {
  for (var i = 0; i < CURRENCIES.length; i++) {
    if (CURRENCIES[i].code === code) {
      return CURRENCIES[i];
    }
  }
  return null;
}

/* Turns typed text like " $1,299.00 " into a number. */
function toNumber(text) {
  if (typeof text !== "string") {
    return NaN;
  }
  var cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") {
    return NaN;
  }
  return Number(cleaned);
}

/* Formats an amount in its own currency, in the customer's language:
   19530 JPY in Japanese -> "￥19,530", 109.32 EUR in German -> "109,32 €".
   Falls back to "CODE 123.45" on any browser that refuses the options. */
function formatCurrency(amount, currency) {
  var options = {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals
  };

  /* The short symbol keeps the big number short and recognisable: ¥906.25
     rather than CN¥906.25. Older browsers reject the option, so they get
     the plain form instead. */
  if (currency.narrow) {
    try {
      options.currencyDisplay = "narrowSymbol";
      return new Intl.NumberFormat(currentLocale(), options).format(amount);
    } catch (error) {
      delete options.currencyDisplay;
    }
  }

  try {
    return new Intl.NumberFormat(currentLocale(), options).format(amount);
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

/* Puts every translated label in place. */
function applyLanguage() {
  var labels = viewCurrency.querySelectorAll("[data-i18n]");
  for (var i = 0; i < labels.length; i++) {
    labels[i].textContent = t(labels[i].getAttribute("data-i18n"));
  }

  var buttons = langGrid.querySelectorAll(".lang-btn");
  for (var j = 0; j < buttons.length; j++) {
    var isOn = buttons[j].getAttribute("data-lang") === language;
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
  retryBtn.hidden = !rateFailed;

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

    /* Fill an empty picker from the language already chosen. */
    if (!currencySelect.value) {
      var suggested = (LANGUAGES[language] || {}).currency;
      if (suggested && findCurrency(suggested)) {
        currencySelect.value = suggested;
      }
    }

    render();
    fetchRates();
    return;
  }

  render();
}

function closeCurrency() {
  viewCurrency.hidden = true;
  viewPriceCheck.hidden = false;
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

  language = button.getAttribute("data-lang");

  /* A language choice never overwrites a currency already picked - it only
     fills the picker when it is still empty. */
  if (!currencySelect.value) {
    var suggested = (LANGUAGES[language] || {}).currency;
    if (suggested && findCurrency(suggested)) {
      currencySelect.value = suggested;
    }
  }

  /* Nothing reloads: the amount, the currency and the rate all stay put. */
  render();
});

currencySelect.addEventListener("change", render);
usdAmountInput.addEventListener("input", render);
manualRateInput.addEventListener("input", render);

useAutoBtn.addEventListener("click", function () {
  manualRateInput.value = "";
  render();
});

retryBtn.addEventListener("click", fetchRates);

/* --------------------------------------------------------------------------
   Start up
   Only the labels are drawn now. Nothing is fetched until the view is
   opened, so the calculator never waits on the network.
   -------------------------------------------------------------------------- */
applyLanguage();
