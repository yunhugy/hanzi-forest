import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

/**
 * 轻量音效 + 触感反馈。
 *
 * 背景：此前只有 web 端用 Web Audio 合成了「叮」声（见 speak.ts 的 playChime），
 * 安卓真机答对时是完全静音的，孩子得不到即时反馈。
 *
 * 这里用 expo-audio 播放随包内置的三个小音效（合计约 13KB，离线可用）：
 *   - correct：答对，清脆上行「叮」
 *   - wrong  ：答错，柔和下行低音（不刺耳、不打击信心）
 *   - flip   ：翻卡，极短轻点
 *
 * 所有播放都包在 try/catch 里 —— 音效只是锦上添花，
 * 任何失败都不允许影响答题主流程。
 */

export type SfxName = 'correct' | 'wrong' | 'flip';

const SOURCES: Record<SfxName, number> = {
  correct: require('../../../assets/audio/effects/correct.mp3'),
  wrong: require('../../../assets/audio/effects/wrong.mp3'),
  flip: require('../../../assets/audio/effects/flip.mp3'),
};

/** 全局音效开关（默认开，留出给家长中心挂开关的余地） */
let enabled = true;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

export function isSfxEnabled() {
  return enabled;
}

let players: Record<SfxName, AudioPlayer> | null = null;

/** 惰性创建：首次用到才实例化，不拖慢冷启动 */
function ensurePlayers(): Record<SfxName, AudioPlayer> {
  if (!players) {
    players = {
      correct: createAudioPlayer(SOURCES.correct),
      wrong: createAudioPlayer(SOURCES.wrong),
      flip: createAudioPlayer(SOURCES.flip),
    };
  }
  return players;
}

/** 播放一个音效（即发即忘，绝不阻塞 UI） */
export function playSfx(name: SfxName): void {
  if (!enabled) return;
  try {
    const player = ensurePlayers()[name];
    // 上一次播完后 currentTime 停在末尾，必须先回到 0 才能重播
    player.seekTo(0).then(
      () => player.play(),
      () => {
        /* 忽略 */
      },
    );
  } catch {
    // 静默降级
  }
}

/** 轻触感（仅安卓，避免 iOS 系统振动的「闷响」打断语音朗读） */
export function hapticLight(): void {
  if (Platform.OS !== 'android') return;
  try {
    Vibration.vibrate(15);
  } catch {
    // 忽略
  }
}
