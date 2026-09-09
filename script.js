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
    version: "0.3.0",
    changes: [
      "Added an optional Second Discount section below the first one",
      "The second discount comes off the price the first discount left, not added to it",
      "Second Discount is off by default and set apart with a gray background",
      "Results show both discounts and both subtotals on separate lines"
    ]
  },
  {
    version: "0.2.0",
    changes: [
      "Discount buttons now run in order: 10% / 15% / 20% / 25% / 30% / 35% OFF",
      "Added 20% and 35% presets",
      "Results now show the calculation written out step by step, so the numbers can be checked by hand"
    ]
  },
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
var calcBtn = document.getElementById("calcBtn");
var resetBtn = document.getElementById("resetBtn");
var errorEl = document.getElementById("error");
var resultsEl = document.getElementById("results");

var rOriginal = document.getElementById("rOriginal");
var rDiscount = document.getElementById("rDiscount");
var rDiscountLabel = document.getElementById("rDiscountLabel");
var rAfter = document.getElementById("rAfter");
var rAfterLabel = document.getElementById("rAfterLabel");
var rDiscount2Row = document.getElementById("rDiscount2Row");
var rDiscount2 = document.getElementById("rDiscount2");
var rDiscount2Label = document.getElementById("rDiscount2Label");
var rAfter2Row = document.getElementById("rAfter2Row");
var rAfter2 = document.getElementById("rAfter2");
var rTax = document.getElementById("rTax");
var rTaxLabel = document.getElementById("rTaxLabel");
var rTotal = document.getElementById("rTotal");
var mathSteps = document.getElementById("mathSteps");

var versionCurrent = document.getElementById("versionCurrent");
var versionBody = document.getElementById("versionBody");

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

/* Adds one line to the "How this was calculated" list, e.g.
   "Discount: $34.00 x 25% = $8.50" with the answer in bold. */
