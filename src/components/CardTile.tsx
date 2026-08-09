import { categoryMeta } from '../lib/categories';
import type { Card } from '../lib/types';
import { PlusIcon, MinusIcon, CheckIcon } from './icons';

interface Props {
  card: Card;
  quantity: number;
  onChange: (quantity: number) => void;
}

function stateLabel(q: number): string {
  if (q <= 0) return 'Manquante';
  if (q === 1) return 'Obtenue';
  return `Doublon ×${q - 1}`;
}

export function CardTile({ card, quantity, onChange }: Props) {
  const meta = categoryMeta(card.category);
  const owned = quantity >= 1;
  const dup = quantity >= 2;

  return (
    <div
      className={`card ${owned ? 'is-owned' : 'is-missing'} ${dup ? 'is-dup' : ''}`}
      style={{ '--cat-color': meta.color } as React.CSSProperties}
    >
      <button
        type="button"
        className="card__art"
        onClick={() => onChange(owned ? 0 : 1)}
        title={owned ? 'Marquer comme manquante' : 'Marquer comme obtenue'}
        aria-label={`${card.name} — ${stateLabel(quantity)}. ${owned ? 'Retirer' : 'Ajouter'}.`}
      >
        <span className="card__shine" aria-hidden />
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} loading="lazy" />
        ) : (
          <span className="card__placeholder" aria-hidden>
            {card.name.charAt(0)}
          </span>
        )}
        {owned && !dup && (
          <span className="card__check" aria-hidden>
            <CheckIcon size={12} />
          </span>
        )}
        {dup && <span className="card__badge">×{quantity - 1}</span>}
      </button>

      <div className="card__name" title={card.name}>
        {card.name}
      </div>

      <div className="card__stepper">
        <button
          type="button"
          className="card__step"
          onClick={() => onChange(Math.max(0, quantity - 1))}
          disabled={quantity <= 0}
          aria-label={`Diminuer ${card.name}`}
        >
          <MinusIcon size={16} />
        </button>
        <span className={`card__state ${owned ? 'is-owned' : ''} ${dup ? 'is-dup' : ''}`}>
          {stateLabel(quantity)}
        </span>
        <button
          type="button"
          className="card__step"
          onClick={() => onChange(quantity + 1)}
          aria-label={`Augmenter ${card.name}`}
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}
