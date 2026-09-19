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
    version: "0.5.0",
    changes: [
      "Multiple-item results now open with the Original Total before any discounts",
      "Each item shows what was saved on it and what it comes to after its discount",
      "Added a Total Savings panel with the dollar amount and the overall percentage saved",
      "Added a \"You saved $X today\" line under the Final Total to show a customer",
      "Savings are shown in green so they read as money off, not as a charge"
    ]
  },
  {
    version: "0.4.0",
    changes: [
      "Added a \"Need to calculate multiple items?\" section at the bottom, closed until you open it",
      "Add as many items as you need, each with its own price, quantity and discount",
      "An additional discount can be taken off the combined subtotal of all the items",
      "Results list every item, then the subtotal, additional discount, tax and total",
      "The Final Total is now much larger and easier to show to a customer"
    ]
  },
  {
    version: "0.3.0",
    changes: [
      "Added an optional Second Discount section below the first one",
      "The second discount comes off the price the first discount left, not added to it",
      "Second Discount is off by default and set apart with a gray background",
      "Results show both discounts and both subtotals on separate lines"
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

/* ==========================================================================
   MULTIPLE ITEMS
   An optional second calculator, kept closed until it is opened. Several
   items, each with its own discount, are added up first; the additional
   discount then comes off that combined subtotal, and tax comes off what is
   left. The item discounts and the additional discount are never added
   together.
   ========================================================================== */

var ITEM_DISCOUNT_CHOICES = [0, 10, 15, 20, 25, 30, 35];
var STARTING_ITEM_ROWS = 3;

var itemRows = document.getElementById("itemRows");
var addItemBtn = document.getElementById("addItemBtn");
var additionalInput = document.getElementById("additionalDiscount");
var additionalChips = document.querySelectorAll("#additionalChips .chip");
var calcAdvBtn = document.getElementById("calcAdvBtn");
var advError = document.getElementById("advError");
var advResults = document.getElementById("advResults");
var advBreakdown = document.getElementById("advBreakdown");

var aOriginal = document.getElementById("aOriginal");
var aSubtotal = document.getElementById("aSubtotal");
var aItemSavingsRow = document.getElementById("aItemSavingsRow");
var aItemSavings = document.getElementById("aItemSavings");
var aSavingsBox = document.getElementById("aSavingsBox");
var aTotalSavings = document.getElementById("aTotalSavings");
var aSavingsPercent = document.getElementById("aSavingsPercent");
var aSavedToday = document.getElementById("aSavedToday");
var aDiscountRow = document.getElementById("aDiscountRow");
var aDiscount = document.getElementById("aDiscount");
var aDiscountLabel = document.getElementById("aDiscountLabel");
var aAfterRow = document.getElementById("aAfterRow");
var aAfter = document.getElementById("aAfter");
var aTax = document.getElementById("aTax");
var aTaxLabel = document.getElementById("aTaxLabel");
var aTotal = document.getElementById("aTotal");

function showAdvError(message) {
  advError.textContent = message;
  advError.hidden = false;
  advResults.hidden = true;
}

function clearAdvError() {
  advError.textContent = "";
  advError.hidden = true;
}

/* Builds one item row: price, quantity, discount, and a remove button. */
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
    clearAdvError();
  });

  remove.addEventListener("click", function () {
    /* Always leave at least one row to type into. */
    if (itemRows.querySelectorAll(".item-row").length <= 1) {
      price.value = "";
      qty.value = "";
      select.value = "0";
      customInput.value = "";
      customWrap.hidden = true;
      clearAdvError();
      return;
    }
    row.parentNode.removeChild(row);
    clearAdvError();
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

/* Keeps the chip that matches the typed percentage switched on. */
function syncAdditionalChips() {
  var typed = parseNumber(additionalInput.value);
  if (additionalInput.value.replace(/\s/g, "") === "") {
    typed = 0;
  }
  for (var i = 0; i < additionalChips.length; i++) {
    var chip = additionalChips[i];
    var matches = Number(chip.getAttribute("data-percent")) === typed;
    if (matches) {
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
    clearAdvError();
  });
}

additionalInput.addEventListener("input", function () {
  syncAdditionalChips();
  clearAdvError();
});

addItemBtn.addEventListener("click", function () {
  addItemRow();
  clearAdvError();
});

/* Reads one row. Returns "empty" when no price was typed, null when
   something typed cannot be used, or the finished numbers for that row. */
function readItemRow(row) {
  var priceField = row.querySelector(".item-price");
  var qtyField = row.querySelector(".item-qty");
  var selectField = row.querySelector(".item-discount");
  var customField = row.querySelector(".item-custom-percent");

  if (priceField.value.replace(/\s/g, "") === "") {
    return "empty";
  }

  var price = parseNumber(priceField.value);
  if (isNaN(price) || price < 0) {
    return null;
  }

  var quantity = 1;
  if (qtyField.value.replace(/\s/g, "") !== "") {
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
    ? formatPercent(item.percent) + "% off"
    : "Full price";
  head.appendChild(badge);

  line.appendChild(head);

  if (item.percent > 0) {
    line.appendChild(buildLineRow("Saved", formatMoney(item.saved), true));
    line.appendChild(buildLineRow("After discount", formatMoney(item.subtotal), false));
  } else {
    line.appendChild(buildLineRow("Price", formatMoney(item.subtotal), false));
  }

  advBreakdown.appendChild(line);
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

function calculateAdvanced() {
  var taxRate = parseNumber(taxInput.value);
  if (isNaN(taxRate) || taxRate < 0) {
    showAdvError("Enter a sales tax percentage above.");
    taxInput.focus();
    return;
  }

  var additionalPercent = 0;
  if (additionalInput.value.replace(/\s/g, "") !== "") {
    additionalPercent = parseNumber(additionalInput.value);
    if (isNaN(additionalPercent) || additionalPercent < 0 || additionalPercent > 100) {
      showAdvError("Enter an additional discount between 0 and 100.");
      additionalInput.focus();
      return;
    }
  }

  var rows = itemRows.querySelectorAll(".item-row");
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var item = readItemRow(rows[i]);
    if (item === null) {
      showAdvError("Check the price, quantity and discount on item " + (i + 1) + ".");
      return;
    }
    if (item !== "empty") {
      items.push(item);
    }
  }

  if (items.length === 0) {
    showAdvError("Enter a price for at least one item.");
    return;
  }

  clearAdvError();

  /* Each row is rounded to cents on its own, then the rows are added up. The
     additional discount comes off that combined subtotal - it is never added
     to the individual item discounts. */
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

  aOriginal.textContent = formatMoney(originalTotal);

  advBreakdown.textContent = "";
  for (var k = 0; k < items.length; k++) {
    addBreakdownLine(items[k]);
  }

  aSubtotal.textContent = formatMoney(itemsSubtotal);

  aItemSavingsRow.hidden = itemSavings <= 0;
  aItemSavings.textContent = "-" + formatMoney(itemSavings);

  var usesAdditional = additionalPercent > 0;
  aDiscountRow.hidden = !usesAdditional;
  aAfterRow.hidden = !usesAdditional;
  if (usesAdditional) {
    aDiscountLabel.textContent = "Additional Discount (" + formatPercent(additionalPercent) + "%)";
    aDiscount.textContent = "-" + formatMoney(additionalAmount);
    aAfter.textContent = formatMoney(subtotalAfter);
  }

  aSavingsBox.hidden = totalSavings <= 0;
  aSavedToday.hidden = totalSavings <= 0;
  if (totalSavings > 0) {
    aTotalSavings.textContent = formatMoney(totalSavings);
    aSavingsPercent.textContent = "You saved " + savingsPercent.toFixed(1) + "%";
    aSavedToday.textContent = "You saved " + formatMoney(totalSavings) + " today";
  }

  aTaxLabel.textContent = "Sales Tax (" + formatPercent(taxRate) + "%)";
  aTax.textContent = formatMoney(salesTax);
  aTotal.textContent = formatMoney(finalTotal);

  advResults.hidden = false;
}

calcAdvBtn.addEventListener("click", calculateAdvanced);
additionalInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    calculateAdvanced();
  }
});

resetItemRows();
syncAdditionalChips();

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

  /* Clear the multiple-items section too, so Reset always means a clean
     slate. Its panel is left open or closed exactly as it was. */
  resetItemRows();
  additionalInput.value = "";
  syncAdditionalChips();
  clearAdvError();
  advResults.hidden = true;

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
