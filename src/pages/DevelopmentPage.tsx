import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, FolderOpen, GitBranch, Flag, Notebook } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { formatDate, classNames } from "../utils";
import { todayPlanPayload } from "../planLink";
import { Badge, Button, DetailPanel, EmptyState, EntityForm, Modal, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import type { DialogState } from "./pageTypes";
import { developmentFormConfig } from "./development/formConfig";
import { WorkItemRow } from "./development/WorkItemRow";

export function DevelopmentPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [projectId, setProjectId] = useState<string | null>(data.devProjects[0]?.id ?? null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [panel, setPanel] = useState<DialogState>(null);
  const [filter, setFilter] = useState("open");
  useEffect(() => { if (!projectId && data.devProjects[0]) setProjectId(data.devProjects[0].id); }, [data.devProjects, projectId]);
  useEffect(() => { const value = params.get("new"); if (value) setDialog({ type: value === "work-item" ? "work" : "project" }); }, [params]);
  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const work = data.devWorkItems.find((item) => item.id === focusId);
    if (work) {
      setProjectId(work.project_id);
      setFilter("all");
      setPanel({ type: "work", item: work });
      setParams({});
      return;
    }
    const milestone = data.devMilestones.find((item) => item.id === focusId);
    if (milestone) {
      setProjectId(milestone.project_id);
      setPanel({ type: "milestone", item: milestone });
      setParams({});
      return;
    }
    const project = data.devProjects.find((item) => item.id === focusId);
    if (project) {
      setProjectId(project.id);
      setPanel({ type: "project", item: project });
      setParams({});
      return;
    }
    const log = data.devLogs.find((item) => item.id === focusId);
    if (log) {
      setProjectId(log.project_id);
      setPanel({ type: "log", item: log });
      setParams({});
    }
  }, [data.devLogs, data.devMilestones, data.devProjects, data.devWorkItems, params, setParams]);
  const closeDialog = () => { setDialog(null); setParams({}); };
  const closePanel = () => setPanel(null);
  const project = data.devProjects.find((item) => item.id === projectId);
  const milestones = data.devMilestones.filter((item) => item.project_id === projectId);
  const workItems = useMemo(() => data.devWorkItems.filter((item) => item.project_id === projectId && (filter === "all" || (filter === "open" ? item.status !== "done" : item.item_type === filter))), [data.devWorkItems, filter, projectId]);
  const logs = data.devLogs.filter((item) => item.project_id === projectId);
  const panelConfig = panel?.item?.id ? developmentFormConfig(panel.type, project, milestones) : null;
  const createConfig = dialog && !dialog.item?.id ? developmentFormConfig(dialog.type, project, milestones) : null;
  const selectedId = panel?.item?.id;

  return (
    <div>
      <PageHeader icon={<ModuleArtwork module="development" />} eyebrow="项目与技术记录" title="开发工作" description="项目、里程碑、功能、Bug 和开发日志各归其位。" actions={<><Button variant="secondary" onClick={() => setDialog({ type: "project" })}><Plus size={17} />新建项目</Button>{project ? <Button onClick={() => setDialog({ type: "work" })}><Plus size={17} />添加工作项</Button> : null}</>} />
      {data.devProjects.length === 0 ? <EmptyState title="还没有开发项目" description="建立项目后再添加里程碑、工作项和日志。" hint="先建项目，工作项可以马上补" action={<Button onClick={() => setDialog({ type: "project" })}>建立第一个项目</Button>} /> : <div className={classNames("workspace-split", panelConfig && "has-detail")}>
        <aside className="project-rail"><span className="rail-label">项目</span>{data.devProjects.map((item) => <button key={item.id} className={projectId === item.id ? "active" : ""} onClick={() => { setProjectId(item.id); setPanel(null); }}><div><strong>{item.name}</strong><small>{item.description || "没有项目说明"}</small></div><Badge tone={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "进行中" : item.status === "completed" ? "已完成" : "暂停"}</Badge></button>)}</aside>
        <div className="workspace-detail">
          {project ? <>
            <div className="detail-hero"><div><span className="eyebrow">当前项目</span><h2>{project.name}</h2><p>{project.description || "尚未填写项目说明。"}</p></div><div className="detail-actions">{project.local_path ? <Button variant="secondary" size="sm" onClick={() => void api.openPath(project.local_path)}><FolderOpen size={16} />打开目录</Button> : null}{project.repository_url ? <a className="button button-secondary button-sm" href={project.repository_url} target="_blank" rel="noreferrer"><GitBranch size={16} />代码仓库</a> : null}<Button variant="ghost" size="sm" onClick={() => setPanel({ type: "project", item: project })}>编辑</Button></div></div>
            <Section title="里程碑" description="用目标日期判断项目节奏" action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "milestone" })}><Plus size={15} />添加</Button>}>
              {milestones.length ? <div className="milestone-row">{milestones.map((item) => <button key={item.id} className={classNames(selectedId === item.id && "is-selected")} onClick={() => setPanel({ type: "milestone", item })}><Flag size={18} /><div><strong>{item.name}</strong><small>{item.target_date ? formatDate(item.target_date) : "未设置目标日期"}</small></div><Badge tone={item.status === "done" ? "success" : "neutral"}>{item.status === "done" ? "完成" : "进行中"}</Badge></button>)}</div> : <p className="quiet-line">这个项目还没有里程碑。</p>}
            </Section>
            <Section title="工作项" description="功能、需求、Bug 与技术问题" action={<div className="work-section-actions"><div className="compact-filter"><button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>未完成</button><button className={filter === "bug" ? "active" : ""} onClick={() => setFilter("bug")}>Bug</button><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部</button></div><Button size="sm" onClick={() => setDialog({ type: "work" })}><Plus size={15} />添加工作项</Button></div>}>
              {workItems.length ? (
                <div className="work-list">
                  {workItems.map((item) => (
                    <WorkItemRow
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      milestone={milestones.find((value) => value.id === item.milestone_id)}
                      onEdit={() => setPanel({ type: "work", item })}
                      onDone={() => void run(() => api.update("devWorkItems", item.id, { status: "done" }))}
                      onPlan={() => void run(() => api.create("planItems", todayPlanPayload({
                        title: item.title,
                        sourceModule: "development",
                        sourceEntityType: "dev_work_item",
                        sourceEntityId: item.id,
                        priority: item.priority === "high" || item.priority === "low" ? item.priority : "medium",
                      })))}
                      onDelete={() => void run(() => api.remove("devWorkItems", item.id))}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="当前筛选没有工作项" description="添加一个功能、需求、Bug 或技术问题。" action={<Button variant="secondary" size="sm" onClick={() => setDialog({ type: "work" })}>添加第一个工作项</Button>} />
              )}
            </Section>
            <Section title="开发日志" description="按日期连续记录技术决策和进展" action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "log" })}><Notebook size={15} />写日志</Button>}>
              {logs.length ? <div className="log-list">{logs.slice(0, 8).map((item) => <article key={item.id} className={classNames(selectedId === item.id && "is-selected")}><button type="button" className="log-open" onClick={() => setPanel({ type: "log", item })}><time>{formatDate(item.log_date)}</time><p>{item.content}</p></button></article>)}</div> : <p className="quiet-line">暂无开发日志。</p>}
            </Section>
          </> : null}
        </div>
        {panelConfig && panel?.item?.id ? (
          <DetailPanel open title={panelConfig.editTitle ?? panelConfig.title} description="边看边改，保存后立即更新当前项目。" onClose={closePanel}>
            <EntityForm
              key={panel.item.id}
              fields={panelConfig.fields}
              initial={{ ...panelConfig.defaults, ...panel.item }}
              onCancel={closePanel}
              onSubmit={async (values) => {
                const payload = { ...panelConfig.defaults, ...values };
                if (panel.type === "work" && !payload.milestone_id) payload.milestone_id = null;
                await run(() => api.update(panelConfig.collection, String(panel.item!.id), payload));
                closePanel();
              }}
            />
          </DetailPanel>
        ) : null}
      </div>}
      {createConfig && dialog ? (
        <Modal open title={createConfig.title} description="保存后会立即更新当前项目。" onClose={closeDialog}>
          <EntityForm
            fields={createConfig.fields}
            initial={{ ...createConfig.defaults }}
            onCancel={closeDialog}
            onSubmit={async (values) => {
              const payload = { ...createConfig.defaults, ...values };
              if (dialog.type === "work" && !payload.milestone_id) payload.milestone_id = null;
              await run(() => api.create(createConfig.collection, payload));
              closeDialog();
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
