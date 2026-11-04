import { createElement } from 'react';
import { MapPin, Navigation } from 'lucide-react-native';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { directionsLink, fullAddress, mapsEmbedUrl, mapsLink, storeInfo } from '@/config/store-info';
import { colors, radii, spacing, typography } from '@/theme/tokens';

// Live Google map with the store pin on the web; native apps open Google Maps.
export function StoreMap() {
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  return (
    <View style={styles.card}>
      {Platform.OS === 'web' ? (
        <View style={styles.frame}>
          {createElement('iframe', {
            src: mapsEmbedUrl(),
            title: `${storeInfo.legalName} store location`,
            referrerPolicy: 'no-referrer-when-downgrade',
            allowFullScreen: true,
            style: { border: 0, height: '100%', width: '100%' },
          })}
        </View>
      ) : (
        <Pressable accessibilityLabel="Open store location in Google Maps" accessibilityRole="link" onPress={() => open(mapsLink())} style={[styles.frame, styles.placeholder]}>
          <MapPin color={colors.mint} size={36} />
          <AppText style={styles.placeholderText}>Tap to open the map</AppText>
        </Pressable>
      )}
      <View style={styles.footer}>
        <View style={styles.pin}>
          <MapPin color={colors.onMint} size={18} />
        </View>
        <View style={styles.copy}>
          <AppText style={styles.name}>{storeInfo.legalName}</AppText>
          <AppText tone="muted" variant="caption">{fullAddress}</AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="link" onPress={() => open(directionsLink())} style={[styles.button, styles.primary]}>
          <Navigation color={colors.onMint} size={16} />
          <AppText style={styles.primaryText}>Get directions</AppText>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => open(mapsLink())} style={styles.button}>
          <MapPin color={colors.ink} size={16} />
          <AppText style={styles.buttonText}>Open in Google Maps</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[4],
    overflow: 'hidden',
    paddingBottom: spacing[5],
  },
  frame: { backgroundColor: colors.graphiteSurface, height: 340, width: '100%' },
  placeholder: { alignItems: 'center', gap: spacing[2], justifyContent: 'center' },
  placeholderText: { color: colors.mintInk, fontFamily: typography.bodySemibold },
  footer: { alignItems: 'center', flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[5] },
  pin: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[5] },
  button: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[4],
  },
  primary: { backgroundColor: colors.mint, borderColor: colors.mint },
  primaryText: { color: colors.onMint, fontFamily: typography.bodyBold },
  buttonText: { color: colors.ink, fontFamily: typography.bodySemibold },
});
