import { describe, expect, it } from 'vitest';
import { createDefinition } from '../src/provider/definition';
import type { YouGileTask } from '../src/yougile/types';
import { createFakeHttp, type RecordedCall } from './fake-http';

const t = (key: string) => key;
const config = { apiKey: 'secret-key' };

const task = (id: string, extra: Partial<YouGileTask> = {}): YouGileTask => ({
  id,
  title: `Task ${id}`,
  timestamp: 1,
  ...extra,
});

/** Routes fake API calls: /users/me, /task-list and /tasks/{id}. */
const api = (tasks: YouGileTask[]) => (call: RecordedCall) => {
  if (call.url.endsWith('/users/me')) return { id: 'me', email: 'me@example.com' };
  if (call.url.endsWith('/task-list')) {
    return { paging: { count: tasks.length, limit: 1000, offset: 0, next: false }, content: tasks };
  }
  const id = decodeURIComponent(call.url.split('/tasks/')[1] || '');
  if (call.method === 'GET') {
    const found = tasks.find((x) => x.id === id);
    if (!found) throw new Error('404');
    return found;
  }
  return {};
};

describe('createDefinition', () => {
  it('sends the API key as a bearer token', () => {
    expect(createDefinition(t).getHeaders(config)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret-key',
    });
  });

  it('imports only open tasks assigned to the user, asking /users/me once', async () => {
    const def = createDefinition(t);
    const { http, calls } = createFakeHttp(
      api([task('a'), task('b', { completed: true }), task('c', { archived: true })]),
    );

    const first = await def.getNewIssuesForBacklog!(config, http);
    await def.getNewIssuesForBacklog!(config, http);

    expect(first.map((i) => i.id)).toEqual(['a']);
    expect(first[0].statusText).toBe('STATUS.OPEN');
    expect(calls.filter((c) => c.url.endsWith('/users/me'))).toHaveLength(1);
    expect(calls.find((c) => c.url.endsWith('/task-list'))?.options?.params?.assignedTo).toBe('me');
  });

  it('refreshes many tasks with one listing and looks up the rest one by one', async () => {
    const def = createDefinition(t);
    const all = [task('a'), task('b')];
    const { http, calls } = createFakeHttp((call) =>
      call.url.endsWith('/task-list') ? api([all[0]])(call) : api(all)(call),
    );

    const issues = await def.getByIds!(['a', 'b', 'gone'], config, http);

    expect(issues.map((i) => i.id).sort()).toEqual(['a', 'b']);
    expect(calls.find((c) => c.url.endsWith('/task-list'))?.options?.params?.includeDeleted).toBe(
      'true',
    );
  });

  it('pushes changes as a partial PUT', async () => {
    const def = createDefinition(t);
    const { http, calls } = createFakeHttp(api([task('a')]));

    await def.updateIssue!('a', { completed: true }, config, http);

    expect(calls.at(-1)).toMatchObject({
      method: 'PUT',
      url: 'https://yougile.com/api-v2/tasks/a',
      body: { completed: true },
    });
  });

  it('adds logged time to the spent hours', async () => {
    const def = createDefinition(t);
    const { http, calls } = createFakeHttp(api([task('a', { timeTracking: { plan: 4, work: 1.25 } })]));

    await def.timeTracking!.logTime(
      'a',
      { started: 0, timeSpentMs: 45 * 60_000, comment: '' },
      config,
      http,
    );

    expect(calls.at(-1)?.body).toEqual({ timeTracking: { plan: 4, work: 2 } });
    expect(await def.timeTracking!.getTimeLogged!('a', config, http)).toBe(1.25 * 3_600_000);
  });

  it('reports a failed connection as false', async () => {
    const { http } = createFakeHttp(() => {
      throw new Error('401');
    });
    expect(await createDefinition(t).testConnection!(config, http)).toBe(false);
  });
});
