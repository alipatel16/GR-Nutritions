import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import { ProductCard } from '@/features/catalog/ProductCard';
import type { Product } from '@/features/catalog/types';
import {
  needsProfessionalAdvice,
  parseGoal,
  recommendProducts,
  type Preferences,
} from '@/features/advisor/advisor-domain';
import { colors } from '@/theme/tokens';
export default function AdvisorRoute() {
  const [products, setProducts] = useState<Product[]>([]);
  const [text, setText] = useState('');
  const [budget, setBudget] = useState('3000');
  const [diet, setDiet] = useState<Preferences['diet']>('any');
  const [avoid, setAvoid] = useState(true);
  const [submitted, setSubmitted] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void catalogRepository
      .list({ pageSize: 100 })
      .then((r) => setProducts(r.items))
      .catch(() => setError('The product shelf could not load. Please retry.'));
  }, []);
  const stop = needsProfessionalAdvice(submitted);
  const validBudget = Number.isFinite(Number(budget)) && Number(budget) > 0;
  const recommendations = useMemo(
    () =>
      submitted && !stop && validBudget
        ? recommendProducts(products, {
            goal: parseGoal(submitted),
            budgetPaise: Math.round(Number(budget) * 100),
            diet,
            avoidStimulants: avoid,
          })
        : [],
    [products, submitted, stop, budget, diet, avoid, validBudget],
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <PageShell style={{ paddingTop: 35, paddingBottom: 90 }}>
        <View style={styles.layout}>
          <View style={styles.intro}>
            <View style={styles.icon}>
              <Sparkles color="#E4ECCD" size={32} />
            </View>
            <AppText tone="accent" variant="caption">
              MEET GR COACH
            </AppText>
            <AppText accessibilityRole="header" variant="display">
              YOUR GOAL.{'\n'}YOUR ROUTINE.{'\n'}YOUR NEXT STEP.
            </AppText>
            <AppText tone="muted" variant="bodyLarge">
              A clearer path through the supplement shelf. Tell us what you’re
              working towards and we’ll help you compare.
            </AppText>
            <AppText tone="muted" variant="caption">
              Guided product finder · matches your preferences against the
              catalog. Recommendations are per product, not a combined stack
              total.
            </AppText>
          </View>
          <View style={styles.conversation}>
            <View style={styles.bubble}>
              <AppText>
                Hey, welcome to GR. What would you like to work on? Tell me your
                goal and budget, and we’ll start there.
              </AppText>
            </View>
            <View style={styles.chips}>
              {[
                'Build muscle',
                'Fat loss / weight management',
                'Improve recovery',
                'Everyday wellness',
              ].map((goal) => (
                <Pressable
                  key={goal}
                  onPress={() => setText(goal)}
                  style={styles.chip}
                >
                  <AppText variant="caption">{goal}</AppText>
                </Pressable>
              ))}
            </View>
            <FormField
              label="Your goal and routine"
              value={text}
              onChangeText={setText}
              multiline
              placeholder="For example: I train three times a week and want to build muscle"
            />
            <FormField
              label="Maximum per-product budget (₹)"
              keyboardType="number-pad"
              value={budget}
              onChangeText={setBudget}
            />
            <AppText variant="label">Dietary preference</AppText>
            <View style={styles.chips}>
              {(['any', 'vegetarian', 'vegan'] as const).map((value) => (
                <Button
                  key={value}
                  variant={diet === value ? 'primary' : 'ghost'}
                  onPress={() => setDiet(value)}
                >
                  {value}
                </Button>
              ))}
            </View>
            <Button variant="ghost" onPress={() => setAvoid(!avoid)}>
              {avoid
                ? 'Caffeine / stimulants: avoid'
                : 'Caffeine / stimulants: open to options'}
            </Button>
            <Button
              disabled={!text.trim() || !validBudget}
              onPress={() => setSubmitted(text.trim())}
            >
              Find my options <ArrowRight size={15} />
            </Button>
            {submitted ? (
              <View style={styles.bubble}>
                <AppText>
                  {stop
                    ? 'Your message mentions a situation that needs a qualified healthcare professional. I won’t suggest a supplement plan for this. Please speak with your clinician or pharmacist.'
                    : recommendations.length
                      ? `For your ${parseGoal(submitted).replaceAll('-', ' ')} goal, here are options within ₹${budget} each. Check ingredients, allergens and the full label before choosing.`
                      : 'Nothing on the current shelf meets all those preferences. Try a different budget or browse the shop; there is no need to force a supplement choice.'}
                </AppText>
              </View>
            ) : null}
            {error ? <AppText tone="danger">{error}</AppText> : null}
            <AppText tone="muted" variant="caption">
              For adults only. If you’re pregnant, breastfeeding, take
              medication, have a medical condition or allergies, ask a qualified
              professional before using supplements. Height and weight alone do
              not determine a suitable supplement.
            </AppText>
          </View>
        </View>
        {recommendations.map((r) => (
          <View
            key={r.variantId}
            style={{ marginTop: 25, gap: 12, maxWidth: 500 }}
          >
            <AppText variant="label">{r.reason}</AppText>
            <ProductCard product={r.product} />
          </View>
        ))}
      </PageShell>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 45 },
  intro: { flex: 1, minWidth: 260, maxWidth: 500, gap: 22, paddingTop: 15 },
  icon: {
    width: 65,
    height: 65,
    backgroundColor: colors.violet,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversation: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFF',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 15,
    padding: 24,
    gap: 18,
  },
  bubble: { backgroundColor: '#EDF1E6', padding: 18, borderRadius: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
});
