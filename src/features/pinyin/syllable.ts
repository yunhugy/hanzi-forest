/**
 * 音节切分：把一个音节拆成「声母 + 韵母」。
 *
 * 按**书写形式**切分 —— 不还原 ü（ju 的韵母就写作 u，yuan 的韵母就写作 uan），
 * 因为孩子看到的就是书写形式，还原成 ü 反而对不上课本。
 */

import { applyTone, stripTone } from './tone';

/**
 * 声母表（人教版 23 个）。
 *
 * 顺序要紧：zh / ch / sh 必须排在 z / c / s 前面，
 * 否则「zhī」会被切成 z + hī。
 */
export const INITIALS = [
  'zh',
  'ch',
  'sh',
  'b',
  'p',
  'm',
  'f',
  'd',
  't',
  'n',
  'l',
  'g',
  'k',
  'h',
  'j',
  'q',
  'x',
  'r',
  'z',
  'c',
  's',
  'y',
  'w',
] as const;

/** 韵母表（人教版 24 个：单韵母 6 + 复韵母 9 + 前鼻 5 + 后鼻 4） */
export const FINALS = [
  'a',
  'o',
  'e',
  'i',
  'u',
  'ü',
  'ai',
  'ei',
  'ui',
  'ao',
  'ou',
  'iu',
  'ie',
  'üe',
  'er',
  'an',
  'en',
  'in',
  'un',
  'ün',
  'ang',
  'eng',
  'ing',
  'ong',
] as const;

/**
 * 切分音节。
 *
 * 零声母音节（a、an、er、ou…）声母返回空串 ——
 * 这类音节不适合出「声母是什么」的题，出题时要跳过。
 */
export function splitSyllable(syllable: string): { initial: string; final: string } {
  const lower = syllable.toLowerCase();
  for (const ini of INITIALS) {
    if (lower.startsWith(ini)) {
      return { initial: syllable.slice(0, ini.length), final: syllable.slice(ini.length) };
    }
  }
  return { initial: '', final: syllable };
}

/**
 * 易混声母分组，同组内互为干扰项。
 *
 * **顺序就是优先级**：取干扰项时从前面的组开始取，所以最该混的放最前。
 *
 * 前八组是「一对一对」的经典易混音；后面几组按**发音部位**兜底 ——
 * 否则像 g、l、b 这种只有一个易混对象的声母，会凑不出两个干扰项，
 * 出题时只能砍掉。
 */
const INITIAL_GROUPS: string[][] = [
  ['zh', 'z'],
  ['ch', 'c'],
  ['sh', 's'],
  ['n', 'l'],
  ['f', 'h'],
  ['b', 'p'],
  ['d', 't'],
  ['g', 'k'],
  // 按发音部位分组
  ['b', 'p', 'm', 'f'], // 唇音
  ['d', 't', 'n', 'l'], // 舌尖中音
  ['g', 'k', 'h'], // 舌根音
  ['j', 'q', 'x', 'y'], // 舌面音（y 是半元音，和细音最接近）
  ['zh', 'ch', 'sh', 'r'], // 翘舌音
  ['z', 'c', 's'], // 平舌音
];

/**
 * 易混韵母分组，按**无声调**形式比较（ín 和 ìn 是同一组）。
 *
 * 同样按优先级排列：前后鼻音最需要区分，放最前。
 */
const FINAL_GROUPS: string[][] = [
  ['an', 'ang'],
  ['en', 'eng'],
  ['in', 'ing'],
  ['ai', 'ei', 'ui'],
  ['ao', 'ou', 'iu'],
  ['ie', 'üe', 'er'],
  ['a', 'o', 'e'],
  ['i', 'u', 'ü'],
  ['an', 'en', 'in', 'un', 'ün'],
  ['ang', 'eng', 'ing', 'ong'],
];

/** 与给定声母容易混淆的其它声母 */
export function similarInitials(initial: string): string[] {
  const low = initial.toLowerCase();
  const out = new Set<string>();
  for (const group of INITIAL_GROUPS) {
    if (group.includes(low)) {
      for (const item of group) {
        if (item !== low) out.add(item);
      }
    }
  }
  return [...out];
}

/**
 * 与给定韵母容易混淆的其它韵母。
 *
 * 保持原声调 —— 干扰项要「韵母不同但声调一样」，
 * 否则孩子可以直接靠声调符号排除，题就废了。
 */
export function similarFinals(final: string): string[] {
  const { base, tone } = stripTone(final);
  const low = base.toLowerCase();
  const out = new Set<string>();
  for (const group of FINAL_GROUPS) {
    if (group.includes(low)) {
      for (const item of group) {
        if (item !== low) out.add(item);
      }
    }
  }
  return [...out].map((f) => applyTone(f, tone));
}
