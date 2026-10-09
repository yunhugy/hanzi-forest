import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { getVoicePref } from './voices';

/**
 * 朗读工具 —— 识字乐园和词语闯关共用。
 *
 * ## 为什么不直接调 Speech.speak
 *
 * 踩过两个坑：
 *
 * 1. **单音节太短**。中文单字只有 200~400ms，系统默认语速（rate 1.0）念出来
 *    就是「嗖」一下，孩子（尤其还不熟的）经常「还没听清就没了」。
 *    → 所以默认**念两遍**，中间留 400ms 停顿，给第二次机会。
 *
 * 2. **cancel / speak 竞态**。web 端 expo-speech 就是包 `window.speechSynthesis`，
 *    而 Chrome 在 `cancel()` 之后立即 `speak()` 有概率把新的朗读丢弃或截断。
 *    → 所以 `stop()` 之后要先留出一点时间再开口。
 *
 * 3. **注意力还没转过来**。直接开口念，孩子往往第一遍完全没听进去。
 *    → 开口前先「叮」一声，再留 350ms 空白，给一个明确的「要开始了」信号。
 *
 * 另外系统默认语速对儿童读物偏快，这里统一降速。
 */

/** 语速档位。数值越小越慢，Web Speech API 的 rate 有效范围约 0.1 ~ 10 */
export const SPEECH_RATES = { slow: 0.5, slower: 0.3 } as const;

export type SpeechRate = keyof typeof SPEECH_RATES;

/** 两遍之间的停顿（毫秒） */
const GAP_BETWEEN_REPEATS = 400;
/** 提示音本身时长（毫秒），与 playChime 的包络保持一致 */
const CHIME_MS = 300;
/** 提示音之后、开口之前的留白（毫秒）—— 给孩子一点「注意力转过来」的时间 */
const LEAD_IN_MS = 350;

/**
 * 开口前先「叮」一声。
 *
 * 为什么需要：直接开口念，孩子的注意力往往还没转过来，第一遍就白念了。
 * 先用一个轻柔的提示音把注意力拉过来，再留一点空白，第二遍才真正听得进去。
 * （课堂听写也是这个节奏：先「注意了」，再读。）
 *
 * 用 Web Audio 现场合成，不需要音频文件 —— 一个 880→1320Hz 的正弦波
 * 加快速衰减包络，听感接近木质音叉的「叮」。
 * 原生端没有 Web Audio，静默跳过（只保留留白）。
 */
function playChime(): void {
  if (Platform.OS !== 'web') return;
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

    // 起音极快、衰减也快，避免拖尾糊住后面的朗读
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // 音频上下文不可用（或被浏览器自动播放策略拦下）就静默跳过
  }
}

export type SpeakOptions = {
  /** 语速档位，默认 slow */
  speed?: SpeechRate;
  /** 念几遍，默认 2 */
  times?: number;
};

/**
 * 朗读一个短字 / 短词。
 * 设备没有中文语音包时静默降级 —— 不抛错、不打断页面。
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const { speed = 'slow', times = 2 } = options;

  try {
    Speech.stop();

    let remaining = Math.max(1, times);

    const sayOnce = () => {
      remaining -= 1;
      // 家长在「给爸爸妈妈」里挑的语音；没挑就交给系统默认
      const voiceId = getVoicePref();
      Speech.speak(text, {
        language: 'zh-CN',
        rate: SPEECH_RATES[speed],
        pitch: 1.05,
        ...(voiceId ? { voice: voiceId } : {}),
        onDone: () => {
          if (remaining > 0) {
            // 用 onDone 回调串起下一遍，比「在文本里塞逗号」可靠：
            // 不同语音引擎对逗号停顿时长的处理差别很大，回调是确定的
            setTimeout(sayOnce, GAP_BETWEEN_REPEATS);
          }
        },
        onError: () => {
          // 单字念不出来就放弃，不重试、不打扰用户
        },
      });
    };

    // ① 先「叮」一声，把注意力拉过来；顺带给了 cancel() 生效的时间
    playChime();
    // ② 再留一点空白才开口 —— 这几百毫秒是「准备听」的关键
    setTimeout(sayOnce, CHIME_MS + LEAD_IN_MS);
  } catch {
    // 静默降级
  }
}
