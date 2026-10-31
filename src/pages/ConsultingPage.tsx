import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Users, ChatCenteredText, Package, PhoneCall, Timer, CalendarPlus, Check, CurrencyCircleDollar, Trash } from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { classNames, formatDate, formatDateTime, formatDuration } from "../utils";
import { todayPlanPayload } from "../planLink";
import { Button, ConfirmDialog, DetailPanel, EmptyState, EntityForm, PageHeader, Section } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";
import type { DialogState } from "./pageTypes";
import { ConsultingDialog } from "./consulting/ConsultingDialog";
import { consultingFormConfig } from "./consulting/formConfig";

export function ConsultingPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [clientId, setClientId] = useState<string | null>(data.clients[0]?.id ?? null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [panel, setPanel] = useState<DialogState>(null);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  useEffect(() => { if (!clientId || !data.clients.some((client) => client.id === clientId)) setClientId(data.clients[0]?.id ?? null); }, [clientId, data.clients]);
  const projects = data.consultingProjects.filter((item) => item.client_id === clientId);
  useEffect(() => { if (!projectId || !projects.some((item) => item.id === projectId)) setProjectId(projects[0]?.id ?? null); }, [projectId, projects]);
  useEffect(() => { const value = params.get("new"); if (value) setDialog({ type: value }); }, [params]);
  useEffect(() => {
    const focusId = params.get("focus");
    if (!focusId) return;
    const client = data.clients.find((item) => item.id === focusId);
    if (client) {
      setClientId(client.id);
      setProjectId(null);
      setPanel({ type: "client", item: client });
      setParams({});
      return;
    }
    const project = data.consultingProjects.find((item) => item.id === focusId);
    if (project) {
      setClientId(project.client_id);
      setProjectId(project.id);
      setPanel({ type: "project", item: project });
      setParams({});
      return;
    }
    const deliverable = data.consultingDeliverables.find((item) => item.id === focusId);
    if (deliverable) {
      const parent = data.consultingProjects.find((item) => item.id === deliverable.project_id);
      if (parent) { setClientId(parent.client_id); setProjectId(parent.id); }
      setPanel({ type: "deliverable", item: deliverable });
      setParams({});
      return;
    }
    const followup = data.consultingFollowups.find((item) => item.id === focusId);
    if (followup) {
      const parent = data.consultingProjects.find((item) => item.id === followup.project_id);
      if (parent) { setClientId(parent.client_id); setProjectId(parent.id); }
      setPanel({ type: "followup", item: followup });
      setParams({});
      return;
    }
    const interaction = data.consultingInteractions.find((item) => item.id === focusId);
    if (interaction) {
      const parent = data.consultingProjects.find((item) => item.id === interaction.project_id);
      if (parent) { setClientId(parent.client_id); setProjectId(parent.id); }
      setPanel({ type: "interaction", item: interaction });
      setParams({});
    }
  }, [data.clients, data.consultingDeliverables, data.consultingFollowups, data.consultingInteractions, data.consultingProjects, params, setParams]);
  const closeDialog = () => { setDialog(null); setParams({}); };
  const closePanel = () => setPanel(null);
  const client = data.clients.find((item) => item.id === clientId);
  const project = data.consultingProjects.find((item) => item.id === projectId);
  const interactions = data.consultingInteractions.filter((item) => item.project_id === projectId);
  const deliverables = data.consultingDeliverables.filter((item) => item.project_id === projectId);
  const followups = data.consultingFollowups.filter((item) => item.project_id === projectId);
  const timeEntries = data.consultingTimeEntries.filter((item) => item.project_id === projectId);
  const totalMinutes = timeEntries.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const totalFee = timeEntries.reduce((sum, item) => sum + Number(item.fee_cents || 0), 0) / 100;
  const panelConfig = panel?.item?.id ? consultingFormConfig(panel.type, clientId, project) : null;
  const selectedId = panel?.item?.id;

  return (
    <div>
      <PageHeader icon={<ModuleArtwork module="consulting" />} eyebrow="客户与交付" title="咨询工作" description="围绕客户、项目、沟通、交付和跟进组织咨询过程。" actions={<><Button variant="secondary" onClick={() => setDialog({ type: "client" })}><Users size={17} />添加客户</Button>{clientId ? <Button onClick={() => setDialog({ type: "project" })}><Plus size={17} />新建咨询项目</Button> : null}{client ? <Button variant="ghost" className="danger-text" onClick={() => setDeleteClientOpen(true)}><Trash size={16} />删除客户</Button> : null}</>} />
      {data.clients.length === 0 ? <EmptyState title="还没有客户记录" description="添加客户后，再创建咨询项目和跟进。" hint="客户名即可，项目与跟进下一步再加" action={<Button onClick={() => setDialog({ type: "client" })}>添加第一个客户</Button>} /> : <div className={classNames("consult-layout", panelConfig && "has-detail")}>
        <aside className="client-column"><span className="rail-label">客户</span>{data.clients.map((entry) => <button className={entry.id === clientId ? "active" : ""} key={entry.id} onClick={() => { setClientId(entry.id); setProjectId(null); setPanel(null); }}><div className="client-avatar">{entry.name.slice(0, 1)}</div><div><strong>{entry.name}</strong><small>{data.consultingProjects.filter((item) => item.client_id === entry.id && item.status === "active").length} 个进行中项目</small></div></button>)}</aside>
        <div className="consult-main">
          <div className="project-tabs">{projects.map((item) => <button key={item.id} className={item.id === projectId ? "active" : ""} onClick={() => { setProjectId(item.id); setPanel(null); }}>{item.name}</button>)}{projects.length === 0 ? <span>该客户还没有项目</span> : null}</div>
          {project ? <>
            <div className="detail-hero"><div><span className="eyebrow">咨询项目</span><h2>{project.name}</h2><p>{project.current_need || "尚未记录当前需求。"}</p></div><div className="consult-stats"><div><Timer size={18} /><strong>{formatDuration(totalMinutes)}</strong><small>累计咨询</small></div><div><CurrencyCircleDollar size={18} /><strong>¥{totalFee.toFixed(2)}</strong><small>记录费用</small></div><Button variant="ghost" size="sm" onClick={() => setPanel({ type: "project", item: project })}>编辑项目</Button></div></div>
            <div className="consult-action-strip"><Button variant="secondary" size="sm" onClick={() => setDialog({ type: "interaction" })}><ChatCenteredText size={15} />记录沟通</Button><Button variant="secondary" size="sm" onClick={() => setDialog({ type: "deliverable" })}><Package size={15} />添加交付</Button><Button variant="secondary" size="sm" onClick={() => setDialog({ type: "followup" })}><PhoneCall size={15} />安排跟进</Button><Button variant="secondary" size="sm" onClick={() => setDialog({ type: "time" })}><Timer size={15} />记录时长</Button></div>
            <div className="consult-grid">
              <Section title="交付物" description="明确截止日期和交付状态">
                {deliverables.length ? <div className="check-list">{deliverables.map((item) => <article key={item.id} className={classNames(selectedId === item.id && "is-selected")}><button className="complete-control" disabled={item.status === "done"} onClick={() => void run(() => api.update("consultingDeliverables", item.id, { status: "done" }))}>{item.status === "done" ? <Check size={14} /> : null}</button><button type="button" className="check-list-open" onClick={() => setPanel({ type: "deliverable", item })}><strong>{item.name}</strong><small>{item.due_date ? `截止 ${formatDate(item.due_date)}` : "没有截止日期"}</small></button><button className="icon-button" title="加入今日计划" onClick={() => void run(() => api.create("planItems", todayPlanPayload({ title: item.name, sourceModule: "consulting", sourceEntityType: "consulting_deliverable", sourceEntityId: item.id, priority: "high" })))}><CalendarPlus size={17} /></button></article>)}</div> : <p className="quiet-line">暂无交付物。</p>}
              </Section>
              <Section title="待跟进" description="到了日期会出现在首页提醒中">
                {followups.length ? <div className="check-list">{followups.map((item) => <article key={item.id} className={classNames(selectedId === item.id && "is-selected")}><button className="complete-control" disabled={item.status === "done"} onClick={() => void run(() => api.update("consultingFollowups", item.id, { status: "done", completed_at: new Date().toISOString() }))}>{item.status === "done" ? <Check size={14} /> : null}</button><button type="button" className="check-list-open" onClick={() => setPanel({ type: "followup", item })}><strong>{item.content}</strong><small>{formatDateTime(item.followup_at)}</small></button><button className="icon-button" title="加入今日计划" onClick={() => void run(() => api.create("planItems", todayPlanPayload({ title: item.content, sourceModule: "consulting", sourceEntityType: "consulting_followup", sourceEntityId: item.id })))}><CalendarPlus size={17} /></button></article>)}</div> : <p className="quiet-line">暂无跟进安排。</p>}
              </Section>
            </div>
            <Section title="沟通记录" description="会议、电话和重要消息按时间连续保存">
              {interactions.length ? <div className="interaction-timeline">{interactions.map((item) => <article key={item.id} className={classNames(selectedId === item.id && "is-selected")}><span /><button type="button" className="interaction-open" onClick={() => setPanel({ type: "interaction", item })}><time>{formatDateTime(item.occurred_at)}</time><strong>{item.interaction_type === "meeting" ? "会议" : item.interaction_type === "call" ? "电话" : "消息"}</strong><p>{item.notes || "没有补充记录"}</p></button></article>)}</div> : <p className="quiet-line">暂无沟通记录。</p>}
            </Section>
          </> : <EmptyState title="选择或创建一个咨询项目" description="项目详情会显示在这里。" hint="点上方「新建咨询项目」即可开始" action={clientId ? <Button variant="secondary" size="sm" onClick={() => setDialog({ type: "project" })}>新建咨询项目</Button> : undefined} />}
        </div>
        {panelConfig && panel?.item?.id ? (
          <DetailPanel open title={panelConfig.editTitle ?? panelConfig.title} description="边看边改，保存后立即更新列表。" onClose={closePanel}>
            <EntityForm
              key={panel.item.id}
              fields={panelConfig.fields}
              initial={{ ...panelConfig.defaults, ...panel.item }}
              onCancel={closePanel}
              onSubmit={async (values) => {
                await run(() => api.update(panelConfig.collection, String(panel.item!.id), { ...panelConfig.defaults, ...values }));
                closePanel();
              }}
            />
          </DetailPanel>
        ) : null}
      </div>}
      <ConsultingDialog dialog={dialog} close={closeDialog} clientId={clientId} project={project} run={run} />
      <ConfirmDialog open={deleteClientOpen} title="将客户移到回收站？" description={`“${client?.name ?? "当前客户"}”会从咨询页面隐藏；相关项目、沟通和交付记录会保留，恢复客户后可继续访问。`} confirmLabel="移到回收站" danger onClose={() => setDeleteClientOpen(false)} onConfirm={async () => { if (client) await run(() => api.remove("clients", client.id)); }} />
    </div>
  );
}
