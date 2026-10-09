import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import { ALL_HANZI } from '@/features/shizi/quiz';
import { MASTERED_THRESHOLD, useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function GrowthScreen() {
  const { state, learnedCount, practicedCount } = useProgress();

  const { correctSum, wrongSum, accuracy } = useMemo(() => {
    let c = 0;
    let w = 0;
    for (const v of Object.values(state.chars)) {
      c += v.correct;
      w += v.wrong;
    }
    const total = c + w;
    return { correctSum: c, wrongSum: w, accuracy: total === 0 ? 0 : Math.round((c / total) * 100) };
  }, [state.chars]);

  const recent = useMemo(() => {
    const byChar = new Map(ALL_HANZI.map((h) => [h.char, h]));
    return Object.entries(state.chars)
      .sort((a, b) => b[1].lastAt - a[1].lastAt)
      .slice(0, 12)
      .map(([char]) => byChar.get(char))
      .filter(Boolean);
  }, [state.chars]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="成长足迹" right={<StarBadge count={state.stars} />} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 四宫格统计 */}
        <View style={styles.grid}>
          <Metric label="认识的字" value={learnedCount} suffix="字" icon="leaf-outline" />
          <Metric label="练过的字" value={practicedCount} suffix="字" icon="pencil-outline" />
          <Metric label="正确率" value={accuracy} suffix="%" icon="checkmark-circle-outline" />
          <Metric label="连续天数" value={state.streak} suffix="天" icon="flame-outline" />
        </View>

        {/* 答题总量 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>答题总量</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.bigNumber}>{state.totalAnswers}</Text>
            <Text style={styles.cardSub}>
              其中答对 {correctSum} 次 · 答错 {wrongSum} 次
            </Text>
          </View>
        </View>

        {/* 最近练的字 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>最近练的字</Text>
          {recent.length === 0 ? (
            <Text style={styles.cardSub}>还没有记录，去识字乐园练一轮吧。</Text>
          ) : (
            <View style={styles.chips}>
              {recent.map((h) => (
                <View
                  key={h!.char}
                  style={[
                    styles.chip,
                    state.chars[h!.char].correct >= MASTERED_THRESHOLD && styles.chipMastered,
                  ]}>
                  <Text style={styles.chipChar}>{h!.char}</Text>
                  <Text style={styles.chipPinyin}>{h!.pinyin}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>每个孩子都有自己的节奏，陪伴比速度更重要</Text>
      </ScrollView>
    </View>
  );
}

function Metric({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricSuffix}>{suffix}</Text>
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadow.soft,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricValue: { fontSize: font.h1, fontWeight: '700', color: colors.text },
  metricSuffix: { fontSize: font.small, color: colors.textMuted },
  metricLabel: { fontSize: font.tiny, color: colors.textSub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.card,
  },
  cardTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  bigNumber: { fontSize: 40, fontWeight: '700', color: colors.primary, lineHeight: 46 },
  cardSub: { fontSize: font.small, color: colors.textSub, flex: 1, lineHeight: 20 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    minWidth: 52,
  },
  chipMastered: { backgroundColor: colors.primarySoft },
  chipChar: { fontSize: 20, color: colors.text },
  chipPinyin: { fontSize: 10, color: colors.textMuted },

  footer: {
    textAlign: 'center',
    fontSize: font.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
