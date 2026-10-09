/**
 * 汉字小森林 —— 设计令牌
 * 取色思路：温柔米白底 + 森林绿主色，儿童向 / 大圆角 / 低饱和 / 高可读
 */

export const colors = {
  // 背景层
  bg: '#F7F4EA',
  bgSide: '#F2EEE1',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF9F2',

  // 主色（森林绿）
  primary: '#4A6741',
  primaryDeep: '#3A5233',
  primarySoft: '#E5EBD9',
  primarySofter: '#F0F4E8',

  // 文字
  text: '#2E332A',
  textSub: '#6F7566',
  textMuted: '#A3A896',

  // 强调
  gold: '#E9B949',
  goldSoft: '#FBF0D2',
  leaf: '#7BA05B',

  // 分隔线
  border: '#E8E3D5',
  borderSoft: '#F0ECE0',

  // 状态
  ok: '#6FA05A',
  err: '#D98C7A',

  white: '#FFFFFF',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const font = {
  h1: 26,
  h2: 21,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
  hanziXL: 72,
  hanziL: 48,
  hanziM: 34,
} as const;

export const shadow = {
  card: {
    shadowColor: '#8A8467',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#8A8467',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
