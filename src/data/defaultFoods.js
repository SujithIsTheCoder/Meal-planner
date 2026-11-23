// Default food database. Every entry is a plain object so the list is easy to extend.
//
// Fields
//   id, name, type          – see FOOD_TYPES in constants.js
//   meals                   – ['breakfast'] | ['lunch'] | both
//   diet                    – 'veg' | 'nonveg'
//   ekadashi                – household considers this dish Ekadashi-friendly
//   ingredients             – tags used by the Ekadashi restriction toggles
//   protein                 – chicken | mutton | egg | fish (non-veg only)
//   variant                 – rice dishes: plain | flav | complete
//   kind                    – sides / chutneys / non-veg mains
//   goes                    – what the dish pairs with (plainRice, flavRice, completeRice, roti)
//   accomp                  – breakfast mains: list of accompaniment slots (each a list of acceptable kinds)
//   group                   – dishes in the same group are avoided together in one day (e.g. potato)
//   available               – false = temporarily unavailable (never generated)

const P = 'plainRice';
const F = 'flavRice';
const C = 'completeRice';
const R = 'roti';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function mk(name, type, meals, diet, o = {}) {
  return {
    id: `${slug(name)}_${type}`,
    name,
    type,
    meals,
    diet,
    ekadashi: !!o.ek,
    ingredients: o.ing || (diet === 'nonveg' ? ['nonveg'] : []),
    protein: o.protein || null,
    variant: o.variant || null,
    kind: o.kind || null,
    goes: o.goes || null,
    accomp: o.accomp || null,
    group: o.group || null,
    ekadashiOnly: false,
    available: true,
    notes: o.notes || '',
    custom: false,
  };
}

const B = ['breakfast'];
const L = ['lunch'];

const bfMain = (name, accomp, o = {}) => mk(name, 'bf_main', B, 'veg', { accomp, ...o });
const bfSide = (name, kind, o = {}) => mk(name, 'bf_side', B, 'veg', { kind, ...o });
const rice = (name, variant, o = {}) => mk(name, 'rice', L, 'veg', { variant, ...o });
const sambar = (name, o = {}) => mk(name, 'sambar', L, 'veg', { goes: [P], group: 'sambar', ...o });
const palya = (name, goes, o = {}) => mk(name, 'palya', L, 'veg', { goes, ...o });
const curry = (name, goes, o = {}) => mk(name, 'curry', L, 'veg', { goes, ...o });
const dal = (name, goes, o = {}) => mk(name, 'dal', L, 'veg', { goes, group: 'pulse', ...o });
const side = (name, kind, goes, o = {}) => mk(name, 'side', L, 'veg', { kind, goes, ...o });
const nv = (name, protein, kind, goes) => mk(name, 'nv_main', L, 'nonveg', { protein, kind, goes });

const ALL = [P, F, C, R];

