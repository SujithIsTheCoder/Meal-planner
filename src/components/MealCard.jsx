import { Badge, Button, foodEmoji } from './ui.jsx';

const SECTIONS = {
  breakfast: [
    ['main', 'Dish'],
    ['accompaniment', 'Accompaniments'],
  ],
  lunch: [
    ['staple', 'Staple'],
    ['main', 'Main dish'],
    ['curry', 'Curry / Sambar'],
    ['side', 'Side dishes'],
  ],
};

export function DishRow({ slot, onChange, compact }) {
  return (
    <li className="dish" key={slot.foodId}>
      <span className="dish-emoji" aria-hidden="true">{foodEmoji(slot.foodName)}</span>
      <span className="dish-text">
        <span className="dish-name">{slot.foodName}</span>
        {!compact && slot.label && <span className="dish-label">{slot.label}</span>}
      </span>
      {onChange && (
        <button className="dish-change" onClick={onChange} aria-label={`Change ${slot.foodName}`} title="Pick a different one">
          <span aria-hidden="true">🔄</span> <span className="dish-change-text">Change</span>
        </button>
      )}
    </li>
  );
}

export default function MealCard({ meal, slots, cooked, onRegenMeal, onChangeSlot, onToggleCooked, delay = 0 }) {
  const isBf = meal === 'breakfast';
  const sections = SECTIONS[meal];
  return (
    <article className={`meal-card meal-${meal} rise`} style={{ animationDelay: `${delay}ms` }}>
      <header className="meal-head">
        <div>
          <div className="meal-kicker">{isBf ? '🌅 Morning' : '☀️ Afternoon · also for dinner'}</div>
          <h3 className="meal-title">{isBf ? 'BREAKFAST' : 'LUNCH'}</h3>
        </div>
        {cooked && <Badge tone="green">✓ Cooked</Badge>}
      </header>

      {!slots.length && <p className="muted">Nothing available. Add or enable dishes in Food Database.</p>}

      {sections.map(([role, heading]) => {
        const list = slots.filter((s) => s.role === role);
        if (!list.length) return null;
        return (
          <div className="meal-section" key={role}>
            <h4 className="section-label">{heading}</h4>
            <ul className="dish-list">
              {list.map((s) => (
                <DishRow key={s.id} slot={s} onChange={() => onChangeSlot(s.id)} />
              ))}
            </ul>
          </div>
        );
      })}

      <footer className="meal-foot">
        <Button variant="soft" size="sm" icon="🔄" onClick={onRegenMeal}>
          Regenerate {isBf ? 'breakfast' : 'lunch'}
        </Button>
        <Button variant={cooked ? 'green' : 'ghost'} size="sm" icon={cooked ? '✓' : '🍳'} onClick={onToggleCooked}>
          {cooked ? 'Cooked' : 'Mark cooked'}
        </Button>
      </footer>
    </article>
  );
}