function addStep(label, expression, result) {
  var item = document.createElement("li");
  item.appendChild(document.createTextNode(label + ": " + expression + " = "));

  var answer = document.createElement("b");
  answer.textContent = result;
  item.appendChild(answer);

  mathSteps.appendChild(item);
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
/* Builds one discount section (buttons + its Custom field). The page has two
   of these: the first discount and the optional second discount. They behave
   the same way, so the same code runs both.

   "selected" holds null (nothing chosen), the string "none", the string
   "custom", or a number such as 25. */
function createDiscountSection(gridId, customWrapId, customInputId, defaultValue) {
  var section = {
    buttons: document.querySelectorAll("#" + gridId + " .discount-btn"),
    customWrap: document.getElementById(customWrapId),
    customInput: document.getElementById(customInputId),
    defaultValue: defaultValue,
    selected: null
  };

  section.select = function (value, focusCustom) {
    section.selected = value;

    for (var i = 0; i < section.buttons.length; i++) {
      var button = section.buttons[i];
      if (button.getAttribute("data-discount") === String(value)) {
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.classList.remove("is-selected");
        button.setAttribute("aria-pressed", "false");
      }
    }

    section.customWrap.hidden = value !== "custom";
    if (value === "custom" && focusCustom) {
      section.customInput.focus();
    }
  };

  /* Reads the section as a percentage. Returns null if what was typed into
     the Custom field is not a usable number. */
  section.getPercent = function () {
    if (section.selected === "custom") {
      var typed = parseNumber(section.customInput.value);
      if (isNaN(typed) || typed < 0 || typed > 100) {
        return null;
      }
      return typed;
    }
    if (typeof section.selected === "number") {
      return section.selected;
    }
    return 0;
  };

  for (var i = 0; i < section.buttons.length; i++) {
    section.buttons[i].addEventListener("click", function (event) {
      var raw = event.currentTarget.getAttribute("data-discount");
      var value = (raw === "custom" || raw === "none") ? raw : Number(raw);

      /* Tapping the button that is already on returns the section to its
         starting state. */
      if (section.selected === value) {
        section.select(section.defaultValue, false);
      } else {
        section.select(value, true);
      }
      clearError();
    });
  }

  section.select(defaultValue, false);
  return section;
}

var firstDiscount = createDiscountSection("discountGrid1", "customWrap1", "customDiscount1", null);
var secondDiscount = createDiscountSection("discountGrid2", "customWrap2", "customDiscount2", "none");

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

  var firstPercent = firstDiscount.getPercent();
  if (firstPercent === null) {
    showError("Enter a first discount between 0 and 100.");
    firstDiscount.customInput.focus();
    return;
  }

  var secondPercent = secondDiscount.getPercent();
  if (secondPercent === null) {
    showError("Enter a second discount between 0 and 100.");
    secondDiscount.customInput.focus();
    return;
  }

  clearError();

  /* The second discount comes off whatever the first discount left behind -
     it is never added to the first one. 25% and then another 25% is NOT 50%
     off. Every displayed number is rounded to cents and the next step uses
     that rounded value, so the breakdown on screen always adds up. */
  var firstAmount = roundCents(price * (firstPercent / 100));
  var subtotalAfterFirst = roundCents(price - firstAmount);
  var secondAmount = roundCents(subtotalAfterFirst * (secondPercent / 100));
  var subtotalAfterSecond = roundCents(subtotalAfterFirst - secondAmount);
  var salesTax = roundCents(subtotalAfterSecond * (taxRate / 100));
  var finalTotal = roundCents(subtotalAfterSecond + salesTax);

  var usesSecond = secondPercent > 0;

  rOriginal.textContent = formatMoney(price);
  rDiscountLabel.textContent = "First Discount (" + formatPercent(firstPercent) + "%)";
  rDiscount.textContent = "-" + formatMoney(firstAmount);
  rAfterLabel.textContent = usesSecond
    ? "Subtotal After First Discount"
    : "Price After Discount";
  rAfter.textContent = formatMoney(subtotalAfterFirst);

  rDiscount2Row.hidden = !usesSecond;
  rAfter2Row.hidden = !usesSecond;
  if (usesSecond) {
    rDiscount2Label.textContent = "Second Discount (" + formatPercent(secondPercent) + "%)";
    rDiscount2.textContent = "-" + formatMoney(secondAmount);
    rAfter2.textContent = formatMoney(subtotalAfterSecond);
  }

  rTaxLabel.textContent = "Sales Tax (" + formatPercent(taxRate) + "%)";
  rTax.textContent = formatMoney(salesTax);
  rTotal.textContent = formatMoney(finalTotal);

  /* The same four steps written out in plain English, so anyone can check
     the numbers by hand. */
  mathSteps.textContent = "";
  addStep(
    usesSecond ? "First discount" : "Discount",
    formatMoney(price) + " × " + formatPercent(firstPercent) + "%",
    formatMoney(firstAmount)
  );
  addStep(
    usesSecond ? "Subtotal after first discount" : "Price after discount",
    formatMoney(price) + " − " + formatMoney(firstAmount),
    formatMoney(subtotalAfterFirst)
  );
  if (usesSecond) {
    addStep(
      "Second discount",
      formatMoney(subtotalAfterFirst) + " × " + formatPercent(secondPercent) + "%",
      formatMoney(secondAmount)
    );
    addStep(
      "Subtotal after second discount",
      formatMoney(subtotalAfterFirst) + " − " + formatMoney(secondAmount),
      formatMoney(subtotalAfterSecond)
    );
  }
  addStep(
    "Sales tax",
    formatMoney(subtotalAfterSecond) + " × " + formatPercent(taxRate) + "%",
    formatMoney(salesTax)
  );
  addStep(
    "Final total",
    formatMoney(subtotalAfterSecond) + " + " + formatMoney(salesTax),
    formatMoney(finalTotal)
  );

  resultsEl.hidden = false;
}

/* --------------------------------------------------------------------------
   Reset - clears price and discount, keeps the default tax rate
   -------------------------------------------------------------------------- */
function reset() {
  priceInput.value = "";
  firstDiscount.customInput.value = "";
  secondDiscount.customInput.value = "";
  taxInput.value = formatPercent(DEFAULT_TAX_RATE);
  firstDiscount.select(null, false);
  secondDiscount.select("none", false);
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
firstDiscount.customInput.addEventListener("keydown", calculateOnEnter);
secondDiscount.customInput.addEventListener("keydown", calculateOnEnter);

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
