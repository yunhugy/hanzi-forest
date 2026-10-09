import wordsData from '@/data/words.json';

import { ALL_HANZI, shuffle, type HanziItem, type TierFilter } from '@/features/shizi/quiz';

export type WordItem = {
  id: number;
  /** 词语本身，两字词 */
  word: string;
  /** 带声调的拼音，如 "xià yǔ" */
  pinyin: string;
  /** 拆开的两个单字 */
  chars: string[];
  /** 难度档：组成字的最高 tier。1=初识 2=进阶 3=探索 */
  tier: number;
  /** HSK 级别，仅作参考（1 最简单） */
  hsk: number;
};

/**
 * 词库：HSK 1-3 全部 + HSK 4 人工精选，共 192 个两字词。
 *
 * 硬约束是「词语的两个字都必须在 612 字库内」—— 否则孩子不认识其中的字，
 * 题目就没意义了。生成脚本见 `_research/prep_words_hsk.py`。
 */
export const ALL_WORDS: WordItem[] = wordsData as WordItem[];

/** 词库总词数（用于首页/抽屉展示） */
export const TOTAL_WORDS = ALL_WORDS.length;

/** 每轮题目数 */
export const WORD_ROUND_SIZE = 8;

/** 题型：认词语（学习）/ 补字（考察）/ 听音选词（考察） */
export type WordMode = 'learn' | 'fill' | 'listen';

export type WordQuestion = {
  answer: WordItem;
  /** 补字题：挖掉第几个字（0 或 1） */
  blankIndex: number;
  /** 补字题：3 个字选项（含正确答案），已打乱 */
  charOptions: string[];
  /** 听音选词：3 个词选项（含正确答案），已打乱 */
  wordOptions: WordItem[];
};

/** 单字 -> 字库条目，用于取拼音做干扰项筛选 */
const HANZI_BY_CHAR = new Map<string, HanziItem>(ALL_HANZI.map((h) => [h.char, h]));

export function wordPoolOf(tier: TierFilter): WordItem[] {
  return tier === 0 ? ALL_WORDS : ALL_WORDS.filter((w) => w.tier === tier);
}

/**
 * 词语是否可以出「补字题」。
 *
 * 叠字词（妈妈 / 爸爸 / 哥哥）不行 —— 挖掉一个「妈」，另一个「妈」还留在原位，
 * 答案直接暴露；而且干扰项也不能选「妈」（那是正确答案本身），无解。
 */
function fillable(w: WordItem): boolean {
  return w.chars.length === 2 && w.chars[0] !== w.chars[1];
}

/**
 * 生成一轮题目。
 *
 * @param tier 词库范围
 * @param mode 题型。补字题只从「无叠字」的词里出；其余题型可用全部词。
 */
export function buildWordRound(
  tier: TierFilter,
  mode: WordMode,
  size = WORD_ROUND_SIZE,
): WordQuestion[] {
  const pool = wordPoolOf(tier);
  const usable = mode === 'fill' ? pool.filter(fillable) : pool;
  // 词太少凑不满一轮时，回退到全部词，避免出题不足
  const source = usable.length >= size ? usable : pool.filter(fillable);

  const picked = shuffle(source).slice(0, size);

  return picked.map((answer) => {
    // 补字题：随机挖一个字
    const blankIndex = Math.random() < 0.5 ? 0 : 1;
    const rightChar = answer.chars[blankIndex];

    // 干扰字：不在该词里、且拼音与正确答案不同（避免两个选项读音一样，没法分辨）
    const rightPinyin = HANZI_BY_CHAR.get(rightChar)?.pinyin ?? '';
    const distractors = shuffle(
      ALL_HANZI.filter(
        (h) => !answer.chars.includes(h.char) && h.pinyin !== rightPinyin,
      ),
    )
      .slice(0, 2)
      .map((h) => h.char);

    // 听音选词：干扰词拼音不同，避免听感混淆
    const wordDistractors = shuffle(
      pool.filter((w) => w.word !== answer.word && w.pinyin !== answer.pinyin),
    ).slice(0, 2);

    return {
      answer,
      blankIndex,
      charOptions: shuffle([rightChar, ...distractors]),
      wordOptions: shuffle([answer, ...wordDistractors]),
    };
  });
}

/** 补字题里，把词语渲染成「苹 _」这样的挖空形式 */
export function maskedWord(q: WordQuestion): string {
  return q.answer.chars.map((c, i) => (i === q.blankIndex ? '＿' : c)).join('');
}
