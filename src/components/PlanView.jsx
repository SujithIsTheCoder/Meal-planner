import { CATEGORIES, PROTEINS } from '../data/constants.js';
import MealCard from './MealCard.jsx';
import { Badge, Button, formatDate, useNotify } from './ui.jsx';

const STAPLE_LABEL = { rice: 'Rice', roti: 'Chapati', both: 'Rice + Chapati' };
const NV_STAPLE_LABEL = { rice: 'with rice', roti: 'with chapati', any: '' };

export function planSubtitle(plan) {
  const cat = CATEGORIES.find((c) => c.id === plan.category);
  let extra = '';
  if (plan.category === 'veg') extra = STAPLE_LABEL[plan.options.staple] || '';
  if (plan.category === 'nonveg') {
    const p = PROTEINS.find((x) => x.id === plan.options.protein);
    extra = [p?.label, NV_STAPLE_LABEL[plan.options.nvStaple]].filter(Boolean).join(' ');
  }
  return { cat, extra };
}

export default function PlanView({ plan, actions, showActions = true }) {
  const notify = useNotify();
  const { cat, extra } = planSubtitle(plan);

  const changeSlot = (meal) => (slotId) => {
    const res = actions.regenerateSlot(meal, slotId);
    if (!res.ok) notify.show(res.message, 'warn');
    else if (res.message) notify.show(res.message);
  };

  return (
    <div className="plan">
      <div className="plan-head rise">
        <div>
          <h2 className="plan-title">Today's meal plan</h2>
          <p className="muted">{formatDate(plan.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="plan-badges">
          <Badge tone={cat?.color}>{cat?.emoji} {cat?.label}</Badge>
          {extra && <Badge tone="neutral">{extra}</Badge>}
          {plan.saved && <Badge tone="saffron">★ Saved</Badge>}
        </div>
      </div>

      {plan.warnings?.map((w) => (
        <div className="notice notice-warn" key={w}>{w}</div>
      ))}

      <div className="plan-grid">
        <MealCard
          meal="breakfast"
          slots={plan.breakfast.slots}
          cooked={plan.cooked.breakfast}
          onRegenMeal={() => actions.regenerateMeal('breakfast')}
          onChangeSlot={changeSlot('breakfast')}
          onToggleCooked={() => actions.toggleCooked(plan.id, 'breakfast')}
          delay={0}
        />
        <MealCard
          meal="lunch"
          slots={plan.lunch.slots}
          cooked={plan.cooked.lunch}
          onRegenMeal={() => actions.regenerateMeal('lunch')}
          onChangeSlot={changeSlot('lunch')}
          onToggleCooked={() => actions.toggleCooked(plan.id, 'lunch')}
          delay={120}
        />
      </div>

      {showActions && (
        <div className="plan-actions rise" style={{ animationDelay: '220ms' }}>
          <Button variant="primary" size="lg" icon="🔄" onClick={() => actions.regenerateAll()}>Regenerate entire plan</Button>
          <Button
            variant={plan.cooked.breakfast && plan.cooked.lunch ? 'green' : 'soft'}
            size="lg" icon="🍳"
            onClick={() => { actions.toggleCooked(plan.id, 'both'); }}
          >
            {plan.cooked.breakfast && plan.cooked.lunch ? 'Cooked ✓' : 'Mark as cooked'}
          </Button>
          <Button
            variant={plan.saved ? 'saffron' : 'ghost'} size="lg" icon={plan.saved ? '★' : '☆'}
            onClick={() => { actions.toggleSaved(plan.id); notify.show(plan.saved ? 'Removed from saved plans' : 'Plan saved ★'); }}
          >
            {plan.saved ? 'Saved' : 'Save plan'}
          </Button>
        </div>
      )}
    </div>
  );
}
