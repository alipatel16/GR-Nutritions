import { Slot, Link } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';

import { MobileTabs } from '@/components/navigation/MobileTabs';
import { WebHeader } from '@/components/navigation/WebHeader';
import { colors } from '@/theme/tokens';
import { MessageCircle } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/theme/use-breakpoint';

function CoachButton() {
  const mobile = useBreakpoint() === 'mobile';

  return (
    <Link href="/advisor" accessibilityLabel="Ask GR Coach" asChild>
      <Pressable
        style={StyleSheet.flatten([styles.coach, mobile && styles.mobileCoach])}
      >
        <MessageCircle color="#FFF" size={19} />
        {!mobile ? <AppText style={styles.coachText}>Ask GR Coach</AppText> : null}
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
    backgroundColor: colors.violet,
    borderRadius: 99,
    bottom: 24,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    position: 'absolute',
    right: 18,
  },
  mobileCoach: { bottom: 84, height: 48, justifyContent: 'center', padding: 0, width: 48 },
  coachText: { color: '#FFF', fontSize: 11 },
});
