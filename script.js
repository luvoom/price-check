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
    version: "0.9.3",
    changes: [
      "The currency now follows the language you pick, so choosing 日本語 no longer leaves the price in Mexican pesos",
      "If you pick a currency from the list yourself, it is kept and the language never changes it",
      "The Currency Conversion button always reads in the language currently chosen"
    ]
  },
  {
    version: "0.9.2",
    changes: [
      "Fixed the Language menu doing nothing on the phone after an update",
      "The phone could end up running part of the new app and part of the old one, which stopped the language from changing",
      "Updates now always come from the internet rather than from a copy the phone kept, so the whole app changes together",
      "If anything ever does get out of step, the language menu now keeps working instead of going quiet"
    ]
  },
  {
    version: "0.9.1",
    changes: [
      "The Language menu now sits at the top of the screen, so it is there as soon as the app opens",
      "Before, it only appeared after you pressed Calculate Total",
      "Picking a language there also changes the Currency Conversion button straight away"
    ]
  }
];

/* Default sales tax rate, used on load and after Reset. */
var DEFAULT_TAX_RATE = 8.375;

/* The discounts offered in each item's dropdown. */
var ITEM_DISCOUNT_CHOICES = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/* How many blank item lines the app opens with. */
var STARTING_ITEM_ROWS = 3;

/* The last Final Total worked out, left here for the Currency Conversion
   screen to pick up. Nothing else reads it, and the calculator never waits
   on anything outside this file. */
window.PriceCheck = { finalTotal: null };

/* --------------------------------------------------------------------------
   Element references
   -------------------------------------------------------------------------- */
var itemRows = document.getElementById("itemRows");
var addItemBtn = document.getElementById("addItemBtn");
var additionalInput = document.getElementById("additionalDiscount");
var additionalChips = document.querySelectorAll("#additionalChips .chip");
var taxInput = document.getElementById("tax");
var calcBtn = document.getElementById("calcBtn");
var resetBtn = document.getElementById("resetBtn");
var errorEl = document.getElementById("error");
var resultsEl = document.getElementById("results");

var breakdown = document.getElementById("breakdown");
var rOriginal = document.getElementById("rOriginal");
var rSubtotal = document.getElementById("rSubtotal");
var rItemSavingsRow = document.getElementById("rItemSavingsRow");
var rItemSavings = document.getElementById("rItemSavings");
var rDiscountRow = document.getElementById("rDiscountRow");
var rDiscount = document.getElementById("rDiscount");
var rDiscountLabel = document.getElementById("rDiscountLabel");
var rAfterRow = document.getElementById("rAfterRow");
var rAfter = document.getElementById("rAfter");
var rSavingsBox = document.getElementById("rSavingsBox");
var rTotalSavings = document.getElementById("rTotalSavings");
var rSavingsPercent = document.getElementById("rSavingsPercent");
var rTaxLabel = document.getElementById("rTaxLabel");
var rTax = document.getElementById("rTax");
var rTotal = document.getElementById("rTotal");
var rSavedToday = document.getElementById("rSavedToday");
var mathSteps = document.getElementById("mathSteps");

var versionCurrent = document.getElementById("versionCurrent");
var versionBody = document.getElementById("versionBody");

var resultLanguage = document.getElementById("resultLanguage");
var langRow = document.getElementById("langRow");

/* The last set of numbers worked out, kept so the results can be drawn
   again in another language without recalculating anything. */
var lastResult = null;

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

/* True when a field was left empty. */
function isBlank(text) {
  return text.replace(/\s/g, "") === "";
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
   "Sales tax: $78.80 x 8.375% = $6.60" with the answer in bold. */
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
      var change = document.createElement("li");
      change.textContent = entry.changes[j];
      list.appendChild(change);
    }
    wrap.appendChild(list);

    versionBody.appendChild(wrap);
  }
}

