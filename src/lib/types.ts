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

/** Clé de possession, utilisée côté client : `${account_id}:${card_id}` -> quantity */
export type OwnershipMap = Record<string, number>;

export function ownKey(accountId: string, cardId: string): string {
  return `${accountId}:${cardId}`;
}
