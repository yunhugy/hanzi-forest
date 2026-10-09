import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from 'expo-router/react-navigation';
import { useNavigation } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/theme';

type Props = {
  title: string;
  right?: React.ReactNode;
};

/** 通用页头：左侧抽屉按钮 + 居中标题 + 右侧插槽 */
export function ScreenHeader({ title, right }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <Pressable
        hitSlop={10}
        style={styles.iconBtn}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu-outline" size={24} color={colors.text} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.right}>{right ?? <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
  },
  right: { width: 40, alignItems: 'flex-end' },
  placeholder: { width: 40, height: 40 },
});
