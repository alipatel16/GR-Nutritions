import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  HeartPulse,
  RotateCcw,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { PageShell } from '@/components/layout/PageShell';
import { Price } from '@/components/ui/Price';
import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import type { Product } from '@/features/catalog/types';
import {
  needsProfessionalAdvice,
  parseGoal,
  recommendProducts,
} from '@/features/advisor/advisor-domain';
import { askCoach, CoachUnavailableError, type CoachTurn } from '@/features/advisor/coach-api';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

type ChatMessage = CoachTurn & {
  id: string;
  productIds?: string[];
  followUps?: string[];
  offline?: boolean;
};

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi, I’m GR Coach. Ask me anything about protein, creatine, pre-workout, vitamins or your training nutrition. Tell me your goal, diet and budget and I’ll pick the best products for you from our shelf.',
};

const starters = [
  'Which protein is best for muscle gain under ₹3,000?',
  'Whey vs isolate — which suits a lactose-sensitive beginner?',
  'Is creatine safe to take every day?',
  'Suggest a stimulant-free pre-workout',
];

const professionalAdvice =
  'Your message mentions a situation where a qualified professional should guide you. I won’t suggest a supplement plan for this. Please speak with your doctor, pharmacist or a registered dietitian first, and share the product label with them.';

let messageCounter = 0;
const nextId = () => `m${(messageCounter += 1)}`;

// Used only when the AI service can't be reached: a deterministic catalogue match.
function offlineReply(text: string, products: Product[]): ChatMessage {
  const budget = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+)|([\d,]{3,})\s*(?:rs|rupees|₹)/i);
  const amount = budget ? Number((budget[1] ?? budget[2]).replaceAll(',', '')) : NaN;
  const goal = parseGoal(text);
  const matches = recommendProducts(products, {
    goal,
    budgetPaise: Number.isFinite(amount) && amount > 0 ? amount * 100 : Number.MAX_SAFE_INTEGER,
    diet: /vegan/i.test(text) ? 'vegan' : /vegetarian|veg\b/i.test(text) ? 'vegetarian' : 'any',
    avoidStimulants: /no caffeine|caffeine.?free|stim(ulant)?.?free|no stim/i.test(text),
  });
  return {
    id: nextId(),
    role: 'assistant',
    offline: true,
    productIds: matches.map((match) => match.product.id),
    content: matches.length
      ? `GR Coach AI is offline for a moment, so here are catalogue matches for your ${goal.replaceAll('-', ' ')} goal. Check ingredients, allergens and the full label before choosing.`
      : 'GR Coach AI is offline for a moment and nothing on the shelf matches those details. Try again shortly, or browse the shop by goal.',
  };
}

