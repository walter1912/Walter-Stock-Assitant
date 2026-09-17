import { adminQuery, throwUserErrors } from "../utils/admin";
import {
  forecast,
  riskRank,
  velocityWindowStart,
  type Forecast,
  type RiskLevel,
} from "../utils/forecast";
import type { Settings } from "./settings";

export type TaskStatus = "new" | "in_progress" | "reviewed" | "ordered";

export const TASK_STATUSES: TaskStatus[] = [
  "new",
  "in_progress",
  "reviewed",
  "ordered",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: "New",
  in_progress: "In progress",
  reviewed: "Reviewed",
  ordered: "Ordered",
};

export const STATUS_TONES: Record<TaskStatus, string> = {
  new: "critical",
  in_progress: "caution",
  reviewed: "info",
  ordered: "success",
};

export interface StockTask {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;
  /** Shopify product status: ACTIVE, DRAFT, or ARCHIVED. */
  productStatus: string;
  displayTitle: string;
  sku: string;
  price: number;
  inventory: number;
  /** False when the merchant has not turned on "Track quantity". */
  tracked: boolean;
  unitsSoldInWindow: number;
  status: TaskStatus;
  note: string;
  reviewedAt: string | null;
  owner: string;
  forecast: Forecast;
}

export interface Inbox {
  tasks: StockTask[];
  /** True when the store has more low stock variants than we fetched. */
  truncatedVariants: boolean;
  /** True when the store has more recent orders than we fetched. */
  truncatedOrders: boolean;
}

/**
 * Guardrails for a no-backend app: we page through the Admin API from the
 * browser, so cap the work instead of hanging on a huge catalogue.
 */
const PRODUCT_PAGE_SIZE = 50;
const MAX_PRODUCT_PAGES = 5;
const ORDER_PAGE_SIZE = 50;
const MAX_ORDER_PAGES = 10;

const ACTIVE_PRODUCTS_QUERY = `#graphql
  query ActiveProductsForInbox($q: String!, $first: Int!, $after: String) {
    products(first: $first, query: $q, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        status
        variants(first: 100) {
          pageInfo {
            hasNextPage
          }
          nodes {
            id
            title
            sku
            price
            inventoryQuantity
            inventoryItem {
              tracked
            }
            metafields(first: 10, namespace: "$app") {
              nodes {
                key
                value
              }
            }
          }
        }
      }
    }
  }`;

const RECENT_ORDERS_QUERY = `#graphql
  query RecentOrderQuantities($q: String!, $first: Int!, $after: String) {
    orders(first: $first, query: $q, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        cancelledAt
        lineItems(first: 100) {
          nodes {
            quantity
            variant {
              id
            }
          }
        }
      }
    }
  }`;

const SAVE_TASK_MUTATION = `#graphql
  mutation SaveStockTask($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }`;

function parseStatus(raw: string | undefined): TaskStatus {
  return TASK_STATUSES.includes(raw as TaskStatus) ? (raw as TaskStatus) : "new";
}

function metafieldMap(nodes: { key: string; value: string }[] | undefined) {
  const map = new Map<string, string>();
  for (const node of nodes ?? []) {
    map.set(node.key, node.value);
  }
  return map;
}

/** Units sold per variant over the velocity window. */
async function fetchSoldQuantities(): Promise<{
  sold: Map<string, number>;
  truncated: boolean;
}> {
  const sold = new Map<string, number>();
  const q = `created_at:>=${velocityWindowStart()}`;

  let after: string | null = null;
  let truncated = false;

  for (let page = 0; page < MAX_ORDER_PAGES; page++) {
    const data = await adminQuery(RECENT_ORDERS_QUERY, {
      q,
      first: ORDER_PAGE_SIZE,
      after,
    });
    const connection = data.orders;

    for (const order of connection?.nodes ?? []) {
      if (order.cancelledAt) continue;

      for (const line of order.lineItems?.nodes ?? []) {
        const variantId = line.variant?.id;
        if (!variantId) continue;
        sold.set(variantId, (sold.get(variantId) ?? 0) + (line.quantity ?? 0));
      }
    }

    if (!connection?.pageInfo?.hasNextPage) {
      return { sold, truncated };
    }
    after = connection.pageInfo.endCursor;
    // Only truncated if there is still more to read once the budget runs out.
    truncated = page === MAX_ORDER_PAGES - 1;
  }

  return { sold, truncated };
}

export async function loadInbox(settings: Settings): Promise<Inbox> {
  const { sold, truncated: truncatedOrders } = await fetchSoldQuantities();
  const threshold = Math.max(0, Math.floor(settings.threshold));

  // productVariants search cannot filter ACTIVE reliably (product_status:ACTIVE,DRAFT
  // returns no rows). products(query: "status:active") does, which we confirmed
  // against this store's catalog. https://shopify.dev/docs/api/admin-graphql/2026-07/queries/products
  const tasks: StockTask[] = [];
  let after: string | null = null;
  let truncatedVariants = false;

  for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
    const data = await adminQuery(ACTIVE_PRODUCTS_QUERY, {
      q: "status:active",
      first: PRODUCT_PAGE_SIZE,
      after,
    });
    const connection = data.products;

    for (const product of connection?.nodes ?? []) {
      if (product.status !== "ACTIVE") continue;

      if (product.variants?.pageInfo?.hasNextPage) {
        truncatedVariants = true;
      }

      for (const variant of product.variants?.nodes ?? []) {
        const inventory = variant.inventoryQuantity ?? 0;
        if (inventory > threshold) continue;
        tasks.push(toTask(variant, product, sold, settings));
      }
    }

    if (!connection?.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor;
    truncatedVariants = truncatedVariants || page === MAX_PRODUCT_PAGES - 1;
  }

  return { tasks: sortByUrgency(tasks), truncatedVariants, truncatedOrders };
}

