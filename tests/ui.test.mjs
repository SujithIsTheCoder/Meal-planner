import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const URL = process.env.APP_URL || 'http://127.0.0.1:8765/index.html';
const SHOTS = process.env.SHOTS || '/tmp/claude-0/shots';
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

let steps = 0;
const ok = (msg) => { steps++; console.log('✓', msg); };
const gen = async () => { await page.getByRole('button', { name: /GENERATE MEAL PLAN/ }).click(); await page.waitForSelector('.pot', { timeout: 3000 }); await page.waitForSelector('.meal-card', { timeout: 5000 }); await page.waitForTimeout(700); };
const dishNames = async (meal) => page.$$eval(`.meal-${meal} .dish-name`, (els) => els.map((e) => e.textContent.trim()));
const nav = async (label) => { await page.locator('.nav-item', { hasText: label }).first().click(); await page.waitForTimeout(250); };

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();

// 1 Home
await page.waitForSelector('.hero-title');
assert.match(await page.textContent('.hero-title'), /Good (morning|afternoon|evening), Amma/);
assert.equal(await page.locator('.cat-card').count(), 3);
for (const n of ['Vegetarian', 'Non-Vegetarian', 'Ekadashi']) assert.ok(await page.locator('.cat-card', { hasText: n }).count());
assert.match(await page.textContent('.quick'), /No plan for today yet/);
await page.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });
ok('home screen: greeting, date, 3 category cards, empty quick view');

// 2 Generate from home (veg default rice)
await page.getByRole('button', { name: /GENERATE MEAL PLAN/ }).click();
await page.waitForSelector('.pot');
ok('loading animation shown');
await page.waitForSelector('.meal-card');
await page.waitForTimeout(800);
let bf = await dishNames('breakfast'); let lunch = await dishNames('lunch');
assert.ok(bf.length >= 1 && lunch.length >= 3, `plan too small ${bf} / ${lunch}`);
assert.ok(lunch.some((n) => /rice|pulao|Bath/i.test(n)), 'rice staple missing: ' + lunch);
ok(`veg+rice plan: ${bf.join(' + ')} | ${lunch.join(' + ')}`);
await page.screenshot({ path: `${SHOTS}/02-plan-mobile.png`, fullPage: true });

// 3 individual dish regeneration
const rows = page.locator('.meal-lunch .dish');
const beforeAll = await dishNames('lunch');
const idx = beforeAll.length - 1; // a side dish
await rows.nth(idx).locator('.dish-change').click();
await page.waitForTimeout(300);
const afterAll = await dishNames('lunch');
assert.equal(afterAll.length, beforeAll.length);
const diff = afterAll.map((n, i) => n !== beforeAll[i]).filter(Boolean).length;
assert.equal(diff, 1, `expected exactly 1 dish changed: ${beforeAll} -> ${afterAll}`);
assert.deepEqual(await dishNames('breakfast'), bf);
ok('single dish regenerated; every other dish unchanged');

// 4 regenerate breakfast only
const lunchBefore = await dishNames('lunch');
await page.locator('.meal-breakfast').getByRole('button', { name: /Regenerate breakfast/ }).click();
await page.waitForTimeout(300);
assert.deepEqual(await dishNames('lunch'), lunchBefore);
ok('regenerate breakfast leaves lunch untouched');

// 5 regenerate whole plan, mark cooked, save
await page.getByRole('button', { name: 'Regenerate entire plan' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Mark as cooked/ }).click();
await page.waitForSelector('.meal-breakfast .badge-green');
await page.getByRole('button', { name: /Save plan/ }).click();
await page.waitForSelector('.plan-badges .badge-saffron');
ok('regenerate entire plan, mark as cooked, save plan');

// 6 Veg roti
await nav('Planner');
await page.locator('.chip', { hasText: 'Roti / Chapati' }).click();
await gen();
lunch = await dishNames('lunch');
assert.ok(lunch.includes('Chapati'), 'chapati missing: ' + lunch);
assert.ok(!lunch.some((n) => /rice/i.test(n)), 'rice in roti plan: ' + lunch);
ok('veg + roti: ' + lunch.join(' + '));
// chapati only one option -> friendly message
await page.locator('.meal-lunch .dish', { hasText: 'Chapati' }).locator('.dish-change').click();
await page.waitForSelector('.toast');
assert.match(await page.textContent('.toast'), /No other choice/);
ok('graceful message when no alternative exists');

// 7 Veg both
await page.locator('.chip', { hasText: 'Both' }).click();
await gen();
lunch = await dishNames('lunch');
assert.ok(lunch.includes('Chapati') && lunch.some((n) => /rice|pulao/i.test(n)), 'both: ' + lunch);
assert.ok(lunch.length <= 6);
ok('veg + both: ' + lunch.join(' + '));

