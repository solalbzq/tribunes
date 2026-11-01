# Mission pour le bureau IA — Tribunes devient un assistant

> Brief de mission pour l'équipe d'agents autonomes qui travaille sur le serveur pendant que je suis en cours.
> Je suis le chef : je fixe le cap, je tranche les décisions marquées « DÉCISION SOLAL », je valide les fusions. Le reste, vous le faites seuls.

---

## 1. Le projet

**Tribunes** est un SaaS qui génère et publie la communication des clubs sportifs amateurs.
Dépôt : `git@github.com:solalbzq/tribunes.git`, application dans `sports-post-saas/`.
Stack : Next.js 14, TypeScript, Prisma/PostgreSQL, Supabase, OpenAI, Stripe, Meta (Facebook/Instagram), Telegram, Vercel.

Lisez en premier, dans cet ordre : `CLAUDE.md` (règles du projet, à respecter), `README.md`, `docs/design-engine-plan.md`, `docs/brand-kit-plan.md`, `prisma/schema.prisma`, `lib/plans.ts`.

État : environ 30 000 lignes, 78 commits entre le 1er juillet et le 2 août 2026, aucun utilisateur réel, jamais déployé. Le dernier travail est sur la branche `design-engine/prototype` (refonte des visuels en rendu serveur Satori), pas sur `main`.

## 2. Le problème qu'on résout

Dans un club amateur, la com dépend du bénévole du moment : le ton change à chaque fois, puis elle passe à la trappe. Résultat : événements mal relayés, peu de monde, membres qui ne se croisent pas.
Tribunes doit devenir **un membre du bureau qui ne part jamais**.

## 3. La vision

Aujourd'hui Tribunes est un outil à ~10 onglets (un par type de post), très orienté tennis. On en fait **un assistant conversationnel dans l'appli web**, sous forme de chat :

