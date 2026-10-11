import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, shadow, spacing } from '@/theme';

import {
  formatBytes,
  getDownloadState,
  mirrorLabel,
  resetDownloadState,
  subscribeDownload,
  type DownloadState,
} from './download-store';

/**
 * 更新下载弹层：全局唯一，挂在根布局上。
 * 下载由 check-update 触发，这里只负责把状态画出来。
 */
export function DownloadModal() {
  const [state, setState] = useState<DownloadState>(getDownloadState);

  useEffect(() => subscribeDownload(setState), []);

  // 下载完成后停一会儿让家长看到结果，再自动收起（安装器已经弹出来了）
  useEffect(() => {
    if (state.status !== 'done') return;
    const t = setTimeout(resetDownloadState, 2500);
    return () => clearTimeout(t);
  }, [state.status]);

  if (state.status === 'idle') return null;

  const percent = Math.min(100, Math.max(0, Math.round(state.progress * 100)));

  return (
    <Modal transparent animationType="fade" visible onRequestClose={resetDownloadState}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{emojiOf(state.status)}</Text>
          <Text style={styles.title}>{titleOf(state)}</Text>
          <Text style={styles.sub}>{subOf(state)}</Text>

          {state.status === 'downloading' && (
            <>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percent}%` }]} />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{percent}%</Text>
                <Text style={styles.meta}>
                  {formatBytes(state.bytes)}
                  {state.total > 0 ? ` / ${formatBytes(state.total)}` : ''}
                </Text>
              </View>
              <Text style={styles.speed}>
                {state.speed > 0 ? `${formatBytes(state.speed)}/s · ` : ''}
                {mirrorLabel(state.mirror)}
              </Text>
            </>
          )}

          {(state.status === 'error' || state.status === 'done') && (
            <Pressable style={styles.btn} onPress={resetDownloadState}>
              <Text style={styles.btnLabel}>
                {state.status === 'error' ? '知道了' : '关闭'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function emojiOf(status: DownloadState['status']): string {
  switch (status) {
    case 'probing':
      return '📡';
    case 'downloading':
      return '⬇️';
    case 'done':
      return '🎉';
    default:
      return '😥';
  }
}

function titleOf(state: DownloadState): string {
  switch (state.status) {
    case 'probing':
      return '正在挑选最快的线路';
    case 'downloading':
      return `正在下载 v${state.version ?? ''}`;
    case 'done':
      return '下载完成';
    default:
      return '下载失败';
  }
}

function subOf(state: DownloadState): string {
  switch (state.status) {
    case 'probing':
      return '先测几条线路的速度，再挑快的下';
    case 'downloading':
      return '别退出应用，下完会自动打开安装';
    case 'done':
      return '正在打开安装程序，按提示完成安装即可';
    default:
      return state.error || '网络不太稳定，稍后再试试';
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 51, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  emoji: { fontSize: 52, lineHeight: 62 },
  title: {
    fontSize: font.h3,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  sub: {
    fontSize: font.small,
    color: colors.textSub,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },

  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.leaf },

  metaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  meta: { fontSize: font.tiny, color: colors.textSub },
  speed: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing.xs },

  btn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  btnLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },
});
