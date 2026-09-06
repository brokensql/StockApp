export const STANDARD_CATEGORIES = [
  'General',
  'Snacks',
  'Beverages',
  'Canned Goods',
  'Instant Food',
  'Cooking Essentials',
  'Dairy',
  'Bakery',
  'Household',
] as const;

export type StandardCategory = (typeof STANDARD_CATEGORIES)[number];
