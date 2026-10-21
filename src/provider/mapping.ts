import type { PluginFieldMapping, PluginIssue } from '@sp/plugin-api';
import { normalizeHost } from '../yougile/client';
import type { YouGileTask, YouGileTaskUpdate } from '../yougile/types';
import { htmlToMarkdown, markdownToHtml } from '../utils/html';
import { dayStringToMs, formatHours, hoursToMs, msToHours, toDayString } from '../utils/time';

/**
 * Issue fields that take part in two-way sync. Super Productivity keeps the
 * last synced value of each one and compares it on every pull and push.
 */
export const SYNC_FIELDS = {
  completed: 'completed',
  title: 'title',
  description: 'description',
  deadlineDay: 'deadlineDay',
  deadlineDateTime: 'deadlineDateTime',
  timePlanMs: 'timePlanMs',
} as const;

/** `state` values; `deleted` is listed in the provider's deletedStates. */
export const STATE = {
  open: 'open',
  done: 'done',
  archived: 'archived',
  deleted: 'deleted',
} as const;

export const DEFAULT_TASK_URL_TEMPLATE = '{host}/team/';

export interface MapContext {
  host?: string;
  taskUrlTemplate?: string;
}

/**
 * Builds the link to a task. Placeholders: {host}, {id}, {idTaskCommon},
 * {idTaskProject}. A placeholder without a value falls back to the bare template.
 */
export const buildTaskUrl = (
  ctx: MapContext,
  task: Pick<YouGileTask, 'id'> & Partial<Pick<YouGileTask, 'idTaskCommon' | 'idTaskProject'>>,
): string => {
  const template = ctx.taskUrlTemplate?.trim() || DEFAULT_TASK_URL_TEMPLATE;
  const values: Record<string, string | undefined> = {
    host: normalizeHost(ctx.host),
    id: task.id,
    idTaskCommon: task.idTaskCommon,
    idTaskProject: task.idTaskProject,
  };
  const placeholders = template.match(/\{(\w+)\}/g) || [];
  if (placeholders.some((p) => !values[p.slice(1, -1)])) {
    return DEFAULT_TASK_URL_TEMPLATE.replace('{host}', values.host!);
  }
  return template.replace(/\{(\w+)\}/g, (_m, key: string) =>
    key === 'host' ? values.host! : encodeURIComponent(values[key]!),
  );
};

const stateOf = (task: YouGileTask): string => {
  if (task.deleted) return STATE.deleted;
  if (task.completed) return STATE.done;
  if (task.archived) return STATE.archived;
  return STATE.open;
};

