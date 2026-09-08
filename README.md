# Price Check

A small, single-page discount and sales tax calculator, built for quick use on
an iPhone. Plain HTML, CSS and JavaScript — no frameworks, no build step, no
packages, no server, no accounts, no internet connection required.

---

## ① User Release Notes

*(Mirrors `VERSION_HISTORY` at the top of `script.js`, which is the single
source of truth. Update that list first, then copy it here.)*

### Version 0.1.0
- Enter a current price and get the final total
- One-tap discount buttons: 25% / 30% / 15% / 10% OFF
- Custom discount option for any other percentage
- Sales tax field, set to 8.375% by default and editable
- Full breakdown: original price, discount, price after discount, tax, final total
- Reset button clears the price and discount but keeps the tax rate
- Works offline once saved to the iPhone Home Screen

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
discountAmount     = round(price × discountPercent / 100)
priceAfterDiscount = round(price − discountAmount)
salesTax           = round(priceAfterDiscount × taxRate / 100)
finalTotal         = round(priceAfterDiscount + salesTax)
```

Each step rounds to cents and feeds the rounded value into the next step, so
the numbers shown on screen always add up exactly.

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
