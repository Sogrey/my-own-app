import type { CollectionName, WorkspaceState, DashboardData, BackupRecord, Entity } from "./types";
import type { WorkspaceMutation } from "./workspaceState";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type MutationListener = (mutation: WorkspaceMutation) => void;

let mutationListener: MutationListener | null = null;

/** 由 WorkspaceProvider 注册：写接口成功后增量 patch 本地缓存。 */
export function setWorkspaceMutationListener(listener: MutationListener | null): void {
  mutationListener = listener;
}

function emit(mutation: WorkspaceMutation): void {
  mutationListener?.(mutation);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new ApiError(result?.error?.message ?? `操作失败（${response.status}）`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  return result.data as T;
}

export const api = {
  state: () => request<WorkspaceState>("/api/state"),
  dashboard: (date: string) => request<DashboardData>(`/api/dashboard?date=${encodeURIComponent(date)}`),
  search: (query: string) => request<Entity[]>(`/api/search?q=${encodeURIComponent(query)}`),
  list: (collection: CollectionName, includeDeleted = false) =>
    request<Entity[]>(`/api/collections/${collection}${includeDeleted ? "?includeDeleted=true" : ""}`),
  trash: () => request<Entity[]>("/api/trash"),
  create: async (collection: CollectionName, input: Record<string, any>) => {
    const entity = await request<Entity>(`/api/collections/${collection}`, { method: "POST", body: JSON.stringify(input) });
    emit({ type: "upsert", collection, entity });
    return entity;
  },
  update: async (collection: CollectionName, id: string, input: Record<string, any>) => {
    const entity = await request<Entity>(`/api/collections/${collection}/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    emit({ type: "upsert", collection, entity });
    return entity;
  },
  remove: async (collection: CollectionName, id: string) => {
    const entity = await request<Entity>(`/api/collections/${collection}/${id}`, { method: "DELETE" });
    emit({ type: "soft-delete", collection, entity });
    return entity;
  },
  restore: async (collection: CollectionName, id: string) => {
    const entity = await request<Entity>(`/api/collections/${collection}/${id}/restore`, { method: "POST" });
    emit({ type: "restore", collection, entity });
    return entity;
  },
  permanentDelete: async (collection: CollectionName, id: string) => {
    await request<void>(`/api/collections/${collection}/${id}/permanent`, { method: "DELETE" });
    emit({ type: "permanent-delete", collection, id });
  },
  completePlan: async (id: string) => {
    const entity = await request<Entity>(`/api/plan-items/${id}/complete`, { method: "POST" });
    emit({ type: "upsert", collection: "planItems", entity });
    return entity;
  },
  postponePlan: async (id: string, date: string) => {
    const entity = await request<Entity>(`/api/plan-items/${id}/postpone`, { method: "POST", body: JSON.stringify({ date }) });
    emit({ type: "upsert", collection: "planItems", entity });
    return entity;
  },
  startWorkoutFromTemplate: async (templateId: string, workoutDate?: string) => {
    const result = await request<{ workout: Entity; exercises: Entity[]; sets: Entity[] }>(
      "/api/workouts/from-template",
      { method: "POST", body: JSON.stringify({ template_id: templateId, workout_date: workoutDate }) },
    );
    emit({ type: "upsert", collection: "workouts", entity: result.workout });
    for (const entity of result.exercises) emit({ type: "upsert", collection: "workoutExercises", entity });
    for (const entity of result.sets) emit({ type: "upsert", collection: "workoutSets", entity });
    return result;
  },
  getReview: (date: string) => request<Entity | null>(`/api/daily-reviews/${date}`),
  setReview: (date: string, content: string) =>
    request<Entity>(`/api/daily-reviews/${date}`, { method: "PUT", body: JSON.stringify({ content }) }),
  convertMemo: async (id: string, collection: CollectionName, fields: Record<string, any>) => {
    const entity = await request<Entity>(`/api/quick-memos/${id}/convert`, { method: "POST", body: JSON.stringify({ collection, fields }) });
    emit({ type: "memo-convert", memoId: id, collection, entity, archivedAt: new Date().toISOString() });
    return entity;
  },
  settings: () => request<Record<string, any>>("/api/settings"),
  saveSettings: async (input: Record<string, any>) => {
    const settings = await request<Record<string, any>>("/api/settings", { method: "PUT", body: JSON.stringify(input) });
    emit({ type: "settings", settings });
    return settings;
  },
  systemStatus: () => request<Record<string, any>>("/api/system/status"),
  saveNow: () => request<{ savedAt: string; database: string; dataFile: string }>("/api/system/save", { method: "POST" }),
  saveAndExit: () => request<{ savedAt: string; database: string; dataFile: string; exiting: boolean }>("/api/system/save-and-exit", { method: "POST" }),
  openDataDirectory: () => request<Record<string, any>>("/api/system/open-data-directory", { method: "POST" }),
  openPath: (path: string) => request<Record<string, any>>("/api/system/open-path", { method: "POST", body: JSON.stringify({ path }) }),
  backups: () => request<BackupRecord[]>("/api/backups"),
  createBackup: (label = "", keep = false) => request<BackupRecord>("/api/backups", { method: "POST", body: JSON.stringify({ label, keep }) }),
  updateBackup: (id: string, input: { label?: string; keep?: boolean }) => request<BackupRecord>(`/api/backups/${id}/metadata`, { method: "PATCH", body: JSON.stringify(input) }),
  restoreBackup: (id: string) => request<{ restored: boolean }>(`/api/backups/${id}/restore`, { method: "POST" }),
  exportAll: () => request<{ filename: string; path: string; size: number; downloadUrl: string }>("/api/export", { method: "POST" }),
  importCollections: (collections: Partial<Record<CollectionName, Array<Record<string, unknown>>>>, safetyBackup = true) =>
    request<{ summary: Record<string, { created: number; skipped: number; failed: number }> }>("/api/import", {
      method: "POST",
      body: JSON.stringify({ collections, safetyBackup }),
    }),
};