function toTask(
  variant: any,
  product: { id?: string; title?: string; status?: string },
  sold: Map<string, number>,
  settings: Settings,
): StockTask {
  const fields = metafieldMap(variant.metafields?.nodes);
  const inventory = variant.inventoryQuantity ?? 0;
  const tracked = Boolean(variant.inventoryItem?.tracked);
  const price = Number(variant.price ?? 0);
  const variantTitle = variant.title ?? "";
  const productTitle = product.title ?? "Untitled product";

  return {
    variantId: variant.id,
    variantTitle,
    productId: product.id ?? "",
    productTitle,
    productStatus: product.status ?? "ACTIVE",
    displayTitle:
      variantTitle && variantTitle !== "Default Title"
        ? `${productTitle} - ${variantTitle}`
        : productTitle,
    sku: variant.sku ?? "",
    price,
    inventory,
    tracked,
    unitsSoldInWindow: sold.get(variant.id) ?? 0,
    status: parseStatus(fields.get("task_status")),
    note: fields.get("task_note") ?? "",
    reviewedAt: fields.get("task_reviewed_at") ?? null,
    owner: fields.get("task_owner") ?? "",
    forecast: forecast({
      inventory,
      unitsSoldInWindow: sold.get(variant.id) ?? 0,
      leadTimeDays: settings.leadTimeDays,
      safetyDays: settings.safetyDays,
      price,
    }),
  };
}

/** Most urgent first: risk band, then soonest stockout, then revenue. */
export function sortByUrgency(tasks: StockTask[]): StockTask[] {
  return [...tasks].sort((a, b) => {
    const byRisk = riskRank(a.forecast.risk) - riskRank(b.forecast.risk);
    if (byRisk !== 0) return byRisk;

    const aDays = a.forecast.daysToStockout ?? Number.POSITIVE_INFINITY;
    const bDays = b.forecast.daysToStockout ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;

    return b.forecast.dailyRevenueAtRisk - a.forecast.dailyRevenueAtRisk;
  });
}

/** Highest revenue exposure among the variants that are actually at risk. */
export function topRevenueAtRisk(tasks: StockTask[], limit = 5): StockTask[] {
  return tasks
    .filter(
      (task) =>
        task.forecast.dailyRevenueAtRisk > 0 &&
        riskRank(task.forecast.risk) <= riskRank("high"),
    )
    .sort(
      (a, b) => b.forecast.dailyRevenueAtRisk - a.forecast.dailyRevenueAtRisk,
    )
    .slice(0, limit);
}

export type QuickFilter = "all" | "act_now" | "can_ignore";

export function applyFilters(
  tasks: StockTask[],
  options: {
    quick?: QuickFilter;
    status?: TaskStatus | "all";
    risk?: RiskLevel | "all";
    owner?: string;
    search?: string;
  },
): StockTask[] {
  const { quick = "all", status = "all", risk = "all", owner, search } = options;
  const needle = search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (status !== "all" && task.status !== status) return false;
    if (risk !== "all" && task.forecast.risk !== risk) return false;
    if (owner && task.owner !== owner) return false;

    if (needle) {
      const haystack = `${task.displayTitle} ${task.sku}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    if (quick === "act_now") {
      // Selling well and about to run out.
      return (
        riskRank(task.forecast.risk) <= riskRank("high") &&
        task.forecast.velocity > 0 &&
        task.status !== "ordered"
      );
    }

    if (quick === "can_ignore") {
      // More than a month of cover, or not selling at all.
      return task.forecast.risk === "low" || task.forecast.risk === "none";
    }

    return true;
  });
}

export function ownersOf(tasks: StockTask[]): string[] {
  return [...new Set(tasks.map((task) => task.owner).filter(Boolean))].sort();
}

export interface WeeklyReview {
  reviewedThisWeek: StockTask[];
  orderedThisWeek: StockTask[];
  untouchedHighRisk: StockTask[];
}

export function weeklyReview(tasks: StockTask[], now = new Date()): WeeklyReview {
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const reviewedWithinWeek = (task: StockTask) =>
    task.reviewedAt !== null && Date.parse(task.reviewedAt) >= weekAgo;

  return {
    reviewedThisWeek: tasks.filter(reviewedWithinWeek),
    orderedThisWeek: tasks.filter(
      (task) => task.status === "ordered" && reviewedWithinWeek(task),
    ),
    untouchedHighRisk: tasks.filter(
      (task) =>
        task.status === "new" && riskRank(task.forecast.risk) <= riskRank("high"),
    ),
  };
}

export interface TaskPatch {
  status?: TaskStatus;
  note?: string;
  owner?: string;
  reviewedAt?: string;
}

/** date_time metafields reject the millisecond precision toISOString emits. */
export function nowForMetafield(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function saveTask(
  variantId: string,
  patch: TaskPatch,
): Promise<void> {
  const metafields: Record<string, unknown>[] = [];
  const push = (key: string, type: string, value: string) =>
    metafields.push({ ownerId: variantId, namespace: "$app", key, type, value });

  if (patch.status !== undefined) {
    push("task_status", "single_line_text_field", patch.status);
  }
  if (patch.note !== undefined) {
    push("task_note", "multi_line_text_field", patch.note);
  }
  if (patch.owner !== undefined) {
    push("task_owner", "single_line_text_field", patch.owner);
  }
  if (patch.reviewedAt !== undefined) {
    push("task_reviewed_at", "date_time", patch.reviewedAt);
  }

  if (metafields.length === 0) return;

  const data = await adminQuery(SAVE_TASK_MUTATION, { metafields });
  throwUserErrors(data.metafieldsSet);
}
