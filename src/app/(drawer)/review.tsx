import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import { dueChars } from '@/features/review/schedule';
import { ALL_HANZI, shuffle, type HanziItem } from '@/features/shizi/quiz';
import { speak } from '@/features/speech/speak';
import { hapticLight, playSfx } from '@/features/sound/effects';
import { useProgress, type CharProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

/**
 * 今日复习 —— 只练「该复习了」的字。
 *
 * 题源由 review/schedule 的间隔重复算法决定（答错的明天回炉，
 * 连对的间隔越拉越长）。题型统一用「听音选字」：
 * 纯靠耳朵辨认，最能检验是不是真记住了。
 */

/** 一轮复习几道题 */
const REVIEW_ROUND = 8;

type Question = { answer: HanziItem; options: HanziItem[] };

/** 把进度里的到期字映射成字库条目 */
function dueItems(chars: Record<string, CharProgress>): HanziItem[] {
  const byChar = new Map(ALL_HANZI.map((h) => [h.char, h]));
  return dueChars(chars)
    .map((c) => byChar.get(c))
    .filter((x): x is HanziItem => Boolean(x));
}

/** 出题：干扰项优先选「拼音不同」的字，避免两个选项读音一样 */
function buildReviewRound(dueList: HanziItem[], size = REVIEW_ROUND): Question[] {
  const picked = shuffle(dueList).slice(0, size);
  return picked.map((answer) => {
    const distractors = shuffle(
      ALL_HANZI.filter((h) => h.char !== answer.char && h.pinyin !== answer.pinyin),
    ).slice(0, 2);
    return { answer, options: shuffle([answer, ...distractors]) };
  });
}

export default function ReviewScreen() {
  const router = useRouter();
  const { state, ready, record } = useProgress();

  // null = 还没定题；[] = 今天没有要复习的
  const [round, setRound] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // 存档就绪后锁定本轮题目（练习中 nextReviewAt 会变，不该影响这一轮）
  useEffect(() => {
    if (round !== null || !ready) return;
    setRound(buildReviewRound(dueItems(state.chars)));
  }, [round, ready, state.chars]);

  const question = round?.[index];
  const answered = picked !== null;
  const isRight = answered && question != null && picked === question.answer.char;

  // 每题自动读一遍，孩子不用先找按钮
  useEffect(() => {
    if (!question) return;
    speak(question.answer.char, { speed: 'slow' });
  }, [question]);

  const onPick = (char: string) => {
    if (answered || !question) return;
    setPicked(char);
    const ok = char === question.answer.char;
    if (ok) {
      playSfx('correct');
      hapticLight();
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('wrong');
    }
    record(question.answer.char, ok);
  };

  const onNext = () => {
    if (!round) return;
    if (index + 1 >= round.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  /** 再练一轮：重新取此刻到期的字（刚答对的已经排到以后了） */
  const restart = useCallback(() => {
    setRound(buildReviewRound(dueItems(state.chars)));
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  }, [state.chars]);

  const empty = round !== null && round.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeader title="今日复习" right={<StarBadge count={state.stars} />} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {empty ? (
          <View style={styles.card}>
            <Text style={styles.bigEmoji}>🌳</Text>
            <Text style={styles.finishTitle}>今天没有要复习的字</Text>
            <Text style={styles.finishSub}>之前练过的字都还记着呢，去「识字乐园」认几个新字吧。</Text>
            <Pressable style={styles.againBtn} onPress={() => router.push('/shizi' as never)}>
              <Text style={styles.againLabel}>去识字乐园</Text>
            </Pressable>
          </View>
        ) : finished ? (
          <View style={styles.card}>
            <Text style={styles.bigEmoji}>{correctCount >= round!.length - 1 ? '🎉' : '🌿'}</Text>
            <Text style={styles.finishTitle}>复习完成啦</Text>
            <Text style={styles.finishSub}>
              答对 {correctCount} / {round!.length} 题
            </Text>
            <Text style={styles.finishNote}>
              答错的字明天还会再来找你，答对的字要过几天才见啦。
            </Text>
            <Pressable style={styles.againBtn} onPress={restart}>
              <Text style={styles.againLabel}>再练一轮</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={() => router.push('/' as never)}>
              <Text style={styles.ghostLabel}>回首页</Text>
            </Pressable>
          </View>
        ) : !question ? (
          <View style={styles.card}>
            <Text style={styles.bigEmoji}>⏳</Text>
            <Text style={styles.finishSub}>正在准备题目…</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.prompt}>听一听，是哪个字？</Text>

              <View style={styles.bodyBox}>
                <Pressable
                  style={styles.listenBtn}
                  onPress={() => speak(question.answer.char, { speed: 'slow' })}>
                  <Ionicons name="volume-high" size={26} color={colors.primaryDeep} />
                  <Text style={styles.listenLabel}>再听一遍</Text>
                </Pressable>
                <Pressable
                  style={[styles.listenBtn, styles.listenBtnAlt]}
                  onPress={() => speak(question.answer.char, { speed: 'slower' })}>
                  <Ionicons name="volume-low" size={22} color={colors.primaryDeep} />
                  <Text style={styles.listenLabel}>再慢点</Text>
                </Pressable>
              </View>

              <View style={styles.options}>
                {question.options.map((opt) => {
                  const chosen = picked === opt.char;
                  const rightOne = opt.char === question.answer.char;
                  let bg: string = colors.surfaceAlt;
                  let border: string = colors.borderSoft;
                  if (answered && rightOne) {
                    bg = colors.primarySoft;
                    border = colors.leaf;
                  } else if (chosen && !rightOne) {
                    bg = '#FBEDE9';
                    border = colors.err;
                  }
                  return (
                    <Pressable
                      key={opt.char}
                      onPress={() => onPick(opt.char)}
                      style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={styles.optionChar}>{opt.char}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {answered && (
                <Text style={[styles.feedback, { color: isRight ? colors.ok : colors.err }]}>
                  {isRight ? '答对啦，记得真牢 🌱' : `没关系，这个是「${question.answer.char}」`}
                </Text>
              )}
              {!answered && <Text style={styles.hint}>勇敢试一试，答错也没关系。</Text>}
            </View>

            <View style={styles.footer}>
              <Text style={styles.progressText}>
                第 {index + 1} / {round!.length} 题
              </Text>
              <Pressable
                onPress={onNext}
                disabled={!answered}
                style={[styles.nextBtn, answered && styles.nextBtnOn]}>
                <Text style={styles.nextLabel}>下一题</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  prompt: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  bodyBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },

  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  listenBtnAlt: { backgroundColor: colors.surfaceAlt },
  listenLabel: { fontSize: font.body, color: colors.primaryDeep, fontWeight: '600' },

  options: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  option: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optionChar: { fontSize: font.hanziM, fontWeight: '700', color: colors.text },

  feedback: { fontSize: font.body, marginTop: spacing.lg, fontWeight: '600' },
  hint: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing.lg },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: font.small, color: colors.textSub },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  nextBtnOn: { backgroundColor: colors.primary },
  nextLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },

  bigEmoji: { fontSize: 72, lineHeight: 86 },
  finishTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  finishSub: {
    fontSize: font.body,
    color: colors.textSub,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
  finishNote: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  againBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  againLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },
  ghostBtn: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  ghostLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
});
