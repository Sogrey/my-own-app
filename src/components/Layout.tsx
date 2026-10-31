import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MagnifyingGlass, Plus, FloppyDisk, CheckCircle, WarningCircle, SidebarSimple,
  ArrowRight, Command,
} from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { formatDateTime, classNames } from "../utils";
import { normalizeAppearance } from "../appearance";
import { Badge, Button, ErrorState, IconButton, Modal, Skeleton } from "./ui";
import { AmbientEnvironment, chooseAmbientScene } from "./AmbientEnvironment";
import { ModuleArtwork, type ModuleArtworkName } from "./ModuleArtwork";
import { CommandPalette } from "./CommandPalette";
import { createCommands } from "../commandPalette";

const groups = [
  { label: "日常", links: [
    { to: "/", label: "首页总览", module: "dashboard", tone: "sky" },
    { to: "/today", label: "今日计划", module: "today", tone: "cyan" },
  ] },
  { label: "工作", links: [
    { to: "/media", label: "自媒体", module: "media", tone: "coral" },
    { to: "/development", label: "开发工作", module: "development", tone: "teal" },
    { to: "/consulting", label: "咨询工作", module: "consulting", tone: "amber" },
  ] },
  { label: "生活", links: [
    { to: "/fitness", label: "健身计划", module: "fitness", tone: "sage" },
    { to: "/diet", label: "饮食计划", module: "diet", tone: "apricot" },
    { to: "/entertainment", label: "游戏娱乐", module: "entertainment", tone: "indigo" },
  ] },
  { label: "系统", links: [{ to: "/settings", label: "数据与设置", module: "settings", tone: "graphite" }] },
] satisfies Array<{ label: string; links: Array<{ to: string; label: string; module: ModuleArtworkName; tone: string }> }>;

const routeMeta: Record<string, { label: string; module: ModuleArtworkName; tone: string; index: string }> = {
  "/": { label: "首页总览", module: "dashboard", tone: "sky", index: "00" },
  "/today": { label: "今日计划", module: "today", tone: "cyan", index: "01" },
  "/media": { label: "自媒体", module: "media", tone: "coral", index: "02" },
  "/development": { label: "开发工作", module: "development", tone: "teal", index: "03" },
  "/consulting": { label: "咨询工作", module: "consulting", tone: "amber", index: "04" },
  "/fitness": { label: "健身计划", module: "fitness", tone: "sage", index: "05" },
  "/diet": { label: "饮食计划", module: "diet", tone: "apricot", index: "06" },
  "/entertainment": { label: "游戏娱乐", module: "entertainment", tone: "indigo", index: "07" },
  "/settings": { label: "数据与设置", module: "settings", tone: "graphite", index: "08" },
};

