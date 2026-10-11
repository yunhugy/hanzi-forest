import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';

import { startUpdateDownload } from './download';

export type UpdateInfo = {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  apkUrl?: string;
  releasePageUrl: string;
};

const GITHUB_REPO = 'yunhugy/hanzi-forest';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  const clean2 = (v2 || '').replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
    const n1 = clean1[i] ?? 0;
    const n2 = clean2[i] ?? 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

export async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  try {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    const resp = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const tag = (data.tag_name || '').trim();
    const latestVersion = tag.replace(/^v/i, '');
    const apkAsset = (data.assets || []).find(
      (a: { name?: string; browser_download_url?: string }) =>
        typeof a.name === 'string' && a.name.endsWith('.apk')
    );

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseTitle: data.name || tag,
      releaseNotes: data.body || '',
      apkUrl: apkAsset?.browser_download_url,
      releasePageUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
    };
  } catch {
    return null;
  }
}

export async function promptUpdate(manual = false): Promise<void> {
  const info = await fetchLatestRelease();
  if (!info) {
    if (manual) {
      Alert.alert('检查更新失败', '网络连接较慢或暂时无法访问更新服务器，请稍后重试。');
    }
    return;
  }

  if (info.hasUpdate) {
    const downloadUrl = info.apkUrl || info.releasePageUrl;
    Alert.alert(
      `发现新版本 v${info.latestVersion} 🎉`,
      `${info.releaseNotes ? info.releaseNotes + '\n\n' : ''}当前安装版本：v${info.currentVersion}\n云端最新版本：v${info.latestVersion}`,
      [
        { text: '稍后再说', style: 'cancel' },
        {
          text: '立即下载更新',
          style: 'default',
          onPress: () => {
            // 优先走 App 内下载：自动测速选线路、带进度条、下完直接调起安装
            if (info.apkUrl) {
              startUpdateDownload(info.apkUrl, info.latestVersion).catch(() => {});
            } else {
              // 没有 APK 资产时退回浏览器打开发布页
              Linking.openURL(downloadUrl).catch(() => {});
            }
          },
        },
      ]
    );
  } else if (manual) {
    Alert.alert(
      '已是最新版本 ✨',
      `当前版本 v${info.currentVersion} 已是最新正式版，无需更新。`
    );
  }
}