1. **Il connaît le club** : une mémoire du club (sport, équipes, calendrier, lieux, personnes clés, sponsors, ton, vocabulaire maison, choses à éviter) qui s'enrichit à chaque échange et à chaque correction. Le bénévole peut voir, corriger et effacer ce qui est retenu.
2. **Il agit avec des outils** : créer un post, produire le visuel, proposer des variantes, programmer, publier, lire le calendrier et les résultats. Ces outils **réutilisent le code existant** (`lib/services/postGeneration.ts`, moteur de visuels, `lib/services/publish-service.ts`, `lib/automation.ts`, `lib/personalization.ts`…).
3. **Il comprend le langage naturel et les fichiers** : « remercie la boulangerie Martin qui nous offre les maillots », une photo, un PDF de calendrier, une feuille de match.
4. **Il prend l'initiative** : « ce week-end, 3 matchs et la soirée du club, je prépare les affiches ? ». Le bénévole valide en un clic.
5. **Il est multisport** : modèle de données générique (club, équipes, rencontres, événements, personnes). Le tennis (Ten'Up, PDF FFT, interclubs) devient un connecteur parmi d'autres.
6. **Il reste sous contrôle humain** : rien n'est publié sans validation, par défaut.

Club pilote : le **TCB**, un club de tennis. Objectif du premier lot : que le TCB produise ses vraies publications de la semaine via le chat.

## 4. Organisation de l'équipe

| Rôle | Mission |
| --- | --- |
| Chef de produit | Découpe la vision en tâches, tient le tableau de bord à jour, rédige le rapport quotidien, décide de ce qui est prioritaire dans le cadre de ce brief |
| Architecte | Audite le code, conçoit l'architecture de l'agent, de la mémoire et du modèle multisport, écrit les plans techniques |
| Développeurs | Implémentent une tâche à la fois, sur une branche dédiée, avec tests |
| Contradicteur | Attaque chaque plan et chaque PR : trop complexe ? hors périmètre ? qu'est-ce qui casse ? |
| Sécurité | Revue de chaque PR qui touche à l'agent, aux outils, à l'auth, aux données entre clubs, aux tokens Meta, aux uploads |
| Relecteur final | Vérifie que la PR répond à la tâche, que les tests et le build passent, que le diff est propre |

Règle d'or : **une idée proposée par un agent doit être validée par un autre avant d'être développée.** Le chef de produit arbitre ; s'il hésite ou si c'est structurant, c'est une DÉCISION SOLAL.

## 5. Feuille de route

Ne passez pas à l'étape suivante tant que la précédente n'est pas validée par moi.

**Étape 0 — Audit et plan (aucun code applicatif).** Livrable : `docs/assistant-plan.md`, avec :
- ce qu'on garde, adapte, gèle ou jette dans l'existant (fichiers à l'appui) ;
- l'architecture de l'agent : boucle de conversation, appels d'outils, streaming, gestion du contexte, stockage des conversations, reprise sur erreur ;
- la liste des outils V1 : nom, arguments, contrôles d'autorisation, fonction existante réutilisée ;
- le schéma de la mémoire du club et sa migration depuis les champs actuels (`contentTone`, `customInstructions`, `bannedWords`, `signaturePhrase`, brand assets) ;
- le modèle multisport et sa migration depuis les tables par type de post ;
- la proactivité : déclencheurs, fréquence, coût, anti-spam ;
- l'interface chat et sa place dans le dashboard ;
- le coût IA estimé par club et par mois pour chaque plan (Gratuit, Club 9,90 €, Pro 19,90 €) et les quotas ;
- les risques et leurs parades ;
- un découpage en lots, chacun utilisable seul ; le lot 1 doit tenir en 2 à 3 semaines de travail ;
- une décision sur la branche `design-engine/prototype` : on la fusionne, on la reprend ou on la gèle ? (DÉCISION SOLAL, avec votre recommandation).

**Étape 1 — Lot 1 : le chat minimal utile au TCB.** Conversation, mémoire du club de base, 3 à 5 outils (brouillon de post, visuel, programmer, publier après validation), aperçu des posts dans le chat.

**Étape 2 et suivantes** : mémoire qui apprend des corrections, proactivité, généralisation multisport, connecteurs. Un lot à la fois.

## 6. Règles de travail (non négociables)

**Git**
- Ne jamais pousser sur `main`. Une branche par tâche (`assistant/<sujet>`), une PR par branche.
- Je suis le seul à fusionner. Une PR n'est proposée qu'après contradicteur, sécurité (si concerné) et relecteur final.
- Tests et `npm run build` doivent passer avant toute PR. Pas de tests désactivés pour faire passer.

**Environnement et argent**
- Aucun accès aux secrets de production. Le `.env` réel n'est pas dans le dépôt et ne doit jamais l'être. Travaillez avec une base PostgreSQL locale et des clés de test fournies dans l'environnement du bureau.
- Aucun déploiement, aucune action sur Vercel, Stripe en mode live, ou les vrais comptes Facebook/Instagram.
- Budget d'appels IA pendant le développement : respecter le plafond défini dans l'environnement du bureau ; s'il n'y en a pas, rester sous **5 € par jour** et le signaler dans le rapport.
- Aucune nouvelle dépendance sans justification écrite dans la PR. Changer de fournisseur de modèle IA est une DÉCISION SOLAL.

**Sécurité du produit**
- Isolation stricte entre clubs : chaque outil de l'agent vérifie côté serveur l'appartenance au club et à l'organisation.
- Résistance aux injections de prompt venant des fichiers, des pages Ten'Up et des messages.
- Aucune action irréversible (publier, supprimer, envoyer) sans confirmation explicite de l'utilisateur.
- Validation Zod des arguments de chaque outil.

**Qualité**
- Respecter `CLAUDE.md` : pas de fausses données, pas de TODO, pas de code factice, pas de refactor hors périmètre.
- Réutiliser l'existant avant de créer une abstraction.
- Interface simple pour un bénévole non technique : pas de jargon, pas de réglages en cascade.

## 7. Quand s'arrêter et m'attendre

Arrêtez la tâche concernée (et continuez sur une autre si possible) dès qu'il faut :
- une migration de base de données destructive ou qui supprime des colonnes ;
- toucher à la facturation Stripe, aux plans ou aux quotas ;
- changer l'authentification ou les droits entre organisations ;
- abandonner ou supprimer une fonctionnalité existante ;
- dépasser le budget IA ;
- deux agents restent en désaccord après une relecture.

Marquez-le « DÉCISION SOLAL » dans le rapport avec les options et votre recommandation.

## 8. Rapport quotidien (lisible sur téléphone)

Chaque jour, le chef de produit publie un rapport court :

```
TRIBUNES — rapport du <date>
Fait : <3 lignes max>
En cours : <tâche, branche>
PR prêtes à fusionner : <liens>
DÉCISION SOLAL : <question + options + recommandation>, ou « aucune »
Bloqué : <quoi et pourquoi>, ou « rien »
Coût IA du jour : <montant>
Demain : <prochaine tâche>
```

Pas de roman : si je dois lire plus de 30 secondes, c'est trop long.

## 9. Pour commencer

Démarrez l'étape 0. Premier rapport quand `docs/assistant-plan.md` est prêt, avec vos décisions à me soumettre.
