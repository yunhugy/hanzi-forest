/**
 * 拼音练习题库 —— 六种题型（外加综合）。
 *
 * | 题型 | 给什么 | 选什么 | 练的是 |
 * |---|---|---|---|
 * | pinyin-to-word | píng guǒ | 苹果 | 拼读 → 词 |
 * | word-to-pinyin | 苹果 | píng guǒ | 词 → 拼读 |
 * | tone           | 妈     | mā/má/mǎ/mà | 声调 |
 * | syllable       | āng    | 声母 / 韵母 | 声母表、韵母表的记忆 |
 * | sorting        | 一组成分 | 逐个归类 | 同上，但能看到整组对比 |
 * | confusable     | 知道   | zhī dào / zī dào | 易混音 |
 * | mixed          | ——     | 一轮里各种题型都练到 | 综合 |
 *
 * 数据来源分三处：
 *   - 词级题型用 `words.json`（192 词，带声调拼音）
 *   - 声调题用 `hanzi600.json` 的单字（612 字，每字带拼音）——
 *     声调是单字的属性，用词出题会把两个字的调混在一起
 *   - 判断类别 / 分类筐用声母表（23 个）+ 韵母表（24 个），
 *     再从词库里找一个例子词做答后说明
 */

import { ALL_WORDS, type WordItem } from '@/features/ciyu/words';
import { ALL_HANZI, shuffle, type HanziItem, type TierFilter } from '@/features/shizi/quiz';

import { confusableVariants } from './confusable';
import { FINALS, INITIALS, splitSyllable } from './syllable';
import { hasTone, stripTone, toneVariants, type Tone } from './tone';

/** 每轮题数 */
export const PINYIN_ROUND_SIZE = 8;

export type PinyinMode =
  | 'pinyin-to-word'
  | 'word-to-pinyin'
  | 'tone'
  | 'syllable'
  | 'sorting'
  | 'confusable'
  | 'mixed';

/** 单一题型 —— 综合模式就是从这里面抽题 */
export const SINGLE_MODES: PinyinMode[] = [
  'pinyin-to-word',
  'word-to-pinyin',
  'tone',
  'syllable',
  'sorting',
  'confusable',
];

/** 题型清单（页面直接渲染这个，避免两处维护） */
export const PINYIN_MODES: { value: PinyinMode; label: string }[] = [
  { value: 'pinyin-to-word', label: '看拼音选词' },
  { value: 'word-to-pinyin', label: '看词选拼音' },
  { value: 'tone', label: '声调' },
  { value: 'syllable', label: '判断类别' },
  { value: 'sorting', label: '分类筐' },
  { value: 'confusable', label: '易混音' },
  { value: 'mixed', label: '综合' },
];

/**
 * 这个题型是否受「档位」影响。
 *
 * 判断类别 / 分类筐考的是声母表、韵母表本身，不分难度，
 * 所以页面在这两个题型下不显示档位选择器。
 */
export function usesTier(mode: PinyinMode): boolean {
  return mode !== 'syllable' && mode !== 'sorting';
}

/**
 * 一道题。
 *
 * 五种题型共用一个结构，页面只按结构渲染，不用为每种题型写一套 UI。
 */
export type PinyinQuestion = {
  /** 这题实际属于哪种题型（综合模式下靠它区分） */
  mode: PinyinMode;
  /** 记账用的字（词题记词里的字，声调题记那一个字） */
  chars: string[];
  /** 题干主体 */
  prompt: string;
  /** 题干字号：拼音串 或 汉字 */
  promptKind: 'pinyin' | 'word';
  /** 题干上方的小提示 */
  hint: string;
  /** 选项（含正确答案），已打乱 */
  options: string[];
  /** 正确答案 */
  correct: string;
  /** 选项字号 */
  optionKind: 'pinyin' | 'word';
  /** 答完后补充说明 */
  note?: string;
  /**
   * 分类筐专用：同一组的全部成分 + 当前是第几个。
   *
   * 有这个字段时，页面会在题干上方把整组 chips 摆出来，
   * 当前那个高亮、答过的标灰 —— 让孩子看到「一批」之间的对比，
   * 而不是孤零零一个成分。普通题型没有这个字段。
   */
  group?: { items: string[]; index: number };
};

const TONE_NAMES: Record<Tone, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '轻' };

/** 词池 */
export function wordPoolOf(tier: TierFilter): WordItem[] {
  return tier === 0 ? ALL_WORDS : ALL_WORDS.filter((w) => w.tier === tier);
}

