import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import charEmoji from '@/data/char-emoji.json';
import { imageOf } from '@/data/char-images';
import { poolOf, TOTAL_CHARS, type HanziItem, type TierFilter } from '@/features/shizi/quiz';
import { MASTERED_THRESHOLD, useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

const EMOJI = charEmoji as Record<string, string>;

const FILTERS: { value: TierFilter; label: string }[] = [
  { value: 0, label: '全部' },
  { value: 1, label: '初识' },
  { value: 2, label: '进阶' },
  { value: 3, label: '探索' },
];

export default function ZikuScreen() {
  const { state } = useProgress();
  const [tier, setTier] = useState<TierFilter>(0);
  const [detail, setDetail] = useState<HanziItem | null>(null);

  const list = useMemo(() => poolOf(tier), [tier]);

  return (
    <View style={styles.root}>
      <ScreenHeader title={`${TOTAL_CHARS} 字库`} right={<StarBadge count={state.stars} />} />

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.value === tier;
          return (
            <Pressable
              key={f.value}
              onPress={() => setTier(f.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.char}
        numColumns={6}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cp = state.chars[item.char];
          const mastered = (cp?.correct ?? 0) >= MASTERED_THRESHOLD;
          const touched = !!cp;
          return (
            <Pressable style={styles.cell} onPress={() => setDetail(item)}>
              <View
                style={[
                  styles.cellInner,
                  touched && styles.cellTouched,
                  mastered && styles.cellMastered,
                ]}>
                <Text style={styles.cellChar}>{item.char}</Text>
              </View>
              {mastered && (
                <View style={styles.dot}>
                  <Ionicons name="star" size={7} color={colors.gold} />
                </View>
              )}
            </Pressable>
          );
        }}
      />

      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {detail && (
              <>
                {imageOf(detail.char) ? (
                  <Image
                    source={imageOf(detail.char)}
                    style={styles.sheetPic}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  EMOJI[detail.char] && <Text style={styles.sheetEmoji}>{EMOJI[detail.char]}</Text>
                )}
                <Text style={styles.sheetChar}>{detail.char}</Text>
                <Text style={styles.sheetPinyin}>{detail.pinyin}</Text>
                <Text style={styles.sheetTier}>
                  {detail.tier === 1 ? '初识汉字' : detail.tier === 2 ? '进阶练习' : '继续探索'}
                </Text>
                <Pressable style={styles.sheetClose} onPress={() => setDetail(null)}>
                  <Text style={styles.sheetCloseLabel}>知道了</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterLabel: { fontSize: font.small, color: colors.textSub },
  filterLabelActive: { color: colors.white, fontWeight: '600' },

  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  gridRow: { gap: spacing.sm, marginBottom: spacing.sm },
  cell: { flex: 1, aspectRatio: 1, position: 'relative' },
  cellInner: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTouched: { backgroundColor: colors.primarySofter },
  cellMastered: { backgroundColor: colors.primarySoft },
  cellChar: { fontSize: 22, color: colors.text },
  dot: { position: 'absolute', top: 3, right: 3 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(46,51,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  sheetEmoji: { fontSize: 60, lineHeight: 72 },
  sheetPic: { width: 148, height: 148, borderRadius: radius.lg },
  sheetChar: { fontSize: font.hanziXL, fontWeight: '700', color: colors.text, lineHeight: 86 },
  sheetPinyin: { fontSize: font.h2, color: colors.primary, letterSpacing: 1 },
  sheetTier: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing.sm },
  sheetClose: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  sheetCloseLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },
});
