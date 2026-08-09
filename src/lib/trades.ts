import type { Account, Card, Category, OwnershipMap } from './types';
import { ownKey } from './types';
import { CATEGORY_ORDER } from './categories';

export function quantityOf(own: OwnershipMap, accountId: string, cardId: string): number {
  return own[ownKey(accountId, cardId)] ?? 0;
}

/** Nombre de doublons disponibles à l'échange (quantity - 1, borné à 0). */
export function spareCount(own: OwnershipMap, accountId: string, cardId: string): number {
  return Math.max(0, quantityOf(own, accountId, cardId) - 1);
}

/** Une carte que je peux donner : j'en ai un doublon, l'autre ne l'a pas. */
function canGive(own: OwnershipMap, from: string, to: string, cardId: string): boolean {
  return spareCount(own, from, cardId) > 0 && quantityOf(own, to, cardId) === 0;
}

export interface CategorySwap {
  category: Category;
  give: Card[]; // cartes que le compte de référence peut donner au partenaire
  get: Card[]; // cartes que le partenaire peut donner au compte de référence
}

export interface PartnerTrades {
  partner: Account;
  swaps: CategorySwap[];
  /** nb de trocs 1-contre-1 réalisables (somme sur les catégories de min(give, get)). */
  total: number;
}

/**
 * Échanges réciproques (gagnant-gagnant) du point de vue de `accountId`.
 * Pour chaque autre compte et chaque catégorie, on ne garde la catégorie que si
 * les DEUX côtés ont quelque chose à donner (même catégorie obligatoire).
 */
export function reciprocalTradesFor(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
  accountId: string,
): PartnerTrades[] {
  const me = accountId;
  const result: PartnerTrades[] = [];

  for (const partner of accounts) {
    if (partner.id === me) continue;

    const swaps: CategorySwap[] = [];
    for (const cat of CATEGORY_ORDER) {
      const catCards = cards.filter((c) => c.category === cat);
      const give = catCards.filter((c) => canGive(own, me, partner.id, c.id));
      const get = catCards.filter((c) => canGive(own, partner.id, me, c.id));
      if (give.length > 0 && get.length > 0) swaps.push({ category: cat, give, get });
    }

    if (swaps.length > 0) {
      const total = swaps.reduce((s, x) => s + Math.min(x.give.length, x.get.length), 0);
      result.push({ partner, swaps, total });
    }
  }

  // Comptes principaux (P1) d'abord, puis par nombre d'échanges possibles.
  result.sort((a, b) => a.partner.priority - b.partner.priority || b.total - a.total);
  return result;
}

/**
 * Matrice symétrique : nombre de trocs gagnant-gagnant possibles entre chaque paire
 * de comptes. Clé `${aId}:${bId}` (renseignée dans les deux sens).
 */
export function reciprocalMatrix(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
): Record<string, number> {
  const m: Record<string, number> = {};
  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const a = accounts[i];
      const b = accounts[j];
      let total = 0;
      for (const cat of CATEGORY_ORDER) {
        const catCards = cards.filter((c) => c.category === cat);
        const give = catCards.filter((c) => canGive(own, a.id, b.id, c.id)).length;
        const get = catCards.filter((c) => canGive(own, b.id, a.id, c.id)).length;
        total += Math.min(give, get);
      }
      if (total > 0) {
        m[`${a.id}:${b.id}`] = total;
        m[`${b.id}:${a.id}`] = total;
      }
    }
  }
  return m;
}
