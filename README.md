# Price Check

A small, single-page discount and sales tax calculator, built for quick use on
an iPhone. Plain HTML, CSS and JavaScript — no frameworks, no build step, no
packages, no server, no accounts, no internet connection required.

---

## ① User Release Notes

*(Mirrors `VERSION_HISTORY` at the top of `script.js`, which is the single
source of truth. Update that list first, then copy it here.)*

### Version 0.5.0
- Multiple-item results now open with the Original Total before any discounts
- Each item shows what was saved on it and what it comes to after its discount
- Added a Total Savings panel with the dollar amount and the overall percentage saved
- Added a "You saved $X today" line under the Final Total to show a customer
- Savings are shown in green so they read as money off, not as a charge

### Version 0.4.0
- Added a "Need to calculate multiple items?" section at the bottom, closed until you open it
- Add as many items as you need, each with its own price, quantity and discount
- An additional discount can be taken off the combined subtotal of all the items
- Results list every item, then the subtotal, additional discount, tax and total
- The Final Total is now much larger and easier to show to a customer

### Version 0.3.0
- Added an optional Second Discount section below the first one
- The second discount comes off the price the first discount left, not added to it
- Second Discount is off by default and set apart with a gray background
- Results show both discounts and both subtotals on separate lines

---

## ② Developer Notes

### Files

| File | Purpose |
| --- | --- |
| `index.html` | The page structure: price field, discount buttons, tax field, buttons, results. |
| `style.css` | All styling. Neutral palette, large touch targets, iPhone safe-area padding. |
| `script.js` | All behaviour: version history rendering, discount selection, the calculation, reset, service worker registration. Also holds `VERSION_HISTORY` and `DEFAULT_TAX_RATE`. |
| `manifest.webmanifest` | Lets iOS open the app full-screen when added to the Home Screen. |
| `sw.js` | Service worker. Caches the app so it opens with no connection. |

### Calculation

```
firstAmount          = round(price × firstPercent / 100)
subtotalAfterFirst   = round(price − firstAmount)
secondAmount         = round(subtotalAfterFirst × secondPercent / 100)
subtotalAfterSecond  = round(subtotalAfterFirst − secondAmount)
salesTax             = round(subtotalAfterSecond × taxRate / 100)
finalTotal           = round(subtotalAfterSecond + salesTax)
```

The two discounts are applied one after the other: the second percentage is
taken off `subtotalAfterFirst`, never added to the first percentage. 25% then
25% is not 50% off.

Each step rounds to cents and feeds the rounded value into the next step, so
the numbers shown on screen always add up exactly. That means a chain such as
$34.00 − 25% − 25% shows $19.12 rather than $19.13: $6.375 rounds up to $6.38
for the second discount line, and $25.50 − $6.38 is $19.12. Rounding only at
the very end would show $19.13, but then the lines on screen would no longer
subtract correctly by hand.

### Multiple items

```
rowSubtotal    = round(price × quantity × (1 − itemPercent / 100))   per row
itemsSubtotal  = the rounded row subtotals added together
additional     = round(itemsSubtotal × additionalPercent / 100)
subtotalAfter  = round(itemsSubtotal − additional)
salesTax       = round(subtotalAfter × taxRate / 100)
finalTotal     = round(subtotalAfter + salesTax)
```

Same rule as the two-discount chain: the per-item discounts and the
additional discount are applied in sequence, never added together. The
section reuses the sales tax rate from the main calculator rather than
carrying a second tax field.

The savings figures shown alongside come from the same numbers:

```
originalTotal   = the rounded (price × quantity) of every row added together
itemSavings     = originalTotal − itemsSubtotal
totalSavings    = originalTotal − subtotalAfter
savingsPercent  = totalSavings / originalTotal × 100      (shown to 1 decimal)
```

`totalSavings` is measured before tax is added, so tax is never counted as a
saving. The savings rows, the Total Savings panel and the "You saved $X
today" line are hidden when nothing was discounted.

### Version history

`VERSION_HISTORY` in `script.js` is the single source. It holds the three
newest versions, newest first — adding a new entry at the top means deleting
the oldest at the bottom. The collapsible panel at the top of the page renders
straight from it, and starts collapsed on every load. This README's *User
Release Notes* section mirrors the same list (kept in sync by hand, because the
project deliberately has no Node.js or build tooling).

### Caching

`sw.js` uses one fixed cache name and a cache-first / refresh-in-background
strategy, so there is no cache version number to bump when the app changes. An
edited file is picked up the second time the app is opened after the change.

### Constraints kept on purpose

No React, no Node.js, no npm, no external libraries, no CDN resources, no APIs,
no backend, no database, no login. Only long-standing browser features that
iPhone Safari has supported for years.
