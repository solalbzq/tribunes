# CLAUDE.md — Tribunes

Tribunes aide les clubs sportifs amateurs à produire et publier leur communication.
Cible : tous les clubs et associations sportives, pas seulement le tennis.
Stack : Next.js 15, TypeScript, Tailwind CSS, Prisma/PostgreSQL, OpenAI, Resend, Stripe.

Référence unique de la refonte : `docs/refonte-assistant-prompt.md`
(présent sur la branche `design-engine/prototype`). En cas de doute, ce document fait foi.

## Règles du projet

- Aucune fausse donnée. Pas de valeurs inventées, pas de données factices présentées comme réelles.
- Aucun TODO laissé dans le code.
- Pas de refactor hors périmètre : une PR = une tâche.
- Pas de nouvelle dépendance sans justification écrite.
- Isolation stricte des données entre clubs, vérifiée côté serveur à chaque appel.
- Aucune action irréversible (publication, suppression, envoi) sans confirmation explicite de l'utilisateur.
- Coûts IA maîtrisés : quotas appliqués côté serveur et journalisés (`UsageEvent`).
- Interface simple pour un bénévole non technique : pas de jargon.
- Réutiliser le code existant (`lib/services/`, `lib/automation.ts`, `lib/personalization.ts`…) plutôt que le réécrire.
- Vérifier avant de livrer : build, tests, lint.

## Workflow Git

- Commits uniquement sur des branches `agent/…`, jamais sur `main` ni `bureau`.
- PR visant `bureau`. Aucune fusion par l'agent.
- Ne pas toucher au dossier `com/`, aux secrets ni aux fichiers `.env`.

## Décisions du PDG (validées sur le §14)

- On valide les propositions du plan.
- Le tennis est gardé, mais aucune publication automatique.
- Les visuels restent sur le moteur actuel.
- Aucun nom de joueur n'est stocké.
- Aucune fausse donnée, aucun TODO, pas de refactor hors périmètre.
- Commits sur branches `agent/` uniquement.
