import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOTAL_WORDS } from '@/features/ciyu/words';
import { TOTAL_CHARS } from '@/features/shizi/quiz';
import { useProgress } from '@/store/progress';
import { colors, font, radius, spacing } from '@/theme';

/** 侧边栏菜单（对应截图里的主导航） */
const MENU = [
  { route: '/shizi', label: '识字乐园', icon: 'leaf-outline' },
  { route: '/ciyu', label: '词语闯关', icon: 'grid-outline' },
  { route: '/pinyin', label: '拼音练习', icon: 'text-outline' },
  { route: '/ziku', label: `${TOTAL_CHARS} 字库`, icon: 'library-outline' },
  { route: '/cards', label: '我的汉字卡', icon: 'heart-outline' },
  { route: '/growth', label: '成长足迹', icon: 'star-outline' },
] as const;

/**
 * 只依赖 navigation.closeDrawer。
 * expo-router 内部的 DrawerNavigationHelpers 与 @react-navigation/drawer
 * 的同名类型结构一致但类型不互认，用最小接口可以避开这个冲突。
 */
export type ForestDrawerProps = {
  navigation: { closeDrawer: () => void };
};

export function ForestDrawerContent({ navigation }: ForestDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { learnedCount } = useProgress();
  const insets = useSafeAreaInsets();

  const go = (route: string) => {
    navigation.closeDrawer();
    router.push(route as never);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}>
        {/* 品牌头 */}
        <Pressable style={styles.brand} onPress={() => go('/')}>
          <View style={styles.brandIcon}>
            <Ionicons name="leaf" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.brandTitle}>我的小森林</Text>
            <Text style={styles.brandSub}>每天认识几个字</Text>
          </View>
        </Pressable>

        {/* 主导航 */}
        <View style={styles.menu}>
          {MENU.map((item) => {
            const active = pathname === item.route;
            return (
              <Pressable
                key={item.route}
                onPress={() => go(item.route)}
                style={[styles.item, active && styles.itemActive]}>
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={active ? colors.primaryDeep : colors.textSub}
                />
                <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 成长可视化 */}
        <View style={styles.growthCard}>
          <Text style={styles.treeEmoji}>🌳</Text>
          <Text style={styles.growthTitle}>每认识一个字，森林就长大一点</Text>

          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, (learnedCount / TOTAL_CHARS) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.growthStat}>
            已认识 {learnedCount} / {TOTAL_CHARS} 字
          </Text>
          <Text style={styles.growthStatSub}>词语朋友 0 / {TOTAL_WORDS}</Text>
        </View>
      </ScrollView>

      {/* 家长入口固定在底部 */}
      <Pressable
        style={[styles.parents, { paddingBottom: Math.max(insets.bottom, 14) }]}
        onPress={() => go('/parents')}>
        <Ionicons name="people-outline" size={19} color={colors.textSub} />
        <Text style={styles.parentsLabel}>给爸爸妈妈</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSide },
  scroll: { paddingBottom: spacing.md },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  brandSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },

  menu: { paddingHorizontal: spacing.md, gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: colors.primarySoft },
  itemLabel: { fontSize: font.body, color: colors.textSub },
  itemLabelActive: { color: colors.primaryDeep, fontWeight: '600' },

  growthCard: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  treeEmoji: { fontSize: 54, lineHeight: 62 },
  growthTitle: {
    fontSize: font.tiny,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.leaf },
  growthStat: { fontSize: font.tiny, color: colors.textSub, marginTop: spacing.sm },
  growthStatSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },

  parents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  parentsLabel: { fontSize: font.body, color: colors.textSub },
});
