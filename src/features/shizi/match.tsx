import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { hapticLight, playSfx } from '@/features/sound/effects';
import { useProgress } from '@/store/progress';
import { colors, font, radius, shadow, spacing } from '@/theme';

import { poolOf, shuffle, type TierFilter } from './quiz';

/**
 * 翻卡配对（识字乐园的第四个题型）。
 *
 * 玩法：4 个字各拆成「字卡 + 拼音卡」，8 张卡背面朝上打乱摆开。
 * 每次翻两张，配成一对就留下，配错就翻回去。
 *
 * 记分口径：配对成功按「认对」记一笔（走 progress.record），
 * 翻错只算步数、不记错误 —— 翻错属于记忆游戏里的正常试错，
 * 不该污染「这个字孩子认不认识」的判断。
 */

/** 一轮 4 对 = 8 张卡 */
const PAIR_COUNT = 4;
/** 配对失败后，卡片停留多久再翻回去（够孩子看清两个内容） */
const FLIP_BACK_MS = 800;

type CardFace = 'char' | 'pinyin';

type Card = {
  key: string;
  char: string;
  pinyin: string;
  face: CardFace;
};

function buildCards(tier: TierFilter): Card[] {
  const picked = shuffle(poolOf(tier)).slice(0, PAIR_COUNT);
  const cards: Card[] = [];
  for (const h of picked) {
    cards.push({ key: `${h.char}#c`, char: h.char, pinyin: h.pinyin, face: 'char' });
    cards.push({ key: `${h.char}#p`, char: h.char, pinyin: h.pinyin, face: 'pinyin' });
  }
  return shuffle(cards);
}

export function MatchGame({ tier }: { tier: TierFilter }) {
  const { record } = useProgress();

  const [cards, setCards] = useState<Card[]>(() => buildCards(tier));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [steps, setSteps] = useState(0);
  const [finished, setFinished] = useState(false);

  const reset = useCallback(() => {
    setCards(buildCards(tier));
    setFlipped([]);
    setMatched([]);
    setLocked(false);
    setSteps(0);
    setFinished(false);
  }, [tier]);

  // 换档位重新发牌
  useEffect(() => {
    reset();
  }, [reset]);

  // 卸载时清掉待执行的翻回定时器，避免 setState 落到已卸载组件
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const onPressCard = useCallback(
    (card: Card) => {
      if (locked || finished) return;
      if (matched.includes(card.char)) return;
      if (flipped.includes(card.key)) return;

      playSfx('flip');
      const next = [...flipped, card.key];
      setFlipped(next);
      setSteps((s) => s + 1);

      if (next.length < 2) return;

      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      const isPair = a.char === b.char && a.face !== b.face;

      if (isPair) {
        playSfx('correct');
        hapticLight();
        record(a.char, true);
        const nextMatched = [...matched, a.char];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length >= PAIR_COUNT) setFinished(true);
      } else {
        playSfx('wrong');
        setLocked(true);
        timerRef.current = setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, FLIP_BACK_MS);
      }
    },
    [cards, flipped, locked, matched, finished, record],
  );

  if (finished) {
    return (
      <View style={styles.finishCard}>
        <Text style={styles.finishEmoji}>{steps <= PAIR_COUNT + 2 ? '🎉' : '🌿'}</Text>
        <Text style={styles.finishTitle}>全部配对成功！</Text>
        <Text style={styles.finishSub}>
          一共翻了 {steps} 次
          {steps <= PAIR_COUNT + 2 ? '，记性真好' : '，多练几次就更快啦'}
        </Text>
        <Pressable style={styles.againBtn} onPress={reset}>
          <Text style={styles.againLabel}>再来一局</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headText}>
          已配对 {matched.length} / {PAIR_COUNT} 对
        </Text>
        <Text style={styles.headHint}>把「字」和它的「拼音」配成一对</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <FlipCard
            key={card.key}
            card={card}
            open={flipped.includes(card.key) || matched.includes(card.char)}
            done={matched.includes(card.char)}
            onPress={() => onPressCard(card)}
          />
        ))}
      </View>
    </View>
  );
}

/** 单张卡片：3D 翻转（背面 = 叶子，正面 = 字 / 拼音） */
function FlipCard({
  card,
  open,
  done,
  onPress,
}: {
  card: Card;
  open: boolean;
  done: boolean;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const backRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const frontRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable onPress={onPress} style={styles.slot}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.face,
          styles.back,
          { transform: [{ perspective: 900 }, { rotateY: backRotate }] },
        ]}>
        <Ionicons name="leaf" size={20} color={colors.leaf} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.face,
          styles.front,
          done && styles.frontDone,
          { transform: [{ perspective: 900 }, { rotateY: frontRotate }] },
        ]}>
        {card.face === 'char' ? (
          <Text style={styles.charText} numberOfLines={1} adjustsFontSizeToFit>
            {card.char}
          </Text>
        ) : (
          <Text style={styles.pinyinText} numberOfLines={1} adjustsFontSizeToFit>
            {card.pinyin}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  head: { alignItems: 'center', gap: spacing.xs },
  headText: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  headHint: { fontSize: font.tiny, color: colors.textMuted },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  slot: { width: '23%', aspectRatio: 0.86 },

  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  back: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
  },
  front: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    ...shadow.soft,
  },
  frontDone: { backgroundColor: colors.primarySoft, borderColor: colors.leaf },

  charText: { fontSize: 32, fontWeight: '700', color: colors.text },
  pinyinText: { fontSize: font.small, fontWeight: '600', color: colors.primaryDeep, letterSpacing: 0.3 },

  finishCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  finishEmoji: { fontSize: 72, lineHeight: 86 },
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
