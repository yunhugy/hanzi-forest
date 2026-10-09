import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import charEmoji from '@/data/char-emoji.json';
import { ALL_HANZI } from '@/features/shizi/quiz';
import { MASTERED_THRESHOLD, useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

const EMOJI = charEmoji as Record<string, string>;

export default function CardsScreen() {
  const { state } = useProgress();

  const cards = useMemo(() => {
    const byChar = new Map(ALL_HANZI.map((h) => [h.char, h]));
    return Object.entries(state.chars)
      .map(([char, cp]) => ({ hanzi: byChar.get(char), cp }))
      .filter((x) => x.hanzi)
      .sort((a, b) => b.cp.lastAt - a.cp.lastAt);
  }, [state.chars]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="我的汉字卡" right={<StarBadge count={state.stars} />} />

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🃏</Text>
          <Text style={styles.emptyTitle}>还没有汉字卡</Text>
          <Text style={styles.emptyDesc}>去「识字乐园」练几个字，这里就会收集到卡片。</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.hanzi!.char}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const mastered = item.cp.correct >= MASTERED_THRESHOLD;
            return (
              <View style={[styles.card, mastered && styles.cardMastered]}>
                {EMOJI[item.hanzi!.char] && (
                  <Text style={styles.cardEmoji}>{EMOJI[item.hanzi!.char]}</Text>
                )}
                <Text style={styles.cardChar}>{item.hanzi!.char}</Text>
                <Text style={styles.cardPinyin}>{item.hanzi!.pinyin}</Text>
                <View style={styles.cardStat}>
                  <Ionicons
                    name={mastered ? 'star' : 'star-outline'}
                    size={11}
                    color={mastered ? colors.gold : colors.textMuted}
                  />
                  <Text style={styles.cardStatText}>
                    {item.cp.correct} 对 / {item.cp.wrong} 错
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 72, lineHeight: 84 },
  emptyTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyDesc: {
    fontSize: font.small,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },

  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { gap: spacing.md, marginBottom: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
    ...shadow.soft,
  },
  cardMastered: { backgroundColor: colors.primarySoft },
  cardEmoji: { fontSize: 26, lineHeight: 32 },
  cardChar: { fontSize: font.hanziM, fontWeight: '700', color: colors.text },
  cardPinyin: { fontSize: font.tiny, color: colors.primary },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs },
  cardStatText: { fontSize: 10, color: colors.textMuted },
});
