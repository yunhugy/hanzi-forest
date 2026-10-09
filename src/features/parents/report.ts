/**
 * 「给爸爸妈妈」学习报告 —— 纯计算逻辑
 *
 * 数据只来自 progress store：每个字只保存了 correct / wrong / lastAt，
 * 没有逐次答题的时间线，所以「最近 7 天」的聚合是基于 lastAt（最后一次练习时间）做的。
 */

import type { HanziItem } from '@/features/shizi/quiz';
import type { CharProgress } from '@/store/progress';

/** 观察窗口：最近 7 天（含今天） */
export const WEEK_DAYS = 7;

const DAY_MS = 86400000;
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** 取某个时间戳当天的零点 */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type DayBucket = {
  /** 该日零点时间戳（可作 key） */
  start: number;
  /** 星期几：日 / 一 / 二 … */
  label: string;
  /** 当天练过的字数 */
  count: number;
};

/** 最近 7 天的每日练习分布，按时间正序（最后一项是今天） */
export function weekBuckets(chars: Record<string, CharProgress>, now = Date.now()): DayBucket[] {
  const todayStart = startOfDay(now);
  const buckets: DayBucket[] = [];
  for (let i = WEEK_DAYS - 1; i >= 0; i--) {
    const start = todayStart - i * DAY_MS;
    buckets.push({ start, label: WEEK_LABELS[new Date(start).getDay()], count: 0 });
  }

  const indexByDay = new Map(buckets.map((b, i) => [b.start, i]));
  for (const cp of Object.values(chars)) {
    if (cp.lastAt <= 0) continue;
    const i = indexByDay.get(startOfDay(cp.lastAt));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

export type WeekSummary = {
  /** 这周练过的字数 */
  practiced: number;
  /** 这周答对次数 */
  correct: number;
  /** 这周答错次数 */
  wrong: number;
  /** 这周答对率 0-100 */
  accuracy: number;
  /** 这周有练习的天数 */
  activeDays: number;
};

/** 最近 7 天的整体表现 */
export function weekSummary(chars: Record<string, CharProgress>, now = Date.now()): WeekSummary {
  const since = startOfDay(now) - (WEEK_DAYS - 1) * DAY_MS;

  let practiced = 0;
  let correct = 0;
  let wrong = 0;
  for (const cp of Object.values(chars)) {
    if (cp.lastAt >= since) {
      practiced += 1;
      correct += cp.correct;
      wrong += cp.wrong;
    }
  }

  const total = correct + wrong;
  return {
    practiced,
    correct,
    wrong,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    activeDays: weekBuckets(chars, now).filter((b) => b.count > 0).length,
  };
}

export type WrongChar = {
  char: string;
  pinyin: string;
  wrong: number;
  correct: number;
};

/** 易错字排行：按认错次数降序，取前 limit 个（只保留字库内、认错过至少一次的字） */
export function topWrongChars(
  chars: Record<string, CharProgress>,
  pool: HanziItem[],
  limit = 8,
): WrongChar[] {
  const byChar = new Map(pool.map((h) => [h.char, h]));
  return Object.entries(chars)
    .filter(([, cp]) => cp.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong || b[1].lastAt - a[1].lastAt)
    .map(([char, cp]): WrongChar | null => {
      const h = byChar.get(char);
      return h ? { char, pinyin: h.pinyin, wrong: cp.wrong, correct: cp.correct } : null;
    })
    .filter((x): x is WrongChar => x !== null)
    .slice(0, limit);
}

export type AdviceInput = {
  learnedCount: number;
  practicedCount: number;
  streak: number;
  weekPracticed: number;
  weekActiveDays: number;
  wrongCount: number;
};

/**
 * 根据真实数据生成 2-3 条温和的家长建议。
 * 完全没有练习记录时返回空数组（由页面走空态）。
 */
export function buildAdvice(input: AdviceInput): string[] {
  const { learnedCount, practicedCount, streak, weekPracticed, weekActiveDays, wrongCount } = input;
  if (practicedCount === 0) return [];

  const tips: string[] = [];

  // 1. 这周的节奏反馈
  if (weekPracticed === 0) {
    tips.push('这周还没顾上练字，找个安静的小段时间，陪孩子读 8 个字就很好。');
  } else if (weekActiveDays >= 5) {
    tips.push(`这周有 ${weekActiveDays} 天都在练字，节奏很稳，孩子一定很有成就感。`);
  } else if (weekPracticed < 16) {
    tips.push(`这周练了 ${weekPracticed} 个字，不用着急，每天一点点就是最好的进步。`);
  } else {
    tips.push(`这周练了 ${weekPracticed} 个字，量很足，记得让孩子停下来休息下眼睛。`);
  }

  // 2. 易错字提醒
  if (wrongCount > 0) {
    tips.push(`有 ${wrongCount} 个字容易记混，陪孩子多读两遍、造个小句子，很快就记住了。`);
  } else if (learnedCount >= 20) {
    tips.push('最近认字很稳，几乎没有出错的字，可以放心让孩子试试新的字啦。');
  }

  // 3. 坚持鼓励
  if (streak >= 3) {
    tips.push(`已经连续打卡 ${streak} 天，这份坚持值得好好夸一夸孩子。`);
  }

  // 兜底：保证至少两条，不出现「只有一句话」的干瘪感
  if (tips.length < 2) {
    tips.push('每天几分钟，读一读、玩一玩，字就慢慢住进孩子的记忆里了。');
  }

  return tips.slice(0, 3);
}