// 8 Non-veg chicken
await page.locator('.cat-card', { hasText: 'Non-Vegetarian' }).click();
await page.locator('.chip', { hasText: 'Chicken' }).click();
for (let i = 0; i < 5; i++) {
  await gen();
  lunch = await dishNames('lunch');
  assert.ok(lunch.some((n) => /Chicken/.test(n)), 'no chicken: ' + lunch);
  assert.ok(!lunch.some((n) => /Mutton|Fish|Egg/i.test(n)), 'other protein leaked: ' + lunch);
}
ok('non-veg chicken x5: only chicken. last: ' + lunch.join(' + '));
await page.screenshot({ path: `${SHOTS}/03-nonveg.png`, fullPage: true });
await page.locator('.chip', { hasText: 'Fish' }).click();
await gen();
lunch = await dishNames('lunch');
assert.ok(lunch.some((n) => /Fish/.test(n)) && !lunch.some((n) => /Chicken|Mutton/.test(n)), 'fish: ' + lunch);
ok('non-veg fish: ' + lunch.join(' + '));

// 9 Ekadashi + restrictions toggle
await page.locator('.cat-card', { hasText: 'Ekadashi' }).click();
await gen();
const all = [...(await dishNames('breakfast')), ...(await dishNames('lunch'))].join(' | ');
assert.ok(!/Idli|dosa|Steamed rice|Chicken|Onion|sambar/i.test(all.replace(/Kuttu dosa/, '')), 'non-ekadashi dish: ' + all);
ok('ekadashi plan: ' + all);
await page.screenshot({ path: `${SHOTS}/04-ekadashi.png`, fullPage: true });
await nav('Settings');
await page.screenshot({ path: `${SHOTS}/05-settings.png`, fullPage: true });
const samaRow = page.locator('.setting-row', { hasText: 'Sama rice' });
await samaRow.locator('.toggle').click();
const potatoRow = page.locator('.setting-row', { hasText: /^\s*Potato/ }).first();
await potatoRow.locator('.toggle').click();
assert.ok(await page.locator('.setting-row', { hasText: /Onion/ }).locator('.locked-note').count());
await nav('Planner');
for (let i = 0; i < 6; i++) {
  await gen();
  const t = [...(await dishNames('breakfast')), ...(await dishNames('lunch'))].join(' | ');
  assert.ok(!/Sama rice|Potato curry|Peanut aloo|Jeera aloo|Aloo sabzi|Sabudana khichdi|Sabudana vada|Singhara puri|Kuttu roti|Kuttu dosa|Rajgira paratha/.test(t), 'blocked ingredient used: ' + t);
}
ok('Ekadashi toggles (sama rice + potato off) respected; onion/garlic/rice locked');

// 10 Side dish count setting
await nav('Settings');
await page.getByRole('button', { name: 'More side dishes' }).click();
await page.getByRole('button', { name: 'More side dishes' }).click();
assert.equal((await page.textContent('.stepper-val')).trim(), '4');
await nav('Planner');
await page.locator('.cat-card', { has: page.getByText('Vegetarian', { exact: true }) }).click();
await page.locator('.chip', { hasText: 'Roti / Chapati' }).click();
await gen();
assert.ok((await page.locator('.meal-lunch .section-label', { hasText: 'Side dishes' }).count()) === 1);
assert.ok((await page.locator('.meal-lunch .dish').count()) >= 5);
ok('side-dish setting increases lunch sides');
await nav('Settings');
for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Fewer side dishes' }).click();

