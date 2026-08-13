export type Category = 'elixir' | 'elixir_noir' | 'base_ouvriers' | 'super_troupes';

export interface Card {
  id: string;
  name: string;
  category: Category;
  imageUrl: string | null;
}

export interface Account {
  id: string;
  name: string;
  owner: string;
  priority: number;
}

/** quantity: 0 = pas obtenue, 1 = obtenue, 2+ = doublon(s) */
export interface PlayerCard {
  account_id: string;
  card_id: string;
  quantity: number;
}

/** Raison d'un mouvement dans l'historique. */
export type EventReason = 'add' | 'remove' | 'trade';

/** Un mouvement enregistré dans l'historique du classeur. */
export interface CardEvent {
  id: string;
  account_id: string;
  card_id: string;
  delta: number; // +1 ajout, -1 retrait
  reason: EventReason;
  trade_id: string | null; // regroupe les mouvements d'un même échange
  partner_id: string | null; // l'autre compte, pour les échanges
  created_at: string;
}

/** Événement à insérer (sans id ni created_at, générés par la base). */
export interface NewCardEvent {
  account_id: string;
  card_id: string;
  delta: number;
  reason: EventReason;
  trade_id?: string | null;
  partner_id?: string | null;
}

/** Clé de possession, utilisée côté client : `${account_id}:${card_id}` -> quantity */
export type OwnershipMap = Record<string, number>;

export function ownKey(accountId: string, cardId: string): string {
  return `${accountId}:${cardId}`;
}
