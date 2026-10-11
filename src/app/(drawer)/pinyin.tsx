import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import {
  buildPinyinRound,
  PINYIN_MODES,
  poolSizeOf,
  usesTier,
  type PinyinMode,
  type PinyinQuestion,
} from '@/features/pinyin/quiz';
import type { TierFilter } from '@/features/shizi/quiz';
import { hapticLight, playSfx } from '@/features/sound/effects';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

const TIERS: { value: TierFilter; label: string }[] = [
  { value: 0, label: '全部' },
  { value: 1, label: '初识' },
  { value: 2, label: '进阶' },
  { value: 3, label: '探索' },
];

export default function PinyinScreen() {
  const { record, state } = useProgress();

  const [tier, setTier] = useState<TierFilter>(0);
  const [mode, setMode] = useState<PinyinMode>('pinyin-to-word');
  const [round, setRound] = useState<PinyinQuestion[]>(() =>
    buildPinyinRound(0, 'pinyin-to-word'),
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = round[index];
  const group = question?.group;
  const answered = picked !== null;
  const isRight = answered && question != null && picked === question.correct;

  const restart = useCallback((nextTier: TierFilter, nextMode: PinyinMode) => {
    setRound(buildPinyinRound(nextTier, nextMode));
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  }, []);

  const changeTier = (next: TierFilter) => {
    setTier(next);
    restart(next, mode);
  };

  const changeMode = (next: PinyinMode) => {
    setMode(next);
    restart(tier, next);
  };

  const onPick = (choice: string) => {
    if (answered || !question) return;
    setPicked(choice);
    const ok = choice === question.correct;
    if (ok) {
      playSfx('correct');
      hapticLight();
      setCorrectCount((c) => c + 1);
    } else {
      playSfx('wrong');
    }
    // 按题里的每个字记账，和词语闯关保持一致
    question.chars.forEach((c) => record(c, ok));
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
      <ScreenHeader title="拼音练习" right={<StarBadge count={state.stars} />} />

      {/* 题型：五种，横向滚动 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeRow}>
        {PINYIN_MODES.map((m) => {
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
      </ScrollView>

      {/* 范围：数量随题型变（声调题是「字」，其余是「词」）。
          判断类别 / 分类筐考的是声母表、韵母表本身，不分难度，所以不显示。 */}
      {usesTier(mode) && (
        <View style={styles.tierRow}>
          {TIERS.map((t) => {
            const active = t.value === tier;
            const { count, unit } = poolSizeOf(t.value, mode);
            return (
              <Pressable
                key={t.value}
                onPress={() => changeTier(t.value)}
                style={[styles.tierChip, active && styles.tierChipActive]}>
                <Text style={[styles.tierLabel, active && styles.tierLabelActive]}>{t.label}</Text>
                <Text style={[styles.tierCount, active && styles.tierCountActive]}>
                  {count} {unit}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {finished || !question ? (
          <FinishCard
            correct={correctCount}
            total={round.length}
            onAgain={() => restart(tier, mode)}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.prompt}>{question.hint}</Text>

              {/* 分类筐：把整组摆出来，当前那个高亮、答过的标灰 ——
                  单看一个成分和同时看一组，后者才逼孩子做对比 */}
              {group && (
                <View style={styles.groupRow}>
                  {group.items.map((item, i) => (
                    <Text
                      key={item}
                      style={[
                        styles.groupChip,
                        i < group.index && styles.groupChipDone,
                        i === group.index && styles.groupChipNow,
                      ]}>
                      {item}
                    </Text>
                  ))}
                </View>
              )}

              {/* 题干主体 —— 刻意不给朗读按钮：
                  这个页面的重点就是让孩子自己拼读，读出来他就直接听了，
                  拼读这一步整个被跳过，练习也就白做了 */}
              <View style={styles.bodyBox}>
                <Text style={question.promptKind === 'pinyin' ? styles.bigPinyin : styles.bigWord}>
                  {question.prompt}
                </Text>
              </View>

              {/* 选项：竖排 —— 拼音串比较长，横排三个会挤成一团 */}
              <View style={styles.options}>
                {question.options.map((opt) => {
                  const chosen = picked === opt;
                  const rightOne = opt === question.correct;
                  let bg: string = colors.surfaceAlt;
                  let border: string = colors.borderSoft;
                  if (answered && rightOne) {
                    bg = colors.primarySoft;
                    border = colors.leaf;
                  } else if (chosen && !rightOne) {
                    bg = '#FBEDE9';
                    border = colors.err;
                  }
                  // 短选项（mā、p、íng）放大，长拼音串保持小一号
                  const short = opt.length <= 4;
                  const textStyle =
                    question.optionKind === 'word'
                      ? styles.optionWord
                      : short
                        ? styles.optionPinyinShort
                        : styles.optionPinyin;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => onPick(opt)}
                      style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                      <Text style={textStyle}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {answered && (
                <>
                  <Text style={[styles.feedback, { color: isRight ? colors.ok : colors.err }]}>
                    {isRight ? '答对啦 🌱' : `正确答案是「${question.correct}」`}
                  </Text>
                  {question.note ? <Text style={styles.note}>{question.note}</Text> : null}
                </>
              )}
              {!answered && <Text style={styles.hint}>自己先读一遍，再选。</Text>}
            </View>

            <View style={styles.footer}>
              <Text style={styles.progressText}>
                第 {index + 1} / {round.length} 题
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
      <Text style={styles.bigEmoji}>{correct >= total - 1 ? '🎉' : '🔤'}</Text>
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

  // 题型 chips：胶囊形，横向滚动
  modeRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  modeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  modeChipActive: { backgroundColor: colors.primary },
  modeLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
  modeLabelActive: { color: colors.white },

  // 范围 chips：四个平分一行
  tierRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierChip: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tierChipActive: { backgroundColor: colors.primarySoft },
  tierLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
  tierLabelActive: { color: colors.primaryDeep },
  tierCount: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  tierCountActive: { color: colors.primary },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  prompt: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },

  // 分类筐：整组 chips，当前高亮、答过的标灰
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  groupChip: {
    fontSize: font.h3,
    color: colors.textMuted,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    overflow: 'hidden',
  },
  groupChipDone: { color: colors.textMuted, backgroundColor: colors.borderSoft },
  groupChipNow: { color: colors.white, backgroundColor: colors.primary, fontWeight: '700' },

  bodyBox: { alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },

  // 拼音串用等宽感的字号，声调符号才不挤
  bigPinyin: { fontSize: 38, color: colors.primary, letterSpacing: 1.5, lineHeight: 50 },
  bigWord: {
    fontSize: font.hanziXL,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 86,
    letterSpacing: 4,
  },

  // 竖排：拼音串长，三个并排会挤成一团
  options: { width: '100%', gap: spacing.md },
  option: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optionWord: { fontSize: font.hanziM, fontWeight: '600', color: colors.text, letterSpacing: 3 },
  optionPinyin: { fontSize: font.h2, fontWeight: '600', color: colors.text, letterSpacing: 0.5 },
  optionPinyinShort: {
    fontSize: font.hanziM,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
  },

  feedback: { fontSize: font.body, marginTop: spacing.lg, fontWeight: '600' },
  note: { fontSize: font.small, color: colors.textSub, marginTop: spacing.sm },
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

  bigEmoji: { fontSize: 96, lineHeight: 112 },
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
