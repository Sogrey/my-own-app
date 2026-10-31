import type { CollectionName, Entity, WorkspaceState } from "./types";

export type WorkspaceMutation =
  | { type: "upsert"; collection: CollectionName; entity: Entity }
  | { type: "soft-delete"; collection: CollectionName; entity: Entity }
  | { type: "restore"; collection: CollectionName; entity: Entity }
  | { type: "permanent-delete"; collection: CollectionName; id: string }
  | { type: "settings"; settings: Record<string, unknown> }
  | { type: "memo-convert"; memoId: string; collection: CollectionName; entity: Entity; archivedAt: string };

/** 与服务端 dependentCollections 对齐的精简版，用于永久删除时清理本地缓存子树。 */
const dependentCollections: Partial<Record<CollectionName, Array<{ collection: CollectionName; foreignKey: string }>>> = {
  clients: [{ collection: "consultingProjects", foreignKey: "client_id" }],
  consultingProjects: [
    { collection: "consultingInteractions", foreignKey: "project_id" },
    { collection: "consultingDeliverables", foreignKey: "project_id" },
    { collection: "consultingFollowups", foreignKey: "project_id" },
    { collection: "consultingTimeEntries", foreignKey: "project_id" },
  ],
  devProjects: [
    { collection: "devMilestones", foreignKey: "project_id" },
    { collection: "devWorkItems", foreignKey: "project_id" },
    { collection: "devLogs", foreignKey: "project_id" },
  ],
  workoutTemplates: [{ collection: "workoutTemplateExercises", foreignKey: "template_id" }],
  workouts: [{ collection: "workoutExercises", foreignKey: "workout_id" }],
  workoutExercises: [{ collection: "workoutSets", foreignKey: "workout_exercise_id" }],
  meals: [{ collection: "mealItems", foreignKey: "meal_id" }],
  entertainmentItems: [{ collection: "playSessions", foreignKey: "entertainment_id" }],
};

const titleFields: Partial<Record<CollectionName, string>> = {
  planItems: "title",
  quickMemos: "content",
  mediaContents: "title",
  devProjects: "name",
  devMilestones: "name",
  devWorkItems: "title",
  clients: "name",
  consultingProjects: "name",
  consultingDeliverables: "name",
  consultingFollowups: "content",
  workoutTemplates: "name",
  workouts: "name",
  foods: "name",
  meals: "name",
  entertainmentItems: "name",
};

export function applyWorkspaceMutation(state: WorkspaceState, mutation: WorkspaceMutation): WorkspaceState {
  switch (mutation.type) {
    case "upsert":
      return {
        ...state,
        [mutation.collection]: upsert(state[mutation.collection] as Entity[], enrichEntity(state, mutation.collection, mutation.entity)),
      };
    case "soft-delete": {
      const titleKey = titleFields[mutation.collection] ?? "title";
      const displayTitle = String(mutation.entity[titleKey] ?? mutation.entity.name ?? mutation.entity.content ?? "未命名记录");
      const trashEntry: Entity = {
        id: `local-trash-${mutation.collection}-${mutation.entity.id}`,
        collection: mutation.collection,
        entity_id: mutation.entity.id,
        display_title: displayTitle,
        deleted_at: mutation.entity.deleted_at ?? new Date().toISOString(),
      };
      return {
        ...state,
        [mutation.collection]: (state[mutation.collection] as Entity[]).filter((item) => item.id !== mutation.entity.id),
        trash: [trashEntry, ...state.trash.filter((item) => !(item.collection === mutation.collection && item.entity_id === mutation.entity.id))],
      };
    }
    case "restore":
      return {
        ...state,
        [mutation.collection]: upsert(state[mutation.collection] as Entity[], enrichEntity(state, mutation.collection, mutation.entity)),
        trash: state.trash.filter((item) => !(item.collection === mutation.collection && item.entity_id === mutation.entity.id)),
      };
    case "permanent-delete": {
      const removed = collectSubtree(state, mutation.collection, mutation.id);
      let next = { ...state };
      for (const [collection, ids] of removed) {
        next = {
          ...next,
          [collection]: (next[collection] as Entity[]).filter((item) => !ids.has(item.id)),
        };
      }
      next = {
        ...next,
        trash: next.trash.filter((item) => {
          const ids = removed.get(item.collection as CollectionName);
          return !(ids && ids.has(String(item.entity_id)));
        }),
      };
      return next;
    }
    case "settings":
      return { ...state, settings: { ...state.settings, ...mutation.settings } };
    case "memo-convert": {
      const memos = (state.quickMemos as Entity[]).map((memo) => (
        memo.id === mutation.memoId
          ? { ...memo, converted_type: mutation.collection, converted_id: mutation.entity.id, archived_at: mutation.archivedAt }
          : memo
      ));
      return {
        ...state,
        quickMemos: memos,
        [mutation.collection]: upsert(state[mutation.collection] as Entity[], enrichEntity(state, mutation.collection, mutation.entity)),
      };
    }
    default:
      return state;
  }
}

function upsert(list: Entity[], entity: Entity): Entity[] {
  const index = list.findIndex((item) => item.id === entity.id);
  if (index < 0) return [entity, ...list];
  return list.map((item, offset) => (offset === index ? entity : item));
}

function enrichEntity(state: WorkspaceState, collection: CollectionName, entity: Entity): Entity {
  if (collection !== "planItems") return entity;
  const displayTitle = sourceTitle(state, entity.source_entity_type, entity.source_entity_id) || entity.title;
  return { ...entity, display_title: displayTitle };
}

function sourceTitle(state: WorkspaceState, type: string | null | undefined, id: string | null | undefined): string | null {
  if (!type || !id) return null;
  const collectionByType: Record<string, CollectionName> = {
    media_content: "mediaContents",
    dev_work_item: "devWorkItems",
    consulting_deliverable: "consultingDeliverables",
    consulting_followup: "consultingFollowups",
    workout: "workouts",
    meal: "meals",
    entertainment_item: "entertainmentItems",
  };
  const collection = collectionByType[type];
  if (!collection) return null;
  const row = (state[collection] as Entity[]).find((item) => item.id === id);
  if (!row) return null;
  const titleKey = titleFields[collection] ?? "title";
  return String(row[titleKey] ?? "");
}

function collectSubtree(state: WorkspaceState, collection: CollectionName, id: string): Map<CollectionName, Set<string>> {
  const removed = new Map<CollectionName, Set<string>>();
  const add = (name: CollectionName, entityId: string) => {
    const set = removed.get(name) ?? new Set<string>();
    set.add(entityId);
    removed.set(name, set);
  };
  add(collection, id);
  const visit = (parent: CollectionName, parentId: string) => {
    for (const child of dependentCollections[parent] ?? []) {
      for (const row of state[child.collection] as Entity[]) {
        if (String(row[child.foreignKey]) !== parentId) continue;
        add(child.collection, row.id);
        visit(child.collection, row.id);
      }
    }
  };
  visit(collection, id);
  return removed;
}
