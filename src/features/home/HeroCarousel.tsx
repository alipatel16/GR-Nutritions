import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Carousel } from '@/components/commerce/Carousel';
import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const campaigns = [
  {
    eyebrow: 'BUILT AROUND YOUR NEXT LEVEL',
    title: 'GOOD FUEL. GREAT POTENTIAL.',
    body: 'From your first scoop to your next personal best. Discover nutrition that fits your goal, routine, and life.',
    primaryLabel: 'Find your fuel',
    primaryAccessibilityLabel: 'Shop all supplements',
    primaryHref: '/shop',
    secondaryLabel: 'Help me choose',
    secondaryAccessibilityLabel: 'Find my stack',
    secondaryHref: '/advisor',
    accent: '#FF806A',
    shade: '#07110966',
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
    accent: '#E9F2D8',
    shade: '#173526A8',
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
    accent: '#FFD7B5',
    shade: '#17241DB8',
  },
] as const;

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
            <PageShell style={styles.heroShell}>
              <View style={[styles.layout, mobile && styles.mobileLayout]}>
                <View
                  style={[styles.copy, mobile && styles.mobileColumn]}
                  testID={index === 0 ? 'home-hero-copy' : undefined}
                >
                  <AppText style={styles.eyebrow}>{campaign.eyebrow}</AppText>
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
                        <AppText style={styles.buttonText}>{campaign.primaryLabel}</AppText>
                        <ArrowRight color="#FFF" size={17} />
                      </Pressable>
                    </Link>
                    <Link
                      accessibilityLabel={campaign.secondaryAccessibilityLabel}
                      asChild
                      href={campaign.secondaryHref as Href}
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Sparkles color="#FFF" size={16} />
                        <AppText style={styles.buttonText}>{campaign.secondaryLabel}</AppText>
                      </Pressable>
                    </Link>
                  </View>
                  <View style={styles.note}>
                    <ShieldCheck color="#D8E2D5" size={15} />
                    <AppText style={styles.noteText}>
                      Clear product information for confident choices.
                    </AppText>
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
  frame: { backgroundColor: '#111A16', overflow: 'hidden' },
  slide: { justifyContent: 'center', minHeight: 520, overflow: 'hidden' },
  mobileSlide: { minHeight: 570 },
  heroShell: { paddingVertical: spacing[10] },
  layout: { flexDirection: 'row', width: '100%' },
  mobileLayout: { flexWrap: 'wrap' },
  copy: { gap: spacing[4], maxWidth: 660, minWidth: 0, width: '58%' },
  visual: { minWidth: 0, width: '42%' },
  mobileColumn: { flexBasis: '100%', minWidth: 0, width: '100%' },
  eyebrow: {
    color: '#E5EDE2',
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    lineHeight: 17,
  },
  title: {
    fontFamily: typography.displayHeavy,
    fontSize: 88,
    letterSpacing: -1.8,
    lineHeight: 80,
    maxWidth: 650,
  },
  mobileTitle: { fontSize: 58, letterSpacing: -1, lineHeight: 54 },
  body: { color: '#E0E7DE', fontSize: 15, lineHeight: 24, maxWidth: 470 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderRadius: 6,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 48,
    paddingHorizontal: spacing[5],
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#A9B5A7',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 48,
    paddingHorizontal: spacing[5],
  },
  buttonText: { color: '#FFF', fontFamily: typography.bodyBold, fontSize: 13 },
  note: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  noteText: { color: '#D8E2D5', fontSize: 11, lineHeight: 17 },
});
