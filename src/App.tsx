import { useMemo, useState } from 'react';
import { useAppData } from './lib/useAppData';
import type { Category } from './lib/types';
import { CategoryFilter } from './components/CategoryFilter';
import { AlbumView } from './views/AlbumView';
import { TradesView } from './views/TradesView';
import { HistoryView } from './views/HistoryView';
import { AccountPicker } from './views/AccountPicker';
import { AlbumIcon, TradeIcon, HistoryIcon, SpadeIcon } from './components/icons';
import { initials, ownerColor } from './lib/owners';

type Tab = 'album' | 'trades' | 'history';
export type CategoryFilterValue = Category | 'all';

export default function App() {
  const data = useAppData();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('album');
  const [category, setCategory] = useState<CategoryFilterValue>('all');

  const owners = useMemo(() => [...new Set(data.accounts.map((a) => a.owner))], [data.accounts]);
  const selected = useMemo(
    () => data.accounts.find((a) => a.id === accountId) ?? null,
    [data.accounts, accountId],
  );

  // ── États bloquants (avant sélection de compte) ──────────────────
  if (data.error && !data.configured) {
    return (
      <div className="screen screen--center">
        <div className="banner banner--error" role="alert">
          <p>{data.error}</p>
        </div>
      </div>
    );
  }
  if (data.loading) {
    return (
      <div className="screen screen--center">
        <div className="loading">
          <span className="loading__spinner" aria-hidden />
          <p className="muted">Chargement…</p>
        </div>
      </div>
    );
  }
  if (!selected) {
    return (
      <div className="screen">
        {data.error && (
          <div className="banner banner--error" role="alert">
            <p>{data.error}</p>
            <button className="btn" onClick={data.reload}>
              Réessayer
            </button>
          </div>
        )}
        <AccountPicker
          data={data}
          onSelect={(id) => {
            setAccountId(id);
            setTab('album');
          }}
        />
      </div>
    );
  }

  // ── App (compte sélectionné) ─────────────────────────────────────
  const accColor = ownerColor(selected.owner, owners);

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="topbar__account"
          style={{ '--acc-color': accColor } as React.CSSProperties}
          onClick={() => setAccountId(null)}
          title="Changer de compte"
        >
          <span className="topbar__avatar">{initials(selected.name)}</span>
          <span className="topbar__accmeta">
            <span className="topbar__accname">{selected.name}</span>
            <span className="topbar__accowner">{selected.owner} · changer</span>
          </span>
        </button>
        <span className="topbar__logo" aria-hidden>
          <SpadeIcon size={18} />
        </span>
      </header>

      <div className="filterbar">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <main className="app__main">
        {data.error && (
          <div className="banner banner--error" role="alert">
            <p>{data.error}</p>
            <button className="btn" onClick={data.reload}>
              Réessayer
            </button>
          </div>
        )}

        {tab === 'album' && (
          <AlbumView data={data} category={category} accountId={selected.id} />
        )}
        {tab === 'trades' && (
          <TradesView
            data={data}
            category={category}
            accountId={selected.id}
            accountName={selected.name}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            data={data}
            category={category}
            accountId={selected.id}
            accountName={selected.name}
          />
        )}
      </main>

      <nav className="bottomnav" role="tablist" aria-label="Navigation principale">
        <button
          role="tab"
          aria-selected={tab === 'album'}
          className={`bottomnav__btn ${tab === 'album' ? 'is-active' : ''}`}
          onClick={() => setTab('album')}
        >
          <AlbumIcon size={22} />
          <span>Classeur</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'trades'}
          className={`bottomnav__btn ${tab === 'trades' ? 'is-active' : ''}`}
          onClick={() => setTab('trades')}
        >
          <TradeIcon size={22} />
          <span>Échanges</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'history'}
          className={`bottomnav__btn ${tab === 'history' ? 'is-active' : ''}`}
          onClick={() => setTab('history')}
        >
          <HistoryIcon size={22} />
          <span>Historique</span>
        </button>
      </nav>
    </div>
  );
}
