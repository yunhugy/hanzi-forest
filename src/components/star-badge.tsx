import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

/** 星星计数徽章 */
export function StarBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="star" size={14} color={colors.gold} />
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  count: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
