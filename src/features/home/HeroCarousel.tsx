import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { ArrowRight, BadgeCheck, LockKeyhole, Sparkles, Truck } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Carousel } from '@/components/commerce/Carousel';
import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const campaigns = [
  {
    eyebrow: 'INDIA’S TRUSTED SUPPLEMENT STORE',
    title: 'GOOD FUEL. GREAT POTENTIAL.',
    body: 'Genuine protein, creatine, pre-workout and daily wellness from the brands serious athletes rely on. Not sure where to start? GR Coach will help you choose.',
    primaryLabel: 'Shop bestsellers',
    primaryAccessibilityLabel: 'Shop all supplements',
    primaryHref: '/shop',
    secondaryLabel: 'Ask GR Coach',
    secondaryAccessibilityLabel: 'Find my stack',
    secondaryHref: '/advisor',
    accent: colors.onDark,
    shade: '#12141733',
  },
  {
    eyebrow: 'SIMPLE CHOICES. SMARTER ROUTINES.',
    title: 'BUILD YOUR EVERYDAY STACK.',
    body: 'Start with protein, training support, or daily wellness—then shape a shelf that works for you.',
    primaryLabel: 'Shop protein',
    primaryAccessibilityLabel: 'Explore protein products',
    primaryHref: '/shop?category=protein',
    secondaryLabel: 'Shop by goal',
    secondaryAccessibilityLabel: 'Explore products by goal',
    secondaryHref: '/shop?goal=muscle-gain',
    accent: colors.onDark,
    shade: '#12141733',
  },
  {
    eyebrow: 'TRAIN. RESET. GO AGAIN.',
    title: 'RECOVERY COUNTS, TOO.',
    body: 'Explore recovery, hydration, and everyday essentials for the work that happens between sessions.',
    primaryLabel: 'Explore recovery',
    primaryAccessibilityLabel: 'Shop recovery products',
    primaryHref: '/shop?goal=recovery',
    secondaryLabel: 'View wellness',
    secondaryAccessibilityLabel: 'Shop wellness products',
    secondaryHref: '/shop?category=wellness',
    accent: colors.onDark,
    shade: '#12141733',
  },
] as const;

const scrimSteps = [0.86, 0.82, 0.76, 0.68, 0.56, 0.4, 0.22, 0.08, 0, 0];

export function HeroCarousel() {
  const { width } = useWindowDimensions();
  const mobile = useBreakpoint() === 'mobile';

  return (
    <View style={styles.frame}>
      <Carousel
        accessibilityLabel="Store campaigns"
        autoAdvanceMs={6000}
        itemWidth={width}
        items={campaigns}
        renderItem={(campaign, index) => (
          <View style={[styles.slide, mobile && styles.mobileSlide]}>
            <Image
              accessibilityLabel="GR Nutritions supplement campaign"
              contentFit="cover"
              contentPosition={index === 0 ? 'center' : 'right center'}
              source={require('../../../assets/images/gr-campaign.png')}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: campaign.shade }]} />
            {/* Stepped left-to-right scrim keeps copy legible while the pack shot stays visible. */}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]}>
              {scrimSteps.map((opacity, step) => (
                <View key={step} style={[styles.scrimStep, { opacity: mobile ? Math.max(opacity, 0.55) : opacity }]} />
              ))}
            </View>
            <PageShell style={styles.heroShell}>
              <View style={[styles.layout, mobile && styles.mobileLayout]}>
                <View
                  style={[styles.copy, mobile && styles.mobileColumn]}
                  testID={index === 0 ? 'home-hero-copy' : undefined}
                >
                  <View style={styles.eyebrowPill}>
                    <BadgeCheck color={colors.mint} size={14} />
                    <AppText style={styles.eyebrow}>{campaign.eyebrow}</AppText>
                  </View>
                  <AppText
                    accessibilityRole="header"
                    style={[
                      styles.title,
                      { color: campaign.accent },
                      mobile && styles.mobileTitle,
                    ]}
                  >
                    {campaign.title}
                  </AppText>
                  <AppText style={styles.body}>{campaign.body}</AppText>
                  <View style={styles.actions}>
                    <Link
                      accessibilityLabel={campaign.primaryAccessibilityLabel}
                      asChild
                      href={campaign.primaryHref as Href}
                    >
                      <Pressable style={styles.primaryButton}>
                        <AppText style={styles.primaryText}>{campaign.primaryLabel}</AppText>
                        <ArrowRight color={colors.graphite} size={17} />
                      </Pressable>
                    </Link>
                    <Link
                      accessibilityLabel={campaign.secondaryAccessibilityLabel}
                      asChild
                      href={campaign.secondaryHref as Href}
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Sparkles color={colors.mint} size={16} />
                        <AppText style={styles.buttonText}>{campaign.secondaryLabel}</AppText>
                      </Pressable>
                    </Link>
                  </View>
                  <View style={styles.notes}>
                    {([
                      [BadgeCheck, 'Authentic products'],
                      [Truck, 'Free delivery over ₹999'],
                      [LockKeyhole, 'Secure checkout'],
                    ] as const).map(([Icon, label]) => (
                      <View key={label} style={styles.note}>
                        <Icon color={colors.mint} size={15} />
                        <AppText style={styles.noteText}>{label}</AppText>
                      </View>
                    ))}
                  </View>
                </View>
                <View
                  style={[styles.visual, mobile && styles.mobileColumn]}
                  testID={index === 0 ? 'home-hero-visual' : undefined}
                />
              </View>
            </PageShell>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.graphite, overflow: 'hidden', paddingBottom: spacing[4] },
  slide: { justifyContent: 'center', minHeight: 560, overflow: 'hidden' },
  mobileSlide: { minHeight: 600 },
  scrim: { flexDirection: 'row' },
  scrimStep: { backgroundColor: colors.graphite, flex: 1 },
  heroShell: { paddingVertical: spacing[12] },
  layout: { flexDirection: 'row', width: '100%' },
  mobileLayout: { flexWrap: 'wrap' },
  copy: { gap: spacing[5], maxWidth: 680, minWidth: 0, width: '58%' },
  visual: { minWidth: 0, width: '42%' },
  mobileColumn: { flexBasis: '100%', minWidth: 0, width: '100%' },
  eyebrowPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#12141799',
    borderColor: '#3EE6B066',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  eyebrow: {
    color: colors.mint,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    lineHeight: 16,
  },
  title: {
    fontFamily: typography.displayHeavy,
    fontSize: 96,
    letterSpacing: -1,
    lineHeight: 88,
    maxWidth: 660,
  },
  mobileTitle: { fontSize: 60, letterSpacing: -0.5, lineHeight: 56 },
  body: { color: '#D5DCE8', fontSize: 16, lineHeight: 26, maxWidth: 500 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[1] },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.xs,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 52,
    paddingHorizontal: spacing[6],
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#12141780',
    borderColor: '#F8FAFC55',
    borderRadius: radii.xs,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 52,
    paddingHorizontal: spacing[6],
  },
  primaryText: { color: colors.graphite, fontFamily: typography.bodyBold, fontSize: 14, letterSpacing: 0.3 },
  buttonText: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 14, letterSpacing: 0.3 },
  notes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[5], marginTop: spacing[2] },
  note: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  noteText: { color: colors.onDark, fontFamily: typography.bodySemibold, fontSize: 12.5, lineHeight: 18 },
});
