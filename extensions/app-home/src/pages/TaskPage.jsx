import {useEffect, useState} from 'preact/hooks';
import {
  STATUS_LABELS,
  STATUS_TONES,
  TASK_STATUSES,
} from '../../../../shared/models/stockTasks';
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
  formatReorder,
  formatVelocity,
} from '../../../../shared/utils/forecast';
import {productAdminUrl} from '../../../../shared/utils/gid';
import {useStore, findTask, updateTask, markReviewed} from '../store';

/** @param {{ id?: string }} props */
export default function TaskPage({id}) {
  const {status: storeStatus, error: storeError} = useStore();
  const task = id ? findTask(id) : null;

  const [draft, setDraft] = useState({status: 'new', note: '', owner: ''});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Re-seed the form whenever the task resolves, including on a deep link
  // where the inbox is still loading on first render.
  useEffect(() => {
    if (!task) return;
    setDraft({status: task.status, note: task.note, owner: task.owner});
  }, [task?.variantId]);

  const loading = storeStatus === 'loading' || storeStatus === 'idle';

  if (loading && !task) {
    return (
      <s-page heading="Loading task">
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Loading this task...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  if (!task) {
    return (
      <s-page heading="Task not found">
        <s-link slot="breadcrumb-actions" href="/">
          Stock tasks
        </s-link>
        <s-section>
          <s-banner tone="info" heading="This task is no longer in your inbox">
            <s-paragraph>
              {storeError ??
                'The variant may have been restocked, archived, or moved above your threshold.'}
            </s-paragraph>
            <s-button slot="primary-action" href="/">
              Back to stock tasks
            </s-button>
          </s-banner>
        </s-section>
      </s-page>
    );
  }

  const {forecast} = task;

  const handleSave = async (event) => {
    const promise = (async () => {
      setSaving(true);
      setError(null);
      try {
        await updateTask(task.variantId, {
          status: draft.status,
          note: draft.note,
          owner: draft.owner,
        });
        shopify.toast.show('Task saved');
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Could not save');
        throw saveError;
      } finally {
        setSaving(false);
      }
    })();

    event?.waitUntil?.(promise);
    await promise;
    return false;
  };

  const handleReset = () => {
    setDraft({status: task.status, note: task.note, owner: task.owner});
    setError(null);
  };

  const handleMarkReviewed = async () => {
    setSaving(true);
    setError(null);
    try {
      await markReviewed(task);
      setDraft((prev) => ({...prev, status: 'reviewed'}));
      shopify.toast.show('Marked as reviewed');
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : 'Could not save',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <s-page heading={task.displayTitle} inlineSize="small">
      <s-link slot="breadcrumb-actions" href="/">
        Stock tasks
      </s-link>
      <s-button
        slot="secondary-actions"
        loading={saving}
        disabled={task.status === 'reviewed'}
        onClick={handleMarkReviewed}
      >
        Mark as reviewed
      </s-button>

      {error && (
        <s-section>
          <s-banner tone="critical">{error}</s-banner>
        </s-section>
      )}

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
        <s-form onSubmit={handleSave} onReset={handleReset}>
          <s-stack direction="block" gap="base">
            <s-select
              label="Status"
              name="status"
              labelAccessibilityVisibility="visible"
              value={draft.status}
              onChange={(event) =>
                setDraft((prev) => ({...prev, status: event.target.value}))
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
                setDraft((prev) => ({...prev, owner: event.target.value}))
              }
            />
            <s-text-area
              label="Internal note"
              name="note"
              labelAccessibilityVisibility="visible"
              placeholder="e.g. Supplier is out until next week"
              value={draft.note}
              onInput={(event) =>
                setDraft((prev) => ({...prev, note: event.target.value}))
              }
            />
          </s-stack>
        </s-form>
      </s-section>
    </s-page>
  );
}
