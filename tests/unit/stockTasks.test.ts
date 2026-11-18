import { describe, expect, it, vi } from "vitest";
import { applyFilters, loadInbox, saveTask, sortByUrgency, weeklyReview } from "../../shared/models/stockTasks";
import { DEFAULT_SETTINGS, fetchSettings } from "../../shared/models/settings";
import { TASKS } from "../fixtures";

function variant(id: string, qty: number, extra: Record<string, unknown> = {}) {
  return { id: `gid://shopify/ProductVariant/${id}`, title: "Default Title", sku: id, price: "10.00", inventoryQuantity: qty, inventoryItem: { tracked: true }, metafields: { nodes: [] }, ...extra };
}

function fakeAdmin(products: any[], orders: any[] = []) {
  return vi.fn(async (query: string) => {
    if (query.includes("RecentOrderQuantities")) return { orders: { pageInfo: { hasNextPage: false }, nodes: orders } };
    if (query.includes("ActiveProductsForInbox")) return { products: { pageInfo: { hasNextPage: false }, nodes: products } };
    if (query.includes("SaveStockTask")) return { metafieldsSet: { userErrors: [] } };
    throw new Error("unexpected query");
  });
}

describe("loadInbox", () => {
  it("keeps active variants at or below threshold and counts sales, skipping cancelled orders", async () => {
    const admin = fakeAdmin(
      [
        { id: "gid://shopify/Product/1", title: "Board", status: "ACTIVE", variants: { pageInfo: { hasNextPage: false }, nodes: [variant("a", 3), variant("b", 50)] } },
        { id: "gid://shopify/Product/2", title: "Draft", status: "DRAFT", variants: { pageInfo: { hasNextPage: false }, nodes: [variant("c", 0)] } },
      ],
      [
        { cancelledAt: null, lineItems: { nodes: [{ quantity: 6, variant: { id: "gid://shopify/ProductVariant/a" } }, { quantity: 1, variant: null }] } },
        { cancelledAt: "2026-11-01", lineItems: { nodes: [{ quantity: 100, variant: { id: "gid://shopify/ProductVariant/a" } }] } },
      ],
    );
    const inbox = await loadInbox(DEFAULT_SETTINGS, admin);
    expect(inbox.tasks.map((t) => t.sku)).toEqual(["a"]);
    expect(inbox.tasks[0].unitsSoldInWindow).toBe(6);
    expect(inbox.tasks[0].displayTitle).toBe("Board");
  });

  it("reads task metafields and ignores unknown status", async () => {
    const admin = fakeAdmin([
      { id: "p", title: "Wax", status: "ACTIVE", variants: { pageInfo: { hasNextPage: false }, nodes: [
        variant("a", 1, { title: "Blue", metafields: { nodes: [{ key: "task_status", value: "bogus" }, { key: "task_owner", value: "Mai" }] } }),
      ] } },
    ]);
    const [task] = (await loadInbox(DEFAULT_SETTINGS, admin)).tasks;
    expect(task.status).toBe("new");
    expect(task.owner).toBe("Mai");
    expect(task.displayTitle).toBe("Wax - Blue");
  });

  it("handles an empty store", async () => {
    const inbox = await loadInbox(DEFAULT_SETTINGS, fakeAdmin([]));
    expect(inbox.tasks).toEqual([]);
  });
});

describe("saveTask", () => {
  it("sends only the fields that changed", async () => {
    const admin = fakeAdmin([]);
    await saveTask("gid://shopify/ProductVariant/1", { status: "ordered", owner: "Mai" }, admin);
    const { metafields } = (admin.mock.calls[0] as any[])[1];
    expect(metafields.map((m: any) => m.key)).toEqual(["task_status", "task_owner"]);
  });
  it("blank note/owner deletes the metafield instead of sending an empty value", async () => {
    const admin = vi.fn(async (q: string): Promise<any> =>
      q.includes("DeleteStockTaskFields") ? { metafieldsDelete: { userErrors: [] } } : { metafieldsSet: { userErrors: [] } });
    await saveTask("v", { status: "new", note: "", owner: "  " }, admin);
    const calls = admin.mock.calls as any[];
    expect(calls[0][1].metafields.map((m: any) => m.key)).toEqual(["task_status"]);
    expect(calls[1][0]).toContain("metafieldsDelete");
    expect(calls[1][1].metafields.map((m: any) => m.key)).toEqual(["task_note", "task_owner"]);
  });
  it("throws on userErrors", async () => {
    const admin = vi.fn(async () => ({ metafieldsSet: { userErrors: [{ field: ["x"], message: "bad" }] } }));
    await expect(saveTask("v", { note: "x" }, admin)).rejects.toThrow();
  });
});

describe("filters and review", () => {
  it("sorts most urgent first", () => {
    expect(sortByUrgency(TASKS)[0].forecast.risk).toBe("critical");
  });
  it("search, owner and quick filters", () => {
    expect(applyFilters(TASKS, { search: "gift" }).length).toBe(1);
    expect(applyFilters(TASKS, { owner: "Mai" }).length).toBe(1);
    expect(applyFilters(TASKS, { quick: "act_now" }).every((t) => t.forecast.velocity > 0)).toBe(true);
  });
  it("weekly review counts ordered tasks", () => {
    expect(weeklyReview(TASKS).orderedThisWeek.length).toBe(1);
  });
});

describe("settings", () => {
  it("falls back to defaults on missing or broken JSON", async () => {
    expect(await fetchSettings(async () => ({ currentAppInstallation: null }))).toEqual(DEFAULT_SETTINGS);
    expect(await fetchSettings(async () => ({ currentAppInstallation: { metafield: { value: "{oops" } } }))).toEqual(DEFAULT_SETTINGS);
    const s = await fetchSettings(async () => ({ currentAppInstallation: { metafield: { value: '{"threshold":-1,"leadTimeDays":3}' } } }));
    expect(s.threshold).toBe(10);
    expect(s.leadTimeDays).toBe(3);
  });
});