/* --------------------------------------------------------------------------
   Item lines
   -------------------------------------------------------------------------- */

/* Builds one item line: price, quantity, discount, and a remove button. */
function createItemRow() {
  var row = document.createElement("div");
  row.className = "item-row";

  var price = document.createElement("input");
  price.className = "item-input item-price";
  price.type = "text";
  price.inputMode = "decimal";
  price.autocomplete = "off";
  price.placeholder = "$0.00";
  price.setAttribute("aria-label", "Item price");
  row.appendChild(price);

  var qty = document.createElement("input");
  qty.className = "item-input item-qty";
  qty.type = "text";
  qty.inputMode = "numeric";
  qty.autocomplete = "off";
  qty.placeholder = "1";
  qty.setAttribute("aria-label", "Quantity");
  row.appendChild(qty);

  var select = document.createElement("select");
  select.className = "item-select item-discount";
  select.setAttribute("aria-label", "Item discount");
  for (var i = 0; i < ITEM_DISCOUNT_CHOICES.length; i++) {
    var percent = ITEM_DISCOUNT_CHOICES[i];
    var option = document.createElement("option");
    option.value = String(percent);
    option.textContent = percent === 0 ? "Full price" : percent + "% off";
    select.appendChild(option);
  }
  var otherOption = document.createElement("option");
  otherOption.value = "custom";
  otherOption.textContent = "Other…";
  select.appendChild(otherOption);
  row.appendChild(select);

  var remove = document.createElement("button");
  remove.type = "button";
  remove.className = "item-remove";
  remove.textContent = "✕";
  remove.setAttribute("aria-label", "Remove this item");
  row.appendChild(remove);

  /* The box for "Other…", hidden until that option is picked. */
  var customWrap = document.createElement("div");
  customWrap.className = "item-custom";
  customWrap.hidden = true;

  var customLabel = document.createElement("span");
  customLabel.textContent = "Discount";
  customWrap.appendChild(customLabel);

  var customInput = document.createElement("input");
  customInput.className = "item-input item-custom-percent";
  customInput.type = "text";
  customInput.inputMode = "decimal";
  customInput.autocomplete = "off";
  customInput.placeholder = "0";
  customInput.setAttribute("aria-label", "Custom item discount percentage");
  customWrap.appendChild(customInput);

  var customPercent = document.createElement("span");
  customPercent.textContent = "%";
  customWrap.appendChild(customPercent);

  row.appendChild(customWrap);

  select.addEventListener("change", function () {
    customWrap.hidden = select.value !== "custom";
    if (select.value === "custom") {
      customInput.focus();
    }
    clearError();
  });

  remove.addEventListener("click", function () {
    /* Always leave at least one line to type into. */
    if (itemRows.querySelectorAll(".item-row").length <= 1) {
      price.value = "";
      qty.value = "";
      select.value = "0";
      customInput.value = "";
      customWrap.hidden = true;
      clearError();
      return;
    }
    row.parentNode.removeChild(row);
    clearError();
  });

  return row;
}

function addItemRow() {
  itemRows.appendChild(createItemRow());
}

function resetItemRows() {
  itemRows.textContent = "";
  for (var i = 0; i < STARTING_ITEM_ROWS; i++) {
    addItemRow();
  }
}

addItemBtn.addEventListener("click", function () {
  addItemRow();
  clearError();
});

/* Reads one line. Returns "empty" when no price was typed, null when
   something typed cannot be used, or the finished numbers for that line. */
