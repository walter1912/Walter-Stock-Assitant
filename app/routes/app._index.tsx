import { useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
} from "react-router";
import { useFetcher, useRevalidator, useRouteLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  applyFilters,
  ownersOf,
  saveTask,
  topRevenueAtRisk,
  STATUS_LABELS,
  STATUS_TONES,
  TASK_STATUSES,
  nowForMetafield,
  type QuickFilter,
  type StockTask,
  type TaskStatus,
} from "../../shared/models/stockTasks";
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
  type RiskLevel,
} from "../../shared/utils/forecast";
import { gidToId } from "../../shared/utils/gid";
import { fetchSettings, saveSettings } from "../../shared/models/settings";
import { authenticatedQuery, type AppData } from "../inbox.server";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "act_now", label: "Might cost me sales" },
  { id: "can_ignore", label: "Can ignore this week" },
];

const RISK_OPTIONS: RiskLevel[] = ["critical", "high", "medium", "low", "none"];

export const action = async ({ request }: ActionFunctionArgs) => {
  const { query } = await authenticatedQuery(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "markReviewed") {
    await saveTask(
      String(form.get("variantId")),
      { status: "reviewed", reviewedAt: nowForMetafield() },
      query,
    );
    return { ok: true, intent };
  }

  if (intent === "setSimpleMode") {
    const settings = await fetchSettings(query);
    await saveSettings(
      { ...settings, simpleMode: form.get("simpleMode") === "true" },
      query,
    );
    return { ok: true, intent };
  }

  return { ok: false };
};

