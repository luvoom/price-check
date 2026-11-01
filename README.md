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

### Version 0.10.0
- Changing a price, quantity, discount or the tax now marks the results as out of date, so an old total is never shown as if it were current
- While they are out of date the Currency Conversion screen no longer fills in that old total
- Typing your own exchange rate and then switching currency no longer keeps the old number — it would have converted at the wrong rate
- Added an Update Rate button that is always available, not only when the rate fails to load
- The exchange rate is also refreshed on its own when it is more than half an hour old, or when you come back to a phone that has been asleep

### Version 0.9.3
- The currency now follows the language you pick, so choosing 日本語 no longer leaves the price in Mexican pesos
- If you pick a currency from the list yourself, it is kept and the language never changes it
- The Currency Conversion button always reads in the language currently chosen

### Version 0.9.2
- Fixed the Language menu doing nothing on the phone after an update
- The phone could end up running part of the new app and part of the old one, which stopped the language from changing
- Updates now always come from the internet rather than from a copy the phone kept, so the whole app changes together
- If anything ever does get out of step, the language menu now keeps working instead of going quiet



---

## ② Developer Notes

### Files

| File | Purpose |
| --- | --- |
| `index.html` | Both views: `#viewPriceCheck` (the calculator) and `#viewCurrency` (the converter). One is hidden while the other shows. |
| `style.css` | All styling. Neutral palette, large touch targets, iPhone safe-area padding. |
| `i18n.js` | Every translated word, plus `t`/`tf`, `setLanguage`, `onLanguageChange`, `applyTranslations` and `applyDirection`. Loads before the other two. Holds `LANGUAGES` and `TRANSLATIONS`. |
| `script.js` | The calculator: version history rendering, the item lines, the calculation, `renderResults`, reset, service worker registration. Also holds `VERSION_HISTORY`, `DEFAULT_TAX_RATE`, `ITEM_DISCOUNT_CHOICES` and `STARTING_ITEM_ROWS`. |
| `currency.js` | The converter: `CURRENCIES`, `RATE_SOURCES`, the fetch and the rendering. The only file that touches the network. |
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

The network leg goes through `fetchFresh()`, which passes
`{ cache: "no-store" }`. Without it, "network first" is not what happens:
GitHub Pages sends `Cache-Control: max-age=600`, so a plain `fetch()` inside
the worker can be answered from the browser's own store without a request
leaving the device — and each file expires on its own clock, so an update
could leave the page from one version running the scripts of another. That is
worse than being merely out of date: 0.9.1's `script.js` against 0.9.0's
`index.html` threw on a missing element and took the language switching down
with it. `fetchFresh` falls back to a plain `fetch` if a browser rejects the
option.

Nothing should depend on that never happening, so `applyTranslations` and
`applyDirection` ignore a missing element instead of throwing, `setLanguage`
runs each listener in its own `try`, and `script.js` guards the language
select. A mismatched set now shows slightly older labels rather than breaking.

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
successful response is stamped with `fetchedAt` and saved to `localStorage`
under `priceCheckRates`, so a reopen shows the last known rate immediately —
labelled as saved — while a refresh runs. If every source fails and nothing is
saved, the view shows the translated error; conversion is simply unavailable
until a rate exists.

`ratesAreStale()` is true with no rate, with one restored from storage, or
with one older than `RATE_MAX_AGE_MS` (30 min). `refreshIfStale()` runs it on
every opening of the view and whenever the page becomes visible again while
the view is open, which covers the screen being left open through a shift and
a phone coming back from sleep. The refresh button is always on screen rather
than only after a failure — a rate fetched an hour ago is still the rate on
display until someone asks for a newer one — and it reads *Try Again* when the
last attempt failed.

A positive number typed into the manual field takes precedence over the
automatic rate for as long as it is there; *Use Automatic Rate* clears it, and
so does changing currency: a rate is typed for one currency, and carrying 150
from yen into euros would have quietly converted at 1 USD = 150 EUR.

### Out-of-date results

Nothing recalculates as you type, so after an edit the figures on screen
belong to the previous inputs. `markResultsOutOfDate()` — wired to the item
rows as a whole, the Add Item button, the discount chips and field, and the
tax field — adds `is-stale` to the results card, shows the translated notice
and sets `window.PriceCheck.finalTotal` back to `null`. The figures fade while
the notice does not, and the converter has no total to prefill, so a stale
number cannot reach a customer as the current one. `calculate()` and `reset()`
clear the state.

Amounts use `Intl.NumberFormat` with the chosen language's locale and the
`decimals` field from `CURRENCIES` (0 for JPY, KRW, TWD, VND). `narrow: true`
asks for the short symbol, which is set only where that symbol stands alone
(¥906.25 rather than CN¥906.25); every other dollar keeps its CA$ / HK$ / NT$
prefix. Where even the full symbol would come out as a bare `$` — Taiwan
writes NT$ as plain `$` in its own language — `symbolIsBareDollar` catches it
with `formatToParts` and the format falls back to the code, so `TWD 5,216` can
never be read as US dollars next to the USD line above it. Currency names come
from `Intl.DisplayNames` where the browser has it, inside a try/catch that
falls back to the English name.

### Languages

`i18n.js` holds the whole system. `LANGUAGES` lists the fifteen — code, the
language's own name, the locale used for formatting, the currency to suggest,
and `rtl` for the ones written right to left. `TRANSLATIONS` has one object
per language with identical keys; `t(key)` falls back to the English wording,
and `tf(key, value)` fills the `{0}` in strings such as `"You saved {0} today"`.

Both screens share `appLanguage`. `setLanguage()` is the only way it changes,
and it calls every listener registered through `onLanguageChange()` —
script.js redraws `#langRow` and the results panel, currency.js redraws its
view and the button label. So the Language menu and the language buttons on
the converter are two ways into the same setting.

`#langRow` sits directly under the title rather than inside `#results`,
because `#results` carries `hidden` until a calculation has been made: in the
results card the menu could not be found, or used, until Calculate Total had
been pressed.

A language change leaves the amount and the rate alone. The currency depends
on where it came from: `currencyChosenByHand` is set when the picker is used,
and `suggestCurrency()` then steps aside, so a deliberate choice is never
undone. Until then the currency is only the `currency` field of the chosen
language, and it follows the next one — Español suggests MXN, so switching to
日本語 has to leave yen rather than a Japanese screen quoting Mexican pesos.
Selecting the blank entry clears the flag.

Labels carry `data-i18n="key"` in the markup and `applyTranslations(root)`
fills them. Anything with a number in it — `Sales Tax (8.375%)`,
`25% off` — is written in `renderResults()` and `render()` instead, from the
same keys. `calculate()` does the arithmetic once and stores it in
`lastResult`; `renderResults()` draws from that, so changing language redraws
the panel without recalculating, and the amounts never move.

Only the parts shown to the customer are translated: the results panel and the
converter. The item rows, the tax field, the buttons the employee works and
every error message stay in English, because they are for whoever is holding
the phone.

`applyDirection()` sets `dir` on those two panels for Arabic, and a short CSS
block puts the money back to `direction: ltr` so a minus sign stays in front
of the amount (`-$61.05`, not `$61.05-`).

The button into the converter shows `Currency Conversion` with the chosen
language's wording underneath, hidden while the language is English since
there would be nothing to add.

### Constraints kept on purpose

No React, no Node.js, no npm, no external libraries, no CDN resources, no
backend, no database, no login. The exchange-rate request is the only network
call in the project, and only the converter depends on it. Everything else uses
long-standing browser features that iPhone Safari has supported for years.
