import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/theme';
import { promptUpdate } from './check-update';

export function UpdateCard() {
  const [checking, setChecking] = useState(false);
  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  const onCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await promptUpdate(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="sparkles-outline" size={20} color={colors.primaryDeep} />
        <Text style={styles.title}>版本与在线更新</Text>
      </View>

      <Text style={styles.desc}>
        当前版本：v{currentVersion}（汉字小森林正式版）
      </Text>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={onCheck}
        disabled={checking}>
        {checking ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.btnText}>检查在线更新</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
  },
  desc: {
    fontSize: font.small,
    color: colors.textSub,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: font.body,
    fontWeight: '600',
  },
});
