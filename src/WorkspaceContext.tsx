import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowCounterClockwise, CheckCircle } from "@phosphor-icons/react";
import { api, setWorkspaceMutationListener } from "./api";
import type { CollectionName, WorkspaceState } from "./types";
import { applyWorkspaceMutation, type WorkspaceMutation } from "./workspaceState";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type SaveHandler = () => Promise<void> | void;

type UndoToast = {
  collection: CollectionName;
  entityId: string;
  label: string;
};

type SuccessToast = {
  title: string;
  detail?: string;
};

type WorkspaceContextValue = {
  data: WorkspaceState;
  loading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  run: <T>(operation: () => Promise<T>) => Promise<T>;
  saveNow: () => Promise<void>;
  registerSaveHandler: (handler: SaveHandler) => () => void;
  refresh: () => Promise<void>;
  notifySuccess: (title: string, detail?: string) => void;
};

const emptyState: WorkspaceState = {
  planItems: [], quickMemos: [], mediaContents: [], devProjects: [], devMilestones: [], devWorkItems: [], devLogs: [],
  clients: [], consultingProjects: [], consultingInteractions: [], consultingDeliverables: [], consultingFollowups: [], consultingTimeEntries: [],
  workoutTemplates: [], workoutTemplateExercises: [], workouts: [], workoutExercises: [], workoutSets: [], bodyMetrics: [], nutritionTargets: [],
  foods: [], meals: [], mealItems: [], entertainmentItems: [], playSessions: [], settings: {}, trash: [],
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function entityLabel(entity: Record<string, any>): string {
  const raw = entity.title ?? entity.name ?? entity.content ?? entity.display_title;
  const text = typeof raw === "string" ? raw.trim() : "";
  return text || "这条记录";
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [successToast, setSuccessToast] = useState<SuccessToast | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const saveHandlers = useRef(new Set<SaveHandler>());
  const undoTimer = useRef(0);
  const successTimer = useRef(0);
  const query = useQuery({ queryKey: ["workspace"], queryFn: api.state, staleTime: 15_000 });

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = window.setTimeout(() => setSaveStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const offerUndo = useCallback((collection: CollectionName, entity: Record<string, any>) => {
    window.clearTimeout(undoTimer.current);
    window.clearTimeout(successTimer.current);
    setSuccessToast(null);
    setUndoToast({ collection, entityId: String(entity.id), label: entityLabel(entity) });
    undoTimer.current = window.setTimeout(() => setUndoToast(null), 7000);
  }, []);

  const notifySuccess = useCallback((title: string, detail?: string) => {
    window.clearTimeout(successTimer.current);
    window.clearTimeout(undoTimer.current);
    setUndoToast(null);
    setSuccessToast({ title, detail });
    successTimer.current = window.setTimeout(() => setSuccessToast(null), 2800);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(undoTimer.current);
    window.clearTimeout(successTimer.current);
  }, []);

  useEffect(() => {
    const onMutation = (mutation: WorkspaceMutation) => {
      queryClient.setQueryData<WorkspaceState>(["workspace"], (current) => {
        if (!current) return current;
        return applyWorkspaceMutation(current, mutation);
      });
      if (mutation.type === "soft-delete") offerUndo(mutation.collection, mutation.entity);
    };
    setWorkspaceMutationListener(onMutation);
    return () => setWorkspaceMutationListener(null);
  }, [offerUndo, queryClient]);

  const refreshDerived = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["system"] }),
      queryClient.invalidateQueries({ queryKey: ["backups"] }),
      queryClient.invalidateQueries({ queryKey: ["search"] }),
    ]);
  }, [queryClient]);

  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setSaveStatus("saving");
    try {
      const result = await operation();
      // 业务写操作已通过 api 监听器增量 patch workspace，这里只刷新派生查询。
      await refreshDerived();
      setSaveStatus("saved");
      return result;
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  }, [refreshDerived]);

  const undoSoftDelete = useCallback(async () => {
    if (!undoToast || undoBusy) return;
    const target = undoToast;
    setUndoBusy(true);
    try {
      window.clearTimeout(undoTimer.current);
      setUndoToast(null);
      await run(() => api.restore(target.collection, target.entityId));
    } finally {
      setUndoBusy(false);
    }
  }, [run, undoBusy, undoToast]);

  const registerSaveHandler = useCallback((handler: SaveHandler) => {
    saveHandlers.current.add(handler);
    return () => saveHandlers.current.delete(handler);
  }, []);

  const saveNow = useCallback(async () => {
    setSaveStatus("saving");
    try {
      for (const handler of [...saveHandlers.current]) await handler();
      await api.saveNow();
      await queryClient.invalidateQueries({ queryKey: ["system"] });
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("error");
      throw error;
    }
  }, [queryClient]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    data: query.data ?? emptyState,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    saveStatus,
    run,
    saveNow,
    registerSaveHandler,
    refresh: async () => {
      await queryClient.invalidateQueries();
    },
    notifySuccess,
  }), [notifySuccess, query.data, query.isLoading, query.error, queryClient, registerSaveHandler, run, saveNow, saveStatus]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {undoToast ? (
        <div className="undo-toast glass-regular" role="status" aria-live="polite" data-testid="undo-toast">
          <div className="undo-toast-copy">
            <strong>已移到回收站</strong>
            <span>{undoToast.label}</span>
          </div>
          <button type="button" className="undo-toast-action" disabled={undoBusy} onClick={() => void undoSoftDelete().catch(() => undefined)}>
            <ArrowCounterClockwise size={16} />
            撤销
          </button>
        </div>
      ) : successToast ? (
        <div className="undo-toast success-toast glass-regular" role="status" aria-live="polite" data-testid="success-toast">
          <CheckCircle size={18} weight="fill" aria-hidden />
          <div className="undo-toast-copy">
            <strong>{successToast.title}</strong>
            {successToast.detail ? <span>{successToast.detail}</span> : null}
          </div>
        </div>
      ) : null}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is missing");
  return value;
}