export function AppLayout() {
  const { data, saveNow, saveStatus, loading, error, refresh } = useWorkspace();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const system = useQuery({ queryKey: ["system"], queryFn: api.systemStatus, staleTime: 30_000, enabled: !error });
  const currentPage = routeMeta[location.pathname] ?? routeMeta["/"];
  const appearance = normalizeAppearance(data.settings.appearance);
  const theme = data.settings.theme === "dark" ? "dark" : "light";
  const ambientScene = chooseAmbientScene(currentPage.module, theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appearance = appearance;
  }, [appearance, theme]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // 环境层视差：滚动时让背景以极低速率位移，玻璃背后才有东西可折射。
  // 只写一个 CSS 变量并由合成层处理，不触发 React 重渲染。
  useEffect(() => {
    const root = document.documentElement;
    if (appearance !== "liquid") {
      root.style.removeProperty("--ambient-shift");
      return;
    }
    // 视差是纯增强。任何一个依赖的浏览器 API 缺席都必须静默降级，
    // 绝不能让整个应用外壳挂掉。
    if (typeof window.requestAnimationFrame !== "function") return;
    const motion = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    let frame = 0;
    const apply = () => {
      frame = 0;
      // 夹在 ±110px：环境层只向外扩了 14%，位移超过这个量长页面底部会露边。
      root.style.setProperty("--ambient-shift", String(Math.max(-110, Math.min(0, Math.round(window.scrollY * -0.04)))));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    const sync = () => {
      window.removeEventListener("scroll", onScroll);
      if (motion?.matches) { root.style.setProperty("--ambient-shift", "0"); return; }
      window.addEventListener("scroll", onScroll, { passive: true });
      apply();
    };
    sync();
    motion?.addEventListener("change", sync);
    return () => {
      motion?.removeEventListener("change", sync);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--ambient-shift");
    };
  }, [appearance]);

  return (
    <div
      className={classNames("app-shell", appearance === "neo" && "neo-shell", collapsed && "sidebar-collapsed")}
      data-appearance={appearance}
      data-module={currentPage.module}
      data-ambient={ambientScene}
    >
      {appearance === "liquid" ? <AmbientEnvironment scene={ambientScene} /> : appearance === "notebook" ? <NotebookEnvironment /> : null}
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <aside className="sidebar glass-regular">
        <div className="brand"><div className="brand-mark" aria-hidden="true"><img src={appearance === "neo" ? "/assets/neo/muzi-app-icon-brand.png" : "/assets/brand/muzi-mark.svg"} alt="" draggable={false} /></div><div className="brand-copy"><strong>木子工作台</strong><span>本地个人空间</span></div>{appearance === "neo" ? <span className="brand-edition">NEO / PERSONAL CONTROL DESK</span> : null}</div>
        <Button className="quick-create" onClick={() => setQuickOpen(true)}><Plus size={18} />快速新增</Button>
        <nav aria-label="主导航">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.links.map(({ to, label, module, tone }) => (
                <NavLink key={to} to={to} end={to === "/"} data-tone={tone} className={({ isActive }) => classNames("nav-link", isActive && "active")} title={label}>
                  {appearance === "neo" ? <NeoModuleEmblem module={module} /> : <ModuleArtwork module={module} />}<span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={classNames("local-state", system.data?.backupStatus?.state === "error" && "backup-error")}><span className="status-dot" /><div><strong>{system.data?.backupStatus?.state === "error" ? "自动备份失败" : "仅保存在这台电脑"}</strong><small>{system.data?.backupStatus?.state === "error" ? system.data.backupStatus.lastError : system.data?.latestBackup ? `备份于 ${formatDateTime(system.data.latestBackup.createdAt)}` : "等待首次备份"}</small></div></div>
        </div>
      </aside>
      <div className="app-main">
        <div className="topbar-slot">
          <header className="topbar glass-clear">
            <div className="topbar-left">
              <IconButton label={collapsed ? "展开导航" : "收起导航"} onClick={() => setCollapsed((value) => !value)}><SidebarSimple size={20} /></IconButton>
              <span className="toolbar-page-icon" data-tone={currentPage.tone} aria-hidden="true"><ModuleArtwork module={currentPage.module} /></span>
              <div className="toolbar-context"><strong>{currentPage.label}</strong><span>{new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</span></div>
              {appearance === "neo" ? <span className="topbar-index">{currentPage.index} / 08</span> : null}
            </div>
            <div className="topbar-actions">
              <button className="search-trigger glass-clear" aria-label="搜索与命令" title="搜索与命令" onClick={() => setCommandOpen(true)}><MagnifyingGlass size={18} /><span>搜索与命令</span><kbd><Command size={12} />K</kbd></button>
              <Button className="topbar-create" variant="secondary" size="sm" title="快速新建" aria-label="快速新建" onClick={() => setQuickOpen(true)}><Plus size={16} /><span className="label">快速新建</span></Button>
              <Button className="manual-save" variant="secondary" size="sm" title="手动保存" aria-label="手动保存" loading={saveStatus === "saving"} onClick={() => void saveNow().catch(() => undefined)}><FloppyDisk size={16} /><span className="label">手动保存</span></Button>
              <SaveIndicator status={saveStatus} />
            </div>
          </header>
        </div>
        <main className="page-container" id="main-content" tabIndex={-1}>
          {loading ? <Skeleton lines={8} /> : error ? (
            <ErrorState message={error} onRetry={() => void refresh().catch(() => undefined)} />
          ) : <Outlet />}
        </main>
      </div>
      {!error ? <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} /> : null}
      {!error ? <QuickCreateModal open={quickOpen} onClose={() => setQuickOpen(false)} /> : null}
    </div>
  );
}

function NeoModuleEmblem({ module }: { module: ModuleArtworkName }) {
  return <span className="neo-nav-emblem" data-module={module} aria-hidden="true" />;
}

function NotebookEnvironment() {
  return <div className="notebook-environment" aria-hidden="true" />;
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  const values = {
    idle: { icon: FloppyDisk, label: "自动保存" },
    saving: { icon: FloppyDisk, label: "保存中" },
    saved: { icon: CheckCircle, label: "已保存" },
    error: { icon: WarningCircle, label: "保存失败" },
  } as const;
  const value = values[status];
  const Icon = value.icon;
  return <div className={`save-indicator save-${status}`} role="status"><Icon size={16} /><span>{value.label}</span></div>;
}

function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const tones: Record<string, string> = {
    "create-today": "cyan",
    "create-media": "coral",
    "create-dev": "teal",
    "create-followup": "amber",
    "create-workout": "sage",
    "create-meal": "apricot",
    "create-game": "indigo",
  };
  const modules: Record<string, ModuleArtworkName> = {
    "create-today": "today",
    "create-media": "media",
    "create-dev": "development",
    "create-followup": "consulting",
    "create-workout": "fitness",
    "create-meal": "diet",
    "create-game": "entertainment",
  };
  return (
    <Modal open={open} title="快速新增" description="选择要记录的内容类型" onClose={onClose}>
      <div className="quick-grid">
        {createCommands.map((option) => (
          <button
            data-tone={tones[option.id] ?? "cyan"}
            key={option.id}
            type="button"
            onClick={() => {
              if (option.href) navigate(option.href);
              onClose();
            }}
          >
            <span className="quick-option-icon"><ModuleArtwork module={modules[option.id] ?? "dashboard"} /></span>
            <div><Badge>{option.label.replace(/^新建/, "")}</Badge><p>{option.detail}</p></div>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
