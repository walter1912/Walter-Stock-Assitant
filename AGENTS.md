# Walter stock assistant — agent guide

Read this before changing the app. Human-facing overview: [README.md](./README.md). Vietnamese product/tech summary: [MO-TA.md](./MO-TA.md).

## What this is

A low-stock **task inbox** for small merchants. The App Home is a Shopify-hosted **iframe** (React Router / Remix + Polaris web components). Sessions and GDPR webhooks live in a small Node server. Sidekick tools stay as an admin UI extension.

Merchant UI is English. The builder is Vietnamese; keep UI copy in English.

App name in `shopify.app.toml` is currently `Walter Stock Assitant` (typo). Handle/folder: `walter-stock-assistant`.

## Hard constraints (do not violate)

- **Iframe App Home**, not `admin.app.home.render`. Public distribution needs this plus a hosted backend and GDPR webhooks.
- UI: **Polaris web components** (`s-page`, `s-text`, …) via App Bridge. `s-text` uses `color="subdued"`, not `tone`. Do not import `@shopify/polaris`.
- Admin GraphQL only. The Remix server uses `authenticate.admin(request).graphql`. Sidekick still uses Direct API in [`shared/utils/admin.ts`](./shared/utils/admin.ts). No REST Admin API.
- **Do not add** `shopify.storage` for shared settings, draft-order “reorder”, or ShopifyQL inside this app.
- Use Shopify skills / Dev MCP for Admin GraphQL. Validate queries before shipping.

## Layout

```
shopify.app.toml          # name, scopes, variant metafields, webhooks, sidekick summary
shopify.web.toml          # local Remix / React Router process
app/                      # iframe App Home (React Router)
  shopify.server.ts       # OAuth, sessions, App Store distribution
  db.server.ts            # MongoDB session storage
  inbox.server.ts         # load settings + inbox for authenticated requests
  routes/app*.tsx         # Inbox, Task, Weekly review, Settings
  routes/webhooks.*.tsx   # uninstall, scopes, GDPR
shared/utils/admin.ts     # Direct API wrapper (Sidekick)
shared/utils/forecast.ts  # velocity / days left / suggested qty (pure math)
shared/utils/gid.ts
shared/models/settings.ts # app-installation JSON metafield `$app.settings`
shared/models/stockTasks.ts  # inbox load, task metafields, filters
extensions/app-tools/     # Sidekick tools (read-only)
```

Routes: `/app` inbox, `/app/task/:id` (numeric variant id), `/app/weekly-review`, `/app/settings`.

## Scopes

`shopify.app.toml`: `read_inventory,read_orders,write_products`.

`write_products` is for `metafieldsSet` on variants. `read_orders` is enough for a 30-day window (60-day API default; no `read_all_orders`).

`shopify app dev --reset` can wipe scopes back to `write_products` only. Restore the line above and restart.

## How the inbox is built

1. Page **active products only**: `products(query: "status:active")`. Draft/archived are ignored.
2. Keep variants whose `inventoryQuantity <= threshold` (default 10).
3. Page recent orders (last 30 days) and sum line-item qty per variant id → velocity.

**Do not** search `productVariants` with `product_status:ACTIVE,DRAFT`. That query returns empty rows even when inventory search works. Confirmed against the catalog.

Caps: 5 × 50 products, 100 variants per product, 10 × 50 orders. Set `truncatedVariants` / `truncatedOrders` when the cap hits.

## Forecast (not ShopifyQL)

All in [`shared/utils/forecast.ts`](./shared/utils/forecast.ts):

```
velocity       = unitsSoldIn30d / 30
daysToStockout = inventory / velocity          # null if no sales
reorderQty     = ceil(velocity * (lead + safety) - inventory)
```

Risk: out of stock or <7d critical; 7–14 high; 14–30 medium; >30 low; no sales → none (never “urgent”).

This is **not** Shopify Analytics. Do not call `shopifyqlQuery` from App Home: it needs `read_reports` and is meant for aggregated reporting. Sales velocity stays on `orders` line items.

If a human wants a store-level sales report (GraphiQL / Explore), a valid ShopifyQL starting point is:

```shopifyql
FROM sales SHOW total_sales, orders TIMESERIES month SINCE -12m UNTIL today
```

Docs: [ShopifyQL](https://shopify.dev/docs/api/shopifyql/2026-07).

## Data storage (metafields)

`$app` namespace. Definitions in `shopify.app.toml` (`[variant.metafields.app.*]`).

On **ProductVariant**: `task_status` (`new` | `in_progress` | `reviewed` | `ordered`), `task_note`, `task_reviewed_at`, `task_owner`.

On **AppInstallation**: JSON `settings` `{ threshold, leadTimeDays, safetyDays, simpleMode, contactEmail }`. Not `shopify.storage` (that is per-browser).

MongoDB stores **OAuth sessions only**, not inbox data. Set `MONGODB_URI` (and optional `MONGODB_DB`). Local default is `mongodb://127.0.0.1:27017/walter-stock-assistant`.

Status **Ordered** is a workflow flag only. There is **no** draft order / purchase order create. Do not add `draftOrderCreate` — it is a sales draft, not a supplier PO. Native inventory POs are unstable / feature-preview only.

## Sidekick

[`extensions/app-tools`](./extensions/app-tools): `list_stock_tasks`, `get_stock_task`. Read-only. Keep `[sidekick] extensions_summary` in the app TOML or previews fail.

## Local dev

```
shopify app dev
```

That starts the Remix server on localhost (port 3000) and, by default, a Cloudflare tunnel so Shopify can reach OAuth and webhooks. For UI-only testing without a tunnel:

```
shopify app dev --use-localhost
```

`--use-localhost` cannot receive webhooks. Press `g` for GraphiQL on the store.

## Distribution / App Store

The iframe + GDPR webhook stubs are the public-app shape. You still need a public HTTPS host (not only localhost) before App Store submission, plus a privacy policy URL.

Re-run a local check: `/shopify-app-store-review` (fetches live requirements; do not commit the dump).
