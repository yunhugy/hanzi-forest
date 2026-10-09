import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import { TOTAL_CHARS } from '@/features/shizi/quiz';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { state, learnedCount, practicedCount } = useProgress();

  const ratio = Math.min(1, learnedCount / TOTAL_CHARS);
  // 每 60 个字长高一档，共 10 档，树越来越大
  const stage = Math.min(9, Math.floor(learnedCount / 60));

  return (
    <View style={styles.root}>
      <ScreenHeader title="我的小森林" right={<StarBadge count={state.stars} />} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* 森林成长卡片 */}
        <View style={styles.forestCard}>
          <Text style={styles.forestEmoji}>{['🌱', '🌿', '☘️', '🪴', '🌳', '🌳', '🌳', '🌲', '🌲', '🌲'][stage]}</Text>
          <Text style={styles.forestTitle}>
            {learnedCount === 0 ? '森林还在等第一颗种子' : `森林长到第 ${stage + 1} 档了`}
          </Text>
          <Text style={styles.forestSub}>每认识一个字，森林就长大一点</Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.barLabel}>
            已认识 {learnedCount} / {TOTAL_CHARS} 字
          </Text>
        </View>

        {/* 今日主行动 */}
        <Pressable
          style={styles.cta}
          onPress={() => router.push('/shizi' as never)}>
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>
              {practicedCount === 0 ? '开始今天的识字' : '继续识字'}
            </Text>
            <Text style={styles.ctaSub}>8 道题，几分钟就好</Text>
          </View>
          <View style={styles.ctaIcon}>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </View>
        </Pressable>

        {/* 三个小数据 */}
        <View style={styles.statsRow}>
          <StatCard label="认识的字" value={learnedCount} icon="leaf-outline" />
          <StatCard label="练过的字" value={practicedCount} icon="pencil-outline" />
          <StatCard label="连续天数" value={state.streak} icon="flame-outline" />
        </View>

        <Text style={styles.footer}>每个孩子都有自己的节奏，陪伴比速度更重要</Text>
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  forestCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  forestEmoji: { fontSize: 76, lineHeight: 88 },
  forestTitle: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  forestSub: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.xs },
  barTrack: {
    width: '100%',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.leaf },
  barLabel: { fontSize: font.small, color: colors.textSub, marginTop: spacing.md },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    ...shadow.soft,
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { fontSize: font.h3, fontWeight: '700', color: colors.white },
  ctaSub: { fontSize: font.small, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 3,
    ...shadow.soft,
  },
  statValue: { fontSize: font.h2, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.textMuted },

  footer: {
    textAlign: 'center',
    fontSize: font.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
