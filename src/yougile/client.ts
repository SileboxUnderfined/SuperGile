import type { PluginHttp } from '@sp/plugin-api';
import type {
  YouGilePage,
  YouGileTask,
  YouGileTaskUpdate,
  YouGileUser,
} from './types';

export const DEFAULT_HOST = 'https://yougile.com';

/** Largest page /task-list allows. */
const PAGE_LIMIT = 1000;

/**
 * Safety stop for pagination. YouGile allows 50 requests per minute per
 * company, so one sync never spends more than this many on listing.
 */
const MAX_PAGES = 10;

export interface TaskListQuery {
  assignedTo?: string;
  title?: string;
  columnId?: string;
  includeDeleted?: boolean;
  /** Stop after this many tasks instead of reading every page */
  max?: number;
}

/** Normalizes a user-entered host such as "ru.yougile.com/" to "https://ru.yougile.com". */
export const normalizeHost = (host: string | undefined): string => {
  const trimmed = (host || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return DEFAULT_HOST;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** Thin wrapper over the endpoints of YouGile REST API v2 that SuperGile needs. */
export class YouGileClient {
  private readonly apiUrl: string;

  constructor(
    private readonly http: PluginHttp,
    host?: string,
  ) {
    this.apiUrl = `${normalizeHost(host)}/api-v2`;
  }

  /** The user who owns the API key. */
  getMe(): Promise<YouGileUser> {
    return this.http.get<YouGileUser>(`${this.apiUrl}/users/me`);
  }

  getTask(id: string): Promise<YouGileTask> {
    return this.http.get<YouGileTask>(`${this.apiUrl}/tasks/${encodeURIComponent(id)}`);
  }

  /** Partial update: only the fields present in `update` change. */
  async updateTask(id: string, update: YouGileTaskUpdate): Promise<void> {
    await this.http.put(`${this.apiUrl}/tasks/${encodeURIComponent(id)}`, update);
  }

  /** Reads /task-list page by page until it runs out or `query.max` is reached. */
  async listTasks(query: TaskListQuery = {}): Promise<YouGileTask[]> {
    const max = query.max ?? Number.POSITIVE_INFINITY;
    const tasks: YouGileTask[] = [];
    for (let page = 0; page < MAX_PAGES && tasks.length < max; page++) {
      const limit = Math.min(PAGE_LIMIT, max - tasks.length);
      const params: Record<string, string> = {
        limit: String(limit),
        offset: String(tasks.length),
      };
      if (query.assignedTo) params.assignedTo = query.assignedTo;
      if (query.title) params.title = query.title;
      if (query.columnId) params.columnId = query.columnId;
      if (query.includeDeleted) params.includeDeleted = 'true';

      const res = await this.http.get<YouGilePage<YouGileTask>>(`${this.apiUrl}/task-list`, {
        params,
      });
      const content = res?.content || [];
      tasks.push(...content);
      if (!res?.paging?.next || content.length === 0) {
        break;
      }
    }
    return tasks;
  }
}
