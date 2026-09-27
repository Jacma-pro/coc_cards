// Mode démo : même app, sans Supabase.
// Les cartes et les comptes (fictifs) viennent des JSON du repo ; les
// collections sont générées une fois puis gardées dans le navigateur
// (localStorage). Chaque visiteur manipule sa propre copie.

import cardsSource from '../../cards.json';
import accountsSource from '../../accounts.json';
import type { Account, Card, CardEvent, NewCardEvent, PlayerCard } from './types';

const STORAGE_KEY = 'coc-cards-demo-v1';

interface DemoState {
  ownership: PlayerCard[];
  events: CardEvent[];
}

// ── Génération déterministe ────────────────────────────────────────
// Même graine → même démo pour tout le monde au premier chargement.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Taux de complétion visé par compte : un album complet, les autres étalés. */
const FILL_RATES = [1, 0.82, 0.7, 0.55, 0.88, 0.74, 0.62, 0.5, 0.66, 0.78];

function uuid(rand: () => number): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(rand() * 16);
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function seed(): DemoState {
  const rand = mulberry32(2026);
  const accounts = accountsSource.accounts;
  const cards = cardsSource.cards;
  const ownership: PlayerCard[] = [];

  accounts.forEach((acc, i) => {
    const rate = FILL_RATES[i % FILL_RATES.length];
    for (const card of cards) {
      if (rand() >= rate) continue;
      // ~35 % de doublons, parfois deux.
      const extra = rand() < 0.35 ? (rand() < 0.3 ? 2 : 1) : 0;
      ownership.push({ account_id: acc.id, card_id: card.id, quantity: 1 + extra });
    }
  });

  // Un peu d'historique, étalé sur les trois derniers jours.
  const events: CardEvent[] = [];
  const now = Date.now();
  const hour = 3_600_000;
  const at = (hoursAgo: number) => new Date(now - hoursAgo * hour).toISOString();

  accounts.forEach((acc, i) => {
    const owned = ownership.filter((o) => o.account_id === acc.id);
    for (let k = 0; k < 4 && k < owned.length; k++) {
      const pick = owned[Math.floor(rand() * owned.length)];
      events.push({
        id: uuid(rand),
        account_id: acc.id,
        card_id: pick.card_id,
        delta: 1,
        reason: 'add',
        trade_id: null,
        partner_id: null,
        created_at: at(6 + i * 5 + k * 3),
      });
    }
  });

  // Un échange entre les deux premiers comptes, pour montrer le regroupement.
  const [a, b] = accounts;
  const byCategory = (cat: string) => cards.filter((c) => c.category === cat);
  const elixir = byCategory('elixir');
  if (a && b && elixir.length >= 2) {
    const tradeId = uuid(rand);
    const when = at(2);
    const [x, y] = elixir;
    events.push(
      { id: uuid(rand), account_id: a.id, card_id: x.id, delta: -1, reason: 'trade', trade_id: tradeId, partner_id: b.id, created_at: when },
      { id: uuid(rand), account_id: a.id, card_id: y.id, delta: 1, reason: 'trade', trade_id: tradeId, partner_id: b.id, created_at: when },
      { id: uuid(rand), account_id: b.id, card_id: y.id, delta: -1, reason: 'trade', trade_id: tradeId, partner_id: a.id, created_at: when },
      { id: uuid(rand), account_id: b.id, card_id: x.id, delta: 1, reason: 'trade', trade_id: tradeId, partner_id: a.id, created_at: when },
    );
  }

  return { ownership, events };
}

// ── Persistance ────────────────────────────────────────────────────
// Si le stockage est indisponible (navigation privée…), la démo tourne en
// mémoire et repart de zéro au rechargement.
let memory: DemoState | null = null;

function load(): DemoState {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memory = JSON.parse(raw) as DemoState;
      return memory;
    }
  } catch {
    /* stockage illisible : on régénère */
  }
  memory = seed();
  save();
  return memory;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* stockage indisponible : reste en mémoire */
  }
}

/** Remet la démo dans son état initial. */
export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* rien à nettoyer */
  }
  memory = null;
}

// ── Même interface que api.ts ──────────────────────────────────────
export async function fetchCards(): Promise<Card[]> {
  return cardsSource.cards.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category as Card['category'],
    imageUrl: c.imageUrl ?? null,
  }));
}

export async function fetchAccounts(): Promise<Account[]> {
  return [...accountsSource.accounts].sort(
    (a, b) => a.owner.localeCompare(b.owner) || a.priority - b.priority,
  );
}

export async function fetchPlayerCards(): Promise<PlayerCard[]> {
  return load().ownership.map((o) => ({ ...o }));
}

export async function setPlayerCard(accountId: string, cardId: string, quantity: number) {
  const state = load();
  const rest = state.ownership.filter(
    (o) => !(o.account_id === accountId && o.card_id === cardId),
  );
  if (quantity > 0) rest.push({ account_id: accountId, card_id: cardId, quantity });
  state.ownership = rest;
  save();
}

export async function logEvents(events: NewCardEvent[]) {
  const state = load();
  const created_at = new Date().toISOString();
  for (const ev of events) {
    state.events.push({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      account_id: ev.account_id,
      card_id: ev.card_id,
      delta: ev.delta,
      reason: ev.reason,
      trade_id: ev.trade_id ?? null,
      partner_id: ev.partner_id ?? null,
      created_at,
    });
  }
  save();
}

export async function fetchEvents(accountId: string, limit = 150): Promise<CardEvent[]> {
  return load()
    .events.filter((e) => e.account_id === accountId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}
