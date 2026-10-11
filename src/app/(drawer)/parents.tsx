import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import {
  buildAdvice,
  topWrongChars,
  weekBuckets,
  weekSummary,
} from '@/features/parents/report';
import { ALL_HANZI, TOTAL_CHARS } from '@/features/shizi/quiz';
import { VoicePicker } from '@/features/speech/voice-picker';
import { UpdateCard } from '@/features/updates/update-card';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

/** 柱状图最高的一根对应的像素高度 */
const CHART_MAX_HEIGHT = 56;

export default function ParentsScreen() {
  const { state, learnedCount, practicedCount } = useProgress();

  const summary = useMemo(() => weekSummary(state.chars), [state.chars]);
  const buckets = useMemo(() => weekBuckets(state.chars), [state.chars]);
  const wrongChars = useMemo(() => topWrongChars(state.chars, ALL_HANZI, 8), [state.chars]);
  // 认错过的字总数（易错字列表只展示前 8 个，建议文案要用真实总数）
  const wrongTotal = useMemo(
    () => Object.values(state.chars).filter((c) => c.wrong > 0).length,
    [state.chars],
  );
  const advice = useMemo(
    () =>
      buildAdvice({
        learnedCount,
        practicedCount,
        streak: state.streak,
        weekPracticed: summary.practiced,
        weekActiveDays: summary.activeDays,
        wrongCount: wrongTotal,
      }),
    [learnedCount, practicedCount, state.streak, summary, wrongTotal],
  );

  // 还没有任何练习记录 —— 显示友好引导，不铺一堆 0
  // （语音设置要在这种情况下也能用，家长第一次进来就要能挑语音）
  if (practicedCount === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="给爸爸妈妈" right={<StarBadge count={state.stars} />} />
        <ScrollView contentContainerStyle={styles.emptyBody} showsVerticalScrollIndicator={false}>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧</Text>
            <Text style={styles.emptyTitle}>学习报告还在等第一笔记录</Text>
            <Text style={styles.emptyDesc}>
              陪孩子在「识字乐园」练上几个字，这里就会记录下他的每一点进步。
            </Text>
          </View>
          <VoicePicker />
          <UpdateCard />
        </ScrollView>
      </View>
    );
  }

  const ratio = Math.min(1, learnedCount / TOTAL_CHARS);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <View style={styles.root}>
      <ScreenHeader title="给爸爸妈妈" right={<StarBadge count={state.stars} />} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 学习总览 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>学习总览</Text>

          <View style={styles.progressHead}>
            <Text style={styles.progressLead}>已认识</Text>
            <Text style={styles.progressNum}>{learnedCount}</Text>
            <Text style={styles.progressTail}>/ {TOTAL_CHARS} 字</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
          </View>

          <View style={styles.grid}>
            <Metric label="认识的字" value={learnedCount} suffix="字" icon="leaf-outline" />
            <Metric label="练过的字" value={practicedCount} suffix="字" icon="pencil-outline" />
            <Metric label="连续打卡" value={state.streak} suffix="天" icon="flame-outline" />
            <Metric
              label="累计答题"
              value={state.totalAnswers}
              suffix="次"
              icon="checkmark-circle-outline"
            />
          </View>
        </View>

        {/* 最近 7 天表现 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>最近 7 天</Text>
            <Text style={styles.cardHint}>每天坚持一点点</Text>
          </View>

          <View style={styles.chart}>
            {buckets.map((b, i) => (
              <View key={b.start} style={styles.chartCol}>
                <Text style={styles.chartCount}>{b.count > 0 ? b.count : ''}</Text>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: barHeight(b.count, maxCount) },
                      i === buckets.length - 1 && styles.chartBarToday,
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{b.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.weekStats}>
            <WeekStat label="这周练过" value={`${summary.practiced} 字`} />
            <WeekStat label="答对率" value={`${summary.accuracy}%`} />
            <WeekStat label="练习天数" value={`${summary.activeDays} 天`} />
          </View>
        </View>

        {/* 需要留意的字 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>需要留意的字</Text>
            {wrongChars.length > 0 && <Text style={styles.cardHint}>多读两遍就熟啦</Text>}
          </View>

          {wrongChars.length === 0 ? (
            <Text style={styles.cardSub}>目前还没有容易认错的字，保持得不错。</Text>
          ) : (
            <View style={styles.chips}>
              {wrongChars.map((h) => (
                <View key={h.char} style={styles.chip}>
                  <Text style={styles.chipChar}>{h.char}</Text>
                  <Text style={styles.chipPinyin}>{h.pinyin}</Text>
                  <Text style={styles.chipWrong}>错 {h.wrong} 次</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 给家长的小建议 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="heart-outline" size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>给家长的小建议</Text>
          </View>
          <View style={styles.adviceList}>
            {advice.map((text, i) => (
              <View key={i} style={styles.adviceRow}>
                <View style={styles.adviceDot} />
                <Text style={styles.adviceText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 朗读语音（家长设一次就行） */}
        <VoicePicker />

        {/* 版本与在线更新 */}
        <UpdateCard />

        <Text style={styles.footer}>每个孩子都有自己的节奏，陪伴比速度更重要</Text>
      </ScrollView>
    </View>
  );
}

/** 柱高：至少留一点「有练过」的视觉高度，最高的一根顶到 CHART_MAX_HEIGHT */
function barHeight(count: number, max: number): number {
  if (count <= 0) return 4;
  return Math.max(10, Math.round((count / max) * CHART_MAX_HEIGHT));
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

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.weekStat}>
      <Text style={styles.weekStatValue}>{value}</Text>
      <Text style={styles.weekStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  emptyBody: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyEmoji: { fontSize: 72, lineHeight: 84 },
  emptyTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyDesc: {
    fontSize: font.small,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  cardHint: { fontSize: font.tiny, color: colors.textMuted, flex: 1, textAlign: 'right' },
  cardSub: { fontSize: font.small, color: colors.textSub, lineHeight: 20 },

  progressHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  progressLead: { fontSize: font.body, color: colors.textSub },
  progressNum: { fontSize: 34, fontWeight: '700', color: colors.primary, lineHeight: 40 },
  progressTail: { fontSize: font.small, color: colors.textMuted },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.leaf },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  metric: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricValue: { fontSize: font.h2, fontWeight: '700', color: colors.text },
  metricSuffix: { fontSize: font.tiny, color: colors.textMuted },
  metricLabel: { fontSize: font.tiny, color: colors.textSub },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  chartCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  chartCount: { fontSize: 10, color: colors.textMuted, height: 14 },
  chartBarTrack: { height: CHART_MAX_HEIGHT, justifyContent: 'flex-end' },
  chartBar: {
    width: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  chartBarToday: { backgroundColor: colors.leaf },
  chartLabel: { fontSize: font.tiny, color: colors.textSub },

  weekStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  weekStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  weekStatValue: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  weekStatLabel: { fontSize: font.tiny, color: colors.textMuted },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    minWidth: 62,
    gap: 1,
  },
  chipChar: { fontSize: 20, color: colors.text },
  chipPinyin: { fontSize: 10, color: colors.textMuted },
  chipWrong: { fontSize: 10, color: colors.err },

  adviceList: { gap: spacing.md },
  adviceRow: { flexDirection: 'row', gap: spacing.sm },
  adviceDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.leaf,
    marginTop: 7,
  },
  adviceText: { flex: 1, fontSize: font.small, color: colors.textSub, lineHeight: 21 },

  footer: {
    textAlign: 'center',
    fontSize: font.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
