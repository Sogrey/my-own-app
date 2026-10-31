import type { CollectionName } from "../shared/schema";

export type { CollectionName };
export type Entity = Record<string, any> & { id: string };

export type WorkspaceState = {
  [K in CollectionName]: Entity[];
} & {
  settings: Record<string, any>;
  trash: Entity[];
};

export type DashboardData = {
  date: string;
  overview: { completed: number; total: number; progress: number; scheduledMinutes: number };
  timeline: Entity[];
  unscheduled: Entity[];
  attention: Entity[];
  summaries: Record<string, Entity[]>;
};

export type BackupRecord = {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  type: "manual" | "automatic" | "safety";
  label: string;
  keep: boolean;
};
