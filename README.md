# Sports Post SaaS

Landing page de validation pour un SaaS qui aide les clubs sportifs amateurs a generer automatiquement leurs posts reseaux sociaux apres les matchs et tournois.
Le site collecte des emails, envoie une confirmation par email et propose une offre early adopter a 10EUR/mois via Stripe.
La stack repose sur Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Resend et Stripe.

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
STRIPE_PRICE_ID=price_xxxxxxxxxxxx
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

1. Creer un produit dans Stripe Dashboard, par exemple `Sports Post Early Adopter`.
2. Ajouter un prix recurrent mensuel a `10 EUR`.
3. Recuperer l'identifiant du prix (`price_...`) et le renseigner dans `STRIPE_PRICE_ID`.
4. Recuperer la cle secrete Stripe (`sk_...`) et la renseigner dans `STRIPE_SECRET_KEY`.

## Scripts utiles

- `npm run dev` : demarre le serveur de developpement
- `npm run build` : construit l'application pour la production
- `npm run start` : lance la build de production
- `npm run prisma:generate` : genere le client Prisma
- `npm run prisma:migrate` : lance une migration Prisma en local