export const DEFAULT_FOODS = [
  // ───────────── Breakfast mains ─────────────
  bfMain('Idli', [['chutney'], ['sambar']]),
  bfMain('Masala dosa', [['chutney'], ['sambar']], { group: 'potato' }),
  bfMain('Plain dosa', [['chutney'], ['sambar']]),
  bfMain('Set dosa', [['chutney'], ['sambar']]),
  bfMain('Rava dosa', [['chutney']]),
  bfMain('Neer dosa', [['chutney', 'gravy']]),
  bfMain('Uttapam', [['chutney'], ['sambar']]),
  bfMain('Pesarattu', [['chutney']]),
  bfMain('Upma', [['chutney']]),
  bfMain('Vegetable upma', [['chutney']]),
  bfMain('Pongal', [['sambar'], ['chutney']]),
  bfMain('Poori bhaji', [], { group: 'potato', notes: 'Poori served with potato bhaji' }),
  bfMain('Paratha', [['curd'], ['pickle']]),
  bfMain('Akki rotti', [['chutney']]),
  bfMain('Avalakki / Poha', [['curd', 'pickle']]),
  bfMain('Puttu', [['gravy']]),
  bfMain('Ragi dosa', [['chutney']]),

  // ───────────── Breakfast accompaniments ─────────────
  bfSide('Coconut chutney', 'chutney', { ek: true, ing: ['coconut'] }),
  bfSide('Tomato chutney', 'chutney', { ing: ['tomato'] }),
  bfSide('Peanut chutney', 'chutney', { ing: ['peanut'], notes: 'Regular recipe usually has garlic' }),
  bfSide('Peanut chutney (no garlic)', 'chutney', { ek: true, ing: ['peanut'] }),
  bfSide('Sambar', 'sambar', { group: 'sambar' }),
  bfSide('Vegetable kurma', 'gravy'),
  bfSide('Kadala curry', 'gravy', { group: 'pulse' }),
  bfSide('Potato palya', 'bhaji', { group: 'potato' }),
  bfSide('Curd', 'curd', { ek: true, ing: ['curd'] }),
  bfSide('Pickle', 'pickle'),
  bfSide('Aloo sabzi (Ekadashi)', 'bhaji', { ek: true, ing: ['potato'], group: 'potato' }),

  // ───────────── Ekadashi breakfast mains ─────────────
  bfMain('Sabudana khichdi', [['curd', 'chutney']], { ek: true, ing: ['sabudana', 'peanut', 'potato'], group: 'potato' }),
  bfMain('Sabudana vada', [['chutney'], ['curd']], { ek: true, ing: ['sabudana', 'peanut', 'potato'], group: 'potato' }),
  bfMain('Sama rice upma', [['chutney', 'curd']], { ek: true, ing: ['samarice', 'peanut'] }),
  bfMain('Kuttu dosa', [['chutney']], { ek: true, ing: ['kuttu', 'potato'] }),
  bfMain('Singhara puri', [['bhaji']], { ek: true, ing: ['singhara', 'potato'] }),
  bfMain('Rajgira paratha', [['curd']], { ek: true, ing: ['rajgira', 'potato'] }),
  bfMain('Sweet potato chaat', [['curd']], { ek: true, ing: ['sweetpotato', 'fruit'] }),
  bfMain('Fruit bowl', [['curd']], { ek: true, ing: ['fruit'] }),
  bfMain('Peanut sundal', [], { ek: true, ing: ['peanut', 'coconut'], notes: 'Boiled peanuts with coconut' }),

  // ───────────── Rice dishes ─────────────
  rice('Steamed rice', 'plain'),
  rice('Ghee rice', 'flav'),
  rice('Lemon rice', 'flav'),
  rice('Tomato rice', 'flav', { ing: ['tomato'] }),
  rice('Coconut rice', 'flav'),
  rice('Jeera rice', 'flav'),
  rice('Curd rice', 'complete'),
  rice('Vegetable pulao', 'flav'),
  rice('Bisi Bele Bath', 'complete'),
  rice('Sambar rice', 'complete'),

  // ───────────── Sambar ─────────────
  sambar('Drumstick sambar'),
  sambar('Mixed vegetable sambar'),
  sambar('Arachuvitta sambar', { ing: ['coconut'] }),
  sambar('Tomato sambar', { ing: ['tomato'] }),
  sambar('Onion sambar', { ing: ['onion'] }),
  sambar('Radish sambar'),
  sambar('Pumpkin sambar'),
  sambar('Brinjal sambar'),
  sambar('Beans sambar'),

  // ───────────── Palya / dry curries ─────────────
  palya('Vegetable palya', [P, F, C]),
  palya('Beans palya', [P, F, C]),
  palya('Cabbage palya', [P, F, C]),
  palya('Potato fry', [P, F, C], { group: 'potato' }),
  palya('Bendekai fry', [P, F, C]),
  palya('Aloo Gobi', ALL, { group: 'potato' }),
  palya('Mushroom pepper fry', [P, F, R], { group: 'mushroom' }),

  // ───────────── Curries / gravies ─────────────
  curry('Mixed vegetable kurma', [P, F, R]),
  curry('Paneer butter masala', [F, R], { group: 'paneer' }),
  curry('Kadai paneer', [F, R], { group: 'paneer' }),
  curry('Palak paneer', [F, R], { group: 'paneer' }),
  curry('Matar paneer', [F, R], { group: 'paneer' }),
  curry('Mushroom masala', [F, R], { group: 'mushroom' }),
  curry('Chana masala', [P, F, R], { group: 'pulse' }),
  curry('Rajma masala', [P, F, R], { group: 'pulse' }),
  curry('Vegetable kadai', [F, R]),
  curry('Aloo matar', [F, R], { group: 'potato' }),

  // ───────────── Dal ─────────────
  dal('Dal fry', [P, F, R]),
  dal('Dal tadka', [P, F, R]),

  // ───────────── Roti ─────────────
  mk('Chapati', 'roti', L, 'veg', { goes: [R] }),

  // ───────────── Sides ─────────────
  side('Rasam', 'rasam', [P]),
  side('Pepper rasam', 'rasam', [P]),
  side('Curd', 'curd', ALL, { ek: true, ing: ['curd'] }),
  side('Papad', 'papad', ALL),
  side('Pickle', 'pickle', ALL),
  side('Cucumber raita', 'raita', [F, C, R]),
  side('Boondi raita', 'raita', [F, C, R]),
  side('Cucumber salad', 'salad', [P, F, C, R]),
  side('Onion tomato salad', 'salad', [F, C, R], { ing: ['onion', 'tomato'] }),
  side('Boiled eggs', 'egg', ALL, { }),

  // ───────────── Chicken ─────────────
  nv('Chicken biryani', 'chicken', 'rice', [C]),
  nv('Chicken pulao', 'chicken', 'rice', [C]),
  nv('Chicken curry', 'chicken', 'gravy', [P, F, R]),
  nv('Chicken sukka', 'chicken', 'dry', [P, R]),
  nv('Chicken pepper fry', 'chicken', 'dry', [P, R]),
  nv('Chicken kebab', 'chicken', 'dry', [P, R]),
  nv('Chicken ghee roast', 'chicken', 'dry', [P, R]),
  nv('Chicken 65', 'chicken', 'dry', [P, R]),

  // ───────────── Mutton ─────────────
  nv('Mutton biryani', 'mutton', 'rice', [C]),
  nv('Mutton curry', 'mutton', 'gravy', [P, F, R]),
  nv('Mutton pepper fry', 'mutton', 'dry', [P, R]),
  nv('Mutton sukka', 'mutton', 'dry', [P, R]),
  nv('Mutton pulao', 'mutton', 'rice', [C]),

  // ───────────── Egg ─────────────
  nv('Egg curry', 'egg', 'gravy', [P, F, R]),
  nv('Egg bhurji', 'egg', 'dry', [P, R]),
  nv('Egg roast', 'egg', 'gravy', [P, R]),
  nv('Egg biryani', 'egg', 'rice', [C]),

  // ───────────── Fish ─────────────
  nv('Fish curry', 'fish', 'gravy', [P]),
  nv('Fish fry', 'fish', 'dry', [P]),
  nv('Fish pulimunchi', 'fish', 'gravy', [P]),

  // ───────────── Ekadashi lunch ─────────────
  mk('Sama rice pulao', 'rice', L, 'veg', { variant: 'flav', ek: true, ing: ['samarice', 'peanut', 'potato'] }),
  mk('Sabudana khichdi', 'rice', L, 'veg', { variant: 'complete', ek: true, ing: ['sabudana', 'peanut', 'potato'] }),
  mk('Rajgira roti', 'roti', L, 'veg', { goes: [R], ek: true, ing: ['rajgira'] }),
  mk('Kuttu roti', 'roti', L, 'veg', { goes: [R], ek: true, ing: ['kuttu', 'potato'] }),
  mk('Singhara roti', 'roti', L, 'veg', { goes: [R], ek: true, ing: ['singhara'] }),
  curry('Potato curry (Ekadashi)', [F, R], { ek: true, ing: ['potato'], group: 'potato' }),
  curry('Jeera aloo', [F, R], { ek: true, ing: ['potato'], group: 'potato' }),
  curry('Peanut aloo curry', [F, R], { ek: true, ing: ['peanut', 'potato'], group: 'potato' }),
  curry('Sweet potato sabzi', [F, R], { ek: true, ing: ['sweetpotato'] }),
  curry('Coconut pumpkin curry', [F, R], { ek: true, ing: ['coconut'] }),
  curry('Raw banana fry', [F, R], { ek: true }),
  side('Cucumber peanut raita', 'raita', [F, C, R], { ek: true, ing: ['curd', 'peanut'] }),
  side('Fruit bowl', 'fruit', ALL, { ek: true, ing: ['fruit'] }),
  side('Sabudana papad', 'papad', ALL, { ek: true, ing: ['sabudana'] }),
];

