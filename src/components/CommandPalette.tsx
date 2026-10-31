import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { collectionFocusPath } from "../moduleRoutes";
import {
  commandSectionTitle,
  filterStaticCommands,
  type CommandItem,
  type CommandKind,
} from "../commandPalette";
import { ErrorState, Modal, Skeleton } from "./ui";

type PaletteRow =
  | { type: "command"; item: CommandItem }
  | { type: "result"; id: string; label: string; module: string; collection: string; entityId: string };

const moduleNames: Record<string, string> = {
  dashboard: "首页",
  today: "今日计划",
  media: "自媒体",
  development: "开发工作",
  consulting: "咨询工作",
  fitness: "健身计划",
  diet: "饮食计划",
  entertainment: "游戏娱乐",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { saveNow } = useWorkspace();
  const trimmed = query.trim();
  const search = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => api.search(trimmed),
    enabled: open && trimmed.length > 0,
  });

  const commands = useMemo(() => filterStaticCommands(query), [query]);
  const rows = useMemo<PaletteRow[]>(() => {
    const list: PaletteRow[] = commands.map((item) => ({ type: "command", item }));
    if (trimmed && search.data?.length) {
      for (const hit of search.data) {
        list.push({
          type: "result",
          id: `result-${hit.collection}-${hit.id}`,
          label: String(hit.title || "未命名记录"),
          module: String(hit.module || ""),
          collection: String(hit.collection),
          entityId: String(hit.id),
        });
      }
    }
    return list;
  }, [commands, search.data, trimmed]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, search.data]);

  const runRow = async (row: PaletteRow) => {
    if (row.type === "result") {
      navigate(collectionFocusPath(row.collection, row.entityId));
      onClose();
      return;
    }
    const item = row.item;
    if (item.run === "save-now") {
      onClose();
      await saveNow().catch(() => undefined);
      return;
    }
    if (item.href) {
      navigate(item.href);
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (!rows.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((value) => (value + 1) % rows.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((value) => (value - 1 + rows.length) % rows.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const row = rows[activeIndex];
        if (row) void runRow(row);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeIndex, open, rows]);

  const grouped = useMemo(() => {
    const sections: Array<{ kind: CommandKind | "result"; title: string; rows: Array<{ row: PaletteRow; index: number }> }> = [];
    const push = (kind: CommandKind | "result", row: PaletteRow, index: number) => {
      const last = sections.at(-1);
      if (last && last.kind === kind) last.rows.push({ row, index });
      else sections.push({ kind, title: kind === "result" ? "搜索结果" : commandSectionTitle(kind), rows: [{ row, index }] });
    };
    rows.forEach((row, index) => {
      if (row.type === "result") push("result", row, index);
      else push(row.item.kind, row, index);
    });
    return sections;
  }, [rows]);

  return (
    <Modal open={open} title="命令面板" description="搜索记录，或直接执行新建、保存与跳转" onClose={onClose} wide>
      <div className="command-search glass-clear">
        <MagnifyingGlass size={20} />
        <input
          autoFocus
          aria-label="命令或搜索关键词"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入命令或关键词…"
        />
      </div>
      <div className="search-results command-palette-results" role="listbox" aria-label="命令与搜索结果">
        {!trimmed && !rows.length ? <div className="search-hint">输入关键词搜索，或选择下方动作。</div> : null}
        {trimmed && search.isLoading ? <Skeleton lines={4} /> : null}
        {trimmed && search.error ? <ErrorState message={(search.error as Error).message} /> : null}
        {trimmed && !search.isLoading && !search.error && commands.length === 0 && (search.data?.length ?? 0) === 0 ? (
          <div className="search-hint">没有匹配的命令或记录。</div>
        ) : null}
        {grouped.map((section) => (
          <section className="search-group" key={section.title}>
            <h3>{section.title}</h3>
            {section.rows.map(({ row, index }) => {
              const active = index === activeIndex;
              const label = row.type === "result" ? row.label : row.item.label;
              const detail = row.type === "result"
                ? (moduleNames[row.module] ?? row.module)
                : row.item.detail;
              return (
                <button
                  key={row.type === "result" ? row.id : row.item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? "is-active" : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void runRow(row)}
                >
                  <span className="command-row-copy">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </Modal>
  );
}
