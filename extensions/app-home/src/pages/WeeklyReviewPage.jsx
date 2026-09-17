import {useMemo} from 'preact/hooks';
import {weeklyReview} from '../../../../shared/models/stockTasks';
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
} from '../../../../shared/utils/forecast';
import {gidToId} from '../../../../shared/utils/gid';
import {useStore} from '../store';

/**
 * A screenshot-friendly summary of the week. Nothing is emailed; the point is
 * to have one page to show a teammate or a manager.
 */
export default function WeeklyReviewPage() {
  const {status, settings, inbox} = useStore();
  const tasks = inbox?.tasks ?? [];

  const review = useMemo(() => weeklyReview(tasks), [tasks]);
  const loading = status === 'loading' || status === 'idle';

  return (
    <s-page heading="Weekly review" inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/">
        Stock tasks
      </s-link>

      {loading && (
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Building your review...</s-text>
          </s-stack>
        </s-section>
      )}

      {!loading && (
        <>
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
                {review.untouchedHighRisk.length === 1 ? ' task' : ' tasks'} still
                untouched.
              </s-paragraph>
              {settings.contactEmail && (
                <s-text color="subdued">
                  Chase: {settings.contactEmail}
                </s-text>
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
                    <s-link href={`/task/${gidToId(task.variantId)}`}>
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
                    <s-link href={`/task/${gidToId(task.variantId)}`}>
                      {task.displayTitle}
                    </s-link>
                    <s-text color="subdued">
                      {task.owner ? `${task.owner} - ` : ''}
                      {task.reviewedAt
                        ? new Date(task.reviewedAt).toLocaleDateString()
                        : ''}
                    </s-text>
                  </s-stack>
                ))}
              </s-stack>
            )}
          </s-section>
        </>
      )}
    </s-page>
  );
}
