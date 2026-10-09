import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { speak } from '@/features/speech/speak';
import {
  getVoicePref,
  listChineseVoices,
  setVoicePref,
  type VoiceOption,
} from '@/features/speech/voices';
import { colors, font, radius, shadow, spacing } from '@/theme';

/** 试听用的字，读音清晰、不易被误听 */
const SAMPLE = '天';

/**
 * 朗读语音选择器（放在家长页）。
 *
 * 设备上可能有多个中文语音，音质差别不小。这里列出来让家长挑一个，
 * 点一下就能试听，选定后存本地、所有朗读都跟着换。
 */
export function VoicePicker() {
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSelected(getVoicePref());
    listChineseVoices().then((list) => {
      if (alive) setVoices(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onPick = useCallback((id: string | null) => {
    setSelected(id);
    setVoicePref(id).catch(() => {});
    // 选完立刻试听一遍，不用再单独点「试听」
    speak(SAMPLE, { times: 1 });
  }, []);

  if (voices === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>朗读语音</Text>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.cardSub}>正在读取设备上的语音…</Text>
        </View>
      </View>
    );
  }

  if (voices.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>朗读语音</Text>
        <Text style={styles.cardSub}>
          这台设备上没找到中文语音，朗读可能不出声。可以在系统设置里安装中文语音包后再回来看看。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>朗读语音</Text>
        <Text style={styles.cardHint}>点一下试听</Text>
      </View>

      <View style={styles.list}>
        <VoiceRow
          name="系统默认"
          sub="交给设备自己挑"
          active={selected === null}
          onPress={() => onPick(null)}
        />
        {voices.map((v) => (
          <VoiceRow
            key={v.id}
            name={prettyName(v.name)}
            sub={`${v.language}${v.local ? ' · 本地' : ' · 联网'}`}
            active={selected === v.id}
            onPress={() => onPick(v.id)}
          />
        ))}
      </View>

      <Text style={styles.footnote}>
        语音由设备自带，不同机器上能选的不一样。选好后所有朗读都会用它。
      </Text>
    </View>
  );
}

/** 把 "Microsoft Huihui - Chinese (Simplified)" 这类冗长名字收短 */
function prettyName(raw: string): string {
  const short = raw.replace(/\s*-\s*(Chinese|中文|Mandarin).*$/i, '').trim();
  return short || raw;
}

function VoiceRow({
  name,
  sub,
  active,
  onPress,
}: {
  name: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, active && styles.rowActive]}>
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={active ? colors.primary : colors.textMuted}
      />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, active && styles.rowNameActive]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="volume-medium-outline" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  cardSub: { fontSize: font.small, color: colors.textSub, lineHeight: 20, flex: 1 },

  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  rowActive: { backgroundColor: colors.primarySoft },
  rowText: { flex: 1, gap: 1 },
  rowName: { fontSize: font.body, color: colors.text },
  rowNameActive: { color: colors.primaryDeep, fontWeight: '600' },
  rowSub: { fontSize: font.tiny, color: colors.textMuted },

  footnote: { fontSize: font.tiny, color: colors.textMuted, lineHeight: 17 },
});
