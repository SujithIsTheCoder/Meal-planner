import assert from 'node:assert/strict';
import { DEFAULT_FOODS } from '../src/data/defaultFoods.js';
import { DEFAULT_SETTINGS } from '../src/data/constants.js';
import { generatePlan, regenerateMeal, regenerateSlot, isEligible, blockedSet, buildCtx } from '../src/engine/generator.js';
import { validateFood, blankForm, formToFood } from '../src/engine/validation.js';

const foods = DEFAULT_FOODS.map((f) => ({ ...f }));
const byId = new Map(foods.map((f) => [f.id, f]));
const settings = { ...DEFAULT_SETTINGS };
const names = (plan, m) => plan[m].slots.map((s) => s.foodName);
const fd = (s) => byId.get(s.foodId);
let history = [];
let n = 0;
const check = (cond, msg) => { assert.ok(cond, msg); n++; };

function allSlots(p) { return [...p.breakfast.slots, ...p.lunch.slots]; }

// ---- veg ----
for (const staple of ['rice', 'roti', 'both']) {
  for (let i = 0; i < 300; i++) {
    const p = generatePlan(foods, 'veg', { staple }, settings, []);
    check(p.breakfast.slots.length >= 1 && p.lunch.slots.length >= 2, `veg ${staple} too small: ${names(p,'lunch')}`);
    for (const s of allSlots(p)) check(fd(s).diet === 'veg', 'veg plan has non-veg: ' + s.foodName);
    const ids = allSlots(p).map((s) => s.foodId);
    check(new Set(ids).size === ids.length, 'duplicate dish ' + ids);
    const types = p.lunch.slots.map((s) => fd(s).type);
    if (staple !== 'roti') check(types.includes('rice'), 'rice missing');
    if (staple !== 'rice') check(types.includes('roti'), 'roti missing');
    if (staple === 'rice') check(!types.includes('roti'), 'unexpected roti');
    if (staple === 'roti') check(!types.includes('rice'), 'unexpected rice');
    if (staple === 'both') check(p.lunch.slots.length <= 6, 'too many dishes in both: ' + names(p, 'lunch'));
    // culinary sense: sambar only with plain steamed rice
    const rice = p.lunch.slots.map(fd).find((f) => f.type === 'rice');
    if (rice && types.includes('sambar')) check(rice.variant === 'plain', `sambar with ${rice.name}`);
    if (rice && rice.variant === 'complete') check(!types.includes('sambar') && !types.includes('curry'), 'complete rice w/ curry: ' + names(p, 'lunch'));
    // breakfast accompaniments belong to breakfast
    for (const s of p.breakfast.slots) check(fd(s).meals.includes('breakfast'), 'bf slot not breakfast');
    // no potato at breakfast and lunch
    const groups = allSlots(p).map(fd).map((f) => f.group).filter((g) => g === 'potato');
    check(groups.length <= 1, 'two potato dishes: ' + names(p, 'breakfast') + names(p, 'lunch'));
  }
}
// ---- non-veg ----
for (const protein of ['chicken', 'mutton', 'egg', 'fish', 'any']) {
  for (const nvStaple of ['rice', 'roti', 'any']) {
    for (let i = 0; i < 100; i++) {
      const p = generatePlan(foods, 'nonveg', { protein, nvStaple }, settings, []);
      const lf = p.lunch.slots.map(fd);
      const mains = lf.filter((f) => f.type === 'nv_main');
      check(mains.length === 1, 'need exactly one non-veg main: ' + names(p, 'lunch'));
      for (const f of lf) if (f.diet === 'nonveg' && protein !== 'any') check(f.protein === protein, `${protein} pref gave ${f.name}`);
      for (const f of p.breakfast.slots.map(fd)) check(f.diet === 'veg', 'nonveg breakfast');
      const m = mains[0];
      if (m.kind === 'rice') check(!lf.some((f) => f.type === 'rice' || f.type === 'roti'), 'biryani with extra staple: ' + names(p, 'lunch'));
      else check(lf.some((f) => f.type === 'rice' || f.type === 'roti'), 'no staple with ' + m.name);
    }
  }
}
// ---- ekadashi ----
for (let i = 0; i < 400; i++) {
  const p = generatePlan(foods, 'ekadashi', {}, settings, []);
  const blocked = blockedSet(settings);
  check(p.breakfast.slots.length && p.lunch.slots.length, 'ekadashi empty');
  for (const s of allSlots(p)) {
    const f = fd(s);
    check(f.ekadashi && f.diet === 'veg', 'non-ekadashi dish ' + f.name);
    check(!f.ingredients.some((x) => blocked.has(x)), 'blocked ingredient in ' + f.name);
    check(!['onion', 'garlic', 'rice'].some((x) => f.ingredients.includes(x)), 'locked ingredient ' + f.name);
  }
}
// Ekadashi toggles: block sama rice -> never appears; allow nothing -> graceful
{
  const s2 = { ...settings, ekadashiBlocked: [...settings.ekadashiBlocked, 'samarice', 'potato'] };
  for (let i = 0; i < 200; i++) {
    const p = generatePlan(foods, 'ekadashi', {}, s2, []);
    for (const s of allSlots(p)) check(!fd(s).ingredients.some((x) => ['samarice', 'potato'].includes(x)), 'toggle ignored: ' + s.foodName);
  }
  const s3 = { ...settings, ekadashiBlocked: INGREDIENTS_ALL() };
  const p = generatePlan(foods, 'ekadashi', {}, s3, []);
  check(p.warnings.length >= 1, 'expected warnings when nothing allowed');
}
function INGREDIENTS_ALL() { return ['onion','garlic','rice','nonveg','wheat','pulses','tomato','samarice','sabudana','kuttu','rajgira','singhara','potato','sweetpotato','peanut','coconut','curd','fruit']; }

