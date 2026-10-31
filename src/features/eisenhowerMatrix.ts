/** 艾森豪威尔矩阵：重×急 → 四象限。 */

export type MatrixQuadrant = "do" | "schedule" | "delegate" | "park";

export const MATRIX_QUADRANTS: MatrixQuadrant[] = ["do", "schedule", "delegate", "park"];

export const matrixQuadrantMeta: Record<MatrixQuadrant, {
  title: string;
  hint: string;
  /** CSS 网格位置：与「上急下缓、左轻右重」对齐 */
  area: "do" | "schedule" | "delegate" | "park";
}> = {
  do: { title: "重要且紧急", hint: "立刻做", area: "do" },
  schedule: { title: "重要不紧急", hint: "排进计划", area: "schedule" },
  delegate: { title: "紧急不重要", hint: "尽快处理或委托", area: "delegate" },
  park: { title: "不重要不紧急", hint: "可延后或删减", area: "park" },
};

export function isMatrixQuadrant(value: unknown): value is MatrixQuadrant {
  return value === "do" || value === "schedule" || value === "delegate" || value === "park";
}

/** 未手选象限时，用既有 priority 给出合理默认。 */
export function quadrantFromPriority(priority: unknown): MatrixQuadrant {
  if (priority === "high") return "do";
  if (priority === "low") return "park";
  return "schedule";
}

export function resolveMatrixQuadrant(item: {
  matrix_quadrant?: string | null;
  priority?: string | null;
}): MatrixQuadrant {
  if (isMatrixQuadrant(item.matrix_quadrant)) return item.matrix_quadrant;
  return quadrantFromPriority(item.priority);
}

export type MatrixBucket = {
  quadrant: MatrixQuadrant;
  title: string;
  hint: string;
  items: Array<Record<string, any>>;
};

/** 将今日未完成事项按四象限分组（不含已完成 / 已取消）。 */
export function buildEisenhowerMatrix(
  planItems: Array<Record<string, any>>,
  date: string,
): MatrixBucket[] {
  const open = planItems.filter(
    (item) => item.plan_date === date && !["done", "cancelled"].includes(String(item.status)),
  );
  const buckets = Object.fromEntries(
    MATRIX_QUADRANTS.map((quadrant) => [quadrant, [] as Array<Record<string, any>>]),
  ) as Record<MatrixQuadrant, Array<Record<string, any>>>;

  for (const item of open) {
    buckets[resolveMatrixQuadrant(item)].push(item);
  }

  for (const quadrant of MATRIX_QUADRANTS) {
    buckets[quadrant].sort((a, b) =>
      `${a.start_time || "99:99"}${a.title || ""}`.localeCompare(`${b.start_time || "99:99"}${b.title || ""}`),
    );
  }

  return MATRIX_QUADRANTS.map((quadrant) => ({
    quadrant,
    title: matrixQuadrantMeta[quadrant].title,
    hint: matrixQuadrantMeta[quadrant].hint,
    items: buckets[quadrant],
  }));
}

export function matrixOpenCount(buckets: MatrixBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.items.length, 0);
}
