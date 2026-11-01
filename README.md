# Sports Post SaaS

Tribunes aide les clubs sportifs amateurs a generer leurs posts reseaux sociaux (matchs, tournois, annonces).
Les plans (Decouverte gratuit, Club, Pro) sont definis dans `lib/plans.ts` et factures via Stripe.
La stack repose sur Next.js 15, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Resend et Stripe.

## Prerequis

- Node.js 18+
- PostgreSQL
- Un compte Resend
- Un compte Stripe

## Installation

1. Cloner le projet puis ouvrir le dossier `sports-post-saas`.
2. Installer les dependances : `npm install`
3. Copier les variables d'environnement : `cp .env.local.example .env.local`
4. Renseigner les valeurs dans `.env.local`
5. Initialiser Prisma : `npx prisma generate`
6. Creer la base et appliquer la premiere migration : `npx prisma migrate dev --name init`
7. Lancer le serveur : `npm run dev`

## Variables d'environnement

Le fichier `.env.local.example` contient les variables attendues :

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sportspost
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=bonjour@tonemail.fr
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_PRICE_CLUB_MONTHLY=price_xxxxxxxxxxxx
STRIPE_PRICE_CLUB_YEARLY=price_xxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Developpement

Lancer l'application en local avec :

```bash
npm run dev
```

Le site sera disponible sur `http://localhost:3000`.

## Deploiement sur Vercel

1. Importer le repository dans Vercel.
2. Ajouter toutes les variables d'environnement de `.env.local.example` dans les settings du projet.
3. Configurer une base PostgreSQL accessible depuis Vercel.
4. Executer les migrations Prisma sur la base cible.
5. Redefinir `NEXT_PUBLIC_BASE_URL` avec l'URL publique du projet.

## Configuration Stripe

1. Creer les produits Club et Pro dans Stripe Dashboard, chacun avec un prix mensuel et un prix annuel (montants dans `lib/plans.ts`).
2. Renseigner les 4 identifiants `price_...` dans `STRIPE_PRICE_CLUB_MONTHLY`, `STRIPE_PRICE_CLUB_YEARLY`, `STRIPE_PRICE_PRO_MONTHLY` et `STRIPE_PRICE_PRO_YEARLY`.
3. Recuperer la cle secrete Stripe (`sk_...`) pour `STRIPE_SECRET_KEY`, et le secret du webhook pour `STRIPE_WEBHOOK_SECRET`.

## Scripts utiles

- `npm run dev` : demarre le serveur de developpement
- `npm run build` : construit l'application pour la production
- `npm run start` : lance la build de production
- `npm run prisma:generate` : genere le client Prisma
- `npm run prisma:migrate` : lance une migration Prisma en local