const checklistsToMarkdown = (task: YouGileTask): string =>
  (task.checklists || [])
    .map((list) =>
      [
        list.title ? `**${list.title}**` : '',
        ...list.items.map((item) => `- [${item.isCompleted ? 'x' : ' '}] ${item.title}`),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');

const formatDeadline = (task: YouGileTask): string => {
  const ms = task.deadline?.deadline;
  if (!ms) return '';
  const d = new Date(ms);
  const day = toDayString(ms);
  return task.deadline?.withTime
    ? `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : day;
};

/** YouGile task → the issue object Super Productivity stores and displays. */
export const mapTask = (task: YouGileTask, ctx: MapContext): PluginIssue => {
  const deadlineMs = task.deadline?.deadline || 0;
  const withTime = !!task.deadline?.withTime;
  return {
    id: task.id,
    title: task.title,
    body: htmlToMarkdown(task.description),
    url: buildTaskUrl(ctx, task),
    state: stateOf(task),
    // The API has no "updated at", so the newest known timestamp stands in for it
    lastUpdated: Math.max(
      task.timestamp || 0,
      task.completedTimestamp || 0,
      task.archivedTimestamp || 0,
    ),

    // Two-way sync values (see SYNC_FIELDS)
    [SYNC_FIELDS.completed]: !!task.completed,
    [SYNC_FIELDS.description]: htmlToMarkdown(task.description),
    [SYNC_FIELDS.deadlineDay]: deadlineMs && !withTime ? toDayString(deadlineMs) : null,
    [SYNC_FIELDS.deadlineDateTime]: deadlineMs && withTime ? deadlineMs : null,
    [SYNC_FIELDS.timePlanMs]: hoursToMs(task.timeTracking?.plan),

    // Display only
    code: task.idTaskProject || task.idTaskCommon || '',
    statusText: stateOf(task),
    deadlineText: formatDeadline(task),
    timePlanText: formatHours(task.timeTracking?.plan),
    timeWorkText: formatHours(task.timeTracking?.work),
    checklistsText: checklistsToMarkdown(task),
  };
};

export const FIELD_MAPPINGS: PluginFieldMapping[] = [
  {
    taskField: 'isDone',
    issueField: SYNC_FIELDS.completed,
    defaultDirection: 'both',
    toIssueValue: (taskValue) => !!taskValue,
    toTaskValue: (issueValue) => !!issueValue,
  },
  {
    taskField: 'title',
    issueField: SYNC_FIELDS.title,
    defaultDirection: 'both',
    toIssueValue: (taskValue) => (taskValue as string) ?? '',
    toTaskValue: (issueValue) => (issueValue as string) ?? '',
  },
  {
    // Pull only by default: YouGile descriptions can hold formatting that the
    // Markdown round trip would flatten. Users can switch it to "both".
    taskField: 'notes',
    issueField: SYNC_FIELDS.description,
    defaultDirection: 'pullOnly',
    toIssueValue: (taskValue) => (taskValue as string) || '',
    toTaskValue: (issueValue) => (issueValue as string) || '',
  },
  {
    taskField: 'dueWithTime',
    issueField: SYNC_FIELDS.deadlineDateTime,
    defaultDirection: 'both',
    mutuallyExclusive: ['dueDay'],
    toIssueValue: (taskValue) => (typeof taskValue === 'number' && taskValue > 0 ? taskValue : null),
    toTaskValue: (issueValue) => (typeof issueValue === 'number' && issueValue > 0 ? issueValue : undefined),
  },
  {
    taskField: 'dueDay',
    issueField: SYNC_FIELDS.deadlineDay,
    defaultDirection: 'both',
    mutuallyExclusive: ['dueWithTime'],
    toIssueValue: (taskValue) => (typeof taskValue === 'string' && taskValue ? taskValue : null),
    toTaskValue: (issueValue) => (typeof issueValue === 'string' && issueValue ? issueValue : undefined),
  },
  {
    taskField: 'timeEstimate',
    issueField: SYNC_FIELDS.timePlanMs,
    defaultDirection: 'both',
    toIssueValue: (taskValue) => (typeof taskValue === 'number' ? taskValue : 0),
    toTaskValue: (issueValue) => (typeof issueValue === 'number' ? issueValue : 0),
  },
];

const has = (obj: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Turns the changed issue fields Super Productivity pushes into a PUT body.
 * `current` is the task as it is in YouGile now; it is needed to keep the
 * other half of the deadline and time tracking stickers intact.
 */
export const buildTaskUpdate = (
  changes: Record<string, unknown>,
  current: YouGileTask,
): YouGileTaskUpdate => {
  const update: YouGileTaskUpdate = {};

  if (has(changes, SYNC_FIELDS.completed)) {
    update.completed = !!changes[SYNC_FIELDS.completed];
  }
  if (has(changes, SYNC_FIELDS.title) && typeof changes[SYNC_FIELDS.title] === 'string') {
    update.title = changes[SYNC_FIELDS.title] as string;
  }
  if (has(changes, SYNC_FIELDS.description)) {
    update.description = markdownToHtml(changes[SYNC_FIELDS.description] as string);
  }

  const hasDateTime = has(changes, SYNC_FIELDS.deadlineDateTime);
  const hasDay = has(changes, SYNC_FIELDS.deadlineDay);
  if (hasDateTime || hasDay) {
    const dateTime = changes[SYNC_FIELDS.deadlineDateTime];
    const dayMs =
      typeof changes[SYNC_FIELDS.deadlineDay] === 'string'
        ? dayStringToMs(changes[SYNC_FIELDS.deadlineDay] as string)
        : undefined;
    const startDate = current.deadline?.startDate ? { startDate: current.deadline.startDate } : {};
    const currentWithTime = !!current.deadline?.withTime;

    if (typeof dateTime === 'number' && dateTime > 0) {
      update.deadline = { deadline: dateTime, withTime: true, ...startDate };
    } else if (dayMs) {
      update.deadline = { deadline: dayMs, withTime: false, ...startDate };
    } else if (!current.deadline?.deadline) {
      // Nothing to clear
    } else if (hasDateTime && hasDay) {
      update.deadline = { deleted: true };
    } else if (hasDateTime ? currentWithTime : !currentWithTime) {
      // Only the half that YouGile currently uses was cleared
      update.deadline = { deleted: true };
    }
  }

  if (has(changes, SYNC_FIELDS.timePlanMs)) {
    update.timeTracking = {
      plan: msToHours(changes[SYNC_FIELDS.timePlanMs] as number),
      work: current.timeTracking?.work || 0,
    };
  }

  return update;
};
