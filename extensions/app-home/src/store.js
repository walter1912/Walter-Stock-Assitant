import {useState, useEffect} from 'preact/hooks';
import {
  fetchSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from '../../../shared/models/settings';
import {
  loadInbox,
  saveTask,
  nowForMetafield,
} from '../../../shared/models/stockTasks';

/**
 * One shared snapshot of settings + inbox.
 *
 * The inbox costs several Admin API round trips to assemble, so it is loaded
 * once and reused while the merchant moves between the inbox, a task, and the
 * weekly review.
 */

/** @typedef {import('../../../shared/models/settings').Settings} Settings */
/** @typedef {import('../../../shared/models/stockTasks').StockTask} StockTask */
/** @typedef {import('../../../shared/models/stockTasks').Inbox} Inbox */
/** @typedef {import('../../../shared/models/stockTasks').TaskPatch} TaskPatch */

/**
 * @typedef {object} StoreState
 * @property {'idle' | 'loading' | 'ready' | 'error'} status
 * @property {Settings} settings
 * @property {Inbox | null} inbox
 * @property {string | null} error
 */

/** @type {StoreState} */
let state = {
  status: 'idle',
  settings: {...DEFAULT_SETTINGS},
  inbox: null,
  error: null,
};

/** @type {Set<(state: StoreState) => void>} */
const listeners = new Set();

/** @param {Partial<StoreState>} patch */
function set(patch) {
  state = {...state, ...patch};
  for (const listener of listeners) listener(state);
}

function messageOf(error) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function getState() {
  return state;
}

export async function loadAll({force = false} = {}) {
  if (!force && (state.status === 'loading' || state.status === 'ready')) return;

  set({status: 'loading', error: null});
  try {
    const settings = await fetchSettings();
    const inbox = await loadInbox(settings);
    set({status: 'ready', settings, inbox, error: null});
  } catch (error) {
    set({status: 'error', error: messageOf(error)});
  }
}

export function refresh() {
  return loadAll({force: true});
}

/** Subscribes to the store and triggers the first load. */
export function useStore() {
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state);
    loadAll();
    return () => listeners.delete(setSnapshot);
  }, []);

  return snapshot;
}

/** @param {string} numericId */
export function findTask(numericId) {
  return (
    state.inbox?.tasks.find((task) => task.variantId.endsWith(`/${numericId}`)) ??
    null
  );
}

/**
 * Writes the patch to the variant metafields, then mirrors it locally so the
 * inbox reflects the change without a full reload.
 *
 * @param {string} variantId
 * @param {TaskPatch} patch
 */
export async function updateTask(variantId, patch) {
  await saveTask(variantId, patch);

  if (!state.inbox) return;

  const tasks = state.inbox.tasks.map((task) =>
    task.variantId === variantId
      ? {
          ...task,
          ...(patch.status !== undefined && {status: patch.status}),
          ...(patch.note !== undefined && {note: patch.note}),
          ...(patch.owner !== undefined && {owner: patch.owner}),
          ...(patch.reviewedAt !== undefined && {reviewedAt: patch.reviewedAt}),
        }
      : task,
  );

  set({inbox: {...state.inbox, tasks}});
}

/**
 * "Mark as reviewed" stamps the time and moves the task out of New in one go.
 *
 * @param {StockTask} task
 */
export function markReviewed(task) {
  return updateTask(task.variantId, {
    status: 'reviewed',
    reviewedAt: nowForMetafield(),
  });
}

/**
 * Simple mode only hides columns, so it saves without rebuilding the inbox.
 *
 * @param {boolean} simpleMode
 */
export async function setSimpleMode(simpleMode) {
  const previous = state.settings;
  set({settings: {...previous, simpleMode}});

  try {
    await saveSettings({...previous, simpleMode});
  } catch (error) {
    set({settings: previous});
    throw error;
  }
}

/**
 * Thresholds and lead time feed the forecast, so the inbox is rebuilt after a
 * save rather than patched.
 *
 * @param {Settings} next
 */
export async function updateSettings(next) {
  await saveSettings(next);
  set({settings: next});

  try {
    const inbox = await loadInbox(next);
    set({status: 'ready', inbox, error: null});
  } catch (error) {
    set({status: 'error', error: messageOf(error)});
  }
}
