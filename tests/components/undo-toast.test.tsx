import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../src/api";
import { useWorkspace, WorkspaceProvider } from "../../src/WorkspaceContext";

const collections = ["planItems", "quickMemos", "mediaContents", "devProjects", "devMilestones", "devWorkItems", "devLogs", "clients", "consultingProjects", "consultingInteractions", "consultingDeliverables", "consultingFollowups", "consultingTimeEntries", "workoutTemplates", "workoutTemplateExercises", "workouts", "workoutExercises", "workoutSets", "bodyMetrics", "nutritionTargets", "foods", "meals", "mealItems", "entertainmentItems", "playSessions"];

function SoftDeleteTrigger() {
  const { run } = useWorkspace();
  return <button onClick={() => void run(() => api.remove("planItems", "plan-1")).catch(() => undefined)}>移到回收站</button>;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("soft-delete undo toast", () => {
  it("offers undo after soft-delete and restores the record", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.startsWith("/api/state")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              ...Object.fromEntries(collections.map((name) => [name, name === "planItems" ? [{ id: "plan-1", title: "可撤销事项", plan_date: "2026-08-02" }] : []])),
              settings: {},
              trash: [],
            },
          }),
        } as Response;
      }
      if (method === "DELETE" && url.includes("/api/collections/planItems/plan-1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: "plan-1", title: "可撤销事项", plan_date: "2026-08-02", deleted_at: "2026-08-02T12:00:00.000Z" } }),
        } as Response;
      }
      if (method === "POST" && url.includes("/api/collections/planItems/plan-1/restore")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: "plan-1", title: "可撤销事项", plan_date: "2026-08-02", deleted_at: null } }),
        } as Response;
      }
      if (url.startsWith("/api/dashboard") || url.startsWith("/api/system") || url.startsWith("/api/backups") || url.startsWith("/api/search")) {
        return { ok: true, status: 200, json: async () => ({ data: url.startsWith("/api/dashboard") ? { date: "2026-08-02", overview: { completed: 0, total: 0, progress: 0, scheduledMinutes: 0 }, timeline: [], unscheduled: [], attention: [], summaries: {} } : [] }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ data: null }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <WorkspaceProvider>
          <SoftDeleteTrigger />
        </WorkspaceProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "移到回收站" }));
    expect(await screen.findByTestId("undo-toast")).toHaveTextContent("已移到回收站");
    expect(screen.getByTestId("undo-toast")).toHaveTextContent("可撤销事项");

    await userEvent.click(screen.getByRole("button", { name: "撤销" }));
    await waitFor(() => expect(screen.queryByTestId("undo-toast")).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/restore"))).toBe(true);
  });
});
