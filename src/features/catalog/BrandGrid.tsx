import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/theme/tokens";

const logos = new Map([
  ["MuscleBlaze", "muscleblaze.svg"],
  ["MuscleTech", "muscletech.webp"],
  ["Isopure", "isopure.webp"],
  ["Optimum Nutrition", "optimum-nutrition.webp"],
  ["One Science Nutrition", "one-science.webp"],
  ["Rule One Proteins", "rule-one.svg"],
  ["Transformium Nutrition", "transformium.webp"],
]);
const lightLogos = new Set([
  "Optimum Nutrition",
  "One Science Nutrition",
  "Rule One Proteins",
]);

export function BrandGrid({ brands }: { brands: readonly string[] }) {
  return (
    <View style={styles.grid}>
      {brands.map((brand) => {
        const logo = logos.get(brand);
        return (
          <Link
            key={brand}
            href={{ pathname: "/shop", params: { brand } }}
            asChild
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Shop ${brand}`}
              style={styles.card}
            >
              {logo ? (
                <View
                  style={[
                    styles.logoFrame,
                    lightLogos.has(brand) && styles.darkLogo,
                  ]}
                >
                  <Image
                    source={`https://grnutritions.web.app/catalog/brands-v1/${logo}`}
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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    minWidth: 136,
    minHeight: 100,
    flexGrow: 1,
    flexBasis: 136,
    maxWidth: 240,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  logoFrame: {
    width: 124,
    height: 44,
    padding: 6,
    justifyContent: "center",
    borderRadius: 6,
  },
  darkLogo: { backgroundColor: "#181b19" },
  logo: { width: "100%", height: "100%" },
  name: { textAlign: "center" },
});
