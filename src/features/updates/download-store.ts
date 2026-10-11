/**
 * 应用内更新的下载状态 —— 模块级单例 + 极简发布订阅。
 *
 * 为什么不用 React Context：更新检查（check-update）是普通模块、跑在组件树外，
 * 触发下载时拿不到 React 上下文。所以状态放在模块级，由根布局里的弹层订阅渲染。
 */

export type DownloadStatus = 'idle' | 'probing' | 'downloading' | 'done' | 'error';

export type DownloadState = {
  status: DownloadStatus;
  /** 0 ~ 1；总量未知时为 0 */
  progress: number;
  /** 已下载字节 */
  bytes: number;
  /** 总字节，0 = 未知 */
  total: number;
  /** 实时速度（字节/秒），0 = 未测出 */
  speed: number;
  /** 当前使用的镜像前缀，'' = GitHub 直连 */
  mirror: string;
  /** 目标版本号，用于生成文件名与文案 */
  version?: string;
  error?: string;
};

const IDLE: DownloadState = {
  status: 'idle',
  progress: 0,
  bytes: 0,
  total: 0,
  speed: 0,
  mirror: '',
};

let state: DownloadState = IDLE;

type Listener = (s: DownloadState) => void;
const listeners = new Set<Listener>();

export function getDownloadState(): DownloadState {
  return state;
}

export function subscribeDownload(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setDownloadState(patch: Partial<DownloadState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

/** 关闭弹层时调用，回到空闲 */
export function resetDownloadState(): void {
  setDownloadState({ ...IDLE, version: undefined, error: undefined });
}

/** 镜像前缀 → 人类可读的名字（弹层里展示用） */
export function mirrorLabel(prefix: string): string {
  if (!prefix) return 'GitHub 直连';
  const m = prefix.match(/^https?:\/\/([^/]+)/);
  return m ? m[1] : prefix;
}

/** 字节数格式化 */
export function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
