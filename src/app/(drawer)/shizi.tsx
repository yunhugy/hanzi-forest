import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { StarBadge } from '@/components/star-badge';
import charEmoji from '@/data/char-emoji.json';
import { imageOf } from '@/data/char-images';
import {
  ALL_HANZI,
  buildRound,
  PICTURED_HANZI,
  ROUND_SIZE,
  type Question,
  type QuizMode,
  type TierFilter,
} from '@/features/shizi/quiz';
import { speak } from '@/features/speech/speak';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

const EMOJI = charEmoji as Record<string, string>;

const TIERS: { value: TierFilter; label: string }[] = [
  { value: 0, label: '全部汉字' },
  { value: 1, label: '初识汉字' },
  { value: 2, label: '进阶练习' },
  { value: 3, label: '继续探索' },
];

const MODES: { value: QuizMode; label: string }[] = [
  { value: 'learn', label: '认识汉字' },
  { value: 'picture', label: '看图识字' },
  { value: 'listen', label: '听音选字' },
  { value: 'match', label: '翻卡配对' },
];

export default function ShiziScreen() {
  const { record, state } = useProgress();

  const [tier, setTier] = useState<TierFilter>(0);
  const [mode, setMode] = useState<QuizMode>('picture');
  // 默认题型是看图识字，所以初始就只从有配图的字里出题
  const [round, setRound] = useState<Question[]>(() => buildRound(0, ROUND_SIZE, true));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = round[index];
  const answered = picked !== null;
  const isRight = answered && picked === question?.answer.char;

  const restart = useCallback((nextTier: TierFilter, nextMode: QuizMode) => {
    setRound(buildRound(nextTier, ROUND_SIZE, nextMode === 'picture'));
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  }, []);

  const changeTier = (next: TierFilter) => {
    setTier(next);
    restart(next, mode);
  };

  const changeMode = (next: QuizMode) => {
    setMode(next);
    // 看图识字的题库和别的题型不同，来回切时要重新出题
    if ((next === 'picture') !== (mode === 'picture')) {
      restart(tier, next);
    }
  };

  /** 当前题型下各档的可用字数（看图识字只用有配图的字，数字会小很多） */
  const countFor = (value: TierFilter) => {
    const pool = mode === 'picture' ? PICTURED_HANZI : ALL_HANZI;
    return value === 0 ? pool.length : pool.filter((h) => h.tier === value).length;
  };

  const onPick = (char: string) => {
    if (answered) return;
    setPicked(char);
    const ok = char === question.answer.char;
    if (ok) setCorrectCount((c) => c + 1);
    record(question.answer.char, ok);
  };

  const onNext = () => {
    if (index + 1 >= round.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="识字乐园" right={<StarBadge count={state.stars} />} />

      {/* 字库范围 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tierRow}>
        {TIERS.map((t) => {
          const active = t.value === tier;
          return (
            <Pressable
              key={t.value}
              onPress={() => changeTier(t.value)}
              style={[styles.tierChip, active && styles.tierChipActive]}>
              <Text style={[styles.tierLabel, active && styles.tierLabelActive]}>{t.label}</Text>
              <Text style={[styles.tierCount, active && styles.tierCountActive]}>
                {countFor(t.value)} 字
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 题型 */}
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const active = m.value === mode;
          return (
            <Pressable
              key={m.value}
              onPress={() => changeMode(m.value)}
              style={[styles.modeChip, active && styles.modeChipActive]}>
              <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {finished ? (
          <FinishCard
            correct={correctCount}
            total={round.length}
            onAgain={() => restart(tier, mode)}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.prompt}>{promptOf(mode)}</Text>

              {/* 题干主体 */}
              {mode === 'picture' && <PictureBody question={question} />}
              {mode === 'listen' && <ListenBody question={question} />}
              {mode === 'learn' && <LearnBody question={question} />}
              {mode === 'match' && <MatchPlaceholder />}

              {/* 选项 */}
              {mode !== 'learn' && mode !== 'match' && (
                <View style={styles.options}>
                  {question.options.map((opt) => {
                    const chosen = picked === opt.char;
                    const rightOne = opt.char === question.answer.char;
                    let bg: string = colors.surfaceAlt;
                    let border: string = colors.borderSoft;
                    if (answered && rightOne) {
                      bg = colors.primarySoft;
                      border = colors.leaf;
                    } else if (chosen && !rightOne) {
                      bg = '#FBEDE9';
                      border = colors.err;
                    }
                    return (
                      <Pressable
                        key={opt.char}
                        onPress={() => onPick(opt.char)}
                        style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                        <Text style={styles.optionPinyin}>{opt.pinyin}</Text>
                        <Text style={styles.optionChar}>{opt.char}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {answered && (
                <Text style={[styles.feedback, { color: isRight ? colors.ok : colors.err }]}>
                  {isRight ? '答对啦，森林又长高一点 🌱' : `没关系，这个是「${question.answer.char}」`}
                </Text>
              )}

              {!answered && <Text style={styles.hint}>勇敢试一试，答错也没关系。</Text>}
            </View>

            {/* 底部进度 + 下一步 */}
            <View style={styles.footer}>
              <Text style={styles.progressText}>
                第 {index + 1} / {round.length} 题
              </Text>
              <Pressable
                onPress={
                  mode === 'learn' && !answered ? () => onPick(question.answer.char) : onNext
                }
                disabled={mode === 'learn' ? false : !answered}
                style={[styles.nextBtn, (mode === 'learn' || answered) && styles.nextBtnOn]}>
                <Text style={styles.nextLabel}>
                  {mode === 'learn' && !answered ? '我认识了' : '下一题'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function promptOf(mode: QuizMode) {
  switch (mode) {
    case 'picture':
      return '看一看，这是哪个字？';
    case 'listen':
      return '听一听，是哪个字？';
    case 'learn':
      return '认一认，读一读';
    default:
      return '翻一翻，找到配对的字';
  }
}

function PictureBody({ question }: { question: Question }) {
  const local = imageOf(question.answer.char);
  const emoji = EMOJI[question.answer.char];

  return (
    <View style={styles.bodyBox}>
      {local ? (
        <Image source={local} style={styles.pic} contentFit="contain" transition={200} />
      ) : (
        <Text style={styles.bigEmoji}>{emoji ?? '🖼️'}</Text>
      )}
      {!local && !emoji && <Text style={styles.noPic}>这个字还没有配图</Text>}
    </View>
  );
}

function ListenBody({ question }: { question: Question }) {
  return (
    <View style={styles.bodyBox}>
      <View style={styles.listenRow}>
        <Pressable
          style={styles.listenBtn}
          onPress={() => speak(question.answer.char, { speed: 'slow' })}>
          <Ionicons name="volume-high" size={22} color={colors.primaryDeep} />
          <Text style={styles.listenLabel}>听一听</Text>
        </Pressable>
        <Pressable
          style={[styles.listenBtn, styles.listenBtnAlt]}
          onPress={() => speak(question.answer.char, { speed: 'slower' })}>
          <Ionicons name="volume-low" size={22} color={colors.primaryDeep} />
          <Text style={styles.listenLabel}>再慢点</Text>
        </Pressable>
      </View>
      <Text style={styles.listenHint}>每个字会念两遍，听不清就点「再慢点」</Text>
    </View>
  );
}

function LearnBody({ question }: { question: Question }) {
  const local = imageOf(question.answer.char);
  const emoji = EMOJI[question.answer.char];
  return (
    <View style={styles.bodyBox}>
      {local ? (
        <Image source={local} style={styles.pic} contentFit="contain" transition={200} />
      ) : (
        emoji && <Text style={styles.bigEmoji}>{emoji}</Text>
      )}
      <Text style={styles.learnChar}>{question.answer.char}</Text>
      <Text style={styles.learnPinyin}>{question.answer.pinyin}</Text>
      <Pressable style={styles.listenBtn} onPress={() => speak(question.answer.char)}>
        <Ionicons name="volume-high" size={20} color={colors.primaryDeep} />
        <Text style={styles.listenLabel}>读给我听</Text>
      </Pressable>
    </View>
  );
}

function MatchPlaceholder() {
  return (
    <View style={styles.bodyBox}>
      <Text style={styles.bigEmoji}>🃏</Text>
      <Text style={styles.noPic}>翻卡配对正在开发中</Text>
    </View>
  );
}

function FinishCard({
  correct,
  total,
  onAgain,
}: {
  correct: number;
  total: number;
  onAgain: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.bigEmoji}>{correct >= total - 1 ? '🎉' : '🌿'}</Text>
      <Text style={styles.finishTitle}>这一轮完成啦</Text>
      <Text style={styles.finishSub}>
        答对 {correct} / {total} 题
      </Text>
      <Pressable style={styles.againBtn} onPress={onAgain}>
        <Text style={styles.againLabel}>再来一轮</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  tierRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  tierChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 92,
  },
  tierChipActive: { backgroundColor: colors.primary },
  tierLabel: { fontSize: font.small, color: colors.textSub, fontWeight: '600' },
  tierLabelActive: { color: colors.white },
  tierCount: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  tierCountActive: { color: 'rgba(255,255,255,0.75)' },

  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modeChipActive: { backgroundColor: colors.primarySoft },
  modeLabel: { fontSize: font.tiny, color: colors.textMuted },
  modeLabelActive: { color: colors.primaryDeep, fontWeight: '700' },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  prompt: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  bodyBox: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  bigEmoji: { fontSize: 96, lineHeight: 112 },
  pic: { width: 208, height: 208, borderRadius: radius.lg },
  noPic: { fontSize: font.small, color: colors.textMuted },

  listenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  listenBtnAlt: { backgroundColor: colors.surfaceAlt },
  listenLabel: { fontSize: font.body, color: colors.primaryDeep, fontWeight: '600' },
  listenHint: { fontSize: font.tiny, color: colors.textMuted },

  learnChar: { fontSize: font.hanziXL, fontWeight: '700', color: colors.text, lineHeight: 86 },
  learnPinyin: { fontSize: font.h2, color: colors.primary, letterSpacing: 1 },

  options: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  option: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionPinyin: { fontSize: font.small, color: colors.textMuted },
  optionChar: { fontSize: font.hanziM, fontWeight: '700', color: colors.text },

  feedback: { fontSize: font.body, marginTop: spacing.lg, fontWeight: '600' },
  hint: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing.lg },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { fontSize: font.small, color: colors.textSub },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  nextBtnOn: { backgroundColor: colors.primary },
  nextLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },

  finishTitle: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  finishSub: { fontSize: font.body, color: colors.textSub, marginTop: spacing.xs },
  againBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  againLabel: { fontSize: font.body, color: colors.white, fontWeight: '600' },
});
