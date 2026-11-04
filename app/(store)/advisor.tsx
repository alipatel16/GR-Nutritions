import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { RotateCcw, Sparkles } from 'lucide-react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { Price } from '@/components/ui/Price';
import { recommendProducts, type Preferences } from '@/features/advisor/advisor-domain';
import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import { productGoalValues, type Product } from '@/features/catalog/types';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';

const label = (value: string) => value.replaceAll('-', ' ');

function Choice<T extends string | number | boolean>({ step, title, options, value, onChange }: {
  step: number;
  title: string;
  options: readonly (readonly [T, string])[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <View style={[styles.stepBadge, value !== undefined && styles.stepDone]}>
          <AppText style={[styles.stepText, value !== undefined && styles.stepTextDone]}>{step}</AppText>
        </View>
        <AppText style={styles.groupTitle}>{title}</AppText>
      </View>
      <View style={styles.options}>
        {options.map(([key, name]) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: key === value }}
            key={String(key)} onPress={() => onChange(key)}
            style={[styles.choice, key === value && styles.selected]}>
            <AppText style={[styles.choiceText, key === value && styles.selectedText]}>{name}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AdvisorRoute() {
  const { product } = useLocalSearchParams<{ product?: string }>();
  const desktop = useBreakpoint() === 'desktop';
  const [products, setProducts] = useState<Product[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [goal, setGoal] = useState<Preferences['goal']>();
  const [diet, setDiet] = useState<Preferences['diet']>('any');
  const [budget, setBudget] = useState(Number.MAX_SAFE_INTEGER);
  const [avoidStimulants, setAvoidStimulants] = useState(false);

  useEffect(() => {
    let current = true;
    void (async () => {
      const first = await catalogRepository.list({ page: 1, pageSize: 100 });
      const pages = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) },
        (_, index) => catalogRepository.list({ page: index + 2, pageSize: 100 })));
      if (current) setProducts([first, ...pages].flatMap((page) => page.items));
    })().catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [attempt]);

  const viewing = products?.find((item) => item.slug === product);
  const matches = products && goal ? recommendProducts(products, { goal, budgetPaise: budget, diet, avoidStimulants }) : [];
  const reset = () => {
    setGoal(undefined);
    setDiet('any');
    setBudget(Number.MAX_SAFE_INTEGER);
    setAvoidStimulants(false);
  };

  return (
    <ChromeScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <PageShell>
          <View style={styles.heroCopy}>
            <View style={styles.badge}>
              <Sparkles color={colors.onMint} size={14} />
              <AppText style={styles.badgeText}>Product finder</AppText>
            </View>
            <AppText tone="inverse" variant="display" accessibilityRole="header" style={!desktop && styles.mobileTitle}>GR COACH</AppText>
            <AppText style={styles.heroText}>Choose your preferences to find in-stock products from the GR Nutritions catalogue.</AppText>
            {viewing ? (
              <View style={styles.viewing}>
                <AppText style={styles.viewingText}>Exploring alternatives to {viewing.name}</AppText>
              </View>
            ) : null}
          </View>
        </PageShell>
      </View>

      <PageShell style={styles.shell}>
        <View style={[styles.layout, !desktop && styles.stacked]}>
          <View style={[styles.panel, desktop && styles.panelDesktop]}>
            <Choice step={1} title="Your goal" options={productGoalValues.map((item) => [item, label(item)] as const)} value={goal} onChange={setGoal} />
            <Choice<Preferences['diet']> step={2} title="Diet" options={[[ 'any', 'Any diet' ], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan']]} value={diet} onChange={setDiet} />
            <Choice step={3} title="Budget per product" options={[[Number.MAX_SAFE_INTEGER, 'Any budget'], [150000, 'Up to ₹1,500'], [300000, 'Up to ₹3,000'], [500000, 'Up to ₹5,000']]} value={budget} onChange={setBudget} />
            <Choice step={4} title="Stimulant preference" options={[[false, 'No preference'], [true, 'Avoid stimulant products']]} value={avoidStimulants} onChange={setAvoidStimulants} />
            {goal ? (
              <Pressable accessibilityRole="button" onPress={reset} style={styles.reset}>
                <RotateCcw color={colors.mineral} size={15} />
                <AppText style={styles.resetText}>Start over</AppText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.results}>
            {failed ? (
              <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setAttempt(attempt + 1); }} style={styles.stateCard}>
                <AppText tone="danger">The catalogue could not load. Tap to retry.</AppText>
              </Pressable>
            ) : !products ? (
              <View style={styles.stateCard}><AppText tone="muted">Loading the catalogue…</AppText></View>
            ) : goal ? (
              <View style={styles.resultList} accessibilityLiveRegion="polite">
                <View style={styles.resultsHeading}>
                  <AppText variant="heading">Your matches</AppText>
                  <AppText tone="muted" variant="caption">{matches.length} {matches.length === 1 ? 'product' : 'products'}</AppText>
                </View>
                {matches.length === 0 ? (
                  <View style={styles.stateCard}>
                    <AppText tone="muted">No in-stock products match these preferences. Adjust your choices to try again.</AppText>
                  </View>
                ) : null}
                {matches.map(({ product: item, variantId, pricePaise, reason }, index) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.rank}><AppText style={styles.rankText}>{index + 1}</AppText></View>
                    <View style={styles.cardBody}>
                      <AppText style={styles.cardBrand}>{item.brand.toUpperCase()}</AppText>
                      <AppText style={styles.cardTitle}>{item.name}</AppText>
                      <AppText tone="muted" variant="caption">{item.variants.find((variant) => variant.id === variantId)?.label}</AppText>
                      <Price amountPaise={pricePaise} size="compact" />
                      <AppText style={styles.reason}>{reason}</AppText>
                      <Link href={{ pathname: '/product/[slug]', params: { slug: item.slug } }} style={styles.link}>View product →</Link>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Sparkles color={colors.mintInk} size={28} />
                <AppText style={styles.emptyTitle}>Choose a goal to see your matches.</AppText>
                <AppText tone="muted" variant="caption">Your picks update as soon as you change a preference.</AppText>
              </View>
            )}
            <AppText tone="muted" variant="caption">Catalogue matches are for shopping guidance. Check the product label for ingredients, allergens and warnings.</AppText>
          </View>
        </View>
      </PageShell>
    </ChromeScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.obsidian, flex: 1 },
  content: { paddingBottom: spacing[16] },
  hero: { backgroundColor: colors.graphite, paddingBottom: spacing[8], paddingTop: spacing[8] },
  heroCopy: { gap: spacing[3], maxWidth: 720 },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  badgeText: { color: colors.onMint, fontFamily: typography.bodyBold, fontSize: 12 },
  mobileTitle: { fontSize: 46, lineHeight: 46 },
  heroText: { color: colors.graphiteMuted, fontSize: 16, lineHeight: 24 },
  viewing: {
    alignSelf: 'flex-start',
    backgroundColor: colors.graphiteRaised,
    borderColor: colors.graphiteLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  viewingText: { color: colors.onDark, fontSize: 13 },
  shell: { paddingTop: spacing[6] },
  layout: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[8] },
  stacked: { flexDirection: 'column', gap: spacing[6] },
  panel: {
    alignSelf: 'stretch',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[6],
    padding: spacing[5],
    ...shadows.card,
  },
  panelDesktop: { alignSelf: 'flex-start', flex: 1, padding: spacing[6] },
  group: { gap: spacing[3] },
  groupHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.graphiteSurface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  stepDone: { backgroundColor: colors.graphite, borderColor: colors.graphite },
  stepText: { color: colors.mineral, fontFamily: typography.bodyBold, fontSize: 12 },
  stepTextDone: { color: colors.mint },
  groupTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  choice: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing[4],
  },
  selected: { backgroundColor: colors.graphite, borderColor: colors.graphite },
  choiceText: { color: colors.ink, fontFamily: typography.bodySemibold, fontSize: 13.5, textTransform: 'capitalize' },
  selectedText: { color: colors.mint },
  reset: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing[2], minHeight: 36 },
  resetText: { color: colors.mineral, fontFamily: typography.bodySemibold, fontSize: 13 },
  results: { flex: 1.2, gap: spacing[4], minWidth: 0, width: '100%' },
  resultList: { gap: spacing[3] },
  resultsHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  stateCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing[5],
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
  },
  emptyTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16, textAlign: 'center' },
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[4],
    padding: spacing[4],
    ...shadows.card,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rankText: { color: colors.onMint, fontFamily: typography.bodyBold, fontSize: 14 },
  cardBody: { flex: 1, gap: spacing[1], minWidth: 0 },
  cardBrand: { color: colors.olive, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.2 },
  cardTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16, lineHeight: 22 },
  reason: { color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.mintInk, fontFamily: typography.bodyBold, fontSize: 14, marginTop: spacing[1], textDecorationLine: 'none' },
});
