import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { dueChars, nextReviewAtFor } from '@/features/review/schedule';

const STORAGE_KEY = 'hanzi-forest:progress:v1';

export type CharProgress = {
  /** 认对次数 */
  correct: number;
  /** 认错次数 */
  wrong: number;
  /** 最后练习时间戳 */
  lastAt: number;
  /** 连续答对次数 —— 复习间隔的依据；旧存档没有这个字段，按 0 处理 */
  streakCorrect?: number;
  /** 下次该复习的时间戳；缺失或 0 视为「今天就该复习」（兼容旧存档） */
  nextReviewAt?: number;
};

export type ProgressState = {
  /** 已练过的字：char -> 进度 */
  chars: Record<string, CharProgress>;
  /** 星星总数 */
  stars: number;
  /** 累计答题数 */
  totalAnswers: number;
  /** 连续打卡天数 */
  streak: number;
  /** 最后活跃日期 YYYY-MM-DD */
  lastActiveDate: string;
};

const INITIAL: ProgressState = {
  chars: {},
  stars: 0,
  totalAnswers: 0,
  streak: 0,
  lastActiveDate: '',
};

/** 判定「已认识」的门槛：答对 2 次 */
export const MASTERED_THRESHOLD = 2;

function todayStr() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function diffDays(a: string, b: string) {
  if (!a || !b) return 999;
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}

type Ctx = {
  state: ProgressState;
  ready: boolean;
  /** 记录一次答题 */
  record: (char: string, correct: boolean) => void;
  /** 已认识的字数 */
  learnedCount: number;
  /** 已练过的字数 */
  practicedCount: number;
  /** 今天该复习的字数（首页 / 家长中心展示用） */
  dueReviewCount: number;
  reset: () => void;
};

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(INITIAL);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // 读取本地存档
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && alive) {
          const parsed = JSON.parse(raw) as Partial<ProgressState>;
          setState({ ...INITIAL, ...parsed, chars: parsed.chars ?? {} });
        }
      } catch {
        // 存档损坏就当作全新开始，不阻断使用
      } finally {
        if (alive) {
          hydrated.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 存档落盘（防抖）
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [state]);

  const record = useCallback((char: string, correct: boolean) => {
    setState((prev) => {
      const today = todayStr();
      const prevChar = prev.chars[char] ?? { correct: 0, wrong: 0, lastAt: 0 };
      const gap = diffDays(prev.lastActiveDate, today);
      // 同一天不重复累加连续天数；隔天 +1；断了重来
      const streak = gap === 0 ? Math.max(prev.streak, 1) : gap === 1 ? prev.streak + 1 : 1;

      // 复习计划：答对连对次数 +1，答错清零重来
      const nextStreakCorrect = correct ? (prevChar.streakCorrect ?? 0) + 1 : 0;

      return {
        chars: {
          ...prev.chars,
          [char]: {
            correct: prevChar.correct + (correct ? 1 : 0),
            wrong: prevChar.wrong + (correct ? 0 : 1),
            lastAt: Date.now(),
            streakCorrect: nextStreakCorrect,
            nextReviewAt: nextReviewAtFor(correct, nextStreakCorrect),
          },
        },
        stars: prev.stars + (correct ? 1 : 0),
        totalAnswers: prev.totalAnswers + 1,
        streak,
        lastActiveDate: today,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ ...INITIAL, lastActiveDate: todayStr(), streak: 1 });
  }, []);

  const learnedCount = useMemo(
    () => Object.values(state.chars).filter((c) => c.correct >= MASTERED_THRESHOLD).length,
    [state.chars],
  );

  const practicedCount = useMemo(() => Object.keys(state.chars).length, [state.chars]);

  const dueReviewCount = useMemo(() => dueChars(state.chars).length, [state.chars]);

  const value = useMemo(
    () => ({ state, ready, record, learnedCount, practicedCount, dueReviewCount, reset }),
    [state, ready, record, learnedCount, practicedCount, dueReviewCount, reset],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress 必须在 ProgressProvider 内使用');
  return ctx;
}
