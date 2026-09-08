/* ==========================================================================
   Price Check - script.js
   Plain (vanilla) JavaScript only. No frameworks, no libraries, no network.
   ========================================================================== */

/* --------------------------------------------------------------------------
   VERSION HISTORY  --  SINGLE SOURCE OF TRUTH
   Newest entry first. Keep exactly the 3 newest entries here:
   when you add a new one at the top, delete the oldest at the bottom.
   README.md mirrors this list; update it when you change this.
   -------------------------------------------------------------------------- */
var VERSION_HISTORY = [
  {
    version: "0.1.0",
    changes: [
      "Enter a current price and get the final total",
      "One-tap discount buttons: 25% / 30% / 15% / 10% OFF",
      "Custom discount option for any other percentage",
      "Sales tax field, set to 8.375% by default and editable",
      "Full breakdown: original price, discount, price after discount, tax, final total",
      "Reset button clears the price and discount but keeps the tax rate",
      "Works offline once saved to the iPhone Home Screen"
    ]
  }
];

/* Default sales tax rate, used on load and after Reset. */
var DEFAULT_TAX_RATE = 8.375;

/* --------------------------------------------------------------------------
   Element references
   -------------------------------------------------------------------------- */
var priceInput = document.getElementById("price");
var taxInput = document.getElementById("tax");
var customWrap = document.getElementById("customWrap");
var customInput = document.getElementById("customDiscount");
var discountButtons = document.querySelectorAll(".discount-btn");
var calcBtn = document.getElementById("calcBtn");
var resetBtn = document.getElementById("resetBtn");
var errorEl = document.getElementById("error");
var resultsEl = document.getElementById("results");

var rOriginal = document.getElementById("rOriginal");
var rDiscount = document.getElementById("rDiscount");
var rDiscountLabel = document.getElementById("rDiscountLabel");
var rAfter = document.getElementById("rAfter");
var rTax = document.getElementById("rTax");
var rTaxLabel = document.getElementById("rTaxLabel");
var rTotal = document.getElementById("rTotal");

var versionCurrent = document.getElementById("versionCurrent");
var versionBody = document.getElementById("versionBody");

/* Which discount is chosen: null, a number like 25, or the string "custom". */
var selectedDiscount = null;

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

/* Turns typed text like " $34.00 " or "1,299" into a number. */
function parseNumber(text) {
  if (typeof text !== "string") {
    return NaN;
  }
  var cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") {
    return NaN;
  }
  return Number(cleaned);
}

