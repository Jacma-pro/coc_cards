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

/** Album complet : au moins un exemplaire de chaque carte considérée. */
export function isComplete(own: OwnershipMap, cards: Card[], accountId: string): boolean {
  return cards.every((c) => quantityOf(own, accountId, c.id) >= 1);
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
 * Cartes échangeables entre `me` et `partner`, catégorie par catégorie.
 *
 * Cas normal (aucun album complet) : troc gagnant-gagnant strict — chaque côté
 * donne un doublon que l'autre n'a pas, donc chacun gagne une carte.
 *
 * Album complet : on relâche la contrainte pour lui. Un compte complet peut
 * donner ses doublons à qui en manque et recevoir en retour n'importe quel
 * doublon (qu'il possède déjà : neutre pour lui, l'autre y gagne).
 *
 * Deux albums complets → aucun troc (rien à gagner de part et d'autre).
 * Même catégorie obligatoire (contrainte du jeu).
 */
function swapsBetween(
  cards: Card[],
  own: OwnershipMap,
  meId: string,
  partnerId: string,
  meComplete: boolean,
  partnerComplete: boolean,
): CategorySwap[] {
  if (meComplete && partnerComplete) return [];

  const swaps: CategorySwap[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catCards = cards.filter((c) => c.category === cat);
    // Ce que `me` tend au partenaire : un doublon que le partenaire n'a pas
    // (il gagne) OU n'importe quel doublon si le partenaire est complet (neutre).
    const give = catCards.filter(
      (c) =>
        spareCount(own, meId, c.id) > 0 &&
        (quantityOf(own, partnerId, c.id) === 0 || partnerComplete),
    );
    // Ce que le partenaire tend à `me` : idem dans l'autre sens.
    const get = catCards.filter(
      (c) =>
        spareCount(own, partnerId, c.id) > 0 &&
        (quantityOf(own, meId, c.id) === 0 || meComplete),
    );
    if (give.length > 0 && get.length > 0) swaps.push({ category: cat, give, get });
  }
  return swaps;
}

/**
 * Échanges du point de vue de `accountId`, pour chaque autre compte.
 * Gagnant-gagnant entre deux albums incomplets ; sens unique dès qu'un album
 * complet est impliqué (cf. swapsBetween).
 */
export function reciprocalTradesFor(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
  accountId: string,
): PartnerTrades[] {
  const me = accountId;
  const meComplete = isComplete(own, cards, me);
  const result: PartnerTrades[] = [];

  for (const partner of accounts) {
    if (partner.id === me) continue;

    const swaps = swapsBetween(
      cards,
      own,
      me,
      partner.id,
      meComplete,
      isComplete(own, cards, partner.id),
    );

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
 * Échanges À SENS UNIQUE pour enrichir un compte (typiquement une main).
 * Du point de vue de `accountId` (le bénéficiaire) :
 *  - je GAGNE une carte X : le partenaire en a un doublon et il me manque (qty 0) ;
 *  - je DONNE en retour une carte Y dont j'ai un doublon ET que le partenaire
 *    possède déjà → le partenaire ne perd aucune carte unique (échange neutre pour lui).
 * Résultat : mon album gagne une carte, le partenaire garde tout ce qu'il avait.
 * Même catégorie obligatoire (contrainte du jeu).
 */
export function directionalTradesFor(
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
      // Cartes que je gagne : le partenaire a un doublon, il me manque.
      const get = catCards.filter(
        (c) => spareCount(own, partner.id, c.id) > 0 && quantityOf(own, me, c.id) === 0,
      );
      // Cartes que je rends : j'ai un doublon et le partenaire la possède déjà (neutre pour lui).
      const give = catCards.filter(
        (c) => spareCount(own, me, c.id) > 0 && quantityOf(own, partner.id, c.id) >= 1,
      );
      if (get.length > 0 && give.length > 0) swaps.push({ category: cat, give, get });
    }

    if (swaps.length > 0) {
      const total = swaps.reduce((s, x) => s + Math.min(x.give.length, x.get.length), 0);
      result.push({ partner, swaps, total });
    }
  }

  // Par nombre de cartes gagnables (les meilleurs partenaires d'abord).
  result.sort((a, b) => b.total - a.total || a.partner.priority - b.partner.priority);
  return result;
}

/**
 * Matrice symétrique : nombre d'échanges possibles entre chaque paire de comptes
 * (même logique que la liste : gagnant-gagnant, ou sens unique si un album complet
 * est impliqué ; 0 entre deux albums complets). Clé `${aId}:${bId}`, deux sens.
 */
export function reciprocalMatrix(
  cards: Card[],
  accounts: Account[],
  own: OwnershipMap,
): Record<string, number> {
  const m: Record<string, number> = {};
  const complete = new Map<string, boolean>();
  for (const a of accounts) complete.set(a.id, isComplete(own, cards, a.id));

  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const a = accounts[i];
      const b = accounts[j];
      const swaps = swapsBetween(cards, own, a.id, b.id, !!complete.get(a.id), !!complete.get(b.id));
      const total = swaps.reduce((s, x) => s + Math.min(x.give.length, x.get.length), 0);
      if (total > 0) {
        m[`${a.id}:${b.id}`] = total;
        m[`${b.id}:${a.id}`] = total;
      }
    }
  }
  return m;
}
