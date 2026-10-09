import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { colors, font, radius, shadow, spacing } from '@/theme';

type Props = {
  title: string;
  emoji: string;
  headline: string;
  desc: string;
  todos?: string[];
};

/** 尚未实现的模块占位页（保证导航可用） */
export function ModulePlaceholder({ title, emoji, headline, desc, todos }: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.desc}>{desc}</Text>

          {todos && todos.length > 0 && (
            <View style={styles.list}>
              {todos.map((t) => (
                <View key={t} style={styles.listItem}>
                  <Ionicons name="ellipse" size={5} color={colors.leaf} />
                  <Text style={styles.listText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  emoji: { fontSize: 72, lineHeight: 84 },
  headline: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  desc: {
    fontSize: font.small,
    color: colors.textSub,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  list: { marginTop: spacing.xl, gap: spacing.sm, alignSelf: 'stretch' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listText: { fontSize: font.small, color: colors.textSub },
});
