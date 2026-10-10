import { Asset } from 'expo-asset';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { audioOf } from '@/data/char-audio';
import { wordAudioOf } from '@/data/word-audio';
import { getVoicePref, getAudioPackPref } from './voices';

/**
 * 朗读工具 —— 识字乐园和词语闯关共用。
 *
 * ## 双轨发音架构
 *
 * 优先使用「晓伊离线音频包」（高品质神经 TTS，预生成 mp3）：
 *   - 音质稳定、字正腔圆，不依赖设备语音引擎
 *   - 0ms 延迟，秒播无卡顿
 *   - 100% 离线，断网飞行模式也能用
 *
 * 当字/词不在音频包中（生僻扩展字），无缝降级到系统 expo-speech，
 * 绝不哑火。
 *
 * ## 其他细节（与原版保持一致）
 *
 * 1. 默认念两遍，中间留 400ms，给孩子第二次机会听清。
 * 2. 开口前「叮」一声（Web Audio 合成提示音），拉回注意力。
 * 3. 降速至 -10%（音频包已内置），系统 TTS 回退时同样降速。
 */

/** 语速档位（用于系统 TTS 降级时） */
export const SPEECH_RATES = { slow: 0.5, slower: 0.3 } as const;
export type SpeechRate = keyof typeof SPEECH_RATES;

const GAP_BETWEEN_REPEATS = 400;
const CHIME_MS  = 300;
const LEAD_IN_MS = 350;

// ─── 叮提示音（与原版完全一致） ───────────────────────────────────────────
function playChime(): void {
  if (Platform.OS !== 'web') return;
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return;

    const ctx  = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16,  ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // 静默降级
  }
}

// ─── 内部：系统 TTS 降级路径 ──────────────────────────────────────────────
function speakViaTTS(text: string, speed: SpeechRate, times: number): void {
  Speech.stop();
  let remaining = Math.max(1, times);

  const sayOnce = () => {
    remaining -= 1;
    const voiceId = getVoicePref();
    Speech.speak(text, {
      language: 'zh-CN',
      rate: SPEECH_RATES[speed],
      pitch: 1.05,
      ...(voiceId ? { voice: voiceId } : {}),
      onDone: () => {
        if (remaining > 0) setTimeout(sayOnce, GAP_BETWEEN_REPEATS);
      },
      onError: () => { /* 静默 */ },
    });
  };

  playChime();
  setTimeout(sayOnce, CHIME_MS + LEAD_IN_MS);
}

// ─── 内部：音频包播放路径 ────────────────────────────────────────────────
let _audioPlayer: ReturnType<typeof useAudioPlayer> | null = null;

/**
 * 在组件树外使用 expo-audio。
 * expo-audio 的 useAudioPlayer 是 React hook，不能在普通函数里调用。
 * 解法：在应用根部创建一个单例 player，通过 initAudioPlayer() 注入进来。
 */
export function initAudioPlayer(player: ReturnType<typeof useAudioPlayer>) {
  _audioPlayer = player;
}

async function playAssetOnce(assetModule: number): Promise<void> {
  const player = _audioPlayer;
  if (!player) return;
  const [asset] = await Asset.loadAsync(assetModule);
  player.replace({ uri: asset.localUri ?? asset.uri });
  player.play();
  // 等播放结束（轮询，最多 10s）
  await new Promise<void>((resolve) => {
    const t0 = Date.now();
    const check = () => {
      if (!player.playing || Date.now() - t0 > 10000) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    setTimeout(check, 50);
  });
}

async function speakViaAudioPack(
  assetModule: number,
  times: number,
): Promise<void> {
  playChime();
  await new Promise<void>((r) => setTimeout(r, CHIME_MS + LEAD_IN_MS));

  for (let i = 0; i < times; i++) {
    await playAssetOnce(assetModule);
    if (i < times - 1) {
      await new Promise<void>((r) => setTimeout(r, GAP_BETWEEN_REPEATS));
    }
  }
}

// ─── 公开 API ────────────────────────────────────────────────────────────
export type SpeakOptions = {
  /** 语速档位，仅在降级到系统 TTS 时生效，默认 slow */
  speed?: SpeechRate;
  /** 念几遍，默认 2 */
  times?: number;
  /** 是词语（而非单字），用于选择音频包索引 */
  isWord?: boolean;
};

/**
 * 朗读一个短字 / 短词。
 * - 音频包开启时：秒播晓伊高品质 mp3
 * - 音频包关闭或缺漏时：降级到系统 expo-speech
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const { speed = 'slow', times = 2, isWord = text.length > 1 } = options;

  try {
    const useAudioPack = getAudioPackPref();

    if (useAudioPack) {
      const asset = isWord ? wordAudioOf(text) : audioOf(text);
      if (asset !== undefined) {
        // 音频包命中 → 高品质路径（async，不阻塞 UI）
        speakViaAudioPack(asset, times).catch(() => {
          // 播放出错时降级 TTS
          speakViaTTS(text, speed, times);
        });
        return;
      }
    }

    // 降级：系统 TTS
    speakViaTTS(text, speed, times);
  } catch {
    // 静默
  }
}
