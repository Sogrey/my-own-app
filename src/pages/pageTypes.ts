import type { CollectionName } from "../types";

export type WorkspaceRun = <T>(operation: () => Promise<T>) => Promise<T>;

export type DialogState = {
  type: string;
  item?: Record<string, unknown> & { id?: string };
} | null;

export type DialogConfig = {
  title: string;
  editTitle?: string;
  collection: CollectionName;
  fields: import("../components/ui").FieldDefinition[];
  defaults: Record<string, unknown>;
};
