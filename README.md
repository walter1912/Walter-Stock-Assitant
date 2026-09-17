# Walter Stock Tasks

For AI agents working in this repo, start with [AGENTS.md](./AGENTS.md). Vietnamese product and tech summary: [MO-TA.md](./MO-TA.md).

A low stock task inbox for the Shopify admin, built as an extension-only
[Shopify app](https://shopify.dev/docs/apps/getting-started) with
[Preact](https://preactjs.com/). Shopify hosts the whole thing: it uses
[Direct API access](https://shopify.dev/docs/api/app-home#direct-api-access)
and [App Bridge](https://shopify.dev/docs/api/app-bridge) to call the Admin API
straight from the browser, so there is no server to run.

## Quick start

### Prerequisites

Before you begin, you'll need to [download and install the Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started) if you haven't already.

### Local Development

```shell
shopify app dev
```

Press P to open the URL to your app. Once you click install, you can start development.

Local development is powered by [Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps/test-apps-locally). It logs into your account, connects to an app, provides environment variables, updates remote config, creates a tunnel and provides commands to generate extensions.

## How it works

### Authentication

This template uses [Shopify managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation). Shopify handles the OAuth flow and app installation automatically. Once installed, the app is fully embedded in the Shopify Admin.

### Querying data

This template uses [Direct API access](https://shopify.dev/docs/api/app-home#direct-api-access) — the Shopify Admin API is called directly from the browser using App Bridge. No server-side code is needed.

All Admin API calls go through [`/shared/utils/admin.ts`](./shared/utils/admin.ts). The two data models built on top of it are [`/shared/models/stockTasks.ts`](./shared/models/stockTasks.ts) (the inbox and task state) and [`/shared/models/settings.ts`](./shared/models/settings.ts).

### App Bridge

[App Bridge](https://shopify.dev/docs/api/app-bridge) is loaded automatically in embedded apps.

### Polaris Web Components

This template uses [Polaris Web Components](https://shopify.dev/docs/api/app-home/web-components) — the native custom element version of Polaris that works in any framework (including Preact). No additional package installation is required as they are provided automatically in the Shopify Admin iframe.

## Build

Build the app by running:

Using npm:

```shell
npm run build
```

Using yarn:

```shell
yarn build
```

Using pnpm:

```shell
pnpm run build
```

## Shopify Dev MCP

This template is configured with the Shopify Dev MCP. This instructs [Cursor](https://cursor.com/), [GitHub Copilot](https://github.com/features/copilot), [Claude Code](https://claude.com/product/claude-code), and [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) to use the Shopify Dev MCP.

For more information on the Shopify Dev MCP please read [the documentation](https://shopify.dev/docs/apps/build/devmcp).

## What this app does

A task inbox for restocking, aimed at small stores where one person handles
inventory. Instead of emailing an alert and leaving the merchant in the admin,
each low stock variant becomes a task with a status, an owner, and a note.

Pages, all under `extensions/app-home/src/pages`:

- **Stock tasks** — the inbox, sorted most urgent first, with quick filters
  ("Might cost me sales", "Can ignore this week"), a "Look at these first"
  panel ranked by revenue exposure, and Simple mode for three columns only.
- **Task** — status, owner, internal note, and mark as reviewed.
- **Weekly review** — a screenshot-friendly summary: reviewed, ordered, and
  urgent-but-untouched.
- **Settings** — threshold, supplier lead time, buffer stock, Simple mode.

### How the numbers are worked out

All of it is plain arithmetic in [`/shared/utils/forecast.ts`](./shared/utils/forecast.ts),
recomputed in the browser. There is no scheduled job and no server.

```
velocity       = units sold in the last 30 days / 30
daysToStockout = stock on hand / velocity
reorderQty     = max(0, velocity * (leadTime + safetyDays) - stock on hand)
```

Urgency bands are under 7 days, 7-14, 14-30, and over 30. A variant with no
sales in the window has no stockout estimate and is never treated as urgent.

## Where data is stored

No database. Everything lives in [metafields](https://shopify.dev/docs/apps/custom-data/metafields)
under the app-reserved `$app` namespace, so no other app can overwrite it.

Task state sits on the variant, which also makes it visible in the admin:

```toml
[product_variant.metafields.app.task_status]
name = "Stock task status"
type = "single_line_text_field"

  [product_variant.metafields.app.task_status.access]
  admin = "merchant_read_write"
```

`task_note`, `task_reviewed_at`, and `task_owner` are declared the same way.
These definitions sync to Shopify when you run `shopify app dev` or
`shopify app deploy`.

Merchant settings are one `json` metafield on the app installation, written by
[`/shared/models/settings.ts`](./shared/models/settings.ts). The app
installation is used rather than `shopify.storage` so every staff member sees
the same threshold and lead time instead of per-device values.

## Limits worth knowing

- The App Home UI extension bundle is capped at 64 KB compressed.
- Sales velocity is read from the last 30 days of orders, paged from the
  browser. Both the order and variant scans are capped; when a store has more
  than the cap, the inbox says so. Variants are fetched lowest-stock-first, so
  anything dropped is the least urgent.
- `read_orders` only reaches back 60 days, which covers the 30-day window
  without needing `read_all_orders`.
- App Home UI extensions are custom-distribution only. Public distribution
  would mean re-authoring this UI as an iframe app with a hosted backend.

## Resources

Preact & Vite:

- [Preact docs](https://preactjs.com/guide/v10/getting-started)
- [Vite docs](https://vite.dev/)

Shopify:

- [Intro to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [Direct API access](https://shopify.dev/docs/api/app-home#direct-api-access)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [App Bridge](https://shopify.dev/docs/api/app-bridge)
- [Polaris Web Components](https://shopify.dev/docs/api/app-home/web-components)
- [App Home UI extensions](https://shopify.dev/docs/api/app-home-ui-extension/latest)
- [Metafields](https://shopify.dev/docs/apps/build/metafields/definitions)
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
