import { useState } from 'react';
import { useAppData } from './lib/useAppData';
import type { Category } from './lib/types';
import { CategoryFilter } from './components/CategoryFilter';
import { AlbumView } from './views/AlbumView';
import { TradesView } from './views/TradesView';
import { AlbumIcon, TradeIcon, SpadeIcon } from './components/icons';

type Tab = 'album' | 'trades';
export type CategoryFilterValue = Category | 'all';

export default function App() {
  const data = useAppData();
  const [tab, setTab] = useState<Tab>('album');
  const [category, setCategory] = useState<CategoryFilterValue>('all');

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo" aria-hidden>
            <SpadeIcon size={20} />
          </span>
          <div className="topbar__titles">
            <h1 className="topbar__title">CLASH OF CARDS</h1>
            <p className="topbar__sub">{tab === 'album' ? 'Mon album' : 'Échanges possibles'}</p>
          </div>
        </div>
      </header>

      <div className="filterbar">
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      <main className="app__main">
        {data.error && (
          <div className="banner banner--error" role="alert">
            <p>{data.error}</p>
            {data.configured && (
              <button className="btn" onClick={data.reload}>
                Réessayer
              </button>
            )}
          </div>
        )}

        {data.loading ? (
          <div className="loading">
            <span className="loading__spinner" aria-hidden />
            <p className="muted">Chargement…</p>
          </div>
        ) : tab === 'album' ? (
          <AlbumView data={data} category={category} />
        ) : (
          <TradesView data={data} category={category} />
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
          <span>Album</span>
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
      </nav>
    </div>
  );
}
