import type { CategoryFilterValue } from '../App';
import { CATEGORIES } from '../lib/categories';

interface Props {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="catfilter" role="group" aria-label="Filtrer par catégorie">
      <button
        type="button"
        className={`chip chip--all ${value === 'all' ? 'is-active' : ''}`}
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        Toutes
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip ${value === c.id ? 'is-active' : ''}`}
          aria-pressed={value === c.id}
          style={{ '--chip-color': c.color } as React.CSSProperties}
          onClick={() => onChange(c.id)}
        >
          <span className="chip__dot" aria-hidden />
          {c.label}
        </button>
      ))}
    </div>
  );
}
