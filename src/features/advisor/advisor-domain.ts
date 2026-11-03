import type { Product, ProductGoal } from '@/features/catalog/types';
export type Preferences = {
  goal: ProductGoal;
  budgetPaise: number;
  diet: 'any' | 'vegetarian' | 'vegan';
  avoidStimulants: boolean;
};
export function needsProfessionalAdvice(text: string): boolean {
  return /pregnan|breastfeed|nursing|medicat|diabet|kidney|liver disease|heart condition|under\s*18|\b(?:[1-9]|1[0-7])\s*(?:years?\s*old|yo)\b/i.test(
    text,
  );
}
export function parseGoal(text: string): ProductGoal {
  if (/fat|weight|slim|lean/i.test(text)) return 'weight-management';
  if (/recover|sore/i.test(text)) return 'recovery';
  if (/energy|pre.?workout/i.test(text)) return 'energy';
  if (/well|vitamin|health/i.test(text)) return 'everyday-wellness';
  return 'muscle-gain';
}
export function recommendProducts(products: Product[], prefs: Preferences) {
  if (!Number.isFinite(prefs.budgetPaise) || prefs.budgetPaise <= 0) return [];
  return products
    .filter((p) => p.status === 'active' && p.goals.includes(prefs.goal))
    .filter((p) => prefs.diet === 'any' || p.dietaryTags.includes(prefs.diet))
    .filter(
      (p) =>
        !prefs.avoidStimulants ||
        (!['pre-workout', 'energy'].includes(p.category) &&
          !p.ingredients.some((i) => /caffeine|guarana|yohimb/i.test(i.name))),
    )
    .flatMap((p) => {
      const variant = p.variants
        .filter(
          (v) =>
            v.stockAvailable > 0 && v.price.amountPaise <= prefs.budgetPaise,
        )
        .sort((a, b) => a.price.amountPaise - b.price.amountPaise)[0];
      return variant
        ? [
            {
              product: p,
              variantId: variant.id,
              pricePaise: variant.price.amountPaise,
              reason: `Matches your ${prefs.goal.replaceAll('-', ' ')} goal${prefs.diet !== 'any' ? ` and ${prefs.diet} preference` : ''}. This option fits your per-product budget.`,
            },
          ]
        : [];
    })
    .sort((a, b) => a.pricePaise - b.pricePaise)
    .slice(0, 3);
}
