/**
 * 复习调度 —— 简化版间隔重复（spaced repetition）。
 *
 * 每个字答完就排下一次复习时间：连对次数越多，间隔拉得越长；
 * 答错则清零重来（明天回炉）。目标是把「快忘的字」及时捞回来，
 * 而不是让孩子一遍遍刷已经滚瓜烂熟的字。
 */

import type { CharProgress } from '@/store/progress';

export const DAY_MS = 86400000;

/** 间隔阶梯（天）：索引 = 连对次数，超出取最后一档 */
export const REVIEW_INTERVALS = [1, 1, 3, 7, 14, 30] as const;

/** 取某个时间戳当天的零点 */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 连对 n 次后，下次该隔几天再复习 */
export function intervalDaysFor(streakCorrect: number): number {
  const i = Math.min(Math.max(streakCorrect, 0), REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[i];
}

/**
 * 一次答题之后，这个字下次该什么时候复习。
 *
 * @param correct       这次答对了吗
 * @param streakCorrect 本次答题「之后」的连对次数（答对 = 之前 +1，答错 = 0）
 */
export function nextReviewAtFor(
  correct: boolean,
  streakCorrect: number,
  now = Date.now(),
): number {
  if (!correct) return startOfDay(now + DAY_MS); // 答错 → 明天回炉
  return startOfDay(now + intervalDaysFor(streakCorrect) * DAY_MS);
}

/**
 * 今天到期的复习字，按「错得多 → 久没练」排序。
 *
 * 兼容旧存档：没有 nextReviewAt 字段的字（早期版本练过的）视为今天到期，
 * 这样老用户升级后也能立刻用上复习功能，不用等新数据攒出来。
 */
export function dueChars(chars: Record<string, CharProgress>, now = Date.now()): string[] {
  const todayStart = startOfDay(now);
  return Object.entries(chars)
    .filter(([, cp]) => (cp.nextReviewAt ?? 0) <= todayStart)
    .sort(
      (a, b) => b[1].wrong - a[1].wrong || (a[1].lastAt || 0) - (b[1].lastAt || 0),
    )
    .map(([char]) => char);
}
