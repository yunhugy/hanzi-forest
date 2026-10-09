import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import {
  ALL_WORDS,
  buildWordRound,
  maskedWord,
  type WordMode,
  type WordQuestion,
} from '@/features/ciyu/words';
import type { TierFilter } from '@/features/shizi/quiz';
import { speak } from '@/features/speech/speak';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

const TIERS: { value: TierFilter; label: string }[] = [
  { value: 0, label: '全部词语' },
  { value: 1, label: '初识' },
  { value: 2, label: '进阶' },
  { value: 3, label: '探索' },
];

const MODES: { value: WordMode; label: string }[] = [
  { value: 'learn', label: '认词语' },
  { value: 'fill', label: '补字' },
  { value: 'listen', label: '听音选词' },
];

export default function CiyuScreen() {
  const { record, state } = useProgress();

  const [tier, setTier] = useState<TierFilter>(0);
  const [mode, setMode] = useState<WordMode>('learn');
  const [round, setRound] = useState<WordQuestion[]>(() => buildWordRound(0, 'learn'));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = round[index];
  const answered = picked !== null;

  const restart = useCallback((nextTier: TierFilter, nextMode: WordMode) => {
    setRound(buildWordRound(nextTier, nextMode));
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  }, []);

  const changeTier = (next: TierFilter) => {
    setTier(next);
    restart(next, mode);
  };

  const changeMode = (next: WordMode) => {
    setMode(next);
    restart(tier, next);
  };

  /** 当前档位下的可用词数 */
  const countFor = (value: TierFilter) =>
    value === 0 ? ALL_WORDS.length : ALL_WORDS.filter((w) => w.tier === value).length;

  /** 判定选项对不对 —— 补字题比「字」，听音题比「词」 */
  const isRightPick = (choice: string) =>
    mode === 'fill'
      ? choice === question.answer.chars[question.blankIndex]
      : choice === question.answer.word;

  const onPick = (choice: string) => {
    if (answered) return;
    setPicked(choice);
    const ok = isRightPick(choice);
    if (ok) setCorrectCount((c) => c + 1);
    // 按「词里的每个字」记账 —— 组词本身就是对这两个字的巩固，
    // 这样识字乐园 / 字库 / 成长足迹都能同步看到进度
    question.answer.chars.forEach((c) => record(c, ok));
  };

  const onNext = () => {
    if (index + 1 >= round.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="词语闯关" right={<StarBadge count={state.stars} />} />

      {/* 词库范围 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tierRow}>
        {TIERS.map((t) => {
          const active = t.value === tier;
          return (
            <Pressable
              key={t.value}
              onPress={() => changeTier(t.value)}
              style={[styles.tierChip, active && styles.tierChipActive]}>
              <Text style={[styles.tierLabel, active && styles.tierLabelActive]}>{t.label}</Text>
              <Text style={[styles.tierCount, active && styles.tierCountActive]}>
                {countFor(t.value)} 词
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 题型 */}
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const active = m.value === mode;
          return (
            <Pressable
              key={m.value}
              onPress={() => changeMode(m.value)}
              style={[styles.modeChip, active && styles.modeChipActive]}>
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {finished ? (
          <FinishCard
            correct={correctCount}
            total={round.length}
            onAgain={() => restart(tier, mode)}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.prompt}>{promptOf(mode)}</Text>

              {mode === 'learn' && <LearnBody question={question} />}
              {mode === 'fill' && (
                <FillBody question={question} picked={picked} onPick={onPick} />
              )}
              {mode === 'listen' && (
                <ListenBody question={question} picked={picked} onPick={onPick} />
              )}

              {answered && (
                <Text
                  style={[
                    styles.feedback,
                    { color: isRightPick(picked as string) ? colors.ok : colors.err },
                  ]}>
                  {isRightPick(picked as string)
                    ? '组词成功，这个词你记住啦 🌿'
                    : `没关系，是「${question.answer.word}」`}
                </Text>
              )}

              {!answered && mode !== 'learn' && (
                <Text style={styles.hint}>选一选，答错也没关系。</Text>
              )}
            </View>

            {/* 底部进度 + 下一步 */}
            <View style={styles.footer}>
              <Text style={styles.progressText}>
                第 {index + 1} / {round.length} 题
              </Text>
              <Pressable
                onPress={
                  mode === 'learn' && !answered ? () => onPick(question.answer.word) : onNext
                }
                disabled={mode === 'learn' ? false : !answered}
                style={[styles.nextBtn, (mode === 'learn' || answered) && styles.nextBtnOn]}>
                <Text style={styles.nextLabel}>
                  {mode === 'learn' && !answered ? '我认识了' : '下一题'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function promptOf(mode: WordMode) {
  switch (mode) {
    case 'fill':
      return '哪个字能补全这个词？';
    case 'listen':
      return '听一听，是哪个词？';
    default:
      return '认一认，读一读';
  }
}

/** 学习模式：看词形 + 拼音，可反复听 */
function LearnBody({ question }: { question: WordQuestion }) {
  const w = question.answer;
  return (
    <View style={styles.bodyBox}>
      <Text style={styles.bigWord}>{w.word}</Text>
      <Text style={styles.bigPinyin}>{w.pinyin}</Text>
      <Pressable style={styles.listenBtn} onPress={() => speak(w.word)}>
        <Ionicons name="volume-high" size={20} color={colors.primaryDeep} />
        <Text style={styles.listenLabel}>读给我听</Text>
      </Pressable>
    </View>
  );
}

/** 补字：词语挖掉一个字，从 3 个字里选 */
function FillBody({
  question,
  picked,
  onPick,
}: {
  question: WordQuestion;
  picked: string | null;
  onPick: (c: string) => void;
}) {
  const right = question.answer.chars[question.blankIndex];
  return (
    <View style={styles.bodyBox}>
      <Text style={styles.maskedWord}>{maskedWord(question)}</Text>
      <Text style={styles.bigPinyin}>{question.answer.pinyin}</Text>
      <View style={styles.options}>
        {question.charOptions.map((c) => (
          <OptionButton
            key={c}
            label={c}
            state={optionState(picked, c, right)}
            onPress={() => onPick(c)}
          />
        ))}
      </View>
    </View>
  );
}

/** 听音选词：放读音，从 3 个词里选 */
function ListenBody({
  question,
  picked,
  onPick,
}: {
  question: WordQuestion;
  picked: string | null;
  onPick: (w: string) => void;
}) {
  return (
    <View style={styles.bodyBox}>
      <View style={styles.listenRow}>
        <Pressable
          style={styles.listenBtn}
          onPress={() => speak(question.answer.word, { speed: 'slow' })}>
          <Ionicons name="volume-high" size={22} color={colors.primaryDeep} />
          <Text style={styles.listenLabel}>听一听</Text>
        </Pressable>
        <Pressable
          style={[styles.listenBtn, styles.listenBtnAlt]}
          onPress={() => speak(question.answer.word, { speed: 'slower' })}>
          <Ionicons name="volume-low" size={22} color={colors.primaryDeep} />
          <Text style={styles.listenLabel}>再慢点</Text>
        </Pressable>
      </View>
      <Text style={styles.listenHint}>每个词会念两遍，听不清就点「再慢点」</Text>
      <View style={styles.options}>
        {question.wordOptions.map((w) => (
          <OptionButton
            key={w.word}
            label={w.word}
            state={optionState(picked, w.word, question.answer.word)}
            onPress={() => onPick(w.word)}
          />
        ))}
      </View>
    </View>
  );
}

/** 选项三态：未作答 / 这是正确答案 / 这是选错的 */
type OptionState = 'idle' | 'right' | 'wrong';

function optionState(picked: string | null, choice: string, right: string): OptionState {
  if (picked === null) return 'idle';
  if (choice === right) return 'right';
  return choice === picked ? 'wrong' : 'idle';
}

function OptionButton({
  label,
  state,
  onPress,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
}) {
  // 答错底色与识字乐园保持一致
  const bg =
    state === 'right'
      ? colors.primarySoft
      : state === 'wrong'
        ? '#FBEDE9'
        : colors.surfaceAlt;
  const border =
    state === 'right' ? colors.leaf : state === 'wrong' ? colors.err : colors.borderSoft;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.optionChar, label.length > 1 && styles.optionWord]}>{label}</Text>
    </Pressable>
  );
}

function FinishCard({
  correct,
  total,
  onAgain,
}: {
  correct: number;
  total: number;
  onAgain: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.bigEmoji}>{correct >= total - 1 ? '🎉' : '🧩'}</Text>
      <Text style={styles.finishTitle}>这一轮完成啦</Text>
      <Text style={styles.finishSub}>
        答对 {correct} / {total} 题
      </Text>
      <Pressable style={styles.againBtn} onPress={onAgain}>
        <Text style={styles.againLabel}>再来一轮</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  tierRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  tierChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 92,
  },
  tierChipActive: { backgroundColor: colors.primary },
  tierLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
  tierLabelActive: { color: colors.white },
  tierCount: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  tierCountActive: { color: 'rgba(255,255,255,0.75)' },

  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modeChipActive: { backgroundColor: colors.primarySoft },
  modeLabel: { fontSize: font.tiny, color: colors.textMuted },
  modeLabelActive: { color: colors.primaryDeep, fontWeight: '700' },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  prompt: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  bodyBox: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  bigEmoji: { fontSize: 96, lineHeight: 112 },

  // 词语用大字号 + 字距，两个字之间有呼吸感；挖空题同款尺寸，避免换题时跳动
  bigWord: {
    fontSize: font.hanziXL,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 86,
    letterSpacing: 4,
  },
  maskedWord: {
    fontSize: font.hanziXL,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 86,
    letterSpacing: 4,
  },
  bigPinyin: { fontSize: font.h2, color: colors.primary, letterSpacing: 1 },

  listenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  listenHint: { fontSize: font.tiny, color: colors.textMuted },

  options: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  option: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionChar: { fontSize: font.hanziM, fontWeight: '700', color: colors.text },
  // 选项是词语（两个字）时收小一号，避免撑破卡片
  optionWord: { fontSize: font.h2 },

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

  finishTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  finishSub: { fontSize: font.body, color: colors.textSub, marginTop: spacing.xs },
  againBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  againLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },
});
