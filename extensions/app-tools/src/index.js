import {fetchSettings} from '../../../shared/models/settings';
import {loadInbox, topRevenueAtRisk} from '../../../shared/models/stockTasks';
import {
  RISK_LABELS,
  formatDaysLeft,
  formatReorder,
  formatVelocity,
} from '../../../shared/utils/forecast';
import {gidToId} from '../../../shared/utils/gid';

/** @typedef {import('../../../shared/models/stockTasks').StockTask} StockTask */

const MIME_TYPE = 'application/stock-task';

/** @param {StockTask} task */
function toResourceLink(task) {
  return {
    type: 'resource_link',
    uri: `gid://${MIME_TYPE}/${gidToId(task.variantId)}`,
    name: task.displayTitle,
    mimeType: MIME_TYPE,
    _meta: {
      sku: task.sku,
      status: task.status,
      owner: task.owner,
      note: task.note,
      inventory: task.inventory,
      urgency: RISK_LABELS[task.forecast.risk],
      sales_summary: formatVelocity(task.forecast.velocity),
      days_left: formatDaysLeft(task.forecast.daysToStockout),
      reorder_summary: formatReorder(task.forecast),
      suggested_reorder_quantity: task.forecast.reorderQty,
    },
  };
}

async function loadTasks() {
  const settings = await fetchSettings();
  const {tasks} = await loadInbox(settings);
  return tasks;
}

export default () => {
  shopify.tools.register(
    'list_stock_tasks',
    /** @param {{ only_urgent?: boolean, limit?: number }} input */
    async ({only_urgent: onlyUrgent = false, limit = 20} = {}) => {
      const tasks = await loadTasks();
      const selected = onlyUrgent
        ? topRevenueAtRisk(tasks, limit)
        : tasks.slice(0, limit);

      return {results: selected.map(toResourceLink)};
    },
  );

  shopify.tools.register(
    'get_stock_task',
    /** @param {{ id: string }} input */
    async ({id}) => {
      const numericId = gidToId(id);
      const tasks = await loadTasks();
      const task = tasks.find(
        (candidate) => gidToId(candidate.variantId) === numericId,
      );

      return {results: task ? [toResourceLink(task)] : []};
    },
  );
};