function readItemRow(row) {
  var priceField = row.querySelector(".item-price");
  var qtyField = row.querySelector(".item-qty");
  var selectField = row.querySelector(".item-discount");
  var customField = row.querySelector(".item-custom-percent");

  if (isBlank(priceField.value)) {
    return "empty";
  }

  var price = parseNumber(priceField.value);
  if (isNaN(price) || price < 0) {
    return null;
  }

  var quantity = 1;
  if (!isBlank(qtyField.value)) {
    quantity = parseNumber(qtyField.value);
    if (isNaN(quantity) || quantity < 1) {
      return null;
    }
    quantity = Math.floor(quantity);
  }

  var percent;
  if (selectField.value === "custom") {
    percent = parseNumber(customField.value);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      return null;
    }
  } else {
    percent = Number(selectField.value);
  }

  var original = roundCents(price * quantity);
  var subtotal = roundCents(price * quantity * (1 - percent / 100));

  return {
    price: price,
    quantity: quantity,
    percent: percent,
    original: original,
    subtotal: subtotal,
    saved: roundCents(original - subtotal)
  };
}

/* --------------------------------------------------------------------------
   Additional discount chips
   -------------------------------------------------------------------------- */

/* Keeps the chip that matches the typed percentage switched on. */
function syncAdditionalChips() {
  var typed = isBlank(additionalInput.value) ? 0 : parseNumber(additionalInput.value);

  for (var i = 0; i < additionalChips.length; i++) {
    var chip = additionalChips[i];
    if (Number(chip.getAttribute("data-percent")) === typed) {
      chip.classList.add("is-selected");
      chip.setAttribute("aria-pressed", "true");
    } else {
      chip.classList.remove("is-selected");
      chip.setAttribute("aria-pressed", "false");
    }
  }
}

for (var chipIndex = 0; chipIndex < additionalChips.length; chipIndex++) {
  additionalChips[chipIndex].addEventListener("click", function (event) {
    additionalInput.value = event.currentTarget.getAttribute("data-percent");
    syncAdditionalChips();
    clearError();
  });
}

additionalInput.addEventListener("input", function () {
  syncAdditionalChips();
  clearError();
});

/* --------------------------------------------------------------------------
   Item breakdown
   -------------------------------------------------------------------------- */

/* Builds one block of the item breakdown:

     1 × $39.00                    25% off
     Saved                           $9.75
     After discount                 $29.25  */
function addBreakdownLine(item) {
  var line = document.createElement("li");
  line.className = "item-line";

  var head = document.createElement("div");
  head.className = "item-line-head";

  var title = document.createElement("span");
  title.className = "item-line-title";
  title.textContent = item.quantity + " × " + formatMoney(item.price);
  head.appendChild(title);

  var badge = document.createElement("span");
  badge.className = item.percent > 0
    ? "item-line-badge"
    : "item-line-badge item-line-badge--plain";
  badge.textContent = item.percent > 0
    ? tf("percentOff", formatPercent(item.percent))
    : t("fullPrice");
  head.appendChild(badge);

  line.appendChild(head);

  if (item.percent > 0) {
    line.appendChild(buildLineRow(t("lineSaved"), formatMoney(item.saved), true));
    line.appendChild(buildLineRow(t("lineAfterDiscount"), formatMoney(item.subtotal), false));
  } else {
    line.appendChild(buildLineRow(t("linePrice"), formatMoney(item.subtotal), false));
  }

  breakdown.appendChild(line);
}

function buildLineRow(label, value, isSavings) {
  var row = document.createElement("div");
  row.className = "item-line-row";

  var name = document.createElement("span");
  name.textContent = label;
  row.appendChild(name);

  var amount = document.createElement("b");
  if (isSavings) {
    amount.className = "is-savings";
  }
  amount.textContent = value;
  row.appendChild(amount);

  return row;
}

/* --------------------------------------------------------------------------
   Calculate
   -------------------------------------------------------------------------- */
