/**
 * 拼音声调工具。
 *
 * 声调是拼音里最需要精确处理的一块 —— 标调位置有固定规则，
 * 标错了孩子就会学到错的。这里严格按人教版规则实现：
 *
 *   1. 有 a 找 a          xiǎo、guān
 *   2. 没 a 找 o、e       guǒ、xiě
 *   3. i、u 并列标在后    liù（标 u）、guì（标 i）
 *   4. 单个韵母直接标     nǚ、jūn
 */

/** 声调：1~4 为四声，5 表示轻声（不标调号） */
export type Tone = 1 | 2 | 3 | 4 | 5;

/** 轻声 */
export const NEUTRAL_TONE: Tone = 5;

/** 六个可标调的元音字母 → 四个声调符号 */
const TONE_MARKS: Record<string, [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** 带调字符 → { 基本字母, 声调 } */
const MARK_LOOKUP: Record<string, { base: string; tone: Tone }> = {};
for (const [base, marks] of Object.entries(TONE_MARKS)) {
  marks.forEach((mark, i) => {
    MARK_LOOKUP[mark] = { base, tone: (i + 1) as Tone };
  });
}

/**
 * 去掉声调符号。
 *
 * 返回基本形式与声调；完全没有调号的音节按**轻声**处理
 * （「东西 dōng xi」的 xi 就是轻声）。
 */
export function stripTone(syllable: string): { base: string; tone: Tone } {
  let base = '';
  let tone: Tone = NEUTRAL_TONE;
  for (const ch of syllable) {
    const hit = MARK_LOOKUP[ch];
    if (hit) {
      base += hit.base;
      tone = hit.tone;
    } else {
      base += ch;
    }
  }
  return { base, tone };
}

/**
 * 给无声调音节标上指定声调。
 *
 * 轻声原样返回（轻声不写调号）。找不到可标调的元音时也原样返回，
 * 这样调用方拿到的一定是合法字符串，不会抛异常。
 */
export function applyTone(base: string, tone: Tone): string {
  if (tone === NEUTRAL_TONE) return base;

  const lower = base.toLowerCase();
  let idx = -1;
  if (lower.includes('a')) {
    idx = lower.indexOf('a');
  } else if (lower.includes('o')) {
    idx = lower.indexOf('o');
  } else if (lower.includes('e')) {
    idx = lower.indexOf('e');
  } else {
    // 只剩 i / u / ü —— i、u 并列时标在后一个（liù 标 u、guì 标 i）
    idx = Math.max(lower.lastIndexOf('i'), lower.lastIndexOf('u'), lower.lastIndexOf('ü'));
  }
  if (idx < 0) return base;

  const marks = TONE_MARKS[lower[idx]];
  if (!marks) return base;
  return base.slice(0, idx) + marks[tone - 1] + base.slice(idx + 1);
}

/**
 * 同一音节的另外三个声调形式，用作声调题的干扰项。
 *
 * 例：mā → ['má', 'mǎ', 'mà']
 */
export function toneVariants(syllable: string): string[] {
  const { base, tone } = stripTone(syllable);
  const out: string[] = [];
  for (const t of [1, 2, 3, 4] as Tone[]) {
    if (t === tone) continue;
    out.push(applyTone(base, t));
  }
  return out;
}

/** 整个词的拼音去掉声调（按空格分隔的音节逐个处理） */
export function stripToneAll(pinyin: string): string {
  return pinyin
    .split(/\s+/)
    .map((s) => stripTone(s).base)
    .join(' ');
}

/** 是否带声调 —— 用于筛掉轻声字（轻声没法出四选一的声调题） */
export function hasTone(syllable: string): boolean {
  return stripTone(syllable).tone !== NEUTRAL_TONE;
}
