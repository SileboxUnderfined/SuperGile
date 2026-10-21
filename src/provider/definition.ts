import type {
  IssueProviderPluginDefinition,
  PluginHttp,
  PluginIssue,
  PluginSearchResult,
  PluginTimeEntry,
} from '@sp/plugin-api';
import { YouGileClient } from '../yougile/client';
import type { YouGileTask } from '../yougile/types';
import { hoursToMs, msToHours } from '../utils/time';
import { asConfig, createConfigFields, type SuperGileConfig } from './config';
import {
  FIELD_MAPPINGS,
  STATE,
  SYNC_FIELDS,
  buildTaskUpdate,
  buildTaskUrl,
  mapTask,
} from './mapping';

type Translate = (key: string) => string;

const SEARCH_LIMIT = 50;
/** Tasks looked up one by one in getByIds when they are no longer assigned to the user. */
const MAX_SINGLE_LOOKUPS = 10;

const client = (cfg: SuperGileConfig, http: PluginHttp): YouGileClient =>
  new YouGileClient(http, cfg.host);

const isOpen = (task: YouGileTask): boolean => !task.completed && !task.archived && !task.deleted;

/**
 * Creates the issue provider definition. Kept free of the global PluginAPI so
 * tests can build it with a fake translator and a fake HTTP helper.
 */
export const createDefinition = (t: Translate): IssueProviderPluginDefinition => {
  // The user id behind each API key, so a sync does not ask /users/me every time
  const userIdByKey = new Map<string, string>();

  const getMyId = async (cfg: SuperGileConfig, http: PluginHttp): Promise<string> => {
    const key = cfg.apiKey || '';
    const cached = userIdByKey.get(key);
    if (cached) {
      return cached;
    }
    const me = await client(cfg, http).getMe();
    userIdByKey.set(key, me.id);
    return me.id;
  };

  const listMyTasks = async (
    cfg: SuperGileConfig,
    http: PluginHttp,
    includeDeleted = false,
  ): Promise<YouGileTask[]> =>
    client(cfg, http).listTasks({ assignedTo: await getMyId(cfg, http), includeDeleted });

  const toIssue = (task: YouGileTask, cfg: SuperGileConfig): PluginIssue => {
    const issue = mapTask(task, cfg);
    return { ...issue, statusText: t(`STATUS.${String(issue.state).toUpperCase()}`) };
  };

  return {
    configFields: createConfigFields(t),

    getHeaders(config) {
      const { apiKey } = asConfig(config);
      return {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
      };
    },

    async testConnection(config, http) {
      try {
        const me = await client(asConfig(config), http).getMe();
        return !!me?.id;
      } catch {
        return false;
      }
    },

    async searchIssues(searchTerm, config, http): Promise<PluginSearchResult[]> {
      const cfg = asConfig(config);
      const term = searchTerm.trim();
      const tasks = term
        ? await client(cfg, http).listTasks({ title: term, max: SEARCH_LIMIT })
        : (await listMyTasks(cfg, http)).filter(isOpen);
      return tasks.map((task) => toIssue(task, cfg) as PluginSearchResult);
    },

    async getById(issueId, config, http) {
      const cfg = asConfig(config);
      return toIssue(await client(cfg, http).getTask(issueId), cfg);
    },

    async getByIds(issueIds, config, http) {
      const cfg = asConfig(config);
      const wanted = new Set(issueIds);
      // One listing covers every task still assigned to the user
      const found = (await listMyTasks(cfg, http, true)).filter((task) => wanted.has(task.id));
      const missing = issueIds.filter((id) => !found.some((task) => task.id === id));
      for (const id of missing.slice(0, MAX_SINGLE_LOOKUPS)) {
        try {
          found.push(await client(cfg, http).getTask(id));
        } catch {
          // Skipped ids are refreshed on a later sync, not treated as deleted
        }
      }
      return found.map((task) => toIssue(task, cfg));
    },

    getIssueLink(issueId, config) {
      return buildTaskUrl(asConfig(config), { id: issueId });
    },

    async getNewIssuesForBacklog(config, http) {
      const cfg = asConfig(config);
      return (await listMyTasks(cfg, http))
        .filter(isOpen)
        .map((task) => toIssue(task, cfg) as PluginSearchResult);
    },

    issueDisplay: [
      { field: 'title', label: t('DISPLAY.TITLE'), type: 'link', linkField: 'url' },
      { field: 'code', label: t('DISPLAY.CODE'), type: 'text', hideEmpty: true },
      { field: 'statusText', label: t('DISPLAY.STATUS'), type: 'text' },
      { field: 'deadlineText', label: t('DISPLAY.DEADLINE'), type: 'text', hideEmpty: true },
      { field: 'timePlanText', label: t('DISPLAY.TIME_PLAN'), type: 'text', hideEmpty: true },
      { field: 'timeWorkText', label: t('DISPLAY.TIME_WORK'), type: 'text', hideEmpty: true },
      { field: 'checklistsText', label: t('DISPLAY.CHECKLISTS'), type: 'markdown', hideEmpty: true },
      { field: 'body', label: t('DISPLAY.DESCRIPTION'), type: 'markdown', hideEmpty: true },
    ],

    fieldMappings: FIELD_MAPPINGS,

    async updateIssue(id, changes, config, http) {
      const api = client(asConfig(config), http);
      const update = buildTaskUpdate(changes, await api.getTask(id));
      if (Object.keys(update).length) {
        await api.updateTask(id, update);
      }
    },

    extractSyncValues(issue) {
      return Object.fromEntries(Object.values(SYNC_FIELDS).map((field) => [field, issue[field]]));
    },

    deletedStates: [STATE.deleted],

    timeTracking: {
      async logTime(issueId: string, entry: PluginTimeEntry, config, http) {
        const api = client(asConfig(config), http);
        const current = await api.getTask(issueId);
        const work = (current.timeTracking?.work || 0) + msToHours(entry.timeSpentMs);
        await api.updateTask(issueId, {
          timeTracking: {
            plan: current.timeTracking?.plan || 0,
            work: Math.round(work * 100) / 100,
          },
        });
      },

      // YouGile keeps one total per task, not per person
      async getTimeLogged(issueId, config, http) {
        const task = await client(asConfig(config), http).getTask(issueId);
        return hoursToMs(task.timeTracking?.work);
      },
    },
  };
};
