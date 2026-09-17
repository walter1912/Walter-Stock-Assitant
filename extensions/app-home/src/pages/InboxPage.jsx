import {useMemo, useState} from 'preact/hooks';
import {
  applyFilters,
  ownersOf,
  topRevenueAtRisk,
  STATUS_LABELS,
  STATUS_TONES,
  TASK_STATUSES,
} from '../../../../shared/models/stockTasks';
import {
  RISK_LABELS,
  RISK_TONES,
  formatDaysLeft,
} from '../../../../shared/utils/forecast';
import {gidToId} from '../../../../shared/utils/gid';
import {useStore, refresh, markReviewed, setSimpleMode} from '../store';

/** @typedef {import('../../../../shared/models/stockTasks').StockTask} StockTask */

const QUICK_FILTERS = [
  {id: 'all', label: 'Everything'},
  {id: 'act_now', label: 'Might cost me sales'},
  {id: 'can_ignore', label: 'Can ignore this week'},
];

const RISK_OPTIONS = ['critical', 'high', 'medium', 'low', 'none'];

export default function InboxPage() {
  const {status, settings, inbox, error} = useStore();

  const [quick, setQuick] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const tasks = inbox?.tasks ?? [];
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
  const loading = status === 'loading' || status === 'idle';

  const handleReview = async (task) => {
    setBusyId(task.variantId);
    try {
      await markReviewed(task);
      shopify.toast.show('Marked as reviewed');
    } catch (reviewError) {
      shopify.toast.show(
        reviewError instanceof Error ? reviewError.message : 'Could not save',
        {isError: true},
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <s-page heading="Stock tasks">
      <s-button
        slot="primary-action"
        variant="primary"
        loading={loading}
        onClick={() => refresh()}
      >
        Refresh
      </s-button>
      <s-link slot="secondary-actions" href="/weekly-review">
        Weekly review
      </s-link>

      {error && (
        <s-section>
          <s-banner tone="critical" heading="Could not load your stock tasks">
            <s-paragraph>{error}</s-paragraph>
            <s-button slot="primary-action" onClick={() => refresh()}>
              Try again
            </s-button>
          </s-banner>
        </s-section>
      )}

      {inbox?.truncatedVariants && (
        <s-section>
          <s-banner tone="warning" heading="Showing your lowest stock items only">
            <s-paragraph>
              This store has more items below {settings.threshold} than the app
              loads at once. Lower the threshold in Settings to narrow the list.
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
                <s-link href={`/task/${gidToId(task.variantId)}`}>
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
          onChange={(event) => {
            setSimpleMode(event.target.checked).catch(() =>
              shopify.toast.show('Could not save your view', {isError: true}),
            );
          }}
        />
      </s-section>

      <s-section heading="Filters">
        <s-stack direction="block" gap="base">
          <s-button-group>
            {QUICK_FILTERS.map((option) => (
              <s-button
                key={option.id}
                variant={quick === option.id ? 'primary' : 'secondary'}
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
              onInput={(event) => setSearch(event.target.value)}
            />
            <s-select
              label="Status"
              labelAccessibilityVisibility="visible"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              onChange={(event) => setRiskFilter(event.target.value)}
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
              onChange={(event) => setOwnerFilter(event.target.value)}
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

      {loading && (
        <s-section accessibilityLabel="Loading stock tasks">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner accessibilityLabel="Loading" />
            <s-text>Working out what needs restocking...</s-text>
          </s-stack>
        </s-section>
      )}

      {!loading && tasks.length === 0 && !error && (
        <s-section accessibilityLabel="Nothing to restock">
          <s-stack direction="block" gap="base" alignItems="center">
            <s-heading>Nothing is running low</s-heading>
            <s-paragraph>
              No active product has a variant at or below{' '}
              {settings.threshold} units. Drafts are ignored. Raise the
              threshold in Settings to keep an eye on more items.
            </s-paragraph>
            <s-button href="/settings">Open settings</s-button>
          </s-stack>
        </s-section>
      )}

      {!loading && tasks.length > 0 && visible.length === 0 && (
        <s-section>
          <s-paragraph>
            No task matches these filters. Try "Everything" to see all
            {' '}
            {tasks.length} tasks.
          </s-paragraph>
        </s-section>
      )}

      {visible.length > 0 && (
        <s-section
          padding="none"
          heading={`${visible.length} of ${tasks.length} tasks`}
          accessibilityLabel="Stock tasks table"
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
                      <s-link href={`/task/${gidToId(task.variantId)}`}>
                        {task.displayTitle}
                      </s-link>
                      {task.sku && <s-text color="subdued">{task.sku}</s-text>}
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
                      : '-'}
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
                        : '0'}
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
                        loading={busyId === task.variantId}
                        disabled={task.status === 'reviewed'}
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
