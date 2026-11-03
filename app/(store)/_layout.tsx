import { Slot, Link, usePathname } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';

import { MobileTabs } from '@/components/navigation/MobileTabs';
import { WebHeader } from '@/components/navigation/WebHeader';
import { colors, shadows, typography } from '@/theme/tokens';
import { Sparkles } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/theme/use-breakpoint';

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
        <AppText style={styles.coachText}>Ask GR Coach AI</AppText>
      </Pressable>
    </Link>
  );
}

export default function StoreLayout() {
  return (
    <View style={styles.shell}>
      <WebHeader />
      <View style={styles.content}>
        <Slot />
      </View>
      <MobileTabs />
      <CoachButton />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.obsidian,
    flex: 1,
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
