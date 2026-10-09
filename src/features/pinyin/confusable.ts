/**
 * 易混音对比 —— 专门对付「南方口音」和「平翘舌不分」。
 *
 * 做法：拿正确的拼音，把其中一个音换成它的易混音，生成一个「听起来很像但读错了」
 * 的干扰项。比如「知道 zhī dào」→「zī dào」（zh 读成 z）、「zhī tào」（d 读成 t）。
 *
 * ## 为什么必须按音节处理
 *
 * 不能对整串拼音做 replace。反例：`nán` 想做 n→l 替换，
 * 整串 replace(/n/g, 'l') 会得到 `lál` —— 把韵尾的 n 也改了。
 * 所以只能切开音节、只动声母或只动韵母。
 */

import { splitSyllable } from './syllable';
import { applyTone, stripTone } from './tone';

/** 易混声母对（双向） */
const INITIAL_PAIRS: [string, string][] = [
  ['zh', 'z'],
  ['ch', 'c'],
  ['sh', 's'],
  ['n', 'l'],
  ['f', 'h'],
  ['b', 'p'],
  ['d', 't'],
  ['g', 'k'],
];

/** 易混韵母对（双向，按无声调形式比较） */
const FINAL_PAIRS: [string, string][] = [
  ['an', 'ang'],
  ['en', 'eng'],
  ['in', 'ing'],
  ['uan', 'uang'],
  ['ian', 'iang'],
];

/** 原串首字母大写时，替换结果也跟着大写（保住「Zhōng」这种词首大写） */
function matchCase(source: string, target: string): string {
  const head = source[0];
  if (head && head === head.toUpperCase() && head !== head.toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

/** 声母换成易混声母；没有可换的返回 null */
function swapInitial(initial: string): string | null {
  if (!initial) return null;
  const low = initial.toLowerCase();
  for (const [a, b] of INITIAL_PAIRS) {
    if (low === a) return matchCase(initial, b);
    if (low === b) return matchCase(initial, a);
  }
  return null;
}

/** 韵母换成易混韵母（保持声调）；没有可换的返回 null */
function swapFinal(final: string): string | null {
  const { base, tone } = stripTone(final);
  const low = base.toLowerCase();
  for (const [a, b] of FINAL_PAIRS) {
    if (low === a) return applyTone(b, tone);
    if (low === b) return applyTone(a, tone);
  }
  return null;
}

/** 单个音节能生成的所有易混变体 */
function syllableVariants(syllable: string): string[] {
  const { initial, final } = splitSyllable(syllable);
  const out: string[] = [];
  const nextInitial = swapInitial(initial);
  if (nextInitial !== null) out.push(nextInitial + final);
  const nextFinal = swapFinal(final);
  if (nextFinal !== null) out.push(initial + nextFinal);
  return out;
}

/**
 * 生成整个词的易混变体（每次只动一个音节）。
 *
 * 「知道 zhī dào」→ ['zī dào', 'zhī tào']
 * 空数组表示这个词里没有易混音，不适合出对比题。
 */
export function confusableVariants(pinyin: string): string[] {
  const syllables = pinyin.split(/\s+/);
  const out: string[] = [];
  syllables.forEach((syl, i) => {
    for (const variant of syllableVariants(syl)) {
      const next = [...syllables];
      next[i] = variant;
      out.push(next.join(' '));
    }
  });
  return out;
}

/** 这个词是否含易混音（决定能不能进易混音题型的题池） */
export function hasConfusable(pinyin: string): boolean {
  return confusableVariants(pinyin).length > 0;
}
