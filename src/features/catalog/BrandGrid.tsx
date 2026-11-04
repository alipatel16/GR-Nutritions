import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Link } from "expo-router";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AppText } from "@/components/ui/AppText";
import { colors, shadows } from "@/theme/tokens";
import { useReducedMotion } from "@/theme/use-reduced-motion";

const logos = new Map([
  ["MuscleBlaze", "muscleblaze.svg"],
  ["MuscleTech", "muscletech.webp"],
  ["Isopure", "isopure.webp"],
  ["Optimum Nutrition", "optimum-nutrition.webp"],
  ["One Science Nutrition", "one-science.webp"],
  ["Rule One Proteins", "rule-one.svg"],
  ["Transformium Nutrition", "transformium.webp"],
  ["Wellbeing Nutrition", "wellbeing-nutrition.png"],
  ["C9 Nutrition", "c9-nutrition.png"],
  ["Dymatize", "dymatize.svg"],
  ["GNC", "gnc.png"],
]);
const lightLogos = new Set([
  "Optimum Nutrition",
  "One Science Nutrition",
  "Rule One Proteins",
  "Dymatize",
]);

function BrandCard({
  brand,
  fixedWidth = false,
}: {
  brand: string;
  fixedWidth?: boolean;
}) {
  const logo = logos.get(brand);
  return (
    <Link key={brand} href={{ pathname: "/shop", params: { brand } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Shop ${brand}`}
        style={StyleSheet.flatten([
          styles.card,
          fixedWidth && styles.fixedCard,
        ])}
      >
        {logo ? (
          <View
            style={[styles.logoFrame, lightLogos.has(brand) && styles.darkLogo]}
          >
            <Image
              source={`https://grnutritions.web.app/catalog/brands-v1/${logo}`}
              accessibilityLabel={`${brand} logo`}
              contentFit="contain"
              style={styles.logo}
            />
          </View>
        ) : null}
        <AppText variant="label" style={styles.name}>
          {brand}
        </AppText>
      </Pressable>
    </Link>
  );
}

export function BrandGrid({ brands }: { brands: readonly string[] }) {
  return (
    <View style={styles.grid}>
      {brands.map((brand) => (
        <BrandCard brand={brand} key={brand} />
      ))}
    </View>
  );
}

const MARQUEE_SPEED = 40; // pixels per second

// One row of brands that glides sideways on its own and pauses while the
// shopper hovers or touches it. With reduced motion it is a plain swipeable row.
export function BrandMarquee({ brands }: { brands: readonly string[] }) {
  const reducedMotion = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const paused = useRef(false);

  const run = useCallback(() => {
    if (!rowWidth || paused.current) return;
    offset.stopAnimation((value) => {
      const remaining = Math.max(0, rowWidth + value);
      Animated.timing(offset, {
        toValue: -rowWidth,
        duration: (remaining / MARQUEE_SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (!finished) return;
        // After the partial pass, repeat full passes from the start of the row.
        offset.setValue(0);
        Animated.loop(
          Animated.timing(offset, {
            toValue: -rowWidth,
            duration: (rowWidth / MARQUEE_SPEED) * 1000,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== "web",
          }),
        ).start();
      });
    });
  }, [offset, rowWidth]);

  useEffect(() => {
    if (reducedMotion) return;
    run();
    return () => offset.stopAnimation();
  }, [offset, reducedMotion, run]);

  const pause = () => {
    paused.current = true;
    offset.stopAnimation();
  };
  const resume = () => {
    paused.current = false;
    run();
  };

  if (reducedMotion) {
    return (
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {brands.map((brand) => (
          <BrandCard brand={brand} fixedWidth key={brand} />
        ))}
      </ScrollView>
    );
  }

  return (
    <Pressable
      accessible={false}
      onHoverIn={pause}
      onHoverOut={resume}
      onPressIn={pause}
      onPressOut={resume}
      style={styles.viewport}
    >
      <Animated.View
        style={[styles.track, { transform: [{ translateX: offset }] }]}
      >
        <View
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          style={styles.row}
        >
          {brands.map((brand) => (
            <BrandCard brand={brand} fixedWidth key={brand} />
          ))}
        </View>
        {/* Second copy makes the loop seamless; screen readers only hear the first. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.row}
        >
          {brands.map((brand) => (
            <BrandCard brand={brand} fixedWidth key={`copy-${brand}`} />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  viewport: { marginHorizontal: -4, overflow: "hidden", paddingVertical: 8 },
  track: { flexDirection: "row" },
  // Trailing padding equals the gap so both copies tile without a seam.
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 6 },
  fixedCard: {
    flexBasis: "auto",
    flexGrow: 0,
    maxWidth: 200,
    minWidth: 0,
    width: 180,
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    minWidth: 150,
    minHeight: 120,
    flexGrow: 1,
    flexBasis: 136,
    maxWidth: 240,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    ...shadows.card,
  },
  logoFrame: {
    width: 124,
    height: 44,
    padding: 6,
    justifyContent: "center",
    borderRadius: 6,
  },
  darkLogo: { backgroundColor: colors.graphite },
  logo: { width: "100%", height: "100%" },
  name: { textAlign: "center" },
});
