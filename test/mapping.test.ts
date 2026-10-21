import { describe, expect, it } from 'vitest';
import { FIELD_MAPPINGS, buildTaskUpdate, buildTaskUrl, mapTask } from '../src/provider/mapping';
import type { YouGileTask } from '../src/yougile/types';
import { dayStringToMs } from '../src/utils/time';

const baseTask: YouGileTask = {
  id: 'task-1',
  title: 'Prepare report',
  timestamp: 1_000,
  description: '<p>Hello <b>world</b></p>',
  completed: false,
  idTaskCommon: 'ID-42',
  idTaskProject: 'DEV-42',
};

const mapping = (taskField: string) => FIELD_MAPPINGS.find((m) => m.taskField === taskField)!;

describe('mapTask', () => {
  it('maps core fields', () => {
    const issue = mapTask({ ...baseTask, timeTracking: { plan: 1.5, work: 0.5 } }, {});
    expect(issue).toMatchObject({
      id: 'task-1',
      title: 'Prepare report',
      body: 'Hello **world**',
      description: 'Hello **world**',
      state: 'open',
      completed: false,
      timePlanMs: 5_400_000,
      code: 'DEV-42',
      timePlanText: '1h 30m',
      timeWorkText: '30m',
      deadlineDay: null,
      deadlineDateTime: null,
    });
  });

  it('splits the deadline into a day or a date-time', () => {
    const dayMs = dayStringToMs('2026-11-05')!;
    expect(mapTask({ ...baseTask, deadline: { deadline: dayMs, withTime: false } }, {})).toMatchObject({
      deadlineDay: '2026-11-05',
      deadlineDateTime: null,
      deadlineText: '2026-11-05',
    });
    const at = new Date(2026, 10, 5, 15, 30).getTime();
    expect(mapTask({ ...baseTask, deadline: { deadline: at, withTime: true } }, {})).toMatchObject({
      deadlineDay: null,
      deadlineDateTime: at,
      deadlineText: '2026-11-05 15:30',
    });
  });

  it('derives the state, deleted winning over done', () => {
    expect(mapTask({ ...baseTask, completed: true }, {}).state).toBe('done');
    expect(mapTask({ ...baseTask, archived: true }, {}).state).toBe('archived');
    expect(mapTask({ ...baseTask, completed: true, deleted: true }, {}).state).toBe('deleted');
  });

  it('uses the newest timestamp as lastUpdated', () => {
    expect(mapTask({ ...baseTask, completedTimestamp: 5_000 }, {}).lastUpdated).toBe(5_000);
  });

  it('renders checklists as Markdown tasks', () => {
    const issue = mapTask(
      {
        ...baseTask,
        checklists: [
          { title: 'Steps', items: [{ title: 'one', isCompleted: true }, { title: 'two', isCompleted: false }] },
        ],
      },
      {},
    );
    expect(issue.checklistsText).toBe('**Steps**\n- [x] one\n- [ ] two');
  });
});

describe('buildTaskUrl', () => {
  it('fills placeholders', () => {
    expect(buildTaskUrl({ taskUrlTemplate: '{host}/team/#{idTaskCommon}' }, baseTask)).toBe(
      'https://yougile.com/team/#ID-42',
    );
  });

  it('falls back to the app when a placeholder has no value', () => {
    expect(buildTaskUrl({ host: 'ru.yougile.com', taskUrlTemplate: '{host}/x/{idTaskProject}' }, { id: 'a' })).toBe(
      'https://ru.yougile.com/team/',
    );
  });
});

describe('FIELD_MAPPINGS', () => {
  it('converts values in both directions', () => {
    expect(mapping('isDone').toIssueValue(true, { issueId: 'x' })).toBe(true);
    expect(mapping('dueWithTime').toIssueValue(undefined, { issueId: 'x' })).toBeNull();
    expect(mapping('dueWithTime').toTaskValue(null, { issueId: 'x' })).toBeUndefined();
    expect(mapping('dueDay').toTaskValue('2026-11-05', { issueId: 'x' })).toBe('2026-11-05');
    expect(mapping('timeEstimate').toTaskValue(3_600_000, { issueId: 'x' })).toBe(3_600_000);
  });

  it('pulls descriptions only by default', () => {
    expect(mapping('notes').defaultDirection).toBe('pullOnly');
  });
});

describe('buildTaskUpdate', () => {
  it('maps done, title and description', () => {
    expect(buildTaskUpdate({ completed: true, title: 'New', description: 'a\nb' }, baseTask)).toEqual({
      completed: true,
      title: 'New',
      description: '<p>a<br>b</p>',
    });
  });

  it('sets a date-time deadline and keeps the start date', () => {
    const current = { ...baseTask, deadline: { deadline: 1, startDate: 500, withTime: false } };
    expect(buildTaskUpdate({ deadlineDateTime: 9_000, deadlineDay: null }, current).deadline).toEqual({
      deadline: 9_000,
      withTime: true,
      startDate: 500,
    });
  });

  it('sets a day deadline at local noon', () => {
    expect(buildTaskUpdate({ deadlineDay: '2026-11-05' }, baseTask).deadline).toEqual({
      deadline: dayStringToMs('2026-11-05'),
      withTime: false,
    });
  });

  it('clears the deadline only when the half in use was cleared', () => {
    const timed = { ...baseTask, deadline: { deadline: 1, withTime: true } };
    expect(buildTaskUpdate({ deadlineDateTime: null }, timed).deadline).toEqual({ deleted: true });
    expect(buildTaskUpdate({ deadlineDay: null }, timed).deadline).toBeUndefined();
    expect(buildTaskUpdate({ deadlineDay: null, deadlineDateTime: null }, timed).deadline).toEqual({
      deleted: true,
    });
    expect(buildTaskUpdate({ deadlineDay: null }, baseTask)).toEqual({});
  });

  it('updates the plan and keeps spent time', () => {
    const current = { ...baseTask, timeTracking: { plan: 1, work: 2.5 } };
    expect(buildTaskUpdate({ timePlanMs: 2 * 3_600_000 }, current).timeTracking).toEqual({
      plan: 2,
      work: 2.5,
    });
  });
});
