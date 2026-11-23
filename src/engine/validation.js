import { FOOD_TYPES, LOCKED_INGREDIENTS, ALL_GOES, INGREDIENT_LABEL } from '../data/constants.js';
import { newId } from './generator.js';

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Validate a food form. Returns an object of { field: message }. Empty object = valid. */
export function validateFood(form, allFoods, editingId = null) {
  const errors = {};
  const name = clean(form.name);
  if (name.length < 2) errors.name = 'Please enter the dish name (at least 2 letters).';
  else if (name.length > 60) errors.name = 'Name is too long (60 letters max).';
  else if (
    allFoods.some(
      (f) => f.id !== editingId && f.type === form.type && f.name.toLowerCase() === name.toLowerCase()
    )
  ) {
    errors.name = 'A dish with this name and type already exists.';
  }

  if (!FOOD_TYPES.some((t) => t.id === form.type)) errors.type = 'Please choose a dish type.';
  if (!form.meals || !form.meals.length) errors.meals = 'Choose breakfast, lunch, or both.';

  const type = FOOD_TYPES.find((t) => t.id === form.type);
  if (type && form.meals?.length) {
    const bad = form.meals.filter((m) => !type.meals.includes(m));
    if (bad.length) errors.meals = `A "${type.label}" can only be used for ${type.meals.join(' / ')}.`;
  }

  if (form.diet === 'nonveg' && !form.protein) errors.protein = 'Choose the protein (chicken, mutton, egg or fish).';
  if (form.type === 'nv_main' && form.diet !== 'nonveg') errors.diet = 'Non-veg main dishes must be marked Non-vegetarian.';

  if (form.ekadashi) {
    if (form.diet === 'nonveg') errors.ekadashi = 'A non-vegetarian dish cannot be Ekadashi-compatible.';
    const bad = (form.ingredients || []).filter((i) => LOCKED_INGREDIENTS.includes(i));
    if (bad.length && !errors.ekadashi) {
      errors.ekadashi = `Contains ${bad.map((b) => INGREDIENT_LABEL[b].toLowerCase()).join(', ')} – not allowed on Ekadashi.`;
    }
  }

  if (form.type === 'rice' && !form.variant) errors.variant = 'Tell us how this rice is served.';
  if (['curry', 'palya', 'dal', 'sambar', 'nv_main', 'side'].includes(form.type) && (!form.goes || !form.goes.length)) {
    errors.goes = 'Choose at least one thing it goes with.';
  }
  return errors;
}

/** Convert a validated form to a database food. */
export function formToFood(form, existing = null) {
  const type = form.type;
  const diet = form.diet === 'nonveg' ? 'nonveg' : 'veg';
  const ingredients = new Set(form.ingredients || []);
  if (diet === 'nonveg') ingredients.add('nonveg');
  const food = {
    id: existing?.id || newId('f'),
    name: clean(form.name),
    type,
    meals: [...form.meals],
    diet,
    ekadashi: diet === 'veg' && !!form.ekadashi,
    ekadashiOnly: diet === 'veg' && !!form.ekadashi && !!form.ekadashiOnly,
    ingredients: [...ingredients],
    protein: diet === 'nonveg' ? form.protein : null,
    variant: type === 'rice' ? form.variant : null,
    kind: ['side', 'bf_side', 'nv_main'].includes(type) ? form.kind || (type === 'nv_main' ? 'gravy' : 'other') : null,
    goes: ['curry', 'palya', 'dal', 'sambar', 'nv_main', 'side'].includes(type)
      ? [...(form.goes?.length ? form.goes : ALL_GOES)]
      : type === 'roti'
      ? ['roti']
      : null,
    accomp: type === 'bf_main' ? (form.accompKinds || []).map((k) => [k]) : null,
    group: existing?.group || null,
    available: form.available !== false,
    notes: clean(form.notes).slice(0, 200),
    custom: existing ? existing.custom : true,
  };
  return food;
}

export function foodToForm(food) {
  return {
    name: food.name,
    type: food.type,
    meals: [...food.meals],
    diet: food.diet,
    protein: food.protein || '',
    ekadashi: !!food.ekadashi,
    ekadashiOnly: !!food.ekadashiOnly,
    ingredients: [...(food.ingredients || [])].filter((i) => i !== 'nonveg'),
    variant: food.variant || 'flav',
    kind: food.kind || (food.type === 'nv_main' ? 'gravy' : food.type === 'bf_side' ? 'chutney' : 'other'),
    goes: food.goes ? [...food.goes] : [...ALL_GOES],
    accompKinds: (food.accomp || []).map((a) => a[0]),
    available: food.available !== false,
    notes: food.notes || '',
  };
}

export function blankForm(defaults = {}) {
  return {
    name: '',
    type: 'curry',
    meals: ['lunch'],
    diet: 'veg',
    protein: '',
    ekadashi: false,
    ekadashiOnly: false,
    ingredients: [],
    variant: 'flav',
    kind: 'other',
    goes: [...ALL_GOES],
    accompKinds: [],
    available: true,
    notes: '',
    ...defaults,
  };
}