export default function AdvisorRoute() {
  const { product: productSlug } = useLocalSearchParams<{ product?: string }>();
  const mobile = useBreakpoint() === 'mobile';
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    void catalogRepository
      .list({ pageSize: 100 })
      .then((r) => setProducts(r.items))
      .catch(() => setProducts([]));
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const viewing = productSlug ? products.find((p) => p.slug === productSlug) : undefined;
  const suggestions = viewing
    ? [`Is ${viewing.name} right for my goal?`, `How should I use ${viewing.name}?`, ...starters.slice(0, 2)]
    : starters;

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const userMessage: ChatMessage = { id: nextId(), role: 'user', content };
    const history = [...messages, userMessage];
    setMessages(history);
    setDraft('');
    setError('');
    if (needsProfessionalAdvice(content)) {
      setMessages([...history, { id: nextId(), role: 'assistant', content: professionalAdvice }]);
      return;
    }
    setBusy(true);
    try {
      const turns = history
        .filter((m) => m.id !== 'welcome' && !m.offline)
        .map(({ role, content: c }) => ({ role, content: c }));
      const reply = await askCoach(turns, productSlug);
      setMessages((current) => [
        ...current,
        { id: nextId(), role: 'assistant', content: reply.reply, productIds: reply.productIds, followUps: reply.followUps },
      ]);
    } catch (caught) {
      const status = caught instanceof CoachUnavailableError ? caught.status : 0;
      if (status === 429 || status === 400) {
        setError(caught instanceof Error ? caught.message : 'Please try again.');
        setMessages(messages);
        setDraft(content);
      } else {
        setMessages((current) => [...current, offlineReply(content, products)]);
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([welcome]);
    setError('');
    setDraft('');
  }

  const disclaimer = (
    <AppText style={styles.disclaimer} variant="caption">
      For adults only. GR Coach gives general information, not medical advice. If you’re
      pregnant, breastfeeding, take medication or have a medical condition, consult a
      qualified professional before using supplements.
    </AppText>
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <PageShell style={styles.shell}>
        <View style={[styles.layout, mobile && styles.mobileLayout]}>
          <View style={[styles.intro, mobile && styles.mobileIntro]}>
            <View style={styles.badge}>
              <Sparkles color={colors.graphite} size={14} />
              <AppText style={styles.badgeText}>GR COACH AI</AppText>
            </View>
            <AppText accessibilityRole="header" style={mobile ? styles.mobileTitle : undefined} tone="inverse" variant="display">
              YOUR GOAL.{'\n'}YOUR COACH.
            </AppText>
            {!mobile ? (
              <AppText style={styles.introCopy}>
                Ask anything about supplements and training nutrition. GR Coach compares
                options, explains ingredients, and recommends the best fit from our in-stock shelf.
              </AppText>
            ) : null}
            {!mobile ? (
              <View style={styles.features}>
                {(
                  [
                    [BadgeCheck, 'Recommends only genuine products we stock'],
                    [ShieldCheck, 'Honest answers, no pushy upsells'],
                    [HeartPulse, 'Flags when you should ask a doctor first'],
                  ] as const
                ).map(([Icon, label]) => (
                  <View key={label} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Icon color={colors.mint} size={18} />
                    </View>
                    <AppText style={styles.featureText}>{label}</AppText>
                  </View>
                ))}
              </View>
            ) : null}
            {!mobile ? disclaimer : null}
          </View>

          <View style={[styles.chat, mobile && styles.mobileChat]}>
            <View style={styles.chatHeader}>
              <View style={styles.avatar}>
                <Bot color={colors.graphite} size={20} />
              </View>
              <View style={styles.chatHeaderCopy}>
                <AppText style={styles.chatName}>GR Coach</AppText>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <AppText style={styles.onlineText} variant="caption">
                    Nutrition assistant · replies in seconds
                  </AppText>
                </View>
              </View>
              {messages.length > 1 ? (
                <Pressable accessibilityLabel="Start a new chat" accessibilityRole="button" onPress={reset} style={styles.resetButton}>
                  <RotateCcw color={colors.onDarkMuted} size={16} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              ref={scrollRef}
              accessibilityLabel="Conversation with GR Coach"
              contentContainerStyle={styles.thread}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              style={styles.threadScroll}
            >
              {messages.map((message) => (
                <View key={message.id} style={message.role === 'user' ? styles.userRow : styles.assistantRow}>
                  {message.role === 'assistant' ? (
                    <View style={styles.smallAvatar}>
                      <Bot color={colors.graphite} size={14} />
                    </View>
                  ) : null}
                  <View style={styles.messageColumn}>
                    <View style={message.role === 'user' ? styles.userBubble : styles.assistantBubble}>
                      <AppText style={message.role === 'user' ? styles.userText : styles.assistantText}>
                        {message.content}
                      </AppText>
                    </View>
                    {message.productIds?.length ? (
                      <View style={styles.picks}>
                        {message.productIds
                          .map((id) => productById.get(id))
                          .filter((p): p is Product => Boolean(p))
                          .map((p, index) => (
                            <ProductPick key={p.id} product={p} rank={index + 1} />
                          ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
              {busy ? (
                <View style={styles.assistantRow}>
                  <View style={styles.smallAvatar}>
                    <Bot color={colors.graphite} size={14} />
                  </View>
                  <View style={[styles.assistantBubble, styles.typing]}>
                    <ActivityIndicator color={colors.mintInk} size="small" />
                    <AppText tone="muted" variant="caption">
                      GR Coach is checking the shelf…
                    </AppText>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {!busy ? (
              <ScrollView
                contentContainerStyle={styles.chips}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
              >
                {(messages.length === 1 ? suggestions : lastAssistant?.followUps ?? []).map((prompt) => (
                  <Pressable
                    accessibilityRole="button"
                    key={prompt}
                    onPress={() => void send(prompt)}
                    style={styles.chip}
                  >
                    <AppText style={styles.chipText} variant="caption">
                      {prompt}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {error ? (
              <AppText accessibilityRole="alert" style={styles.error} tone="danger" variant="caption">
                {error}
              </AppText>
            ) : null}

            <View style={styles.composer}>
              <TextInput
                accessibilityLabel="Message GR Coach"
                editable={!busy}
                maxLength={2000}
                multiline
                onChangeText={setDraft}
                onKeyPress={(event) => {
                  const native = event.nativeEvent as { key: string; shiftKey?: boolean };
                  if (native.key === 'Enter' && !native.shiftKey) {
                    event.preventDefault?.();
                    void send(draft);
                  }
                }}
                placeholder="Ask about your goal, diet, budget…"
                placeholderTextColor={colors.mineral}
                style={styles.input}
                value={draft}
              />
              <Pressable
                accessibilityLabel="Send message"
                accessibilityRole="button"
                accessibilityState={{ disabled: !draft.trim() || busy }}
                disabled={!draft.trim() || busy}
                onPress={() => void send(draft)}
                style={[styles.send, (!draft.trim() || busy) && styles.sendDisabled]}
              >
                <SendHorizontal color={colors.graphite} size={20} />
              </Pressable>
            </View>
          </View>
          {mobile ? disclaimer : null}
        </View>
      </PageShell>
    </ScrollView>
  );
}

function ProductPick({ product, rank }: { product: Product; rank: number }) {
  // Lowest in-stock price, so budget-based picks show the option that fits.
  const inStock = product.variants.filter((v) => v.stockAvailable > 0);
  const variant = [...(inStock.length ? inStock : product.variants)].sort(
    (a, b) => a.price.amountPaise - b.price.amountPaise,
  )[0];
  const media = product.media[0];
  return (
    <Link accessibilityLabel={`View ${product.name}`} asChild href={`/product/${product.slug}` as Href}>
      <Pressable style={styles.pick}>
        <View style={[styles.pickMedia, { backgroundColor: media?.backgroundColor ?? colors.graphiteSurface }]}>
          {media?.uri ? (
            <Image accessibilityLabel={media.alt} contentFit="contain" source={{ uri: media.uri }} style={styles.pickImage} />
          ) : (
            <AppText style={styles.pickRank}>{rank}</AppText>
          )}
        </View>
        <View style={styles.pickCopy}>
          <AppText style={styles.pickBrand}>{product.brand.toUpperCase()}</AppText>
          <AppText numberOfLines={2} style={styles.pickName}>
            {product.name}
          </AppText>
          {variant ? (
            <View style={styles.pickPrice}>
              {product.variants.length > 1 ? (
                <AppText tone="muted" variant="caption">
                  From
                </AppText>
              ) : null}
              <Price amountPaise={variant.price.amountPaise} mrpPaise={variant.mrp.amountPaise} size="compact" />
            </View>
          ) : null}
        </View>
        <ArrowRight color={colors.mintInk} size={18} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.graphite, flex: 1 },
  pageContent: { flexGrow: 1 },
  shell: { paddingBottom: spacing[16], paddingTop: spacing[8] },
  layout: { alignItems: 'stretch', flexDirection: 'row', gap: spacing[12] },
  mobileLayout: { flexDirection: 'column', gap: spacing[6] },
  intro: { flex: 0.85, gap: spacing[5], minWidth: 0, paddingTop: spacing[4] },
  mobileIntro: { gap: spacing[3], paddingTop: 0 },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  badgeText: { color: colors.graphite, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.6 },
  mobileTitle: { fontSize: 46, lineHeight: 46 },
  introCopy: { color: colors.onDarkMuted, fontSize: 16, lineHeight: 26, maxWidth: 480 },
  features: { gap: spacing[3], marginTop: spacing[2] },
  feature: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: colors.graphiteRaised,
    borderColor: colors.graphiteLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  featureText: { color: colors.onDark, flexShrink: 1, fontFamily: typography.bodySemibold, fontSize: 14 },
  disclaimer: { color: colors.onDarkMuted, marginTop: spacing[2], maxWidth: 480 },
  chat: {
    backgroundColor: colors.obsidian,
    borderColor: colors.graphiteLine,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1.15,
    height: 680,
    minWidth: 0,
    overflow: 'hidden',
    ...shadows.raised,
  },
  mobileChat: { height: 600 },
  chatHeader: {
    alignItems: 'center',
    backgroundColor: colors.graphiteRaised,
    borderBottomColor: colors.mint,
    borderBottomWidth: 2,
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chatHeaderCopy: { flex: 1, gap: 2 },
  chatName: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 16 },
  onlineRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  onlineDot: { backgroundColor: '#3DDC84', borderRadius: 4, height: 8, width: 8 },
  onlineText: { color: colors.onDarkMuted },
  resetButton: {
    alignItems: 'center',
    borderColor: colors.graphiteLine,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  threadScroll: { flex: 1 },
  thread: { gap: spacing[4], padding: spacing[5] },
  assistantRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[2], maxWidth: '92%' },
  userRow: { alignSelf: 'flex-end', maxWidth: '85%' },
  smallAvatar: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  messageColumn: { flexShrink: 1, gap: spacing[2], minWidth: 0 },
  assistantBubble: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  userBubble: {
    backgroundColor: colors.graphite,
    borderRadius: radii.md,
    borderTopRightRadius: 4,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  assistantText: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  userText: { color: colors.onDark, fontSize: 15, lineHeight: 23 },
  typing: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  picks: { gap: spacing[2] },
  pick: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.mint,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  pickMedia: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
  },
  pickImage: { height: '88%', width: '88%' },
  pickRank: { color: colors.graphite, fontFamily: typography.displayHeavy, fontSize: 28 },
  pickCopy: { flex: 1, gap: 2, minWidth: 0 },
  pickBrand: { color: colors.mintInk, fontFamily: typography.bodyBold, fontSize: 10.5, letterSpacing: 1.2 },
  pickPrice: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pickName: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 14.5, lineHeight: 20 },
  chipScroll: { flexGrow: 0 },
  chips: { gap: spacing[2], paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  chip: {
    backgroundColor: colors.mintSoft,
    borderColor: '#A8EBD3',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing[4],
  },
  chipText: { color: colors.mintInk, fontFamily: typography.bodySemibold },
  error: { paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
  },
  input: {
    backgroundColor: colors.obsidian,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1.5,
    color: colors.ink,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 15,
    maxHeight: 140,
    minHeight: 50,
    paddingHorizontal: spacing[4],
    paddingTop: 14,
    paddingBottom: 14,
  },
  send: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.md,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  sendDisabled: { opacity: 0.4 },
});
