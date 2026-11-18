import { describe, expect, it } from "vitest";
import { forecast, formatDaysLeft, formatReorder, formatVelocity } from "../../shared/utils/forecast";
import { gidToId, productAdminUrl, variantGid } from "../../shared/utils/gid";

const base = { leadTimeDays: 7, safetyDays: 7, price: 10 };

describe("forecast", () => {
  it("no sales: no stockout date, risk none, no reorder", () => {
    const f = forecast({ ...base, inventory: 5, unitsSoldInWindow: 0 });
    expect(f.daysToStockout).toBeNull();
    expect(f.risk).toBe("none");
    expect(f.reorderQty).toBe(0);
  });
  it("out of stock is critical even without sales", () => {
    expect(forecast({ ...base, inventory: 0, unitsSoldInWindow: 0 }).risk).toBe("critical");
  });
  it("velocity, days left and reorder follow the documented formula", () => {
    const f = forecast({ ...base, inventory: 10, unitsSoldInWindow: 60 });
    expect(f.velocity).toBe(2);
    expect(f.daysToStockout).toBe(5);
    expect(f.risk).toBe("critical");
    expect(f.reorderQty).toBe(18); // 2 * 14 - 10
  });
  it.each([
    [26, "high"], [50, "medium"], [100, "low"],
  ])("inventory %i at 2/day is %s", (inventory, risk) => {
    expect(forecast({ ...base, inventory, unitsSoldInWindow: 60 }).risk).toBe(risk);
  });
  it("negative inventory never produces negative numbers", () => {
    const f = forecast({ ...base, inventory: -3, unitsSoldInWindow: 30 });
    expect(f.daysToStockout).toBe(0);
    expect(f.reorderQty).toBeGreaterThanOrEqual(0);
  });
});

describe("formatters", () => {
  it("text for no sales", () => {
    expect(formatVelocity(0)).toBe("No sales in the last 30 days");
    expect(formatDaysLeft(null)).toBe("Not selling");
    expect(formatReorder(forecast({ ...base, inventory: 5, unitsSoldInWindow: 0 }))).toBe("No order needed yet");
  });
  it("text when selling", () => {
    expect(formatDaysLeft(5.7)).toBe("About 5 days left");
    expect(formatDaysLeft(0.5)).toBe("Out of stock today");
    expect(formatReorder(forecast({ ...base, inventory: 10, unitsSoldInWindow: 60 }))).toMatch(/^Order 18 now/);
  });
});

describe("gid", () => {
  it("round trips ids", () => {
    expect(gidToId("gid://shopify/ProductVariant/123?x=1")).toBe("123");
    expect(variantGid("123")).toBe("gid://shopify/ProductVariant/123");
    expect(productAdminUrl("gid://shopify/Product/9")).toBe("shopify:admin/products/9");
  });
});
