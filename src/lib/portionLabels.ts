/**
 * portionLabels.ts — the one place a portion key becomes display text.
 *
 * Used to be defined twice (`usePosCart.ts` had "Half", `useDishPortion.ts`
 * had "Single") for the same `single` key. Storefront and POS orders for the
 * same dish/portion landed in the database under two different `name`
 * strings, so a report grouping by `name` counted them as different items.
 */
export type Portion = 'single' | 'full' | 'large';

export const PORTION_LABELS: Record<Portion, string> = {
  single: 'Half',
  full: 'Full',
  large: 'Large',
};