// 11 Foods: add (with validation), edit, toggle, delete
await nav('Food');
const total0 = await page.locator('.food').count();
await page.getByRole('button', { name: /Add new food/ }).click();
await page.getByRole('button', { name: 'Add dish' }).click();
await page.waitForSelector('.field-msg');
assert.match(await page.textContent('.modal'), /Please enter the dish name/);
ok('validation blocks empty dish name');
await page.fill('.modal input.input', 'Methi thepla');
await page.selectOption('.modal select >> nth=0', 'bf_main');
await page.getByRole('button', { name: 'Add dish' }).click();
await page.waitForSelector('.modal', { state: 'detached' });
await page.fill('.search', 'thepla');
assert.equal(await page.locator('.food').count(), 1);
ok('custom food added and searchable');
await page.fill('.search', '');
// duplicate
await page.getByRole('button', { name: /Add new food/ }).click();
await page.fill('.modal input.input', 'Idli');
await page.selectOption('.modal select >> nth=0', 'bf_main');
await page.getByRole('button', { name: 'Add dish' }).click();
assert.match(await page.textContent('.modal'), /already exists/);
await page.getByRole('button', { name: 'Cancel' }).click();
// ekadashi + onion validation
await page.getByRole('button', { name: /Add new food/ }).click();
await page.fill('.modal input.input', 'Test onion dish');
await page.getByRole('button', { name: /Ekadashi-compatible/ }).click();
await page.getByRole('button', { name: 'Onion', exact: true }).click();
await page.getByRole('button', { name: 'Add dish' }).click();
assert.match(await page.textContent('.modal'), /not allowed on Ekadashi/);
await page.getByRole('button', { name: 'Cancel' }).click();
ok('duplicate and onion-on-Ekadashi rejected');
// custom food is used by generator: make thepla the only available non-ek breakfast
await page.fill('.search', 'thepla');
await page.locator('.food').first().getByRole('button', { name: /Edit/ }).click();
await page.fill('.modal textarea', 'with curd');
await page.getByRole('button', { name: 'Save changes' }).click();
assert.match(await page.textContent('.food'), /with curd/);
ok('edit food + notes');
// mark everything else breakfast unavailable via UI toggle is long; instead mark one unavailable and delete
await page.fill('.search', 'Idli');
await page.locator('.food').first().locator('.toggle').click();
assert.ok(await page.locator('.food-off').count() >= 1);
await page.locator('.chip', { hasText: 'Unavailable only' }).click();
assert.ok(await page.locator('.food').count() >= 1);
ok('mark unavailable + unavailable filter');
await page.locator('.chip', { hasText: 'Unavailable only' }).click();
await page.fill('.search', 'thepla');
await page.locator('.food').first().getByRole('button', { name: /Delete/ }).click();
await page.getByRole('button', { name: 'Yes, delete' }).click();
await page.fill('.search', 'thepla');
assert.equal(await page.locator('.food').count(), 0);
ok('delete food with confirmation');
await page.fill('.search', '');
await page.screenshot({ path: `${SHOTS}/06-foods.png`, fullPage: false });

// 12 History
await nav('History');
assert.ok(await page.locator('.hist-card').count() >= 1);
await page.screenshot({ path: `${SHOTS}/07-history.png`, fullPage: true });
const histBefore = await page.locator('.hist-card').count();
await page.locator('.hist-card').first().getByRole('button', { name: 'View' }).click();
assert.ok(await page.locator('.hist-detail').count() === 1);
await page.locator('.hist-card').first().getByRole('button', { name: /Reuse/ }).click();
await page.waitForSelector('.meal-card');
ok(`history: ${histBefore} plans, view details, reuse -> planner`);
await nav('History');
assert.ok(await page.locator('.hist-card').count() >= histBefore);
// persistence across reload
const before = await page.locator('.hist-card').count();
await page.reload();
await page.waitForSelector('.screen');
await nav('History');
assert.equal(await page.locator('.hist-card').count(), before);
ok('history persists after reload (localStorage)');

// 13 Home quick view shows today's plan
await nav('Home');
assert.ok(await page.locator('.quick .dish').count() >= 4);
await page.screenshot({ path: `${SHOTS}/08-home-with-plan.png`, fullPage: true });
ok('home quick view shows today\'s plan');

// 14 Reset history
await nav('Settings');
await page.getByRole('button', { name: 'Reset meal history' }).click();
await page.getByRole('button', { name: 'Yes, clear history' }).click();
await nav('History');
assert.equal(await page.locator('.hist-card').count(), 0);
ok('reset history');

// 15 Variety: generating repeatedly gives different breakfasts
await nav('Planner');
await page.locator('.cat-card', { has: page.getByText('Vegetarian', { exact: true }) }).click();
const seen = new Set();
for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: 'Regenerate entire plan' }).count().then(async (c) => { if (c) await page.getByRole('button', { name: 'Regenerate entire plan' }).click(); else await gen(); }); await page.waitForTimeout(150); seen.add((await dishNames('breakfast'))[0]); }
assert.ok(seen.size >= 3, 'low variety ' + [...seen]);
ok('variety across regenerations: ' + [...seen].join(', '));

// desktop layout screenshot
await page.setViewportSize({ width: 1280, height: 860 });
await nav('Planner');
await page.screenshot({ path: `${SHOTS}/09-desktop-planner.png`, fullPage: true });
await nav('Home');
await page.screenshot({ path: `${SHOTS}/10-desktop-home.png`, fullPage: true });
ok('desktop layout renders');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
assert.equal(errors.length, 0);
await browser.close();
console.log(`\nAll UI flow tests passed (${steps} checks)`);
