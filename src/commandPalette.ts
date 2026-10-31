/** 命令面板：动作 / 导航 / 新建 / 搜索结果的统一条目与过滤。 */

export type CommandKind = "action" | "navigate" | "create" | "result";

export type CommandItem = {
  id: string;
  kind: CommandKind;
  label: string;
  detail: string;
  keywords: string[];
  /** 导航类：目标路径；动作类可为空 */
  href?: string;
  /** 动作类：运行时执行 */
  run?: "save-now";
};

export const createCommands: CommandItem[] = [
  { id: "create-today", kind: "create", label: "新建今日事项", detail: "安排今天要执行的事情", keywords: ["新建", "今日", "计划", "事项"], href: "/today?new=1" },
  { id: "create-media", kind: "create", label: "新建内容灵感", detail: "记录一个自媒体选题", keywords: ["新建", "自媒体", "内容", "灵感"], href: "/media?new=1" },
  { id: "create-dev", kind: "create", label: "新建开发工作项", detail: "添加功能、需求或 Bug", keywords: ["新建", "开发", "bug", "工作项"], href: "/development?new=work-item" },
  { id: "create-followup", kind: "create", label: "新建咨询跟进", detail: "安排客户后续联系", keywords: ["新建", "咨询", "跟进", "客户"], href: "/consulting?new=followup" },
  { id: "create-workout", kind: "create", label: "开始或记录训练", detail: "打开健身并准备训练", keywords: ["新建", "健身", "训练"], href: "/fitness?new=workout" },
  { id: "create-meal", kind: "create", label: "新建餐食记录", detail: "记录计划或实际饮食", keywords: ["新建", "饮食", "餐食"], href: "/diet?new=meal" },
  { id: "create-game", kind: "create", label: "新建游戏或活动", detail: "加入娱乐清单", keywords: ["新建", "游戏", "娱乐"], href: "/entertainment?new=1" },
];

export const navigateCommands: CommandItem[] = [
  { id: "nav-home", kind: "navigate", label: "打开首页总览", detail: "今天的行动与关注", keywords: ["首页", "总览", "dashboard"], href: "/" },
  { id: "nav-today", kind: "navigate", label: "打开今日计划", detail: "时间安排与复盘", keywords: ["今日", "计划"], href: "/today" },
  { id: "nav-media", kind: "navigate", label: "打开自媒体", detail: "内容制作流程", keywords: ["自媒体", "内容"], href: "/media" },
  { id: "nav-dev", kind: "navigate", label: "打开开发工作", detail: "项目与工作项", keywords: ["开发", "项目"], href: "/development" },
  { id: "nav-consulting", kind: "navigate", label: "打开咨询工作", detail: "客户与跟进", keywords: ["咨询", "客户"], href: "/consulting" },
  { id: "nav-fitness", kind: "navigate", label: "打开健身计划", detail: "训练与身体数据", keywords: ["健身", "训练"], href: "/fitness" },
  { id: "nav-diet", kind: "navigate", label: "打开饮食计划", detail: "餐食与营养", keywords: ["饮食", "餐食"], href: "/diet" },
  { id: "nav-entertainment", kind: "navigate", label: "打开游戏娱乐", detail: "进度与游玩记录", keywords: ["游戏", "娱乐"], href: "/entertainment" },
  { id: "nav-settings", kind: "navigate", label: "打开数据与设置", detail: "备份、导出与偏好", keywords: ["设置", "备份", "数据"], href: "/settings" },
];

export const actionCommands: CommandItem[] = [
  { id: "action-save", kind: "action", label: "手动保存", detail: "提交草稿并写入本地数据文件", keywords: ["保存", "save", "checkpoint"], run: "save-now" },
];

export const staticCommands: CommandItem[] = [...actionCommands, ...createCommands, ...navigateCommands];

export function matchesCommand(item: CommandItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [item.label, item.detail, ...item.keywords].join(" ").toLowerCase();
  return normalized.split(/\s+/).every((token) => haystack.includes(token));
}

export function filterStaticCommands(query: string): CommandItem[] {
  const normalized = query.trim();
  if (!normalized) {
    // 空查询：动作 + 新建优先，导航放后半段以免占满首屏
    return [...actionCommands, ...createCommands, ...navigateCommands.slice(0, 4)];
  }
  return staticCommands.filter((item) => matchesCommand(item, normalized));
}

export function commandSectionTitle(kind: CommandKind): string {
  switch (kind) {
    case "action":
      return "动作";
    case "create":
      return "新建";
    case "navigate":
      return "前往";
    case "result":
      return "搜索结果";
  }
}
