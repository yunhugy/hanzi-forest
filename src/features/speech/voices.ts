import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

/**
 * 朗读语音的选择与记忆。
 *
 * 新增：音频包开关（useAudioPack）
 *   - true（默认）：优先使用预生成的晓伊高品质离线音频包
 *   - false：回退到系统 expo-speech（让家长自选语音引擎时用）
 */

const PREF_KEY_VOICE      = 'hanzi-forest:speech:voice:v1';
const PREF_KEY_AUDIO_PACK = 'hanzi-forest:speech:audio-pack:v1';

export type VoiceOption = {
  /** voiceURI，作为唯一标识 */
  id: string;
  /** 显示名，如 "Microsoft Huihui - Chinese (Simplified)" */
  name: string;
  /** 语言标签，如 "zh-CN" */
  language: string;
  /** 是否本地合成（false = 需要联网） */
  local: boolean;
};

/** 当前选中的语音 id，null = 用系统默认 */
let currentVoiceId: string | null = null;
/** 是否启用离线音频包，默认 true */
let currentAudioPack: boolean = true;

export function getVoicePref(): string | null {
  return currentVoiceId;
}

export function getAudioPackPref(): boolean {
  return currentAudioPack;
}

/** 从本地存档读偏好。应用启动时调一次即可。 */
export async function hydrateVoicePref(): Promise<string | null> {
  try {
    const [voiceRaw, packRaw] = await Promise.all([
      AsyncStorage.getItem(PREF_KEY_VOICE),
      AsyncStorage.getItem(PREF_KEY_AUDIO_PACK),
    ]);
    currentVoiceId   = voiceRaw || null;
    currentAudioPack = packRaw === null ? true : packRaw === 'true';
  } catch {
    currentVoiceId   = null;
    currentAudioPack = true;
  }
  return currentVoiceId;
}

/** 记住选择的语音；传 null 表示回到系统默认。 */
export async function setVoicePref(id: string | null): Promise<void> {
  currentVoiceId = id;
  try {
    if (id) await AsyncStorage.setItem(PREF_KEY_VOICE, id);
    else     await AsyncStorage.removeItem(PREF_KEY_VOICE);
  } catch {
    // 存不下也不影响本次会话
  }
}

/** 切换音频包开关，并持久化。 */
export async function setAudioPackPref(enabled: boolean): Promise<void> {
  currentAudioPack = enabled;
  try {
    await AsyncStorage.setItem(PREF_KEY_AUDIO_PACK, String(enabled));
  } catch {
    // 静默
  }
}

/**
 * 列出设备上的中文语音。
 * 排序：本地语音优先（不依赖网络，更稳定），其次按名称。
 */
export async function listChineseVoices(): Promise<VoiceOption[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter((v) => (v.language ?? '').toLowerCase().startsWith('zh'))
      .map((v) => {
        const extra = v as unknown as { localService?: boolean; voiceURI?: string };
        return {
          id:       v.identifier,
          name:     v.name,
          language: v.language,
          local:    !!extra.localService,
        };
      })
      .sort((a, b) => {
        if (a.local !== b.local) return a.local ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}
