import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useRouteLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  STATUS_LABELS,
  STATUS_TONES,
  TASK_STATUSES,
  nowForMetafield,
  saveTask,
  type TaskStatus,
} from "../../shared/models/stockTasks";
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
  formatReorder,
  formatVelocity,
} from "../../shared/utils/forecast";
import { gidToId, productAdminUrl } from "../../shared/utils/gid";
import { authenticatedQuery, type AppData } from "../inbox.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  return { id: params.id ?? "" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { query } = await authenticatedQuery(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const variantId = String(form.get("variantId"));

  if (intent === "markReviewed") {
    await saveTask(
      variantId,
      { status: "reviewed", reviewedAt: nowForMetafield() },
      query,
    );
    return { ok: true, intent };
  }

  if (intent === "saveTask") {
    await saveTask(
      variantId,
      {
        status: String(form.get("status")) as TaskStatus,
        note: String(form.get("note") ?? ""),
        owner: String(form.get("owner") ?? ""),
      },
      query,
    );
    return { ok: true, intent };
  }

  return { ok: false };
};

export default function TaskPage() {
  const { id } = useLoaderData<typeof loader>();
  const { inbox } = useRouteLoaderData("routes/app") as AppData;
  const task =
    inbox.tasks.find((candidate) => gidToId(candidate.variantId) === id) ??
    null;
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const [draft, setDraft] = useState({
    status: (task?.status ?? "new") as TaskStatus,
    note: task?.note ?? "",
    owner: task?.owner ?? "",
  });

  useEffect(() => {
    if (!task) return;
    setDraft({ status: task.status, note: task.note, owner: task.owner });
  }, [task?.variantId]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.ok) return;
    if (fetcher.data.intent === "saveTask") shopify.toast.show("Task saved");
    if (fetcher.data.intent === "markReviewed") {
      shopify.toast.show("Marked as reviewed");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const saving = fetcher.state !== "idle";

  if (!task) {
    return (
      <s-page heading="Task not found">
        <s-link slot="breadcrumb-actions" href="/app">
          stock assistant
        </s-link>
        <s-section>
          <s-banner tone="info" heading="This task is no longer in your inbox">
            <s-paragraph>
              The variant may have been restocked, archived, or moved above your
              threshold.
            </s-paragraph>
            <s-button slot="primary-action" href="/app">
              Back to stock assistant
            </s-button>
          </s-banner>
        </s-section>
      </s-page>
    );
  }

  const { forecast } = task;

  return (
    <s-page heading={task.displayTitle} inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/app">
        stock assistant
      </s-link>
      <s-button
        slot="secondary-actions"
        {...(saving ? { loading: true } : {})}
        disabled={task.status === "reviewed"}
        onClick={() =>
          fetcher.submit(
            { intent: "markReviewed", variantId: task.variantId },
            { method: "POST" },
          )
        }
      >
        Mark as reviewed
      </s-button>

      <s-section heading="What the numbers say">
        <s-stack direction="block" gap="small-200">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-badge tone={RISK_TONES[forecast.risk]}>
              {RISK_LABELS[forecast.risk]}
            </s-badge>
            <s-badge tone={STATUS_TONES[task.status]}>
              {STATUS_LABELS[task.status]}
            </s-badge>
          </s-stack>
          <s-paragraph>{task.inventory} in stock right now.</s-paragraph>
          <s-paragraph>{formatVelocity(forecast.velocity)}.</s-paragraph>
          <s-paragraph>{formatDaysLeft(forecast.daysToStockout)}.</s-paragraph>
          <s-paragraph>{formatReorder(forecast)}.</s-paragraph>
          {task.sku && <s-text color="subdued">SKU {task.sku}</s-text>}
          {task.productId && (
            <s-link href={productAdminUrl(task.productId)}>
              Open product in admin
            </s-link>
          )}
          {task.reviewedAt && (
            <s-text color="subdued">
              Last reviewed {new Date(task.reviewedAt).toLocaleDateString()}
            </s-text>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Track this task">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetcher.submit(
              {
                intent: "saveTask",
                variantId: task.variantId,
                status: draft.status,
                note: draft.note,
                owner: draft.owner,
              },
              { method: "POST" },
            );
          }}
          onReset={() =>
            setDraft({
              status: task.status,
              note: task.note,
              owner: task.owner,
            })
          }
        >
          <s-stack direction="block" gap="base">
            <s-select
              label="Status"
              name="status"
              labelAccessibilityVisibility="visible"
              value={draft.status}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  status: event.currentTarget.value as TaskStatus,
                }))
              }
            >
              {TASK_STATUSES.map((value) => (
                <s-option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              label="Who is handling this"
              name="owner"
              labelAccessibilityVisibility="visible"
              placeholder="e.g. Mai"
              value={draft.owner}
              details="Used to filter the inbox by person."
              onInput={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  owner: event.currentTarget.value,
                }))
              }
            />
            <s-text-area
              label="Internal note"
              name="note"
              labelAccessibilityVisibility="visible"
              placeholder="e.g. Supplier is out until next week"
              value={draft.note}
              onInput={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  note: event.currentTarget.value,
                }))
              }
            />
            <s-button-group>
              <s-button type="submit" variant="primary" {...(saving ? { loading: true } : {})}>
                Save
              </s-button>
              <s-button type="reset">Discard</s-button>
            </s-button-group>
          </s-stack>
        </form>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
