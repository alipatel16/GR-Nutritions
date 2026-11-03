import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { colors } from '@/theme/tokens';
export default function RootLayout() {
  const [loaded, error] = useFonts({
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.title = 'GR Nutritions · Authentic Supplements, Delivered Across India';
    document.documentElement.style.backgroundColor = colors.obsidian;
    document.body.style.backgroundColor = colors.obsidian;
    document.body.style.fontFamily =
      'DMSans_400Regular, "DM Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const style = document.createElement('style');
    style.dataset.grNutritions = 'global';
    style.textContent = `
      * { box-sizing: border-box; }
      :focus-visible { outline: 2px solid #0B7A5C; outline-offset: 3px; }
      ::selection { background: #DDF7EE; color: #1C1C17; }
    `;
    document.head.appendChild(style);

    return () => style.remove();
  }, []);
  if (!loaded && !error)
    return <View style={{ backgroundColor: colors.obsidian, flex: 1 }} />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
