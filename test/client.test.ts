import { describe, expect, it } from 'vitest';
import { YouGileClient, normalizeHost } from '../src/yougile/client';
import type { YouGileTask } from '../src/yougile/types';
import { createFakeHttp } from './fake-http';

const task = (id: string): YouGileTask => ({ id, title: `Task ${id}`, timestamp: 1 });

describe('normalizeHost', () => {
  it('defaults to the cloud host', () => {
    expect(normalizeHost(undefined)).toBe('https://yougile.com');
    expect(normalizeHost('  ')).toBe('https://yougile.com');
  });

  it('adds https and drops trailing slashes', () => {
    expect(normalizeHost('ru.yougile.com/')).toBe('https://ru.yougile.com');
    expect(normalizeHost('http://localhost:8001')).toBe('http://localhost:8001');
  });
});

describe('YouGileClient', () => {
  it('reads the current user from /users/me', async () => {
    const { http, calls } = createFakeHttp(() => ({ id: 'u1', email: 'me@example.com' }));
    const me = await new YouGileClient(http).getMe();
    expect(me.id).toBe('u1');
    expect(calls[0].url).toBe('https://yougile.com/api-v2/users/me');
  });

  it('pages through /task-list until paging.next is false', async () => {
    const { http, calls } = createFakeHttp((call) => {
      const offset = Number(call.options?.params?.offset);
      return offset === 0
        ? { paging: { count: 3, limit: 2, offset: 0, next: true }, content: [task('a'), task('b')] }
        : { paging: { count: 3, limit: 2, offset: 2, next: false }, content: [task('c')] };
    });

    const tasks = await new YouGileClient(http).listTasks({ assignedTo: 'u1' });

    expect(tasks.map((t) => t.id)).toEqual(['a', 'b', 'c']);
    expect(calls).toHaveLength(2);
    expect(calls[0].options?.params).toEqual({ limit: '1000', offset: '0', assignedTo: 'u1' });
    expect(calls[1].options?.params?.offset).toBe('2');
  });

  it('stops at query.max', async () => {
    const { http, calls } = createFakeHttp(() => ({
      paging: { count: 100, limit: 5, offset: 0, next: true },
      content: [task('a'), task('b'), task('c'), task('d'), task('e')],
    }));

    const tasks = await new YouGileClient(http).listTasks({ title: 'x', max: 5 });

    expect(tasks).toHaveLength(5);
    expect(calls).toHaveLength(1);
    expect(calls[0].options?.params?.limit).toBe('5');
  });

  it('sends partial updates with PUT', async () => {
    const { http, calls } = createFakeHttp();
    await new YouGileClient(http, 'ru.yougile.com').updateTask('t 1', { completed: true });
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      url: 'https://ru.yougile.com/api-v2/tasks/t%201',
      body: { completed: true },
    });
  });
});
