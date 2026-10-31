export type NutritionDelta = {
  remaining: number | null;
  label: string;
  tone: "ok" | "over" | "under" | "none";
};

/** 相对目标的当日差额：正数为还差，负数为超出。 */
export function nutritionDelta(value: number, target?: number | null): NutritionDelta {
  if (target === null || target === undefined || !Number.isFinite(Number(target))) {
    return { remaining: null, label: "未设目标", tone: "none" };
  }
  const remaining = Number(target) - value;
  if (Math.abs(remaining) < 0.5) return { remaining: 0, label: "刚好达标", tone: "ok" };
  if (remaining > 0) return { remaining, label: `还差 ${Math.round(remaining)}`, tone: "under" };
  return { remaining, label: `超出 ${Math.round(Math.abs(remaining))}`, tone: "over" };
}
