import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';

/** 星星计数徽章：星星变多时弹一下，给答题一个即时的正反馈 */
export function StarBadge({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      scale.setValue(1);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          useNativeDriver: true,
          speed: 40,
          bounciness: 16,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 24,
          bounciness: 8,
        }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, scale]);

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
      <Ionicons name="star" size={14} color={colors.gold} />
      <Text style={styles.count}>{count}</Text>
    </Animated.View>
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