// ---- unavailable foods never generated ----
{
  const foods2 = foods.map((f) => (f.type === 'sambar' ? { ...f, available: false } : f));
  for (let i = 0; i < 200; i++) {
    const p = generatePlan(foods2, 'veg', { staple: 'rice' }, settings, []);
    check(!p.lunch.slots.some((s) => byId.get(s.foodId).type === 'sambar'), 'unavailable sambar generated');
  }
}
// ---- individual regeneration ----
for (let i = 0; i < 200; i++) {
  const p = generatePlan(foods, 'veg', { staple: 'rice' }, settings, []);
  const sam = p.lunch.slots.find((s) => fd(s).type === 'sambar');
  if (!sam) continue;
  const r = regenerateSlot(p, 'lunch', sam.id, foods, settings, []);
  check(r.ok, 'sambar regen failed');
  const before = p.lunch.slots.map((s) => s.foodId);
  const after = r.plan.lunch.slots.map((s) => s.foodId);
  check(JSON.stringify(r.plan.breakfast) === JSON.stringify(p.breakfast), 'breakfast changed on dish regen');
  check(before.filter((_, k) => p.lunch.slots[k].id !== sam.id).join() === after.filter((_, k) => p.lunch.slots[k].id !== sam.id).join(), 'other dishes changed');
  const ns = r.plan.lunch.slots.find((s) => s.id === sam.id);
  check(ns.foodId !== sam.foodId && byId.get(ns.foodId).type === 'sambar', 'not a different sambar');
}
// regen meal keeps other meal
{
  const p = generatePlan(foods, 'veg', { staple: 'roti' }, settings, []);
  const r = regenerateMeal(p, 'lunch', foods, settings, []);
  check(JSON.stringify(r.breakfast) === JSON.stringify(p.breakfast), 'regen lunch altered breakfast');
  const r2 = regenerateMeal(p, 'breakfast', foods, settings, []);
  check(JSON.stringify(r2.lunch) === JSON.stringify(p.lunch), 'regen breakfast altered lunch');
}
// regen breakfast main rebuilds accompaniments to match
for (let i = 0; i < 100; i++) {
  const p = generatePlan(foods, 'veg', { staple: 'rice' }, settings, []);
  const main = p.breakfast.slots.find((s) => s.role === 'main');
  const r = regenerateSlot(p, 'breakfast', main.id, foods, settings, []);
  check(r.ok, 'bf main regen failed');
  const nm = r.plan.breakfast.slots.find((s) => s.role === 'main');
  check(nm.foodId !== main.foodId, 'bf main unchanged');
}
// roti staple with a single chapati: graceful message, plan untouched
{
  const p = generatePlan(foods, 'veg', { staple: 'roti' }, settings, []);
  const st = p.lunch.slots.find((s) => s.role === 'staple');
  const r = regenerateSlot(p, 'lunch', st.id, foods, settings, []);
  check(!r.ok && r.plan === p, 'single chapati should report no alternative');
}
// ---- history variety ----
{
  const seenFoods = new Set();
  let hist = [];
  const counts = new Map();
  for (let d = 0; d < 30; d++) {
    const date = new Date(Date.now() - (30 - d) * 86400000);
    const p = generatePlan(foods, 'veg', { staple: 'rice' }, settings, hist);
    p.date = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    hist = [p, ...hist];
    const bf = p.breakfast.slots[0].foodId;
    counts.set(bf, (counts.get(bf) || 0) + 1);
  }
  const maxRun = Math.max(...counts.values());
  check(counts.size >= 10, 'low breakfast variety: ' + counts.size);
  // consecutive-day repeat of the same breakfast main should be rare
  let repeats = 0;
  for (let i = 0; i + 1 < hist.length; i++) if (hist[i].breakfast.slots[0].foodId === hist[i + 1].breakfast.slots[0].foodId) repeats++;
  check(repeats <= 3, 'too many back-to-back repeats: ' + repeats);
}
// ---- validation & custom foods ----
{
  const f = blankForm({ name: 'Methi thepla', type: 'bf_main', meals: ['breakfast'], accompKinds: ['curd', 'pickle'] });
  check(Object.keys(validateFood(f, foods)).length === 0, 'valid form rejected');
  check(validateFood({ ...f, name: '' }, foods).name, 'empty name accepted');
  check(validateFood({ ...f, name: 'Idli' }, foods).name, 'duplicate accepted');
  check(validateFood({ ...f, ekadashi: true, ingredients: ['onion'] }, foods).ekadashi, 'onion ekadashi accepted');
  check(validateFood({ ...f, diet: 'nonveg', protein: '' }, foods).protein, 'nonveg w/o protein accepted');
  check(validateFood({ ...f, meals: [] }, foods).meals, 'no meals accepted');
  // custom food appears in generator automatically
  const custom = formToFood(f);
  const foods3 = [...foods, custom];
  let got = false;
  for (let i = 0; i < 600 && !got; i++) {
    const p = generatePlan(foods3, 'veg', { staple: 'rice' }, settings, []);
    got = p.breakfast.slots.some((s) => s.foodId === custom.id);
  }
  check(got, 'custom food never generated');
  // custom Ekadashi dish only shows in Ekadashi when flagged
  const ek = formToFood(blankForm({ name: 'Makhana kheer', type: 'side', meals: ['lunch'], kind: 'other', ekadashi: true, ingredients: ['curd'], goes: ['roti', 'flavRice', 'completeRice', 'plainRice'] }));
  check(isEligible(ek, buildCtx('ekadashi', {}, settings)), 'flagged custom ek not eligible');
  const nonek = formToFood(blankForm({ name: 'Cabbage kootu', type: 'curry', meals: ['lunch'], ekadashi: false }));
  check(!isEligible(nonek, buildCtx('ekadashi', {}, settings)), 'unflagged veg food leaked into ekadashi');
}
// side count setting
for (const sc of [0, 1, 3]) {
  const p = generatePlan(foods, 'veg', { staple: 'roti' }, { ...settings, sideCount: sc }, []);
  check(p.lunch.slots.filter((s) => s.role === 'side').length <= sc, 'too many sides for ' + sc);
}
console.log(`engine tests passed (${n} assertions)`);
// sample output
for (const [c, o] of [['veg', { staple: 'rice' }], ['veg', { staple: 'roti' }], ['veg', { staple: 'both' }], ['nonveg', { protein: 'chicken', nvStaple: 'rice' }], ['ekadashi', {}]]) {
  const p = generatePlan(foods, c, o, settings, []);
  console.log(`\n[${c} ${JSON.stringify(o)}]\n  B: ${names(p, 'breakfast').join(' + ')}\n  L: ${names(p, 'lunch').join(' + ')}`);
}
