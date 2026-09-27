# Clash of Cards Tracker

Mini-site perso pour suivre les collections de cartes de l'event **Clash of Cards** (Clash of Clans) sur les 10 comptes du groupe, et calculer automatiquement les échanges possibles.

- **Stack** : React + TypeScript + Vite + SCSS
- **Données** : Supabase (Postgres)
- **Déploiement** : Vercel
- Mobile-first, pas d'auth (outil perso entre 3 personnes de confiance).

## Fonctionnalités

- **Mon album** — sélecteur de compte, 60 cartes groupées par catégorie avec contour coloré, édition rapide (clic sur la carte = obtenue/manquante, boutons − / + pour les doublons), progression par catégorie.
- **Échanges** — pour chaque carte manquante d'un compte, liste des comptes qui en ont un doublon (même catégorie garantie). Tri par priorité (compte principal d'un propriétaire satisfait en premier). Vue **liste** + vue **matrice** compte × compte.
- **Filtre par catégorie** partagé entre les deux vues.

Catégories & couleurs : `elixir` (rose), `elixir_noir` (violet), `base_ouvriers` (orange), `super_troupes` (bleu).

## Mode démo

Sans variables Supabase, l'app démarre en **mode démo** : 10 comptes fictifs, collections pré-remplies, modifications gardées dans le navigateur (localStorage) avec un bouton « Réinitialiser ». C'est ce mode qui tourne sur le déploiement public — il suffit de ne déclarer aucune variable d'env.

```bash
npm run dev   # sans .env → démo
```

## Mise en route locale

### 1. Installer

```bash
npm install
```

### 2. Créer le projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/schema.sql`](supabase/schema.sql) (crée les 3 tables + RLS).
3. Récupère tes clés dans **Project Settings → API** :
   - `Project URL`
   - `anon public` key
   - `service_role` key (secrète — pour le seed uniquement).

### 3. Configurer les variables d'env

```bash
cp .env.example .env
```

Remplis `.env` :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...        # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # service_role (jamais commit / jamais côté front)
```

### 4. Importer les données de référence

Seed les 60 cartes et les 10 comptes depuis `cards.json` / `accounts.json` :

```bash
npm run import
```

### 5. Lancer

```bash
npm run dev
```

## Modèle de données

| Table | Colonnes | Rôle |
|---|---|---|
| `cards` | `id`, `name`, `category`, `image_url` | 60 cartes (référence, seed) |
| `accounts` | `id`, `name`, `owner`, `priority` | 10 comptes (référence, seed) |
| `player_cards` | `account_id`, `card_id`, `quantity` | possession — `0` absente, `1` obtenue, `2+` doublon(s) |

Une ligne `player_cards` absente ⇔ `quantity = 0`. L'app supprime la ligne quand on repasse à 0 pour garder la table propre.

## Déploiement Vercel

1. Pousse le repo sur GitHub.
2. Sur [vercel.com](https://vercel.com), **Add New → Project**, importe le repo.
3. Framework détecté : **Vite** (build `npm run build`, output `dist`).
4. **Settings → Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (Ne pas mettre `SUPABASE_SERVICE_ROLE_KEY` sur Vercel — elle ne sert qu'au seed local.)
5. Deploy.

Le seed (`npm run import`) se lance depuis ta machine, pas sur Vercel.

## Notes

- Les `imageUrl` à `null` (5 cartes) affichent un placeholder avec l'initiale ; complète-les plus tard dans `cards.json` puis relance `npm run import`.
- La saisie des collections est 100 % manuelle (pas d'API officielle Clash of Clans).
- La clé `anon` peut lire/écrire `player_cards` (RLS permissive assumée pour un usage privé entre gens de confiance). Ne partage pas l'URL publiquement si tu veux éviter les modifs par des inconnus.