function calculate() {
  var taxRate = parseNumber(taxInput.value);
  if (isNaN(taxRate) || taxRate < 0) {
    showError("Enter a sales tax percentage.");
    taxInput.focus();
    return;
  }

  var additionalPercent = 0;
  if (!isBlank(additionalInput.value)) {
    additionalPercent = parseNumber(additionalInput.value);
    if (isNaN(additionalPercent) || additionalPercent < 0 || additionalPercent > 100) {
      showError("Enter an additional discount between 0 and 100.");
      additionalInput.focus();
      return;
    }
  }

  var rows = itemRows.querySelectorAll(".item-row");
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var item = readItemRow(rows[i]);
    if (item === null) {
      showError("Check the price, quantity and discount on item " + (i + 1) + ".");
      return;
    }
    if (item !== "empty") {
      items.push(item);
    }
  }

  if (items.length === 0) {
    showError("Enter a price for at least one item.");
    return;
  }

  clearError();

  /* Each line is rounded to cents on its own, then the lines are added up.
     The additional discount comes off that combined subtotal - it is never
     added to the individual item discounts. */
  var originalTotal = 0;
  var itemsSubtotal = 0;
  for (var j = 0; j < items.length; j++) {
    originalTotal = roundCents(originalTotal + items[j].original);
    itemsSubtotal = roundCents(itemsSubtotal + items[j].subtotal);
  }

  var itemSavings = roundCents(originalTotal - itemsSubtotal);
  var additionalAmount = roundCents(itemsSubtotal * (additionalPercent / 100));
  var subtotalAfter = roundCents(itemsSubtotal - additionalAmount);

  /* Savings are worked out before tax, so tax never counts as a saving. */
  var totalSavings = roundCents(originalTotal - subtotalAfter);
  var savingsPercent = originalTotal > 0 ? (totalSavings / originalTotal) * 100 : 0;

  var salesTax = roundCents(subtotalAfter * (taxRate / 100));
  var finalTotal = roundCents(subtotalAfter + salesTax);

  /* Everything worked out is kept together, so the panel can be drawn
     again in another language without touching the numbers. */
  lastResult = {
    items: items,
    originalTotal: originalTotal,
    itemsSubtotal: itemsSubtotal,
    itemSavings: itemSavings,
    additionalPercent: additionalPercent,
    additionalAmount: additionalAmount,
    subtotalAfter: subtotalAfter,
    totalSavings: totalSavings,
    savingsPercent: savingsPercent,
    taxRate: taxRate,
    salesTax: salesTax,
    finalTotal: finalTotal
  };

  renderResults();
  resultsEl.hidden = false;

  /* Hand the total to the Currency Conversion screen. */
  window.PriceCheck.finalTotal = finalTotal;
}

/* --------------------------------------------------------------------------
   Drawing the results
   Separate from the arithmetic above so that choosing another language
   redraws the panel from the same numbers.
   -------------------------------------------------------------------------- */