export default function InboxPage() {
  const { settings, inbox } = useRouteLoaderData("routes/app") as AppData;
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const shopify = useAppBridge();

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [search, setSearch] = useState("");

  const tasks = inbox.tasks;
  const owners = useMemo(() => ownersOf(tasks), [tasks]);
  const topAtRisk = useMemo(() => topRevenueAtRisk(tasks), [tasks]);
  const visible = useMemo(
    () =>
      applyFilters(tasks, {
        quick,
        status: statusFilter,
        risk: riskFilter,
        owner: ownerFilter || undefined,
        search,
      }),
    [tasks, quick, statusFilter, riskFilter, ownerFilter, search],
  );

  const simple = settings.simpleMode;
  const loading = revalidator.state === "loading";
  const busyId =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "markReviewed"
      ? String(fetcher.formData.get("variantId"))
      : null;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.ok) return;
    if (fetcher.data.intent === "markReviewed") {
      shopify.toast.show("Marked as reviewed");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const handleReview = (task: StockTask) => {
    fetcher.submit(
      { intent: "markReviewed", variantId: task.variantId },
      { method: "POST" },
    );
  };

  const handleSimpleMode = (checked: boolean) => {
    fetcher.submit(
      { intent: "setSimpleMode", simpleMode: String(checked) },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="stock assistant">
      <s-button
        slot="primary-action"
        variant="primary"
        {...(loading ? { loading: true } : {})}
        onClick={() => revalidator.revalidate()}
      >
        Refresh
      </s-button>
      <s-link slot="secondary-actions" href="/app/weekly-review">
        Weekly review
      </s-link>

      {inbox.truncatedVariants && (
        <s-section>
          <s-banner tone="warning" heading="Showing your lowest stock items only">
            <s-paragraph>
              This store has more items below {settings.threshold} than the app
              loads at once. Lower the threshold in Settings to narrow the list.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {inbox.truncatedOrders && (
        <s-section>
          <s-banner tone="warning" heading="Sales window is truncated">
            <s-paragraph>
              The last 30 days of orders did not all fit in one load. Velocity
              for some variants may be under-counted.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {topAtRisk.length > 0 && (
        <s-section slot="aside" heading="Look at these first">
          <s-paragraph>
            If these run out, they cost you the most sales.
          </s-paragraph>
          <s-stack direction="block" gap="small-200">
            {topAtRisk.map((task) => (
              <s-stack key={task.variantId} direction="block">
                <s-link href={`/app/task/${gidToId(task.variantId)}`}>
                  {task.displayTitle}
                </s-link>
                <s-text color="subdued">
                  {formatDaysLeft(task.forecast.daysToStockout)}
                </s-text>
              </s-stack>
            ))}
          </s-stack>
        </s-section>
      )}

      <s-section slot="aside" heading="View">
        <s-switch
          label="Simple mode"
          details="Show only the product, days left, and how many to order."
          checked={simple}
          onChange={(event) => handleSimpleMode(event.currentTarget.checked)}
        />
      </s-section>

      <s-section heading="Filters">
        <s-stack direction="block" gap="base">
          <s-button-group>
            {QUICK_FILTERS.map((option) => (
              <s-button
                key={option.id}
                variant={quick === option.id ? "primary" : "secondary"}
                onClick={() => setQuick(option.id)}
              >
                {option.label}
              </s-button>
            ))}
          </s-button-group>

          <s-grid gridTemplateColumns="1fr 1fr 1fr 1fr" gap="base">
            <s-search-field
              label="Search"
              labelAccessibilityVisibility="visible"
              placeholder="Product or SKU"
              value={search}
              onInput={(event) => setSearch(event.currentTarget.value)}
            />
            <s-select
              label="Status"
              labelAccessibilityVisibility="visible"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as TaskStatus | "all")
              }
            >
              <s-option value="all">Any status</s-option>
              {TASK_STATUSES.map((value) => (
                <s-option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </s-option>
              ))}
            </s-select>
            <s-select
              label="Urgency"
              labelAccessibilityVisibility="visible"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.currentTarget.value as RiskLevel | "all")
              }
            >
              <s-option value="all">Any urgency</s-option>
              {RISK_OPTIONS.map((value) => (
                <s-option key={value} value={value}>
                  {RISK_LABELS[value]}
                </s-option>
              ))}
            </s-select>
            <s-select
              label="Owner"
              labelAccessibilityVisibility="visible"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.currentTarget.value)}
            >
              <s-option value="">Anyone</s-option>
              {owners.map((value) => (
                <s-option key={value} value={value}>
                  {value}
                </s-option>
              ))}
            </s-select>
          </s-grid>
        </s-stack>
      </s-section>

      {loading && tasks.length === 0 && (
        <s-section accessibilityLabel="Loading stock assistant">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Working out what needs restocking...</s-text>
          </s-stack>
        </s-section>
      )}

      {tasks.length === 0 && (
        <s-section accessibilityLabel="Nothing to restock">
          <s-stack direction="block" gap="base" alignItems="center">
            <s-heading>Nothing is running low</s-heading>
            <s-paragraph>
              No active product has a variant at or below {settings.threshold}{" "}
              units. Drafts are ignored. Raise the threshold in Settings to keep
              an eye on more items.
            </s-paragraph>
            <s-button href="/app/settings">Open settings</s-button>
          </s-stack>
        </s-section>
      )}

      {tasks.length > 0 && visible.length === 0 && (
        <s-section>
          <s-paragraph>
            No task matches these filters. Try &quot;Everything&quot; to see all{" "}
            {tasks.length} tasks.
          </s-paragraph>
        </s-section>
      )}

      {visible.length > 0 && (
        <s-section
          padding="none"
          heading={`${visible.length} of ${tasks.length} tasks`}
          accessibilityLabel="stock assistant table"
        >
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Product</s-table-header>
              <s-table-header>Runs out in</s-table-header>
              <s-table-header>Order this many</s-table-header>
              {!simple && <s-table-header>Urgency</s-table-header>}
              {!simple && <s-table-header>On hand</s-table-header>}
              {!simple && <s-table-header>Sells per day</s-table-header>}
              {!simple && <s-table-header>Status</s-table-header>}
              {!simple && <s-table-header>Action</s-table-header>}
            </s-table-header-row>
            <s-table-body>
              {visible.map((task) => (
                <s-table-row key={task.variantId}>
                  <s-table-cell>
                    <s-stack direction="block">
                      <s-link href={`/app/task/${gidToId(task.variantId)}`}>
                        {task.displayTitle}
                      </s-link>
                      {task.sku && (
                        <s-text color="subdued">{task.sku}</s-text>
                      )}
                      {!task.tracked && (
                        <s-text color="subdued">
                          Quantity is not tracked on this variant
                        </s-text>
                      )}
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    {formatDaysLeft(task.forecast.daysToStockout)}
                  </s-table-cell>
                  <s-table-cell>
                    {task.forecast.reorderQty > 0
                      ? `${task.forecast.reorderQty}`
                      : "-"}
                  </s-table-cell>
                  {!simple && (
                    <s-table-cell>
                      <s-badge tone={RISK_TONES[task.forecast.risk]}>
                        {RISK_LABELS[task.forecast.risk]}
                      </s-badge>
                    </s-table-cell>
                  )}
                  {!simple && <s-table-cell>{task.inventory}</s-table-cell>}
                  {!simple && (
                    <s-table-cell>
                      {task.forecast.velocity > 0
                        ? task.forecast.velocity.toFixed(1)
                        : "0"}
                    </s-table-cell>
                  )}
                  {!simple && (
                    <s-table-cell>
                      <s-badge tone={STATUS_TONES[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </s-badge>
                    </s-table-cell>
                  )}
                  {!simple && (
                    <s-table-cell>
                      <s-button
                        variant="tertiary"
                        {...(busyId === task.variantId ? { loading: true } : {})}
                        disabled={task.status === "reviewed"}
                        onClick={() => handleReview(task)}
                      >
                        Mark reviewed
                      </s-button>
                    </s-table-cell>
                  )}
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
