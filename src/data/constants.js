// Shared constants: food types, kinds, compatibility keys, ingredient tags.

export const CATEGORIES = [
  { id: 'veg', label: 'Vegetarian', emoji: '🥗', tagline: 'Rice, sambar, chapati & curries', color: 'green' },
  { id: 'nonveg', label: 'Non-Vegetarian', emoji: '🍗', tagline: 'Chicken, mutton, egg & fish', color: 'terracotta' },
  { id: 'ekadashi', label: 'Ekadashi', emoji: '🪔', tagline: 'Fasting-friendly, no onion or garlic', color: 'saffron' },
];

export const FOOD_TYPES = [
  { id: 'bf_main', label: 'Breakfast main', meals: ['breakfast'] },
  { id: 'bf_side', label: 'Breakfast accompaniment', meals: ['breakfast'] },
  { id: 'rice', label: 'Rice / grain dish', meals: ['lunch', 'breakfast'] },
  { id: 'roti', label: 'Roti / chapati', meals: ['lunch'] },
  { id: 'sambar', label: 'Sambar', meals: ['lunch'] },
  { id: 'curry', label: 'Curry / gravy', meals: ['lunch'] },
  { id: 'palya', label: 'Palya / dry fry', meals: ['lunch'] },
  { id: 'dal', label: 'Dal', meals: ['lunch'] },
  { id: 'nv_main', label: 'Non-veg main dish', meals: ['lunch'] },
  { id: 'side', label: 'Side dish', meals: ['lunch'] },
];

export const TYPE_LABEL = Object.fromEntries(FOOD_TYPES.map((t) => [t.id, t.label]));

// What a dish goes well with (used by curries, sambar, palya, dal, non-veg mains and sides).
export const GOES_KEYS = [
  { id: 'plainRice', label: 'Plain steamed rice' },
  { id: 'flavRice', label: 'Flavoured rice (ghee, lemon, pulao…)' },
  { id: 'completeRice', label: 'One-pot rice (biryani, bisi bele bath…)' },
  { id: 'roti', label: 'Roti / chapati' },
];
export const ALL_GOES = GOES_KEYS.map((g) => g.id);

export const RICE_VARIANTS = [
  { id: 'plain', label: 'Plain (needs sambar / curry)' },
  { id: 'flav', label: 'Flavoured (needs a curry / raita)' },
  { id: 'complete', label: 'One-pot (needs only a side)' },
];

export const SIDE_KINDS = [
  { id: 'curd', label: 'Curd' },
  { id: 'raita', label: 'Raita' },
  { id: 'salad', label: 'Salad' },
  { id: 'papad', label: 'Papad / fryum' },
  { id: 'pickle', label: 'Pickle' },
  { id: 'rasam', label: 'Rasam / soup' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'egg', label: 'Boiled egg' },
  { id: 'other', label: 'Other' },
];

export const BF_SIDE_KINDS = [
  { id: 'chutney', label: 'Chutney' },
  { id: 'sambar', label: 'Sambar' },
  { id: 'gravy', label: 'Kurma / gravy' },
  { id: 'bhaji', label: 'Bhaji / palya' },
  { id: 'curd', label: 'Curd' },
  { id: 'pickle', label: 'Pickle' },
];

export const NV_KINDS = [
  { id: 'gravy', label: 'Gravy / curry' },
  { id: 'dry', label: 'Dry / fry' },
  { id: 'rice', label: 'Rice dish (biryani / pulao)' },
];

export const PROTEINS = [
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'mutton', label: 'Mutton', emoji: '🍖' },
  { id: 'egg', label: 'Egg', emoji: '🥚' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'any', label: 'Mixed / Any', emoji: '🍽️' },
];

// Ingredient tags. "locked" tags can never be allowed in Ekadashi.
export const INGREDIENTS = [
  { id: 'onion', label: 'Onion', locked: true },
  { id: 'garlic', label: 'Garlic', locked: true },
  { id: 'rice', label: 'Regular rice', locked: true },
  { id: 'nonveg', label: 'Non-vegetarian items', locked: true },
  { id: 'wheat', label: 'Wheat / atta', defaultBlocked: true },
  { id: 'pulses', label: 'Dals & pulses', defaultBlocked: true },
  { id: 'tomato', label: 'Tomato' },
  { id: 'samarice', label: 'Sama rice (barnyard millet)' },
  { id: 'sabudana', label: 'Sabudana (sago)' },
  { id: 'kuttu', label: 'Kuttu (buckwheat) flour' },
  { id: 'rajgira', label: 'Rajgira (amaranth) flour' },
  { id: 'singhara', label: 'Singhara (water chestnut) flour' },
  { id: 'potato', label: 'Potato' },
  { id: 'sweetpotato', label: 'Sweet potato' },
  { id: 'peanut', label: 'Peanuts' },
  { id: 'coconut', label: 'Coconut' },
  { id: 'curd', label: 'Curd / milk' },
  { id: 'fruit', label: 'Fruits' },
];
export const INGREDIENT_LABEL = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i.label]));
export const LOCKED_INGREDIENTS = INGREDIENTS.filter((i) => i.locked).map((i) => i.id);

export const DEFAULT_SETTINGS = {
  sideCount: 2,
  avoidDays: 14,
  ekadashiBlocked: INGREDIENTS.filter((i) => i.locked || i.defaultBlocked).map((i) => i.id),
  last: { category: 'veg', staple: 'rice', protein: 'any', nvStaple: 'rice' },
  motherName: 'Amma',
};
