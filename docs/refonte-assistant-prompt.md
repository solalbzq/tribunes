# Prompt — Refonte de Tribunes autour d'un assistant IA conversationnel

> À coller tel quel dans Claude Code, à la racine de `sports-post-saas`.
> Respecte le workflow multi-agents décrit dans `CLAUDE.md`.

---

## Contexte

Tribunes est un SaaS existant (Next.js 14, TypeScript, Prisma/PostgreSQL, Supabase, OpenAI, Stripe, Meta, Telegram) qui génère et publie la communication des clubs sportifs amateurs. Il est fonctionnel mais n'a encore aucun utilisateur réel. Le développement s'est arrêté le 2 août 2026.

Constat produit :
- l'interface est organisée en ~10 onglets par type de post (résultat, avant-match, programme, tournoi, bilan, joueur à l'honneur, annonce, sondage, publication libre…) : c'est un outil, pas un assistant ;
- la personnalisation existe mais reste un formulaire, et elle ne s'enrichit pas avec l'usage ;
- le produit est très orienté tennis (Ten'Up, PDF FFT, onglet Tennis/Padel) alors que la cible est **tous les clubs et associations sportives** ;
- les visuels font « template » (voir `docs/design-engine-plan.md`).

Le vrai problème des clubs : la com dépend du bénévole du moment, change de ton à chaque fois, puis passe à la trappe. Tribunes doit devenir **un membre du bureau qui ne part jamais**.

## Vision cible

Le cœur de Tribunes devient **un assistant conversationnel dans l'application web**, sous forme de chat, qui :

1. **Connaît le club** : une « mémoire du club » structurée (sport(s), équipes, catégories, calendrier, lieux, personnes clés, sponsors, ton, vocabulaire maison, événements passés, choses à éviter). Elle s'enrichit à chaque échange et à chaque correction du bénévole (« trop formel », « on dit toujours nos Bleus »), avec un contrôle clair de ce qui est retenu (voir, corriger, supprimer).
2. **Agit avec des outils**, pas seulement du texte : créer un brouillon de post, produire le visuel, proposer des variantes, programmer, publier sur les réseaux connectés, lire le calendrier et les résultats. Ces outils doivent **réutiliser le code existant** (`lib/services/postGeneration.ts`, le moteur de visuels, `lib/services/publish-service.ts`, `lib/automation.ts`, `lib/personalization.ts`, etc.) plutôt que le réécrire.
3. **Comprend le langage naturel et les fichiers** : « fais un post pour remercier la boulangerie Martin qui nous offre les maillots », une photo, un PDF de calendrier, une capture de feuille de match.
4. **Prend l'initiative** : à partir du calendrier et de l'historique, il propose ce qu'il faut publier (« ce week-end : 3 matchs et la soirée du club, je prépare les affiches ? ») ; le bénévole valide en un clic. Le cron de digest Telegram existant est l'ébauche de cette boucle.
5. **Est multisport par défaut** : modèle de données générique (club, équipes, rencontres, événements, personnes, résultats). Le tennis (Ten'Up, PDF FFT, interclubs) devient **un connecteur parmi d'autres**, pas le centre du produit.
6. **Reste sous contrôle humain** : par défaut, rien n'est publié sans validation explicite. Le mode automatique reste une option assumée, jamais un défaut.

Les onglets actuels ne disparaissent pas forcément : ils peuvent devenir des raccourcis ou des « gestes rapides » dans le chat. À l'architecte de proposer.

## Contraintes non négociables

- **Isolation stricte des données entre clubs** : chaque outil appelé par l'assistant vérifie l'appartenance au club et à l'organisation, côté serveur. La mémoire d'un club ne fuit jamais dans le contexte d'un autre.
- **Coûts IA maîtrisés et prévisibles** : chiffrer le coût par conversation et par mois et par plan (Gratuit, Club, Pro, voir `lib/plans.ts` et `lib/pricing.ts`), choisir les modèles par tâche (petit modèle pour le routage et l'extraction, gros modèle seulement quand il le faut), quotas appliqués côté serveur et journalisés dans `UsageEvent`.
- **Sécurité de l'agent** : résistance aux injections de prompt venant des fichiers, des pages Ten'Up ou des messages ; aucune action irréversible (publication, suppression, envoi) sans confirmation explicite ; liste fermée d'outils ; validation Zod des arguments de chaque outil.
- **Simplicité pour un bénévole non technique** : l'assistant doit être utilisable sans formation. Pas de jargon, pas de réglages à 4 niveaux.
- **Pas de nouvelle dépendance** sans justification écrite (le SDK OpenAI est déjà là ; un changement de fournisseur de modèle doit être argumenté, coûts compris).
- Respecter `CLAUDE.md` : pas de fausses données, pas de TODO, pas de refactor hors périmètre.

## Ce que je te demande maintenant : PHASE 1 uniquement — audit et plan, aucun code

Ne modifie aucun fichier applicatif, ne crée aucune migration, ne fais aucun commit.

Workflow :

1. **`architect`** : inspecter le dépôt réel et produire le plan (sections ci-dessous).
2. **`contrarian-reviewer`** : attaquer ce plan. En particulier : est-ce surdimensionné pour une V1 ? Qu'est-ce qui peut être livré en 2 à 3 semaines à temps partiel (je suis étudiant) ? Qu'est-ce qui casse ?
3. **`security-reviewer`** : revue ciblée sur l'agent et ses outils (multi-tenant, injection de prompt, actions irréversibles, tokens Meta, uploads).
4. Synthèse finale vérifiée dans le dépôt, puis rédaction du document.

Livrable : **`docs/assistant-plan.md`**, avec :

1. **Résumé exécutif** (10 lignes max) et la recommandation centrale.
2. **Audit de l'existant** utile à l'assistant : ce qu'on garde tel quel, ce qu'on adapte, ce qu'on jette ou gèle. Fichiers concernés.
3. **Architecture de l'agent** : boucle de conversation, appel d'outils, streaming vers l'UI, gestion du contexte (fenêtre, résumé), stockage des conversations, reprise après erreur.
4. **Liste des outils V1** : nom, rôle, arguments, contrôles d'autorisation, fonction existante réutilisée.
5. **Mémoire du club** : schéma proposé, comment elle se construit (onboarding conversationnel, apprentissage depuis les corrections), ce que l'utilisateur voit et peut modifier, et sa migration depuis les champs existants (`contentTone`, `customInstructions`, `bannedWords`, `signaturePhrase`, brand assets…).
6. **Généralisation multisport** : modèle de données générique proposé, plan de migration depuis les tables actuelles par type de post (`MatchResult`, `TournamentSchedule`, `WeeklySchedule`…), place du connecteur tennis.
7. **Proactivité** : déclencheurs, fréquence, coût, comment éviter le spam.
8. **Interface chat** : écrans, place dans le dashboard actuel, aperçu des posts et visuels dans la conversation, validation en un clic.
9. **Coûts IA** : estimation par club et par mois pour chaque plan, et quotas recommandés.
10. **Risques** sécurité, produit et techniques, avec la parade pour chacun.
11. **Découpage en lots livrables**, chaque lot utilisable seul. Le **lot 1** doit permettre au club pilote (le TCB, club de tennis) de produire ses vraies publications de la semaine via le chat, avec validation avant publication.
12. **Questions ouvertes** qui demandent ma décision.

Termine par un récapitulatif court dans le chat (décisions, risques principaux, questions pour moi) et **attends ma validation avant toute implémentation**.

## Phases suivantes (pour information, ne pas commencer)

- Phase 2 : implémentation du lot 1, puis `final-reviewer` et `security-reviewer` avant tout commit.
- Phase 3 : lots suivants, un par un, chacun validé par moi avant de démarrer.