/**
 * 某个题型在某个档位下的可用数量 —— 给页面 chips 显示。
 *
 * 声调题用的是**单字**池（612 字），其余题型用的是**词**池（192 词），
 * 单位不同，所以返回 unit 让页面自己拼。
 */
export function poolSizeOf(
  tier: TierFilter,
  mode: PinyinMode,
): { count: number; unit: string } {
  if (mode === 'tone') return { count: charPoolOf(tier).length, unit: '字' };
  // 判断类别 / 分类筐 的题池就是声母表 + 韵母表（页面在这两个题型下不显示档位）
  if (mode === 'syllable' || mode === 'sorting') {
    return { count: INITIALS.length + FINALS.length, unit: '个' };
  }
  if (mode === 'mixed') return { count: wordPoolOf(tier).length, unit: '词' };
  if (mode === 'confusable') {
    return {
      count: wordPoolOf(tier).filter((w) => uniq(confusableVariants(w.pinyin)).length >= 2)
        .length,
      unit: '词',
    };
  }
  return { count: wordPoolOf(tier).length, unit: '词' };
}

/** 声调题的字池 —— 轻声字没法出四选一，先剔掉 */
function charPoolOf(tier: TierFilter): HanziItem[] {
  const pool = tier === 0 ? ALL_HANZI : ALL_HANZI.filter((h) => h.tier === tier);
  return pool.filter((h) => hasTone(h.pinyin));
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** 取拼音的第一个音节 */
function firstSyllable(pinyin: string): string {
  return pinyin.split(/\s+/)[0] ?? pinyin;
}

/**
 * 词级干扰项（用于「看拼音选词」—— 选项是汉字词，只能是别的真实词）。
 *
 * 优先挑「首音节声母相同」的词，这样孩子必须真读准才能分辨，
 * 而不是靠「三个选项长得完全不一样」蒙对。
 */
function pickWordDistractors(answer: WordItem, pool: WordItem[], count: number): WordItem[] {
  const others = pool.filter((w) => w.word !== answer.word && w.pinyin !== answer.pinyin);
  if (others.length <= count) return others;

  const head = firstSyllable(answer.pinyin)[0] ?? '';
  const sameHead = others.filter((w) => (firstSyllable(w.pinyin)[0] ?? '') === head);
  const picked = shuffle(sameHead).slice(0, count);

  if (picked.length < count) {
    const rest = shuffle(others.filter((w) => !picked.includes(w)));
    picked.push(...rest.slice(0, count - picked.length));
  }
  return picked;
}

/** 整词逐个音节换声调，得到一批「调错了」的读法 */
function toneVariantsOfWord(pinyin: string): string[] {
  const syllables = pinyin.split(/\s+/);
  const out: string[] = [];
  syllables.forEach((syl, i) => {
    for (const t of toneVariants(syl)) {
      const next = [...syllables];
      next[i] = t;
      out.push(next.join(' '));
    }
  });
  return out;
}

/**
 * 拼音侧干扰项（用于「看词选拼音」）。
 *
 * 关键改动：干扰项不再是「别的词的拼音」，而是**这个词本身的错误读法**。
 *
 * 老做法的漏洞：「苹果 píng guǒ」可能配到「píng zi」，孩子只要发现
 * 第二个字不一样就排除了，压根没在读拼音。现在配「pín guǒ」（前后鼻音错）、
 * 「pìng guǒ」（声调错），必须真读准才能分辨。
 *
 * 交替取「易混音」和「声调错」两种，让干扰维度不单一。
 */
function pickPinyinDistractors(answer: WordItem, count: number): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    if (v !== answer.pinyin && !out.includes(v)) out.push(v);
  };

  const confusable = shuffle(uniq(confusableVariants(answer.pinyin)));
  const tones = shuffle(uniq(toneVariantsOfWord(answer.pinyin)));

  let ci = 0;
  let ti = 0;
  while (out.length < count && (ci < confusable.length || ti < tones.length)) {
    if (ci < confusable.length) push(confusable[ci++]);
    if (out.length < count && ti < tones.length) push(tones[ti++]);
  }
  return out.slice(0, count);
}

/** 声调题 */
function buildToneQuestion(item: HanziItem): PinyinQuestion {
  const variants = toneVariants(item.pinyin).slice(0, 3);
  const tone = stripTone(item.pinyin).tone;
  return {
    mode: 'tone',
    chars: [item.char],
    prompt: item.char,
    promptKind: 'word',
    hint: '这个字是第几声？',
    options: shuffle([item.pinyin, ...variants]),
    correct: item.pinyin,
    optionKind: 'pinyin',
    note: `${item.pinyin} 是第${TONE_NAMES[tone]}声`,
  };
}

