import { Link } from 'expo-router';
import { BadgeCheck, ClipboardList, HeartHandshake, LockKeyhole } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { InfoPage } from '@/components/layout/InfoPage';
import { AppText } from '@/components/ui/AppText';
import { storeInfo } from '@/config/store-info';
import { ContactDetails } from '@/features/info/ContactDetails';
import { aboutSections, aboutValues, brandsOnShelf } from '@/features/info/content';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const valueIcons = [BadgeCheck, ClipboardList, HeartHandshake, LockKeyhole];

export default function AboutRoute() {
  return (
    <InfoPage
      aside={<ContactDetails />}
      description={`Genuine sports nutrition and everyday wellness from Ahmedabad, delivered across India. Run by ${storeInfo.owner}.`}
      eyebrow="ABOUT GR NUTRITIONS"
      sections={aboutSections}
      title="About us"
    >
      <View style={styles.values}>
        {aboutValues.map((value, index) => {
          const Icon = valueIcons[index];
          return (
            <View key={value.title} style={styles.value}>
              <View style={styles.icon}>
                <Icon color={colors.mint} size={20} />
              </View>
              <AppText style={styles.valueTitle}>{value.title}</AppText>
              <AppText tone="muted" variant="caption">{value.body}</AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.brands}>
        <AppText style={styles.brandsTitle}>Brands on our shelf</AppText>
        <View style={styles.brandList}>
          {brandsOnShelf.map((brand) => (
            <Link href={{ pathname: '/shop', params: { brand } }} key={brand} style={styles.brand}>
              {brand}
            </Link>
          ))}
        </View>
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  value: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing[2],
    padding: spacing[5],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  valueTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16 },
  brands: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[5],
  },
  brandsTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 18 },
  brandList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  brand: {
    backgroundColor: colors.graphiteSurface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.bodySemibold,
    fontSize: 13,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    textDecorationLine: 'none',
  },
});
