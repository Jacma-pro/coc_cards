# Projet : Clash of Cards Tracker

## Contexte

Clash of Clans a lancé un event de cartes à collectionner ("Clash of Cards", août 2026) : 60 cartes réparties en 4 catégories, échangeables uniquement à l'intérieur d'une même catégorie. Je veux un mini-site perso pour gérer les collections de mes comptes (et ceux de mon groupe) et voir automatiquement qui peut échanger quoi avec qui.

**Pas un outil pour un clan entier** : seulement 3 personnes réelles, 10 comptes au total.
- Alex : GoblinKing (priorité 1), PekkaPower (2), Hog Rush (3), Mini_Alex (4)
- Sam : Valkyrie X (1), Baby_Drake (2), WallBreaker (3), Bowler42 (4), NightWitch (5)
- Noa : GolemNoa (1)

La priorité correspond à l'ordre donné ci-dessus (1 = compte principal de la personne). Elle sert à arbitrer : si plusieurs comptes d'un même groupe ont besoin de la même carte en échange, on privilégie le compte le plus prioritaire.

## Stack

- Frontend : React + TypeScript + Vite + SCSS
- Backend/DB : Supabase
- Déploiement : Vercel
- Pas d'authentification complexe nécessaire — juste un sélecteur de compte (pseudo dans une liste déroulante), pas de vrai système de comptes utilisateurs avec mot de passe.

## Données de référence (fournies, à importer telles quelles)


Deux fichiers JSON sont fournis en pièce jointe :
- `cards.json` : les 60 cartes (`id`, `name`, `category`, `imageUrl` — certains `imageUrl` sont `null`, à compléter plus tard, ne pas bloquer dessus)
- `accounts.json` : les 10 comptes (`id`, `name`, `owner`, `priority`)

Catégories (4) : `elixir`, `elixir_noir`, `base_ouvriers`, `super_troupes`. Chaque catégorie doit avoir une couleur de contour dédiée appliquée sur l'image de la carte :
- `elixir` → rose
- `elixir_noir` → violet
- `base_ouvriers` → orange
- `super_troupes` → bleu

## Modèle de données à créer

En plus des tables `cards` et `accounts` (importées depuis les JSON), une table de possession :

`player_cards` : `account_id`, `card_id`, `quantity` (0 = pas obtenue, 1 = obtenue, 2+ = doublon(s))

## Fonctionnalités attendues

### 1. Vue "Mon album" (par compte)
- Sélectionner un compte dans une liste déroulante
- Afficher les 60 cartes groupées par catégorie, avec leur `imageUrl` (placeholder si `null`) et le contour coloré de la catégorie
- Pour chaque carte, pouvoir indiquer rapidement : pas obtenue / obtenue x1 / doublon (avec quantité de doublons)
- UX doit être rapide à mettre à jour (pas de formulaire lourd — clic/incrémentation directe)

### 2. Vue "Échanges possibles"
- Calculer et afficher les échanges possibles entre comptes : pour chaque carte manquante d'un compte A, lister les comptes qui ont un doublon de cette carte (même catégorie obligatoire)
- Format d'affichage type : "GoblinKing peut recevoir [Carte X] de Hog Rush (doublon)"
- Quand plusieurs comptes proposent la même carte en doublon, trier/mettre en avant selon la `priority` du compte demandeur ET du compte donneur (les comptes prioritaires d'un même groupe sont à satisfaire en premier)
- Idéalement une vue matrice (compte x compte) en plus de la liste, vu qu'on n'a que 10 comptes — ça reste lisible

### 3. Filtrage par catégorie
- Pouvoir filtrer l'album et les échanges par catégorie (`elixir`, `elixir_noir`, `base_ouvriers`, `super_troupes`)

## Points d'attention

- Pas de backend d'auth complexe, pas de gestion de rôles — c'est un outil perso entre 3 personnes de confiance
- Les données de collection reposent entièrement sur la saisie manuelle (pas d'API officielle Clash of Clans pour ça) — l'UX de mise à jour de l'album doit donc être la plus rapide possible
- Design mobile-friendly en priorité (probablement consulté depuis le téléphone en jouant)

## Livrables attendus

1. Setup du projet (Vite + React + TS + SCSS)
2. Config Supabase (schéma SQL des 3 tables + script d'import des deux JSON fournis)
3. Vue "Mon album" fonctionnelle
4. Vue "Échanges possibles" avec logique de matching + priorité
5. Déploiement Vercel prêt (ou instructions de déploiement)
