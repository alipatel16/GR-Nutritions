import { ClipboardList, PackageCheck, ShoppingBag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const shoppingNotes = [
  {
    icon: PackageCheck,
    title: 'Check the label',
    copy: 'Refer to the pack for batch details, expiry and storage instructions.',
  },
  {
    icon: ClipboardList,
    title: 'Find your fit',
    copy: 'Review ingredients, serving instructions and warnings before choosing.',
  },
  {
    icon: ShoppingBag,
    title: 'Your bag, your choice',
    copy: 'Review your selected options and quantities in the bag before checkout.',
  },
] as const;

export function ProductTrustPanel() {
  const breakpoint = useBreakpoint();
  return (
    <View style={[styles.panel, breakpoint === 'mobile' && styles.stacked]}>
      {shoppingNotes.map(({ icon: Icon, title, copy }, index) => (
        <View
          key={title}
          testID={`product-shopping-note-${index}`}
          style={[styles.item, breakpoint === 'mobile' && styles.mobileItem]}
        >
          <View style={styles.icon}>
            <Icon color={colors.gold} size={20} strokeWidth={1.8} />
          </View>
          <View style={styles.copy}>
            <AppText variant="label">{title}</AppText>
            <AppText tone="muted" variant="caption">
              {copy}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    padding: spacing[6],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.midnight,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stacked: { flexDirection: 'column', gap: spacing[5] },
  item: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  mobileItem: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  copy: { flex: 1, gap: spacing[2], minWidth: 0 },
});
