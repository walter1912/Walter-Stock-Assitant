import { forecast } from "../shared/utils/forecast";
import type { StockTask } from "../shared/models/stockTasks";
import { DEFAULT_SETTINGS, type Settings } from "../shared/models/settings";

export function makeTask(overrides: Partial<StockTask> & { id: string }): StockTask {
  const { id, ...rest } = overrides;
  const inventory = rest.inventory ?? 5;
  const unitsSoldInWindow = rest.unitsSoldInWindow ?? 0;
  const price = rest.price ?? 10;
  return {
    variantId: `gid://shopify/ProductVariant/${id}`,
    variantTitle: "Default Title",
    productId: `gid://shopify/Product/${id}`,
    productTitle: `Product ${id}`,
    productStatus: "ACTIVE",
    displayTitle: `Product ${id}`,
    sku: `SKU-${id}`,
    price,
    inventory,
    tracked: true,
    unitsSoldInWindow,
    status: "new",
    note: "",
    reviewedAt: null,
    owner: "",
    forecast: forecast({ inventory, unitsSoldInWindow, leadTimeDays: 7, safetyDays: 7, price }),
    ...rest,
  };
}

/** Covers the cases reviewers hit: out of stock, no sales, selling, untracked, gift card. */
export const TASKS: StockTask[] = [
  makeTask({ id: "1", displayTitle: "Gift Card - $25", inventory: 0 }),
  makeTask({ id: "2", displayTitle: "The Inventory Not Tracked Snowboard", tracked: false, inventory: 0 }),
  makeTask({ id: "3", displayTitle: "Selling Snowboard", inventory: 4, unitsSoldInWindow: 60, owner: "Mai", note: "Call supplier" }),
  makeTask({ id: "4", displayTitle: "Slow Wax", inventory: 10, unitsSoldInWindow: 3, status: "ordered", reviewedAt: new Date().toISOString() }),
];

export function appData(settings: Partial<Settings> = {}, tasks = TASKS) {
  return {
    apiKey: "test",
    settings: { ...DEFAULT_SETTINGS, ...settings },
    inbox: { tasks, truncatedVariants: false, truncatedOrders: false },
  };
}
