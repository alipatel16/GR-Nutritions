import { useEffect, useState } from 'react';
import { Slot, Link, usePathname } from 'expo-router';
import { Animated, StyleSheet, View, Pressable } from 'react-native';

import { MobileTabs } from '@/components/navigation/MobileTabs';
import { ScrollChromeProvider, useScrollChrome } from '@/components/navigation/ScrollChrome';
import { WebHeader } from '@/components/navigation/WebHeader';
import { colors, shadows, typography } from '@/theme/tokens';
import { Sparkles } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/theme/use-breakpoint';
import { useReducedMotion } from '@/theme/use-reduced-motion';

function CoachButton() {
  const breakpoint = useBreakpoint();
  const mobile = breakpoint === 'mobile';
  const path = usePathname();
  // Phones reach GR Coach from the tab bar; the floating button is for larger screens.
  if (path === '/advisor' || mobile) return null;

  return (
    <Link href="/advisor" accessibilityLabel="Ask GR Coach" asChild>
      <Pressable
        style={StyleSheet.flatten([styles.coach, breakpoint === 'tablet' && styles.aboveTabs])}
      >
        <Sparkles color={colors.graphite} size={19} />
        <AppText style={styles.coachText}>GR Coach</AppText>
      </Pressable>
    </Link>
  );
}

// On phones and tablets the header slides up out of the way while the shopper
// scrolls down and returns as soon as they scroll back up. Desktop keeps it fixed.
function CollapsingHeader() {
  const collapsible = useBreakpoint() !== 'desktop';
  const reducedMotion = useReducedMotion();
  const { headerHidden, showHeader } = useScrollChrome();
  const path = usePathname();
  const [height, setHeight] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const hidden = collapsible && headerHidden && height > 0;

  useEffect(() => {
    showHeader();
  }, [path, showHeader]);

  useEffect(() => {
    const target = hidden ? -height : 0;
    if (reducedMotion) offset.setValue(target);
    else Animated.timing(offset, { toValue: target, duration: 200, useNativeDriver: false }).start();
  }, [hidden, height, offset, reducedMotion]);

  return (
    <Animated.View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[styles.header, { marginTop: offset }]}
    >
      <WebHeader />
    </Animated.View>
  );
}

export default function StoreLayout() {
  return (
    <ScrollChromeProvider>
      <View style={styles.shell}>
        <CollapsingHeader />
        <View style={styles.content}>
          <Slot />
        </View>
        <MobileTabs />
        <CoachButton />
      </View>
    </ScrollChromeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  header: {
    zIndex: 2,
  },
  content: {
    flex: 1,
  },
  coach: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderColor: colors.graphite,
    borderRadius: 99,
    borderWidth: 2,
    bottom: 24,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: 'absolute',
    right: 18,
    ...shadows.raised,
  },
  // Tablets also show the bottom tab bar.
  aboveTabs: { bottom: 92 },
  coachText: { color: colors.graphite, fontFamily: typography.bodyBold, fontSize: 13 },
});
