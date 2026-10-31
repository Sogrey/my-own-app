/** 集合 → 模块路由；搜索与 deep-link 共用。 */
export const collectionRoutes: Record<string, string> = {
  planItems: "/today",
  mediaContents: "/media",
  devProjects: "/development",
  devMilestones: "/development",
  devWorkItems: "/development",
  devLogs: "/development",
  clients: "/consulting",
  consultingProjects: "/consulting",
  consultingInteractions: "/consulting",
  consultingDeliverables: "/consulting",
  consultingFollowups: "/consulting",
  consultingTimeEntries: "/consulting",
  workoutTemplates: "/fitness",
  workouts: "/fitness",
  bodyMetrics: "/fitness",
  nutritionTargets: "/diet",
  foods: "/diet",
  meals: "/diet",
  mealItems: "/diet",
  entertainmentItems: "/entertainment",
  playSessions: "/entertainment",
  quickMemos: "/",
};

export const sourceModuleRoutes: Record<string, string> = {
  media: "/media",
  development: "/development",
  consulting: "/consulting",
  fitness: "/fitness",
  diet: "/diet",
  entertainment: "/entertainment",
  today: "/today",
};

export const sourceModuleLabels: Record<string, string> = {
  media: "自媒体",
  development: "开发工作",
  consulting: "咨询工作",
  fitness: "健身计划",
  diet: "饮食计划",
  entertainment: "游戏娱乐",
  today: "今日计划",
};

export function withFocus(route: string, id: string): string {
  if (!id) return route;
  const join = route.includes("?") ? "&" : "?";
  return `${route}${join}focus=${encodeURIComponent(id)}`;
}

export function collectionFocusPath(collection: string, id: string): string {
  return withFocus(collectionRoutes[collection] ?? "/", id);
}

export function sourceFocusPath(sourceModule: string | null | undefined, sourceEntityId: string | null | undefined): string {
  if (!sourceModule) return "/";
  const route = sourceModuleRoutes[sourceModule] ?? "/";
  return sourceEntityId ? withFocus(route, sourceEntityId) : route;
}

export function moduleFocusPath(module: string, id: string): string {
  if (module === "today") return withFocus("/today", id);
  const route = sourceModuleRoutes[module] ?? `/${module}`;
  return withFocus(route, id);
}