/**
 * 从词库里找一个「用到了这个声母/韵母」的例子，做答后说明用。
 *
 * 例：声母 zh → 「知道」；韵母 ang → 「帮忙」。
 * 找不到就返回 null（生僻韵母如 ün 在这 192 个词的词库里可能确实没有）。
 */
function searchExample(
  unit: string,
  isInitial: boolean,
  words: WordItem[],
): { char: string; word: string } | null {
  for (const w of shuffle(words)) {
    const syllables = w.pinyin.split(/\s+/);
    if (syllables.length !== w.chars.length) continue;
    for (let i = 0; i < syllables.length; i++) {
      const { initial, final } = splitSyllable(syllables[i]);
      // 韵母表是无调的，比较前先去调号
      const hit = isInitial ? initial === unit : stripTone(final).base === unit;
      if (hit) return { char: w.chars[i], word: w.word };
    }
  }
  return null;
}

/**
 * 找例子：先在当前档位的词池里找，找不到就放开到全词库。
 *
 * 例子只是答后说明，没必要卡在档位内 —— 否则像 ün 这种在某个档位里
 * 一个词都没有的韵母，就永远给不出例子。
 * 全词库也没有（192 个词覆盖不全所有韵母）就返回 null：题目照出，只是不记账。
 */
function findExample(
  unit: string,
  isInitial: boolean,
  words: WordItem[],
): { char: string; word: string } | null {
  return searchExample(unit, isInitial, words) ?? searchExample(unit, isInitial, ALL_WORDS);
}

/**
 * 判断类别题：给一个拼音成分，问它是声母还是韵母。
 *
 * ## 为什么题干就是那个成分，不给汉字也不给音节
 *
 * 这个题型考的是**声母表 / 韵母表的记忆**（人教版要求背下来的那两张表），
 * 所以题干就该是成分本身。给了音节反而泄露答案 ——
 * 孩子看见「bāng」就知道前面那截是声母，题就白做了。
 *
 * 记账用例子词里的那个字（它确实含这个成分），家长页的字统计才有意义。
 */
function buildCategoryQuestion(tier: TierFilter, askInitial: boolean): PinyinQuestion {
  const unit = askInitial
    ? INITIALS[Math.floor(Math.random() * INITIALS.length)]
    : FINALS[Math.floor(Math.random() * FINALS.length)];
  const label = askInitial ? '声母' : '韵母';
  const example = findExample(unit, askInitial, wordPoolOf(tier));

  return {
    mode: 'syllable',
    chars: example ? [example.char] : [],
    prompt: unit,
    promptKind: 'pinyin',
    hint: '它是声母还是韵母？',
    options: shuffle(['声母', '韵母']),
    correct: label,
    optionKind: 'word',
    note: example ? `${unit} 是${label}，如「${example.word}」` : `${unit} 是${label}`,
  };
}

/** 分类筐一组摆几个 */
const SORT_GROUP_SIZE = 4;

/**
 * 分类筐题：一次摆出一组成分（2 个声母 + 2 个韵母），逐个归类。
 *
 * 和判断类别是同一件事，区别在于**能看到整组**——
 * 单独看一个「zh」和同时看「zh / āng / üe / f」，后者才逼孩子做对比。
 *
 * 实现上是把一组拆成 SORT_GROUP_SIZE 道连续小题，每题都带 group 字段，
 * 页面据此把整组 chips 渲染出来（当前高亮、答过的标灰）。
 */
function buildSortingQuestions(tier: TierFilter, size: number): PinyinQuestion[] {
  const words = wordPoolOf(tier);
  const out: PinyinQuestion[] = [];

  while (out.length < size) {
    const units = shuffle([
      ...shuffle([...INITIALS])
        .slice(0, SORT_GROUP_SIZE / 2)
        .map((u) => ({ unit: u, isInitial: true })),
      ...shuffle([...FINALS])
        .slice(0, SORT_GROUP_SIZE / 2)
        .map((u) => ({ unit: u, isInitial: false })),
    ]);
    const items = units.map((u) => u.unit);

    units.forEach((u, index) => {
      const label = u.isInitial ? '声母' : '韵母';
      const example = findExample(u.unit, u.isInitial, words);
      out.push({
        mode: 'sorting',
        chars: example ? [example.char] : [],
        prompt: u.unit,
        promptKind: 'pinyin',
        hint: '它是声母还是韵母？',
        options: shuffle(['声母', '韵母']),
        correct: label,
        optionKind: 'word',
        note: example ? `${u.unit} 是${label}，如「${example.word}」` : `${u.unit} 是${label}`,
        group: { items, index },
      });
    });
  }

  return out.slice(0, size);
}

