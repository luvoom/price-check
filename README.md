# Price Check

A small, single-page calculator for pricing several discounted items at once,
built for quick use on an iPhone, with a customer-facing currency converter
alongside it. Plain HTML, CSS and JavaScript — no frameworks, no build step, no
packages, no server, no accounts. The calculator needs no internet connection;
only the currency converter asks for a live exchange rate.

---

## ① User Release Notes

*(Mirrors `VERSION_HISTORY` at the top of `script.js`, which is the single
source of truth. Update that list first, then copy it here.)*

### Version 0.8.0
- Added a Currency Conversion screen you can turn around and show the customer
- It opens with the Final Total already filled in, so nothing is retyped
- Converts into 15 currencies using today's exchange rate
- The customer can tap their own language: English, Español, 中文, 日本語, 한국어, Français, Português or Deutsch
- You can type your own exchange rate when you need to, and switch back with one tap
- The price calculator itself still works with no signal

### Version 0.7.1
- Opening the app now loads the newest version straight away when you have a signal
- With no signal it still opens instantly from the copy saved on the phone

### Version 0.7.0
- Each item's discount list now goes up to 50% off
- Added 40%, 45% and 50% to the choices


---

## ② Developer Notes

### Files

| File | Purpose |
| --- | --- |
| `index.html` | Both views: `#viewPriceCheck` (the calculator) and `#viewCurrency` (the converter). One is hidden while the other shows. |
| `style.css` | All styling. Neutral palette, large touch targets, iPhone safe-area padding. |
| `script.js` | The calculator: version history rendering, the item lines, the calculation, reset, service worker registration. Also holds `VERSION_HISTORY`, `DEFAULT_TAX_RATE`, `ITEM_DISCOUNT_CHOICES` and `STARTING_ITEM_ROWS`. |
| `currency.js` | The converter: `TRANSLATIONS`, `LANGUAGES`, `CURRENCIES`, `RATE_SOURCES`, the fetch and the rendering. The only file that touches the network. |
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

`sw.js` uses one fixed cache name and a network-first strategy with a
`NETWORK_TIMEOUT_MS` (3s) fallback to the cache, so there is no cache version
number to bump when the app changes and no second launch needed to pick up an
edit: with a connection the newest files are fetched and re-cached on every
load, and without one the saved copy is served immediately.

The `fetch` handler returns early for any request whose origin is not the
app's own, so the exchange-rate request is never intercepted, never cached and
never delayed by the service worker. Nothing about the converter can affect
whether the app opens.

### Currency conversion

Two views live in one page, swapped by the `hidden` attribute on
`#viewPriceCheck` and `#viewCurrency`. Nothing navigates, so returning from the
converter leaves the calculation, the typed items and the results untouched.

`calculate()` writes its result to `window.PriceCheck.finalTotal` (cleared by
`reset()`), and `openCurrency()` reads it once to prefill the USD field. The
field stays editable, so the converter also works on its own.

`RATE_SOURCES` lists the endpoints in order of preference, each with a `read`
function that normalises the response to `{ rates, updated }`:

1. `https://open.er-api.com/v6/latest/USD` — free, no key, CORS open, covers
   all fifteen currencies including TWD.
2. `https://api.frankfurter.dev/v1/latest?base=USD` — fallback, ECB data; it
   does not quote TWD, which then reports as unavailable rather than wrong.

Each source gets `RATE_TIMEOUT_MS` (8s). The first that answers wins. A
successful response is saved to `localStorage` under `priceCheckRates`, so a
reopen shows the last known rate immediately — labelled as saved — while a
refresh runs. If every source fails and nothing is saved, the view shows the
translated error and a *Try Again* button; conversion is simply unavailable
until a rate exists.

A positive number typed into the manual field takes precedence over the
automatic rate for as long as it is there; *Use Automatic Rate* clears it.

Translations live in `TRANSLATIONS`, one object per language with identical
keys, read through `t(key)` which falls back to the English wording. Labels
carry `data-i18n="key"` in the markup and `applyLanguage()` fills them, so
switching language rewrites the text in place — no reload, no state lost. The
amount, currency and rate are untouched by a language change; the suggested
currency in `LANGUAGES` only ever fills a picker that is still empty.

Amounts use `Intl.NumberFormat` with the chosen language's locale and the
`decimals` field from `CURRENCIES` (0 for JPY, KRW, TWD). Currency names come
from `Intl.DisplayNames` where the browser has it, inside a try/catch that
falls back to the English name.

### Constraints kept on purpose

No React, no Node.js, no npm, no external libraries, no CDN resources, no
backend, no database, no login. The exchange-rate request is the only network
call in the project, and only the converter depends on it. Everything else uses
long-standing browser features that iPhone Safari has supported for years.
