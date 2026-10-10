import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { speak } from '@/features/speech/speak';
import {
  getAudioPackPref,
  getVoicePref,
  listChineseVoices,
  setAudioPackPref,
  setVoicePref,
  type VoiceOption,
} from '@/features/speech/voices';
import { colors, font, radius, shadow, spacing } from '@/theme';

/** 试听用的字，读音清晰、不易被误听 */
const SAMPLE = '天';

/**
 * 朗读设置面板（放在家长页）。
 *
 * 新增：晓伊音频包开关
 *   - 开启（默认）：优先播放预生成的高品质晓伊离线音频，100% 离线秒播
 *   - 关闭：回退到设备系统 TTS，家长可自选语音引擎
 */
export function VoicePicker() {
  const [audioPack, setAudioPackState] = useState<boolean>(true);
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setAudioPackState(getAudioPackPref());
    setSelected(getVoicePref());
    listChineseVoices().then((list) => {
      if (alive) setVoices(list);
    });
    return () => { alive = false; };
  }, []);

  const onToggleAudioPack = useCallback((val: boolean) => {
    setAudioPackState(val);
    setAudioPackPref(val).catch(() => {});
    // 切换后立刻试听，感受效果
    setTimeout(() => speak(SAMPLE, { times: 1 }), 100);
  }, []);

  const onPick = useCallback((id: string | null) => {
    setSelected(id);
    setVoicePref(id).catch(() => {});
    speak(SAMPLE, { times: 1 });
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>朗读设置</Text>

      {/* ── 音频包开关 ── */}
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <View style={styles.switchTitleRow}>
            <Text style={styles.switchLabel}>晓伊高品质童声</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>推荐</Text>
            </View>
          </View>
          <Text style={styles.switchSub}>
            离线音频包，字正腔圆 · 0ms 秒播 · 无需网络
          </Text>
        </View>
        <Switch
          value={audioPack}
          onValueChange={onToggleAudioPack}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {/* ── 系统语音选择（仅音频包关闭时展示） ── */}
      {!audioPack && (
        <>
          <View style={styles.divider} />
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionLabel}>系统语音引擎</Text>
            <Text style={styles.cardHint}>点一下试听</Text>
          </View>

          {voices === null ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.cardSub}>正在读取设备上的语音…</Text>
            </View>
          ) : voices.length === 0 ? (
            <Text style={styles.cardSub}>
              这台设备上没找到中文语音，可在系统设置里安装中文语音包后再回来。
            </Text>
          ) : (
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
          )}

          <Text style={styles.footnote}>
            语音由设备自带，不同机器上能选的不一样。选好后所有朗读都会用它。
          </Text>
        </>
      )}
    </View>
  );
}

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
  cardTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardHint: { fontSize: font.tiny, color: colors.textMuted, flex: 1, textAlign: 'right' },
  cardSub: { fontSize: font.small, color: colors.textSub, lineHeight: 20 },
  sectionLabel: { fontSize: font.body, fontWeight: '600', color: colors.text },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySofter,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  switchText: { flex: 1, gap: 2 },
  switchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchLabel: { fontSize: font.body, fontWeight: '600', color: colors.primaryDeep },
  switchSub: { fontSize: font.tiny, color: colors.textSub, lineHeight: 17 },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 10, color: colors.white, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.borderSoft },

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
