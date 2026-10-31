# Price Check

A small, single-page calculator for pricing several discounted items at once,
built for quick use on an iPhone. Plain HTML, CSS and JavaScript — no frameworks, no build step, no
packages, no server, no accounts, no internet connection required.

---

## ① User Release Notes

*(Mirrors `VERSION_HISTORY` at the top of `script.js`, which is the single
source of truth. Update that list first, then copy it here.)*

### Version 0.7.0
- Each item's discount list now goes up to 50% off
- Added 40%, 45% and 50% to the choices

### Version 0.6.1
- Added a Home Screen app icon: a white P on a dark navy square
- The same icon shows in the browser tab

### Version 0.6.0
- The item list is now the main screen - nothing to open first
- Removed the separate single-item calculator; one item is simply one line
- Additional Discount and Sales Tax work exactly as before
- Results still show every item, the savings, and the final total


---

## ② Developer Notes

### Files

| File | Purpose |
| --- | --- |
| `index.html` | The page structure: the item list, additional discount, tax field, buttons, results. |
| `style.css` | All styling. Neutral palette, large touch targets, iPhone safe-area padding. |
| `script.js` | All behaviour: version history rendering, the item lines, the calculation, reset, service worker registration. Also holds `VERSION_HISTORY`, `DEFAULT_TAX_RATE`, `ITEM_DISCOUNT_CHOICES` and `STARTING_ITEM_ROWS`. |
| `manifest.webmanifest` | Lets iOS open the app full-screen when added to the Home Screen. |
| `sw.js` | Service worker. Caches the app so it opens with no connection. |
| `apple-touch-icon.png` | 180×180 Home Screen icon for iOS. |
| `icon-192.png`, `icon-512.png` | The same icon at the two sizes the manifest declares. |

### Calculation

```
rowSubtotal    = round(price × quantity × (1 − itemPercent / 100))   per line
itemsSubtotal  = the rounded line subtotals added together
additional     = round(itemsSubtotal × additionalPercent / 100)
subtotalAfter  = round(itemsSubtotal − additional)
salesTax       = round(subtotalAfter × taxRate / 100)
finalTotal     = round(subtotalAfter + salesTax)
```

The discounts are applied in sequence, never added together: each line keeps
its own percentage, the lines are totalled, and only then does the additional
discount come off that combined subtotal. 25% on a line and a further 25% off
the subtotal is not 50% off. A single item with two stacked discounts is
entered as one line plus the additional discount.

Each step rounds to cents and feeds the rounded value into the next step, so
the numbers shown on screen always add up exactly. Rounding only at the very
end would shift some totals by a cent, but then the lines on screen would no
longer add up by hand.

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
