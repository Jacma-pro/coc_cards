import { useMemo } from 'react';
import type { AppData } from '../lib/useAppData';
import { ownKey } from '../lib/types';
import { initials, ownerColor } from '../lib/owners';
import { SpadeIcon } from '../components/icons';

interface Props {
  data: AppData;
  onSelect: (accountId: string) => void;
}

export function AccountPicker({ data, onSelect }: Props) {
  const { accounts, cards, ownership } = data;
  const owners = useMemo(() => [...new Set(accounts.map((a) => a.owner))], [accounts]);

  const ownedCount = (accountId: string) =>
    cards.filter((c) => (ownership[ownKey(accountId, c.id)] ?? 0) >= 1).length;

  return (
    <div className="picker">
      <div className="picker__hero">
        <span className="picker__logo" aria-hidden>
          <SpadeIcon size={28} />
        </span>
        <h1 className="picker__title">CLASH OF CARDS</h1>
        <p className="picker__tagline">Choisis un compte pour ouvrir son classeur</p>
      </div>

      {owners.map((owner) => {
        const color = ownerColor(owner, owners);
        const list = accounts
          .filter((a) => a.owner === owner)
          .sort((a, b) => a.priority - b.priority);
        return (
          <section key={owner} className="picker__group">
            <h2 className="picker__owner">
              <span className="picker__ownerdot" style={{ background: color }} aria-hidden />
              {owner}
            </h2>
            <div className="picker__grid">
              {list.map((a) => {
                const owned = ownedCount(a.id);
                const pct = cards.length ? Math.round((owned / cards.length) * 100) : 0;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="acccard"
                    style={{ '--acc-color': color } as React.CSSProperties}
                    onClick={() => onSelect(a.id)}
                  >
                    <span className="acccard__top">
                      <span className="acccard__avatar">{initials(a.name)}</span>
                      <span className="acccard__prio">P{a.priority}</span>
                    </span>
                    <span className="acccard__name">{a.name}</span>
                    <span className="acccard__progress">
                      <span className="progressbar progressbar--thin">
                        <span
                          className="progressbar__fill"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </span>
                      <span className="acccard__count muted">
                        {owned}/{cards.length}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
