# Quote Form Kit

A fully customizable instant-quote form with a visual admin panel. Originally built to replace a hardcoded pressure-washing quote calculator, but designed to work for **any service business** — cleaning, landscaping, detailing, moving, whatever.

## What's in the box

```
quote-form-kit/
├── index.html                     ← landing page with links
├── src/
│   ├── core/
│   │   ├── engine.js              ← pricing calculator (pure logic)
│   │   ├── themes.js              ← 6 theme presets + font library
│   │   └── config.default.json    ← default config (edit via admin)
│   ├── form/
│   │   ├── form.html              ← customer-facing quote form
│   │   └── form.js                ← builds form dynamically from config
│   └── admin/
│       ├── admin.html             ← visual editor
│       └── admin.js               ← admin panel logic
└── README.md
```

## Features

- **6 theme presets** — Minimal, Modern, Bold, Warm, Technical, Dark (with full dark mode support)
- **15 Google Fonts** to pick from, with live preview
- **Fine-grained color control** — tune any of the 6 theme colors independently
- **Lead capture step** — after the quote displays, collect customer contact info and send it to your inbox via Formspree or a custom webhook
- **Four pricing models** (flat, per-unit, tiered, matrix) to handle almost any service
- **Multi-service discounts** and **shareable package URLs**
- **Visual admin panel** — no code required to customize

## Quick start

1. Clone or download this repo
2. Open `index.html` in a browser (or serve the folder with any static host)
3. Click **Admin Panel** and start configuring

> **Note:** Because everything is ES modules, you need to serve this over HTTP (not `file://`). The easiest way locally:
> ```bash
> cd quote-form-kit
> python3 -m http.server 8000
> # visit http://localhost:8000
> ```

## Customizing the form

Everything is driven by `src/core/config.default.json`. You have two ways to edit it:

### Option 1 — visual admin panel (recommended)

Open `src/admin/admin.html`. The panel lets you:
- **Branding** — business name, accent color, currency
- **Services & Pricing** — add, remove, reorder, rename services; choose a pricing type; configure inputs
- **Discounts** — multi-service discount tiers
- **Packages** — pre-selected bundles with shareable URLs like `?package=p1`
- **Live Preview** — iframe that shows exactly what customers see
- **Export** — download `config.json` to commit to your repo

Your edits live in `localStorage` until you export. Click **Save & Preview** to refresh the preview.

### Option 2 — edit JSON directly

If you prefer, open `config.default.json` in any editor. See the "Pricing types" section below.

## Pricing types

The engine supports four pricing strategies. Think of them like different cost calculators you can plug in per service.

### `flat` — one fixed price
```json
{ "type": "flat", "amount": 99 }
```

### `per_unit` — rate × quantity
```json
{
  "type": "per_unit",
  "inputField": "size",
  "rate": 0.25,

  "multipliers": [
    { "field": "sides", "values": { "1": 1, "2": 1.6667 } }
  ],

  "extras": [
    { "field": "railing", "rate": 2.5 }
  ]
}
```
- `multipliers` scale the price (e.g., fence with both sides costs ~1.67× one side)
- `extras` add on top (e.g., deck railing at $2.50/ft gets added to the base deck price)

### `tiered` — price brackets by size
```json
{
  "type": "tiered",
  "inputField": "size",
  "tiers": [
    { "max": 1000, "price": 275 },
    { "max": 2000, "price": 375 }
  ]
}
```
The engine finds the first tier where `quantity <= max`.

### `matrix` — multi-factor pricing
For when the price depends on combining several factors (like the original pressure-washing logic: floors × material × size). Define dimensions, and the admin panel generates a grid where you fill in prices for each combination.

```json
{
  "type": "matrix",
  "aliases": { "vinyl": "std", "concrete": "std", "wood": "wood" },
  "dimensions": [
    { "field": "floors", "values": ["1","2","3"] },
    { "field": "material", "values": ["std","wood"] },
    { "field": "size", "type": "range", "ranges": [
      { "max": 1000, "key": "a" },
      { "max": 2000, "key": "b" }
    ]}
  ],
  "prices": {
    "1|std|a": 150,
    "2|std|a": 175,
    "1|wood|a": 200
  }
}
```
- `aliases` let you group values that share a price (e.g., vinyl/concrete/aluminum all cost the same)
- Leave a combo out of `prices` if it shouldn't be allowed

## Packages and URL params

Packages are shareable bundles. If a customer visits `form.html?package=p1`, the form auto-selects the services in that package. Great for email CTAs:

> "Click here for a free Driveway + Roof quote" → links to `form.html?package=p3`

## Setting up lead capture delivery

The kit itself is fully client-side (no server), so to actually receive lead submissions by email you need a tiny intermediary. Easiest path:

1. Sign up at [formspree.io](https://formspree.io) — free tier allows 50 submissions/month
2. Create a new form, give it a name
3. Copy your endpoint URL — looks like `https://formspree.io/f/xabcd123`
4. In the admin panel, go to **Lead Capture → Where to send submissions**
5. Set delivery method to **Formspree** and paste the URL
6. Hit Save & Preview, submit a test lead, check your inbox

Alternatives:
- **Zapier / Make / n8n webhook** — set delivery to "Custom webhook", paste your webhook URL. The kit POSTs a JSON body with all the fields plus quote details.
- **Your own backend** — same as webhook, send it to any endpoint that accepts a JSON POST.
- **Local only** — for testing. Submissions are logged to the browser console and saved in `localStorage` under `quoteFormKit.leads`.

## Embedding on your site

1. Customize your config via the admin panel
2. Click **Export → Download config.json**
3. Replace `src/core/config.default.json` with the downloaded file
4. Copy the whole `src/` folder to your web host
5. Link to `src/form/form.html` from your site (or iframe it)

## Deploying to GitHub Pages

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
Then in GitHub: **Settings → Pages → Source: main / root**. Your form will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/src/form/form.html`.

## Comparison with the original code

The original script had three big problems:

1. **Hardcoded pricing.** Changing the price of 3-story stucco homes meant editing 4 different `else if` branches.
2. **Hardcoded services.** Adding "window cleaning" meant touching HTML, JS, and the quote form together.
3. **19 packages as separate `case` blocks.** Each one duplicated the same 5 lines.

The kit fixes all three:

| Original | Kit |
|----------|-----|
| 26-branch if/else chain | Matrix lookup table (data, not code) |
| 19 hardcoded `case` blocks | Single `packages` array in config |
| DOM-selector-heavy quote form | Form built from config metadata |
| Code edits to change prices | Visual admin panel |

## License

MIT. Use it for your pressure washing business, your kayak tour booking, or whatever else.
