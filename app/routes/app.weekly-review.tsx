import { useMemo } from "react";
import { useRouteLoaderData } from "react-router";

import { weeklyReview } from "../../shared/models/stockTasks";
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
} from "../../shared/utils/forecast";
import { gidToId } from "../../shared/utils/gid";
import type { AppData } from "../inbox.server";

export default function WeeklyReviewPage() {
  const { settings, inbox } = useRouteLoaderData("routes/app") as AppData;
  const review = useMemo(() => weeklyReview(inbox.tasks), [inbox.tasks]);

  return (
    <s-page heading="Weekly review" inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/app">
        stock assistant
      </s-link>

      <s-section heading="This week at a glance">
        <s-stack direction="block" gap="small-200">
          <s-paragraph>
            {review.reviewedThisWeek.length} reviewed in the last 7 days.
          </s-paragraph>
          <s-paragraph>
            {review.orderedThisWeek.length} moved to Ordered.
          </s-paragraph>
          <s-paragraph>
            {review.untouchedHighRisk.length} urgent
            {review.untouchedHighRisk.length === 1 ? " task" : " tasks"} still
            untouched.
          </s-paragraph>
          {settings.contactEmail && (
            <s-text color="subdued">Chase: {settings.contactEmail}</s-text>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Urgent but nobody has touched it">
        {review.untouchedHighRisk.length === 0 ? (
          <s-paragraph>
            Nothing urgent is sitting untouched. Good week.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="small-200">
            {review.untouchedHighRisk.map((task) => (
              <s-stack
                key={task.variantId}
                direction="inline"
                gap="small"
                alignItems="center"
              >
                <s-badge tone={RISK_TONES[task.forecast.risk]}>
                  {RISK_LABELS[task.forecast.risk]}
                </s-badge>
                <s-link href={`/app/task/${gidToId(task.variantId)}`}>
                  {task.displayTitle}
                </s-link>
                <s-text color="subdued">
                  {formatDaysLeft(task.forecast.daysToStockout)}
                </s-text>
              </s-stack>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section heading="Reviewed in the last 7 days">
        {review.reviewedThisWeek.length === 0 ? (
          <s-paragraph>Nothing reviewed yet this week.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="small-200">
            {review.reviewedThisWeek.map((task) => (
              <s-stack key={task.variantId} direction="block">
                <s-link href={`/app/task/${gidToId(task.variantId)}`}>
                  {task.displayTitle}
                </s-link>
                <s-text color="subdued">
                  {task.owner ? `${task.owner} - ` : ""}
                  {task.reviewedAt
                    ? new Date(task.reviewedAt).toLocaleDateString()
                    : ""}
                </s-text>
              </s-stack>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
