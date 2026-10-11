import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

import { setDownloadState } from './download-store';

/**
 * 应用内更新下载。
 *
 * 背景：GitHub Releases 在国内直连常常只有几十 KB/s，跳浏览器下载既慢又割裂。
 * 改成 App 内直接下载：
 *   1. 先并发探测几条线路的实时速度（各拉一小段），挑最快的；
 *   2. 用 createDownloadResumable 下载，实时回调进度；
 *   3. 下完直接调起系统安装器。
 *
 * 线路挂了就自动换下一条，最后兜底 GitHub 直连。
 */

/** 镜像前缀，'' 表示 GitHub 直连。加速源只是转发，包体仍来自 GitHub 官方发布 */
const MIRRORS = ['', 'https://ghfast.top/', 'https://ghproxy.net/'];

/** 测速取样字节数：够判断快慢，又不太费流量 */
const PROBE_BYTES = 256 * 1024;
/** 单次测速超时（毫秒）——超时就当这条线路太慢，跳过 */
const PROBE_TIMEOUT_MS = 8000;
/** 进度刷新节流：避免每个 chunk 都触发一次渲染 */
const PROGRESS_THROTTLE_MS = 250;

type Probe = { prefix: string; speed: number };

/** 探测单条线路：拉一小段数据算实时速度（B/s）。失败返回 0 */
async function probeMirror(prefix: string, url: string): Promise<Probe> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const resp = await fetch(`${prefix}${url}`, {
      headers: { Range: `bytes=0-${PROBE_BYTES - 1}` },
      signal: controller.signal,
    });
    if (!resp.ok && resp.status !== 206) return { prefix, speed: 0 };
    const buf = await resp.arrayBuffer();
    const seconds = Math.max((Date.now() - started) / 1000, 0.05);
    return { prefix, speed: buf.byteLength / seconds };
  } catch {
    return { prefix, speed: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** 并发探测全部线路，返回按速度降序的候选列表；直连永远兜底在最后 */
export async function pickMirrors(url: string): Promise<string[]> {
  const results = await Promise.all(MIRRORS.map((m) => probeMirror(m, url)));
  const fast = results.filter((r) => r.speed > 0).sort((a, b) => b.speed - a.speed);
  const slow = results.filter((r) => r.speed === 0);
  const ordered = [...fast, ...slow].map((r) => r.prefix);
  return ordered.includes('') ? ordered : [...ordered, ''];
}

export type DownloadResult = { ok: true; fileUri: string } | { ok: false; error: string };

/** 下载 APK：自动挑最快线路，失败逐条回退 */
export async function downloadApk(url: string, version: string): Promise<DownloadResult> {
  setDownloadState({
    status: 'probing',
    version,
    error: undefined,
    progress: 0,
    bytes: 0,
    total: 0,
    speed: 0,
  });

  const mirrors = await pickMirrors(url);
  const fileName = `hanzi-forest-v${version}.apk`;
  const target = `${FileSystem.cacheDirectory ?? ''}${fileName}`;

  // 清掉可能残留的旧包，避免续传读到坏数据
  try {
    await FileSystem.deleteAsync(target, { idempotent: true });
  } catch {
    /* 忽略 */
  }

  let lastError = '';

  for (const prefix of mirrors) {
    try {
      setDownloadState({
        status: 'downloading',
        mirror: prefix,
        progress: 0,
        bytes: 0,
        total: 0,
        speed: 0,
      });

      let lastBytes = 0;
      let lastAt = Date.now();
      let lastUiAt = 0;

      const resumable = FileSystem.createDownloadResumable(
        `${prefix}${url}`,
        target,
        {},
        (p) => {
          const now = Date.now();
          const total = p.totalBytesExpectedToWrite || 0;

          // 速度按采样窗口算，避免抖动
          let speed: number | undefined;
          const dt = (now - lastAt) / 1000;
          if (dt >= 0.3) {
            speed = (p.totalBytesWritten - lastBytes) / dt;
            lastBytes = p.totalBytesWritten;
            lastAt = now;
          }

          // 节流：最多每 250ms 刷一次 UI
          if (now - lastUiAt < PROGRESS_THROTTLE_MS) return;
          lastUiAt = now;

          setDownloadState({
            bytes: p.totalBytesWritten,
            total,
            progress: total > 0 ? p.totalBytesWritten / total : 0,
            ...(speed !== undefined ? { speed } : {}),
          });
        },
      );

      const result = await resumable.downloadAsync();
      if (result?.uri) {
        setDownloadState({ status: 'done', progress: 1, speed: 0 });
        return { ok: true, fileUri: result.uri };
      }
      lastError = '下载未返回文件';
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      // 这条线路不行，换下一条
    }
  }

  const msg = lastError || '所有下载线路都失败了，请检查网络后重试';
  setDownloadState({ status: 'error', error: msg });
  return { ok: false, error: msg };
}

/** 调起系统安装器（Android） */
export async function installApk(fileUri: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    // FLAG_GRANT_READ_URI_PERMISSION：把临时读权限授给安装器
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}

/** 一步到位：下载 + 调起安装（供更新提示直接调用） */
export async function startUpdateDownload(url: string, version: string): Promise<void> {
  const res = await downloadApk(url, version);
  if (!res.ok) return;
  try {
    await installApk(res.fileUri);
  } catch {
    // 安装器没起来：多半是系统里没允许本应用「安装未知应用」
    setDownloadState({
      status: 'error',
      error: '安装包已下好，但没能打开安装程序。请到系统设置里允许本应用「安装未知应用」后再试一次。',
    });
  }
}
