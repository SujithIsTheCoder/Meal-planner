import { CATEGORIES } from '../data/constants.js';
import { todayStr } from '../engine/generator.js';
import { DishRow } from '../components/MealCard.jsx';
import { Badge, Button, Card, formatDate } from '../components/ui.jsx';
import { CategoryCard } from './Planner.jsx';
import { planSubtitle } from '../components/PlanView.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home({ app, current, actions, go, generateNow }) {
  const { last, motherName } = app.settings;
  const today = todayStr();
  const plan = current && current.date === today ? current : app.history.find((h) => h.date === today) || null;

  return (
    <div className="screen">
      <header className="hero">
        <div>
          <h1 className="hero-title">{greeting()}, {motherName || 'Amma'} 🙏</h1>
          <p className="hero-date">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="hero-art" aria-hidden="true">🍛</div>
      </header>

      <h2 className="section-heading">What shall we cook today?</h2>
      <div className="cat-grid">
        {CATEGORIES.map((c) => (
          <CategoryCard key={c.id} cat={c} active={last.category === c.id}
            onClick={() => { actions.setLast({ category: c.id }); go('planner'); }} />
        ))}
      </div>

      <Button variant="primary" size="xl" className="gen-btn" icon="✨" onClick={generateNow}>
        GENERATE MEAL PLAN
      </Button>
      <p className="center muted small">
        Uses your last choice: <strong>{CATEGORIES.find((c) => c.id === last.category)?.label}</strong> — tap a card above to change it.
      </p>

      <Card className="quick">
        <div className="quick-head">
          <h2 className="section-heading">Today's meal plan</h2>
          {plan && <Badge tone={CATEGORIES.find((c) => c.id === plan.category)?.color}>{planSubtitle(plan).cat?.label}</Badge>}
        </div>
        {plan ? (
          <>
            <div className="quick-grid">
              <div>
                <h4 className="section-label">🌅 Breakfast {plan.cooked.breakfast && <Badge tone="green">✓ cooked</Badge>}</h4>
                <ul className="dish-list compact">{plan.breakfast.slots.map((s) => <DishRow key={s.id} slot={s} compact />)}</ul>
              </div>
              <div>
                <h4 className="section-label">☀️ Lunch {plan.cooked.lunch && <Badge tone="green">✓ cooked</Badge>}</h4>
                <ul className="dish-list compact">{plan.lunch.slots.map((s) => <DishRow key={s.id} slot={s} compact />)}</ul>
              </div>
            </div>
            <Button variant="soft" onClick={() => { actions.openPlan(plan.id); go('planner'); }}>Open full plan & change dishes →</Button>
          </>
        ) : (
          <div className="empty small-empty">
            <div className="empty-emoji">🥘</div>
            <p>No plan for today yet. Press the big button!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