/* Rounds to cents, e.g. 2.135625 -> 2.14 */
function roundCents(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/* Formats a number as a dollar string, e.g. 27.64 -> "$27.64" */
function formatMoney(amount) {
  return "$" + amount.toFixed(2);
}

/* Formats a percentage without trailing zeros, e.g. 8.375 -> "8.375" */
function formatPercent(value) {
  return String(Math.round(value * 1000) / 1000);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  resultsEl.hidden = true;
}

function clearError() {
  errorEl.textContent = "";
  errorEl.hidden = true;
}

/* --------------------------------------------------------------------------
   Version History panel
   -------------------------------------------------------------------------- */
function renderVersionHistory() {
  if (VERSION_HISTORY.length === 0) {
    return;
  }

  versionCurrent.textContent = "Version " + VERSION_HISTORY[0].version;

  for (var i = 0; i < VERSION_HISTORY.length; i++) {
    var entry = VERSION_HISTORY[i];

    var wrap = document.createElement("div");
    wrap.className = "vh-entry";

    var heading = document.createElement("div");
    heading.className = "vh-version";
    heading.textContent = "Version " + entry.version;
    wrap.appendChild(heading);

    var list = document.createElement("ul");
    for (var j = 0; j < entry.changes.length; j++) {
      var item = document.createElement("li");
      item.textContent = entry.changes[j];
      list.appendChild(item);
    }
    wrap.appendChild(list);

    versionBody.appendChild(wrap);
  }
}

/* --------------------------------------------------------------------------
   Discount selection
   -------------------------------------------------------------------------- */
function selectDiscount(value) {
  selectedDiscount = value;

  for (var i = 0; i < discountButtons.length; i++) {
    var button = discountButtons[i];
    var isSelected = button.getAttribute("data-discount") === String(value);
    if (isSelected) {
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    } else {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    }
  }

  customWrap.hidden = value !== "custom";
  if (value === "custom") {
    customInput.focus();
  }
}

for (var i = 0; i < discountButtons.length; i++) {
  discountButtons[i].addEventListener("click", function (event) {
    var raw = event.currentTarget.getAttribute("data-discount");
    var value = raw === "custom" ? "custom" : Number(raw);

    /* Tapping the selected button again turns the discount off. */
    if (selectedDiscount === value) {
      selectDiscount(null);
    } else {
      selectDiscount(value);
    }
    clearError();
  });
}

/* --------------------------------------------------------------------------
   Calculate
   -------------------------------------------------------------------------- */
function calculate() {
  var price = parseNumber(priceInput.value);
  if (isNaN(price) || price < 0) {
    showError("Enter a current price.");
    priceInput.focus();
    return;
  }

  var taxRate = parseNumber(taxInput.value);
  if (isNaN(taxRate) || taxRate < 0) {
    showError("Enter a sales tax percentage.");
    taxInput.focus();
    return;
  }

  var discountPercent = 0;
  if (selectedDiscount === "custom") {
    discountPercent = parseNumber(customInput.value);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      showError("Enter a custom discount between 0 and 100.");
      customInput.focus();
      return;
    }
  } else if (typeof selectedDiscount === "number") {
    discountPercent = selectedDiscount;
  }

  clearError();

  /* Every displayed number is rounded to cents, and each step uses the
     rounded value from the step before, so the breakdown always adds up. */
  var discountAmount = roundCents(price * (discountPercent / 100));
  var priceAfterDiscount = roundCents(price - discountAmount);
  var salesTax = roundCents(priceAfterDiscount * (taxRate / 100));
  var finalTotal = roundCents(priceAfterDiscount + salesTax);

  rOriginal.textContent = formatMoney(price);
  rDiscountLabel.textContent = discountPercent > 0
    ? formatPercent(discountPercent) + "% Discount"
    : "Discount";
  rDiscount.textContent = "-" + formatMoney(discountAmount);
  rAfter.textContent = formatMoney(priceAfterDiscount);
  rTaxLabel.textContent = "Sales Tax (" + formatPercent(taxRate) + "%)";
  rTax.textContent = formatMoney(salesTax);
  rTotal.textContent = formatMoney(finalTotal);

  resultsEl.hidden = false;
}

/* --------------------------------------------------------------------------
   Reset - clears price and discount, keeps the default tax rate
   -------------------------------------------------------------------------- */
function reset() {
  priceInput.value = "";
  customInput.value = "";
  taxInput.value = formatPercent(DEFAULT_TAX_RATE);
  selectDiscount(null);
  clearError();
  resultsEl.hidden = true;
  priceInput.focus();
}

/* --------------------------------------------------------------------------
   Wiring
   -------------------------------------------------------------------------- */
calcBtn.addEventListener("click", calculate);
resetBtn.addEventListener("click", reset);

/* Pressing Return on the keyboard calculates. */
function calculateOnEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    calculate();
  }
}
priceInput.addEventListener("keydown", calculateOnEnter);
taxInput.addEventListener("keydown", calculateOnEnter);
customInput.addEventListener("keydown", calculateOnEnter);

/* --------------------------------------------------------------------------
   Start up
   -------------------------------------------------------------------------- */
taxInput.value = formatPercent(DEFAULT_TAX_RATE);
renderVersionHistory();

/* Registers the offline cache. Skipped when opened straight from a file,
   which is fine - the app still works, it just is not cached. */
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      /* Offline caching is optional. Ignore any failure. */
    });
  });
}
