/**
 * Stockout forecasting, in plain arithmetic.
 *
 * Everything here is pure so the inbox can recompute on every render without
 * a backend. The vocabulary stays deliberately simple: units per day, days
 * left, and how many units to order.
 */

export const VELOCITY_WINDOW_DAYS = 30;

/** Ordered from most to least urgent. */
export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export interface ForecastInput {
  /** Available units across all locations. */
  inventory: number;
  /** Units sold over the last VELOCITY_WINDOW_DAYS days. */
  unitsSoldInWindow: number;
  /** Days between placing an order and receiving it. */
  leadTimeDays: number;
  /** Extra days of stock to keep as a buffer. */
  safetyDays: number;
  /** Unit price, used to rank by revenue exposure. */
  price: number;
}

export interface Forecast {
  /** Average units sold per day. */
  velocity: number;
  /** Days until stock hits zero, or null when the variant has no sales. */
  daysToStockout: number | null;
  risk: RiskLevel;
  /** Suggested units to order now. */
  reorderQty: number;
  /** Days of cover once the suggested order arrives, or null without sales. */
  coverDaysAfterReorder: number | null;
  /** Revenue per day at risk if this variant sells out. */
  dailyRevenueAtRisk: number;
}

const RISK_ORDER: RiskLevel[] = ["critical", "high", "medium", "low", "none"];

export function riskRank(risk: RiskLevel): number {
  return RISK_ORDER.indexOf(risk);
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: "Under 7 days",
  high: "7-14 days",
  medium: "14-30 days",
  low: "Over 30 days",
  none: "No sales yet",
};

/** Polaris badge tones, so the inbox reads as a traffic light. */
export const RISK_TONES: Record<RiskLevel, string> = {
  critical: "critical",
  high: "warning",
  medium: "caution",
  low: "success",
  none: "neutral",
};

function classifyRisk(inventory: number, daysToStockout: number | null): RiskLevel {
  if (inventory <= 0) return "critical";
  if (daysToStockout === null) return "none";
  if (daysToStockout < 7) return "critical";
  if (daysToStockout < 14) return "high";
  if (daysToStockout < 30) return "medium";
  return "low";
}

export function forecast({
  inventory,
  unitsSoldInWindow,
  leadTimeDays,
  safetyDays,
  price,
}: ForecastInput): Forecast {
  const velocity = Math.max(0, unitsSoldInWindow) / VELOCITY_WINDOW_DAYS;
  const safeInventory = Math.max(0, inventory);

  const daysToStockout = velocity > 0 ? safeInventory / velocity : null;

  // Cover the lead time plus a buffer, minus whatever is already on the shelf.
  const target = velocity * (leadTimeDays + safetyDays);
  const reorderQty = Math.max(0, Math.ceil(target - safeInventory));

  const coverDaysAfterReorder =
    velocity > 0 ? (safeInventory + reorderQty) / velocity : null;

  return {
    velocity,
    daysToStockout,
    risk: classifyRisk(inventory, daysToStockout),
    reorderQty,
    coverDaysAfterReorder,
    dailyRevenueAtRisk: velocity * Math.max(0, price),
  };
}

/** "Sells about 1.4/day" instead of "velocity: 1.3997". */
export function formatVelocity(velocity: number): string {
  if (velocity <= 0) return "No sales in the last 30 days";
  if (velocity < 0.1) return "Sells less than 0.1/day";
  return `Sells about ${velocity.toFixed(1)}/day`;
}

export function formatDaysLeft(daysToStockout: number | null): string {
  if (daysToStockout === null) return "Not selling";
  if (daysToStockout < 1) return "Out of stock today";
  return `About ${Math.floor(daysToStockout)} days left`;
}

export function formatReorder(f: Forecast): string {
  if (f.reorderQty <= 0) return "No order needed yet";
  if (f.coverDaysAfterReorder === null) return `Order ${f.reorderQty}`;
  return `Order ${f.reorderQty} now to cover about ${Math.floor(
    f.coverDaysAfterReorder,
  )} days`;
}

/** ISO date string for the start of the velocity window. */
export function velocityWindowStart(now = new Date()): string {
  const start = new Date(now.getTime() - VELOCITY_WINDOW_DAYS * 86_400_000);
  return start.toISOString().slice(0, 10);
}
