import { isAppearance, type Appearance } from "../shared/schema";

export type { Appearance };

export function normalizeAppearance(value: unknown): Appearance {
  return isAppearance(value) ? value : "liquid";
}
