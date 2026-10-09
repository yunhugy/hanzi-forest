import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

/**
 * 朗读语音的选择与记忆。
 *
 * ## 为什么需要
 *
 * expo-speech 在 web 端包的是浏览器的 `window.speechSynthesis`，
 * 实际发声的是**操作系统自带的 TTS 引擎**。不同机器装的语音差别很大 ——
 * 有的只有一两个中文语音（音质还一般），有的装了五六个。
 * 系统默认挑的那个不一定好听，所以让家长自己选一个。
 *
 * 选择结果存在本地，下次打开还是同一个。
 */

const PREF_KEY = 'hanzi-forest:speech:voice:v1';

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

export function getVoicePref(): string | null {
  return currentVoiceId;
}

/** 从本地存档读偏好。应用启动时调一次即可。 */
export async function hydrateVoicePref(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    currentVoiceId = raw || null;
  } catch {
    currentVoiceId = null;
  }
  return currentVoiceId;
}

/** 记住选择的语音；传 null 表示回到系统默认。 */
export async function setVoicePref(id: string | null): Promise<void> {
  currentVoiceId = id;
  try {
    if (id) await AsyncStorage.setItem(PREF_KEY, id);
    else await AsyncStorage.removeItem(PREF_KEY);
  } catch {
    // 存不下也不影响本次会话
  }
}

/**
 * 列出设备上的中文语音。
 *
 * 排序：本地语音优先（不依赖网络，更稳定），其次按名称。
 * 浏览器在页面刚加载时 voices 列表可能是空的 —— expo-speech 内部已经处理了
 * 这个时序问题（监听 onvoiceschanged），所以直接 await 就行。
 */
export async function listChineseVoices(): Promise<VoiceOption[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter((v) => (v.language ?? '').toLowerCase().startsWith('zh'))
      .map((v) => {
        // web 端会多带 localService / voiceURI，原生端没有
        const extra = v as unknown as { localService?: boolean; voiceURI?: string };
        return {
          id: v.identifier,
          name: v.name,
          language: v.language,
          local: !!extra.localService,
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