function renderResults() {
  if (lastResult === null) {
    return;
  }
  var r = lastResult;

  /* The fixed labels, and which way round the panel reads. */
  applyTranslations(resultsEl);
  applyDirection(resultsEl);

  rOriginal.textContent = formatMoney(r.originalTotal);

  breakdown.textContent = "";
  for (var k = 0; k < r.items.length; k++) {
    addBreakdownLine(r.items[k]);
  }

  rSubtotal.textContent = formatMoney(r.itemsSubtotal);

  rItemSavingsRow.hidden = r.itemSavings <= 0;
  rItemSavings.textContent = "-" + formatMoney(r.itemSavings);

  var usesAdditional = r.additionalPercent > 0;
  rDiscountRow.hidden = !usesAdditional;
  rAfterRow.hidden = !usesAdditional;
  if (usesAdditional) {
    rDiscountLabel.textContent =
      t("additionalDiscount") + " (" + formatPercent(r.additionalPercent) + "%)";
    rDiscount.textContent = "-" + formatMoney(r.additionalAmount);
    rAfter.textContent = formatMoney(r.subtotalAfter);
  }

  rSavingsBox.hidden = r.totalSavings <= 0;
  rSavedToday.hidden = r.totalSavings <= 0;
  if (r.totalSavings > 0) {
    rTotalSavings.textContent = formatMoney(r.totalSavings);
    rSavingsPercent.textContent = tf("youSavedPercent", r.savingsPercent.toFixed(1) + "%");
    rSavedToday.textContent = tf("youSavedToday", formatMoney(r.totalSavings));
  }

  rTaxLabel.textContent = t("salesTax") + " (" + formatPercent(r.taxRate) + "%)";
  rTax.textContent = formatMoney(r.salesTax);
  rTotal.textContent = formatMoney(r.finalTotal);

  /* The same steps written out in words, so anyone can check the numbers
     by hand. The sums stay in digits; only the labels change language. */
  mathSteps.textContent = "";

  var itemTotals = [];
  for (var m = 0; m < r.items.length; m++) {
    itemTotals.push(formatMoney(r.items[m].subtotal));
  }
  addStep(
    t("stepItemsSubtotal"),
    itemTotals.length <= 5
      ? itemTotals.join(" + ")
      : tf("stepManyItems", itemTotals.length),
    formatMoney(r.itemsSubtotal)
  );

  if (usesAdditional) {
    addStep(
      t("stepAdditional"),
      formatMoney(r.itemsSubtotal) + " × " + formatPercent(r.additionalPercent) + "%",
      formatMoney(r.additionalAmount)
    );
    addStep(
      t("stepSubtotalAfter"),
      formatMoney(r.itemsSubtotal) + " − " + formatMoney(r.additionalAmount),
      formatMoney(r.subtotalAfter)
    );
  }

  addStep(
    t("stepSalesTax"),
    formatMoney(r.subtotalAfter) + " × " + formatPercent(r.taxRate) + "%",
    formatMoney(r.salesTax)
  );
  addStep(
    t("stepFinalTotal"),
    formatMoney(r.subtotalAfter) + " + " + formatMoney(r.salesTax),
    formatMoney(r.finalTotal)
  );
}

/* --------------------------------------------------------------------------
   The language picker above the results
   One language setting covers both screens, so picking Japanese here also
   opens the Currency Conversion screen in Japanese, and the other way round.
   -------------------------------------------------------------------------- */
function buildLanguageSelect() {
  if (!resultLanguage) {
    return;
  }
  for (var i = 0; i < LANGUAGES.length; i++) {
    var option = document.createElement("option");
    option.value = LANGUAGES[i].code;
    option.textContent = LANGUAGES[i].name;
    resultLanguage.appendChild(option);
  }
  resultLanguage.value = appLanguage;
}

if (resultLanguage) {
  resultLanguage.addEventListener("change", function () {
    setLanguage(resultLanguage.value);
  });
}

onLanguageChange(function () {
  if (resultLanguage) {
    resultLanguage.value = appLanguage;
  }
  applyTranslations(langRow);
  applyTranslations(resultsEl);
  applyDirection(resultsEl);
  renderResults();
});

/* --------------------------------------------------------------------------
   Reset - clears the items and discounts, keeps the default tax rate
   -------------------------------------------------------------------------- */
function reset() {
  resetItemRows();
  additionalInput.value = "";
  syncAdditionalChips();
  taxInput.value = formatPercent(DEFAULT_TAX_RATE);
  clearError();
  resultsEl.hidden = true;
  lastResult = null;
  window.PriceCheck.finalTotal = null;
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
taxInput.addEventListener("keydown", calculateOnEnter);
additionalInput.addEventListener("keydown", calculateOnEnter);

/* --------------------------------------------------------------------------
   Start up
   -------------------------------------------------------------------------- */
taxInput.value = formatPercent(DEFAULT_TAX_RATE);
resetItemRows();
syncAdditionalChips();
renderVersionHistory();
buildLanguageSelect();

/* Registers the offline cache. Skipped when opened straight from a file,
   which is fine - the app still works, it just is not cached. */
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      /* Offline caching is optional. Ignore any failure. */
    });
  });
}
