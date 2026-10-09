import hanzi600 from '@/data/hanzi600.json';
import hanziPictured from '@/data/hanzi-pictured.json';

export type HanziItem = {
  id: number;
  char: string;
  pinyin: string;
  /** 1=初识汉字 2=进阶练习 3=继续探索 0=不在主字库内（仅看图识字用） */
  tier: number;
};

/**
 * 主字库：人教版（统编版）小学语文一年级识字表 2024 新版。
 * 上册 293 字 + 下册 321 字，按教材课次顺序去重后 568 字。
 */
export const ALL_HANZI: HanziItem[] = hanzi600 as HanziItem[];

/** 主字库总字数（用于首页进度、抽屉角标等） */
export const TOTAL_CHARS = ALL_HANZI.length;

/**
 * 有本地配图的字（看图识字专用题库）。
 * 与主字库部分重合：568 个一年级识字字里能对上 93 个；
 * 其余 44 个是配图时按「画得出来」挑的具体名词，主字库没有，只用于看图识字。
 */
export const PICTURED_HANZI: HanziItem[] = hanziPictured as HanziItem[];

/** 每轮题目数（对应截图「第 1 / 8 题」） */
export const ROUND_SIZE = 8;

/** 字库范围：0 = 全部 */
export type TierFilter = 0 | 1 | 2 | 3;

/** 题型：对应截图顶部四个 tab */
export type QuizMode = 'learn' | 'picture' | 'listen' | 'match';

export type Question = {
  answer: HanziItem;
  /** 已打乱的选项（含正确答案） */
  options: HanziItem[];
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function poolOf(tier: TierFilter): HanziItem[] {
  return tier === 0 ? ALL_HANZI : ALL_HANZI.filter((h) => h.tier === tier);
}

/** 看图识字的可用字池 */
export function picturedPoolOf(tier: TierFilter): HanziItem[] {
  if (tier === 0) return PICTURED_HANZI;
  const byTier = PICTURED_HANZI.filter((h) => h.tier === tier);
  // 某一档有配图的字凑不满一轮时，回退到全部有图的字，避免出题不足
  return byTier.length >= ROUND_SIZE ? byTier : PICTURED_HANZI;
}

/**
 * 生成一轮题目。
 *
 * @param onlyPictured 看图识字传 true —— 只从有配图的字里出题，
 *                     否则会抽到没图的字，这道题就废了。
 *
 * 干扰项优先选「拼音不同」的字，避免两个选项读音相同、无法分辨。
 */
export function buildRound(
  tier: TierFilter,
  size = ROUND_SIZE,
  onlyPictured = false,
): Question[] {
  const pool = onlyPictured ? picturedPoolOf(tier) : poolOf(tier);
  const picked = shuffle(pool).slice(0, size);

  return picked.map((answer) => {
    const distractors = shuffle(
      pool.filter((h) => h.char !== answer.char && h.pinyin !== answer.pinyin),
    ).slice(0, 2);

    return { answer, options: shuffle([answer, ...distractors]) };
  });
}
