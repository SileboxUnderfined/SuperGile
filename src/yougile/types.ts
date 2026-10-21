// Subset of the YouGile REST API v2 schema that SuperGile uses.
// Source: the official OpenAPI 3.0 spec (https://yougile.com/api-v2#/).

export interface YouGilePaging {
  count: number;
  limit: number;
  offset: number;
  next: boolean;
}

export interface YouGilePage<T> {
  paging: YouGilePaging;
  content: T[];
}

export interface YouGileDeadline {
  /** Deadline timestamp, ms */
  deadline?: number;
  /** Start date timestamp, ms */
  startDate?: number;
  /** true: the deadline has a time of day; false: date only */
  withTime?: boolean;
}

export interface YouGileTimeTracking {
  /** Planned hours */
  plan?: number;
  /** Spent hours */
  work?: number;
}

export interface YouGileChecklist {
  title: string;
  items: { title: string; isCompleted: boolean }[];
}

export interface YouGileTask {
  id: string;
  title: string;
  /** Creation time, ms */
  timestamp: number;
  deleted?: boolean;
  columnId?: string;
  /** HTML */
  description?: string;
  archived?: boolean;
  archivedTimestamp?: number;
  completed?: boolean;
  completedTimestamp?: number;
  subtasks?: string[];
  assigned?: string[];
  createdBy?: string;
  deadline?: YouGileDeadline;
  timeTracking?: YouGileTimeTracking;
  checklists?: YouGileChecklist[];
  stickers?: Record<string, string>;
  color?: string;
  /** Company-wide id, e.g. "ID-484" */
  idTaskCommon?: string;
  /** Project-scoped id, e.g. "DEV-484" */
  idTaskProject?: string;
}

/** Body of PUT /tasks/{id}. A sticker is detached with `{ deleted: true }`. */
export interface YouGileTaskUpdate {
  title?: string;
  description?: string;
  completed?: boolean;
  archived?: boolean;
  deleted?: boolean;
  columnId?: string;
  assigned?: string[];
  deadline?: (YouGileDeadline & { deleted?: boolean }) | { deleted: true };
  timeTracking?: (YouGileTimeTracking & { deleted?: boolean }) | { deleted: true };
}

export interface YouGileUser {
  id: string;
  email: string;
  realName?: string;
  isAdmin?: boolean;
}
