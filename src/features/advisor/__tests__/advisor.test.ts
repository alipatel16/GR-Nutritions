import {
  recommendProducts,
  parseGoal,
  needsProfessionalAdvice,
} from '../advisor-domain';
import { makeProduct } from '../../../../test/factories/product';
const prefs = {
  goal: 'muscle-gain' as const,
  budgetPaise: 200000,
  diet: 'any' as const,
  avoidStimulants: true,
};
it('ranks only in-stock options within the total budget', () => {
  const p = makeProduct();
  const results = recommendProducts([p], prefs);
  expect(results).toHaveLength(1);
  expect(results[0].pricePaise).toBeLessThanOrEqual(200000);
  expect(recommendProducts([p], { ...prefs, budgetPaise: 100 })).toEqual([]);
});
it('excludes dairy products for vegan preferences and excludes sold-out products', () => {
  const p = makeProduct();
  expect(recommendProducts([p], { ...prefs, diet: 'vegan' })).toEqual([]);
  expect(
    recommendProducts(
      [
        {
          ...p,
          variants: p.variants.map((v) => ({ ...v, stockAvailable: 0 })),
        },
      ],
      prefs,
    ),
  ).toEqual([]);
});
it('does not classify unknown pre-workout stimulant status as safe', () => {
  const p = makeProduct({ category: 'pre-workout', goals: ['muscle-gain'] });
  expect(recommendProducts([p], prefs)).toEqual([]);
});
it('recognizes weight-management intent without prescribing a fat burner', () =>
  expect(parseGoal('I want fat loss')).toBe('weight-management'));
it.each([
  'I am pregnant',
  'I take medication for diabetes',
  'I am 15 years old',
  'I have kidney disease',
])('stops product advice for %s', (text) =>
  expect(needsProfessionalAdvice(text)).toBe(true),
);
