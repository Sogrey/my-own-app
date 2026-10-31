/** 首页是否提示写日终复盘：有事项且接近完成，或已到傍晚且尚未写。 */
export function shouldPromptDailyReview(input: {
  progress: number;
  total: number;
  hasReview: boolean;
  hour: number;
}): boolean {
  if (input.hasReview || input.total <= 0) return false;
  if (input.progress >= 70) return true;
  return input.hour >= 17;
}