/** 易混音对比题 —— 选项里必有「易混音读错」的那种 */
function buildConfusableQuestion(word: WordItem): PinyinQuestion | null {
  const variants = shuffle(uniq(confusableVariants(word.pinyin))).filter(
    (v) => v !== word.pinyin,
  );
  if (variants.length < 2) return null;
  return {
    mode: 'confusable',
    chars: word.chars,
    prompt: word.word,
    promptKind: 'word',
    hint: '仔细看声母和韵母，哪个对？',
    options: shuffle([word.pinyin, ...variants.slice(0, 2)]),
    correct: word.pinyin,
    optionKind: 'pinyin',
    note: `${word.word} 读 ${word.pinyin}`,
  };
}

/** 词级题型统一入口 */
function buildWordQuestion(
  word: WordItem,
  mode: PinyinMode,
  pool: WordItem[],
): PinyinQuestion | null {
  if (mode === 'pinyin-to-word') {
    const distractors = pickWordDistractors(word, pool, 2);
    if (distractors.length < 2) return null;
    return {
      mode: 'pinyin-to-word',
      chars: word.chars,
      prompt: word.pinyin,
      promptKind: 'pinyin',
      hint: '读一读拼音，是哪个词？',
      options: shuffle([word.word, ...distractors.map((d) => d.word)]),
      correct: word.word,
      optionKind: 'word',
      note: `${word.pinyin} 是「${word.word}」`,
    };
  }

  if (mode === 'word-to-pinyin') {
    const distractors = pickPinyinDistractors(word, 2);
    if (distractors.length < 2) return null;
    return {
      mode: 'word-to-pinyin',
      chars: word.chars,
      prompt: word.word,
      promptKind: 'word',
      hint: '哪个是这个词的读音？',
      options: shuffle([word.pinyin, ...distractors]),
      correct: word.pinyin,
      optionKind: 'pinyin',
      note: `${word.word} 读 ${word.pinyin}`,
    };
  }

  if (mode === 'confusable') return buildConfusableQuestion(word);
  return null;
}

/**
 * 综合练习：一轮里五种题型都练到。
 *
 * 做法是「每种先各占一题，剩下的随机补」——
 * 纯随机的话，一轮八题可能整轮都没抽到声调题，而声调恰恰是最该练的。
 */
function buildMixedRound(tier: TierFilter, size: number): PinyinQuestion[] {
  const plan: PinyinMode[] = shuffle([...SINGLE_MODES]);
  while (plan.length < size) {
    plan.push(SINGLE_MODES[Math.floor(Math.random() * SINGLE_MODES.length)]);
  }

  const out: PinyinQuestion[] = [];
  for (const m of shuffle(plan).slice(0, size)) {
    const q = buildPinyinRound(tier, m, 1)[0];
    if (q) out.push(q);
  }
  return out;
}

/**
 * 生成一轮题目。
 *
 * 某些题可能出不来（音节对不上、干扰项凑不够），这时跳过换下一道，
 * 所以实际题数可能略少于 size —— 比硬凑出一道废题好。
 */
export function buildPinyinRound(
  tier: TierFilter,
  mode: PinyinMode,
  size = PINYIN_ROUND_SIZE,
): PinyinQuestion[] {
  if (mode === 'mixed') return buildMixedRound(tier, size);

  const out: PinyinQuestion[] = [];

  if (mode === 'tone') {
    for (const item of shuffle(charPoolOf(tier))) {
      if (out.length >= size) break;
      out.push(buildToneQuestion(item));
    }
    return out;
  }

  // 判断类别 / 分类筐不从词出题，直接从声母表、韵母表抽
  if (mode === 'syllable') {
    for (let i = 0; i < size; i++) {
      // 交替问，保证声母、韵母各占一半
      out.push(buildCategoryQuestion(tier, i % 2 === 0));
    }
    return out;
  }

  if (mode === 'sorting') return buildSortingQuestions(tier, size);

  const pool = wordPoolOf(tier);
  const source =
    mode === 'confusable'
      ? pool.filter((w) => uniq(confusableVariants(w.pinyin)).length >= 2)
      : pool;
  // 过滤后凑不满一轮就退回全池，避免出题不足
  const usable = source.length >= size ? source : pool;

  const seen = new Set<string>();
  for (const word of shuffle(usable)) {
    if (out.length >= size) break;
    if (seen.has(word.word)) continue;
    const q = buildWordQuestion(word, mode, pool);
    if (q) {
      seen.add(word.word);
      out.push(q);
    }
  }
  return out;
}