// Dishes that only make sense on Ekadashi (kept out of normal vegetarian / non-veg plans).
const EK_ONLY = [
  'sabudana-khichdi_bf_main', 'sabudana-vada_bf_main', 'sama-rice-upma_bf_main', 'kuttu-dosa_bf_main',
  'singhara-puri_bf_main', 'rajgira-paratha_bf_main', 'sweet-potato-chaat_bf_main', 'fruit-bowl_bf_main',
  'peanut-sundal_bf_main', 'peanut-chutney-no-garlic_bf_side', 'aloo-sabzi-ekadashi_bf_side',
  'sama-rice-pulao_rice', 'sabudana-khichdi_rice', 'rajgira-roti_roti', 'kuttu-roti_roti', 'singhara-roti_roti',
  'potato-curry-ekadashi_curry', 'sabudana-papad_side',
];
for (const id of EK_ONLY) {
  const f = DEFAULT_FOODS.find((x) => x.id === id);
  if (!f) throw new Error('EK_ONLY id not found: ' + id);
  f.ekadashiOnly = true;
}

// Boiled eggs are a non-veg side.
const egg = DEFAULT_FOODS.find((f) => f.id === 'boiled-eggs_side');
egg.diet = 'nonveg';
egg.protein = 'egg';
egg.ingredients = ['nonveg'];

// Unique-id safety net
{
  const seen = new Set();
  for (const f of DEFAULT_FOODS) {
    if (seen.has(f.id)) throw new Error('Duplicate default food id: ' + f.id);
    seen.add(f.id);
  }
}
