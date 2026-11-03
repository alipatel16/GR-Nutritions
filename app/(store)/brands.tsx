import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { PageHero } from "@/components/layout/PageHero";
import { PageShell } from "@/components/layout/PageShell";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { BrandGrid } from "@/features/catalog/BrandGrid";
import { catalogRepository } from "@/features/catalog/supabase-catalog-repository";
import { colors } from "@/theme/tokens";

export default function BrandsRoute() {
  const [brands, setBrands] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void catalogRepository
      .list({ pageSize: Number.MAX_SAFE_INTEGER })
      .then(({ items }) => {
        if (active)
          setBrands([...new Set(items.map((item) => item.brand))].sort());
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.obsidian }}
      contentContainerStyle={{ paddingBottom: 112 }}
    >
      <PageHero
        description="Find your favourite nutrition brands and explore their products."
        eyebrow="TRUSTED NAMES, ONE SHELF"
        title="SHOP BY BRAND"
      />
      <PageShell style={{ paddingTop: 40 }}>
        <View style={{ gap: 20 }}>
          {error ? (
            <View style={{ gap: 12, alignItems: "flex-start" }}>
              <AppText tone="danger">
                Brands could not load. Please try again.
              </AppText>
              <Button
                onPress={() => {
                  setError(false);
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </Button>
            </View>
          ) : brands === null ? (
            <ActivityIndicator
              accessibilityLabel="Loading brands"
              color={colors.violet}
            />
          ) : brands.length ? (
            <BrandGrid brands={brands} />
          ) : (
            <AppText tone="muted">New brands are coming soon.</AppText>
          )}
        </View>
      </PageShell>
    </ScrollView>
  );
}
