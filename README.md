# Walter stock assistant

For AI agents working in this repo, start with [AGENTS.md](./AGENTS.md). Vietnamese product and tech summary: [MO-TA.md](./MO-TA.md).

A low stock task inbox for the Shopify admin. Merchants see it as an embedded
**iframe App Home** built with [React Router](https://reactrouter.com/) (the
current Shopify Remix template) and [Polaris web
components](https://shopify.dev/docs/api/app-home/web-components). A small
Node server handles OAuth, sessions, and GDPR webhooks. Sidekick tools stay as
an admin UI extension.

Local hosting is the Remix process on `http://localhost:3000`. `shopify app
dev` points Shopify at that process (tunnel by default so webhooks work).

## Quick start

### Prerequisites

[Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started),
Node 20.19+ (or 22.12+), and a MongoDB instance (local or Atlas).

### Local development

```shell
npm install
shopify app dev
```

MongoDB defaults to `mongodb://127.0.0.1:27017/walter-stock-assistant`. For Atlas, set `MONGODB_URI` (and optional `MONGODB_DB`) in `.env` before starting.

Press P to open the app on your dev store. After install, the inbox loads in
App Home.

UI-only, no tunnel (webhooks will not arrive):

```shell
shopify app dev --use-localhost
```

## How it works

### Authentication

[Shopify managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation)
plus session tokens. Remix authenticates each request with
`authenticate.admin(request)` in [`app/shopify.server.ts`](./app/shopify.server.ts).
Sessions are stored in MongoDB (`MONGODB_URI`, collection managed by
[`@shopify/shopify-app-session-storage-mongodb`](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-mongodb)).
Local default: `mongodb://127.0.0.1:27017/walter-stock-assistant`.

### Querying data

The iframe app calls Admin GraphQL on the server. All inbox/settings queries
go through [`shared/models`](./shared/models) with a GraphQL function from
[`app/admin-query.server.ts`](./app/admin-query.server.ts).

Sidekick tools still use [Direct API
access](https://shopify.dev/docs/api/app-home#direct-api-access) via
[`shared/utils/admin.ts`](./shared/utils/admin.ts).

### Polaris Web Components

No `@shopify/polaris` React package. `s-page`, `s-button`, and the rest are
custom elements loaded by App Bridge / AppProvider.

## What this app does

A task inbox for restocking, aimed at small stores where one person handles
inventory. Each low stock variant becomes a task with a status, an owner, and
a note.

Pages:

- **stock assistant** (`/app`) — inbox, sorted most urgent first
- **Task** (`/app/task/:id`) — status, owner, internal note
- **Weekly review** (`/app/weekly-review`)
- **Settings** (`/app/settings`)

### How the numbers are worked out

Plain arithmetic in [`shared/utils/forecast.ts`](./shared/utils/forecast.ts):

```
velocity       = units sold in the last 30 days / 30
daysToStockout = stock on hand / velocity
reorderQty     = max(0, velocity * (leadTime + safetyDays) - stock on hand)
```

## Where data is stored

Task state and settings live in [metafields](https://shopify.dev/docs/apps/custom-data/metafields)
under `$app`. MongoDB only stores OAuth sessions.

Status **Ordered** is a workflow flag. The app does not create draft orders or
purchase orders.

## GDPR webhooks

Public apps must answer `customers/data_request`, `customers/redact`, and
`shop/redact`. Handlers are in `app/routes/webhooks.*.tsx`. The app does not
keep customer PII; `shop/redact` deletes sessions for that shop.

## Build

```shell
npm run build
```

## Resources

- [Apps in App Home](https://shopify.dev/docs/apps/build/app-home)
- [Polaris web components](https://shopify.dev/docs/api/app-home/web-components)
- [Shopify app React Router](https://shopify.dev/docs/api/shopify-app-react-router)
- [Privacy law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
