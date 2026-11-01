# Refonte du système de personnalisation Tribunes — "Identité du club / Brand Kit"

**Statut : document d'audit et de plan — aucun fichier applicatif modifié, aucune migration créée, aucun commit effectué.**
Produit par : audit `architect` + revue `security-reviewer` + contre-analyse `contrarian-reviewer` sur le dépôt réel, synthétisés et vérifiés le 2026-07-31.

---

## 1. Résumé exécutif

Tribunes dispose aujourd'hui d'une personnalisation minimale et partiellement cassée : 4 champs texte sur `Club` (`contentTone`, `customInstructions`, `bannedWords`, `signaturePhrase`), un logo, deux couleurs, et une config visuelle JSON par type de post (`postVisualConfigs`, 7 clés). Le pipeline de génération IA (quota → appel modèle → journalisation) est déjà bien centralisé dans `lib/services/postGeneration.ts` et réutilisé par 12 routes — ce n'est pas la partie cassée.

Deux bugs réels et un vrai manque produit ont été confirmés dans le code :
- Le sélecteur de ton n'a **aucun effet** sur les publications libres (CUSTOM_POST) à cause d'une confusion entre un champ texte libre et l'override de voix.
- Les publications libres n'ont **pas de visuel propre** : elles empruntent silencieusement le template "Annonce du club".
- Les `bannedWords` ne sont **jamais vérifiés après génération** — uniquement une consigne de prompt, sans garantie.

La vision produit demandée (Brand Kit complet : onboarding rejouable illimité, import de charte graphique et de références analysées par IA, historique de versions avec brouillon/comparaison, héritage à 4 niveaux, personnalisation par type pour tous les types, 6 presets, 11 sous-sections) est cohérente sur le principe mais **disproportionnée pour une V1**, pour trois raisons factuelles :
1. Le moteur de rendu visuel actuel est contraint à 7 templates fixes (`PostVisualKind`) — il ne peut pas honorer une promesse de "reproduction de charte/référence", ce qui rendrait l'analyse IA de charte trompeuse pour l'utilisateur.
2. Aucun chiffrage de coût/quota n'accompagne un "onboarding rejouable illimité" combiné à de l'analyse IA de fichiers — contraire à la contrainte projet de coûts IA maîtrisés.
3. Le persona déclaré ("responsable de club non technique") est mal servi par un héritage à 4 niveaux × 10 dimensions et 11 sous-sections d'interface.

**Recommandation** : livrer un **MVP B réduit** (voir §29-30) qui corrige les bugs, pose une fondation de données solide et propre (héritage à 2 niveaux, override par type réservé à CUSTOM_POST), et livre un onboarding rapide unique basé sur logo + preset + questionnaire court. Reporter en V2/V3 l'import de charte, l'analyse de références, le versionnement complet et l'extension de l'héritage — sous condition de demande utilisateur mesurée, pas d'anticipation.

---

## 2. Audit de l'existant

### 2.1 Frontend — personnalisation
| Fichier | Rôle réel | Constat |
|---|---|---|
| `app/dashboard/PersonnalisationView.tsx` | Page "Personnalisation" : logo, couleurs, `contentTone`, `customInstructions`, `bannedWords`, `signaturePhrase`, éditeurs visuels par type (`POST_VISUAL_TYPES`, 7 entrées) | Aucun `maxLength` sur les champs texte |
| `app/dashboard/ClubSettings.tsx` | Page "Mon Club" : nom, sport, `tenupUrl`, `clubProfile` | Séparée de la personnalisation éditoriale, poste sur la même route `/api/clubs` (payload partiel, pas de conflit observé) |
| `app/dashboard/CustomPostTab.tsx` | Formulaire "Publication libre" (CUSTOM_POST) | Duplique `MAX_FIELD_LENGTH = 200` côté client car composant client, commentaire explicite dans le code |
| `ToneSelector.tsx` | Sélecteur `''\|'FUN'\|'SOBER'` | Réutilisé à l'identique dans 8+ onglets et dans `PersonalizePostPanel.tsx` |

### 2.2 Génération — noyau commun (déjà centralisé, bonne base)
- `lib/services/postGeneration.ts` — `generatePlatformPosts()` : quota → appel OpenAI → découpage plateforme → statut initial. `toPostIds`, `findCachedPosts`, `deletePostsForRegenerate` pour la régénération. Utilisé identiquement par les 12 routes.
- `lib/personalization.ts` — `buildPersonalizationPrefix(club, overrideInstructions)` : empile `club.customInstructions` puis l'override ponctuel, injecte `bannedWords`/`signaturePhrase` en préfixe de prompt.
- `lib/voice.ts` — `getVoiceInstruction(voice)`, `CLUB_VOICES`.
- `lib/postTypes.ts` — registre `POST_TYPES` (10 entrées dont `CUSTOM_POST`), gère l'ownership multi-club générique (`clubOwnershipOr`) et les FK dynamiques par type. Déjà propre et générique — bonne fondation à réutiliser.

### 2.3 Routes de génération de posts — **12 routes IA réelles** (pas 13)
`app/api/posts/club-announcement`, `match-announcement`, `player-spotlight`, `engagement-poll`, `season-recap`, `generic/tournament`, `generic/weekly`, `tennis/tournament/generate`, `tennis/interclub/weekly`, `tennis/programme`, `tennis/interclub/result`, `custom-post`.
3 fichiers voisins ne génèrent **pas** de contenu IA : `tennis/interclub/matches` (liste), `tennis/tournament/parse` (parsing PDF), `tennis/interclub/result-input` (saisie score).

Pattern dupliqué ~12 fois (pas le cœur quota/IA, déjà centralisé) : `const voice = tone || club.contentTone`, `buildPersonalizationPrefix(...)`, bloc create/update+regenerate avec `posts: { create: [...] }`, puis `runAutomationSideEffects`.

### 2.4 Base de données (`prisma/schema.prisma`)
- `Club` (l.53-88) : `primaryColor`, `secondaryColor`, `logoUrl`, `visualConfig Json?`, `tennisVisualConfig Json?`, `postVisualConfigs Json?` (7 clés `PostVisualKind`), `contentTone String @default("STANDARD")`, `customInstructions String? @db.Text`, `signaturePhrase String?`, `bannedWords String? @db.Text`. Aucune contrainte de longueur. Pas de colonne `updatedAt`.
- `CustomPost` (l.255-269) : `objective`, `subject`, `keyInformation Json`, `callToAction`, `targetAudience`, **`tone String?`** (source du bug), `desiredPlatforms Json`, `suggestedCategory`.
- `GeneratedPost` (l.271-306) : une FK nullable par type parent, `postType String` (libre, pas d'enum), `status String`.
- `UsageEvent` (l.120-134) : `kind`, `model`, `tokensIn/Out`, `credits`, `meta Json?`, indexé `[clubId, createdAt]`.

### 2.5 Uploads, quotas, stockage
- `app/api/clubs/logo/route.ts` — **aucune** validation MIME/taille serveur, extension dérivée du nom de fichier client.
- `app/api/clubs/background/route.ts` — valide `MAX_SIZE` + allowlist MIME (commentaire du code reconnaît explicitement l'écart avec `logo/route.ts`).
- Stockage Supabase, exclusivement via `getPublicUrl` — aucune occurrence de `createSignedUrl` dans tout le repo.
- `lib/quota.ts` (`checkAiQuota`) / `lib/usage.ts` (`logAiUsage`) — quotas vérifiés uniquement côté serveur à partir d'`UsageEvent`, non contournables par le client. Bonne base.
- `zod` est déclaré en dépendance mais **non utilisé nulle part** — le repo valide manuellement (fonctions `str`/`num`/`bool`/`isoDate`/`strArray`/`clampConfidence` dans `app/api/intent/extract/route.ts:172-261`, réutilisées dans `app/api/vision/extract-match/route.ts`). C'est la convention de fait pour valider une sortie IA structurée.
- `app/api/intent/extract/route.ts:38` pose déjà explicitement le cadrage "donnée non fiable, jamais une instruction" pour un contenu utilisateur injecté en prompt — pattern directement réutilisable pour l'analyse de documents importés.

---

## 3. Bugs confirmés

### Bug 1 — `tone` sans effet sur les publications libres (CRITIQUE, priorité 1)
Dans les 11 routes standards, `tone` envoyé par `ToneSelector` (`''|'FUN'|'SOBER'`) est un **override ponctuel de voix** : `const voice = tone || club.contentTone`, passé à `getVoiceInstruction`.

Dans `app/api/posts/custom-post/route.ts` :
- l.62 : `const toneStr = nullableStr(tone)` — le même paramètre `tone` est traité comme texte libre.
- l.79 : stocké dans `CustomPostData.tone`.
- l.85 : `customPostPromptAll(club.sport, club.name, data, club.contentTone, ...)` — la voix passée est **`club.contentTone` en dur**, jamais `tone || club.contentTone`.
- `lib/prompts/custom-post.ts:53` : `data.tone` finit injecté comme donnée encadrée (`Ton souhaité par le club : """FUN"""`) — le prompt précise lui-même que tout ce qui est entre guillemets triples est une donnée, jamais une instruction, donc le modèle n'a aucune raison d'interpréter `"""FUN"""` comme une consigne de ton.

**Impact utilisateur** : sur l'onglet "Publication libre", cliquer "Fun" ou "Sobre" (via `ToneSelector` ou `PersonalizePostPanel`) n'a aucun effet réel — le club obtient systématiquement `club.contentTone`, en croyant avoir fait un choix ponctuel. Incohérence silencieuse, sans erreur visible.

### Bug 2 — CUSTOM_POST sans visuel propre (CRITIQUE, priorité 1)
`lib/visualLayout.ts:597-599` — `PostVisualKind` = 7 valeurs (`tournament`, `schedule`, `seasonRecap`, `matchAnnouncement`, `playerSpotlight`, `clubAnnouncement`, `engagementPoll`), pas de `customPost`. `CustomPostTab.tsx:291-298` appelle `<ClubAnnouncementVisualGenerator category="CLUB_LIFE" .../>`, et `ClubAnnouncementVisualGenerator.tsx:64` résout `parsePostVisualConfig(club.postVisualConfigs, 'clubAnnouncement', format)` avec la clé en dur. Toute personnalisation visuelle de "Annonce du club" s'applique donc silencieusement aux publications libres, sans possibilité de les distinguer.

### Bug 3 — `bannedWords` jamais vérifiés après génération (MOYEN, priorité 2)
`buildPersonalizationPrefix` (`lib/personalization.ts:24`) injecte `bannedWords` uniquement comme consigne de prompt. Aucune recherche/regex post-génération n'existe dans `postGeneration.ts` ni dans les 12 routes — un mot interdit peut apparaître dans le texte généré sans que rien ne le détecte.

### Bug 4 — Upload de logo sans validation serveur (MOYEN — également sécurité, voir §20)
`app/api/clubs/logo/route.ts:10-20` accepte tout `file.type` déclaré par le client, sans limite de taille, contrairement à `background/route.ts` qui applique déjà `MAX_SIZE` + allowlist. Écart documenté dans un commentaire du code lui-même.

---

## 4. Dette technique (hors bugs)

- Absence de limite serveur sur `customInstructions`/`bannedWords`/`signaturePhrase` (niveau `Club`) — contraste avec `custom-post/route.ts` qui applique `MAX_FIELD_LENGTH = 200` sur ses propres champs.
- Absence de `.trim()` systématique — une chaîne d'espaces est considérée non-vide et injectée telle quelle dans le prompt.
- Duplication du bloc CRUD create/update/regenerate à travers les 12 routes (pas le cœur quota/IA, qui est déjà centralisé) — `lib/postTypes.ts` connaît déjà `relation`/`parentIdField` par type, chaînon manquant pour généraliser ce bloc.
- Pas de colonne `updatedAt` sur `Club` — aucune notion de "dernière modification" exploitable pour un futur historique.
- `zod` déclaré mais inutilisé — écart de convention à trancher explicitement avant d'introduire une nouvelle validation structurée (analyse de charte) plutôt que de faire coexister silencieusement deux approches.

---

## 5. Vision produit (rappel, non modifiée)

> « Tribunes comprend l'identité de votre club une fois, puis chaque publication lui ressemble réellement. »

Deux dimensions : identité éditoriale (ton, énergie, humour, niveau institutionnel, longueur, emojis, CTA, expressions, terminologie, signatures) et identité visuelle (logos, couleurs, typographies, formes, densité, styles de titres, placement logo/sponsors, templates). Cette vision reste la cible ; ce document définit ce qui est réaliste de livrer en V1 vs ce qui doit être vérifié/chiffré avant d'être promis (voir §33).

---

## 6. Parcours rapide (V1 — voir wireframes §A)

Objectif : identité cohérente en quelques minutes, pour un responsable de club non technique.

Étapes retenues pour la V1 :
1. Import du logo principal (upload validé MIME/taille, réutilise/corrige `app/api/clubs/logo/route.ts`).
2. Détection automatique de couleur dominante — **traitement déterministe côté serveur** (lecture des pixels, pas d'appel modèle), correction manuelle possible.
3. Choix d'un preset visuel (3-4 presets en V1, voir §12) — affiche les conséquences avant application.
4. Questionnaire éditorial court (3-5 questions fermées : ton principal, niveau d'emojis, longueur, mise en avant préférée).
5. Expressions importantes / interdites (reprend les champs existants, avec limites désormais appliquées).
6. Aperçu de 2-3 publications types (rendu déterministe, pas d'appel IA — voir §16).
7. Validation finale (bouton "Activer cette identité").

Les curseurs/choix ne sont **jamais** injectés bruts dans les prompts : ils sont transformés côté serveur en instructions rédactionnelles déterministes (mapping fixe question → fragment de prompt), testables unitairement.

## 7. Parcours complet (reporté en V2/V3, conçu ici mais non développé en V1 — voir §33)

Le parcours complet (import de charte graphique PDF/image analysée par IA, import de 3-10 publications de référence analysées par IA, upload de logos multiples avec rôles, configuration 100% manuelle) est **conçu dans ce document** (wireframes §D-G) pour ne pas perdre le travail de conception, mais **non recommandé pour la V1** : le moteur de rendu actuel (7 templates fixes) ne peut pas honorer une promesse de reproduction de style, ce qui rendrait la fonctionnalité trompeuse tant qu'un vrai moteur de composition n'existe pas. Voir §33 pour le détail de l'objection.

Si développé ultérieurement, chaque méthode reste combinable et **ne s'applique jamais automatiquement** : toute proposition détectée par l'IA doit être validée explicitement par l'utilisateur avant d'écrire une configuration (brouillon → validation → application).

---

## 8. Onboarding rejouable

Accessible en permanence depuis un menu discret de la section Identité du club (voir wireframe §K). Relancer l'onboarding ne doit **jamais** écraser la configuration active :

1. la configuration actuelle reste active pendant tout le nouvel onboarding ;
2. Tribunes crée une **proposition distincte** (pas encore persistée comme active) ;
3. aperçu de la proposition, comparable à l'actif (V1 : aperçu côte à côte simple ; comparaison structurée détaillée reportée, voir §33) ;
4. choix explicite : appliquer / abandonner / conserver comme brouillon ;
5. l'ancienne configuration reste restaurable via l'historique (§25).

Limite anti-abus (à chiffrer avec le produit, proposition initiale) : pas de blocage dur du nombre de relances (c'est une action gratuite en soi), mais chaque relance qui déclenche une détection de couleur ou un appel modèle passe par les mêmes quotas/limites que toute autre opération IA (§27) — l'onboarding "illimité" porte sur le nombre de relances de l'UI, pas sur un nombre illimité d'appels IA.

---

## 9. Architecture de l'espace « Identité du club » (V1 réduite)

```
Identité du club
├── Vue d'ensemble        (état de config, éléments manquants, style/ton actifs, CTA aperçu, menu discret onboarding)
├── Logo et couleurs       (fusion Logos + Couleurs — un seul logo en V1, pas de multi-asset)
├── Ton éditorial et vocabulaire  (fusion Ton + Vocabulaire + Signatures)
├── Aperçus
└── Historique
```
5 sections en V1 (au lieu des 11 demandées) — Typographies, Style visuel séparé, Références importées, Types de publications sont soit reportés (charte/références, §33) soit intégrés ailleurs (override CUSTOM_POST directement dans son propre onglet existant, pas une section globale dédiée). Réextension possible si l'usage le justifie.

La vue d'ensemble affiche : état de configuration (complet/incomplet avec liste des manquants), style actif (preset + logo + couleurs), ton actif, accès "Tester le rendu" (aperçu), accès discret "Relancer la personnalisation".

---

## 10. Identité éditoriale (V1)

- **Ton principal** : réutilise `contentTone` existant (`STANDARD`/`FUN`/`SOBER`), pas d'extension à 8 valeurs en V1 (dynamique/chaleureux/institutionnel/etc. — reporté, cf. §33 sur-ingénierie pour le persona).
- **Dimensions secondaires (curseurs)** : reportées en V2 — non demandées par le persona non-com d'après la contre-analyse, ajouteraient de la complexité d'héritage sans valeur mesurée.
- **Consignes libres** : `customInstructions`, désormais avec limite serveur (proposition 1000 caractères, §21) et `.trim()`.
- **Vocabulaire** : `bannedWords` (désormais réellement vérifié, §22) conservé tel quel. Expressions à privilégier et terminologie officielle multi-catégories : reportées en V2 (le champ actuel ne les distingue pas ; les ajouter sans les faire respecter serait une nouvelle fausse promesse).
- **Signatures** : `signaturePhrase` conservé, une seule variante en V1 (pas de variante par type/plateforme, cf. §33).

## 11. Identité visuelle (V1)

Réglages retenus car déjà supportés ou à coût de développement faible sur `visualLayout.ts` :
| Réglage | Support actuel | Coût V1 |
|---|---|---|
| Palette (primaire/secondaire) | Supporté (`Club.primaryColor/secondaryColor`) | Aucun |
| Logo | Supporté (`logoUrl`) | Correction validation upload (§20) |
| Template par type visuel (`postVisualConfigs`) | Supporté (7 clés) | Ajout 8e clé `customPost` (§3 Bug 2) |
| Preset visuel (mapping vers palette/densité/placement) | Absent | Faible — mapping statique côté serveur |
| Typographies personnalisées, formes/arrondis fins, overlays, style photographique | Non supporté par `visualLayout.ts` sans développement du moteur | Élevé — reporté |

Ne pas exposer de réglage que le moteur ne peut pas appliquer réellement (contrainte explicite du produit) : la V1 se limite donc à palette, logo, template par type, preset.

## 12. Presets (V1 : 3-4, pas 6)

La contre-analyse note que sur un rendu contraint à 7 templates fixes, plusieurs des 6 presets demandés (Élégant/Institutionnel/Minimaliste notamment) risquent de ne différer que par couleur/police — différenciation douteuse. V1 recommandée : **Énergique, Institutionnel, Communautaire** (+ éventuellement Minimaliste si la palette de templates le permet clairement). Chaque preset définit : palette par défaut, densité, placement du logo, ton éditorial, longueur, niveau d'emojis — toutes des dimensions déjà supportées par le moteur actuel. Le changement de preset affiche ses conséquences (aperçu) avant application, jamais en un clic silencieux.

## 13. Personnalisation par type de publication (V1 : CUSTOM_POST uniquement)

La contre-analyse déconseille d'ouvrir l'override par type aux 5+ types dès la V1 (persona non-com, 12 routes déjà dupliquées en couche CRUD). V1 : réserver la table `ClubPersonalizationOverride` (§24) à `CUSTOM_POST`, qui en a un besoin réel documenté (bug tone + visuel manquant). Affichage explicite : « Style utilisé : Annonce du club — [Créer une variante pour les publications libres] » tant que l'override n'est pas défini. Extension aux autres types en V2 si l'usage le justifie.

## 14. Personnalisation ponctuelle (panneau « Personnaliser ce post »)

Reste un panneau compact, séparé du Brand Kit complet (déjà une bonne séparation UX, confirmée par la contre-analyse). Contenu selon type : voix (override ponctuel), longueur, emojis, consigne ponctuelle, signature on/off. Angle éditorial et disposition avancée : seulement si déjà supportés par le générateur du type concerné, sinon non affichés (principe §11). Action « Enregistrer ces réglages pour ce type de publication » : affiche exactement les champs qui deviendront permanents (écrit dans `ClubPersonalizationOverride` pour ce postType) et demande confirmation explicite. Séparation stricte : données métier du post / préférences éditoriales / options de génération / options visuelles — déjà largement respectée par la structure actuelle des routes (`CustomPostData` vs paramètres de génération), à formaliser dans les types partagés plutôt qu'à réinventer.

## 15. Logique d'héritage (V1 : 2 niveaux, pas 4)

```
Override ponctuel du post (paramètre de requête, non persisté)
→ Identité générale du club (Club.contentTone / customInstructions / bannedWords / signaturePhrase / postVisualConfigs)
```
Le niveau "override par type" (§13) s'ajoute uniquement pour CUSTOM_POST en V1 :
```
Override ponctuel > Override CUSTOM_POST (ClubPersonalizationOverride) > Identité générale du club > Défaut Tribunes
```
Fonction centralisée à créer, ex. `resolvePersonalization(club, postType, requestOverride)`, extension de `lib/personalization.ts`. `customInstructions` se concatène (comportement déjà présent dans `buildPersonalizationPrefix`), les autres champs (voix, signature) s'écrasent au niveau le plus spécifique non vide. L'interface indique pour chaque champ : valeur héritée vs personnalisée, avec action "Revenir à l'héritage".

L'héritage à 4 niveaux × 10 dimensions demandé initialement est explicitement écarté en V1 (illisible pour un non-technicien, incohérent avec le principe "simple pour les petits clubs" de CLAUDE.md) — réévaluable en V2 uniquement si l'usage de l'override CUSTOM_POST démontre une vraie demande d'extension.

## 16. Prévisualisation

V1 : aperçu déterministe (texte + visuel) généré côté serveur à partir d'un **jeu de données d'exemple stable** (fixture, pas les données réelles du club), sans appel IA — les changements de logo/couleur/preset se reflètent immédiatement via le même moteur de rendu que la publication réelle (`visualLayout.ts`), pas une simulation séparée. Le changement de texte (ton, longueur) nécessite une action explicite ("Régénérer l'aperçu texte") qui, elle, consomme un appel IA limité et comptabilisé (§27) — jamais déclenchée automatiquement à chaque frappe. Comparaison avant/après multi-variantes structurée : reportée (§33), V1 = un aperçu à la fois, régénérable.

## 17. Import de fichiers (conception — reporté en exécution, voir §33)

Pipeline conçu pour le jour où charte/références seraient développées :
upload → validation format (magic bytes, pas extension/MIME déclaré) → validation taille → stockage (bucket privé + URL signée, pas `getPublicUrl`, cf. §20) → extraction contenu → analyse IA avec cadrage "donnée non fiable" (pattern déjà présent dans `app/api/intent/extract/route.ts:38`) → validation structurée stricte de la sortie (introduire `zod`, décision explicite à trancher avant, cf. §4) → présentation de la proposition → correction utilisateur → application à un brouillon (jamais à la config active directement) → conservation ou suppression du fichier selon politique de rétention (§20).

Ne jamais faire confiance au nom de fichier, à l'extension, au type déclaré par le navigateur, ni au contenu produit par le modèle — repris du constat sécurité (§20).

## 18. Analyse des chartes graphiques — reporté (V2/V3)

Conception disponible (types MIME PDF/PNG/JPEG/WEBP, extraction palette/typo/logo/style/ton si présent) mais non développée en V1 : le moteur de rendu ne peut pas appliquer la majorité de ce qui serait détecté (typographie, style photographique, formes) sans développement du moteur de composition visuel — développer l'analyse avant le moteur produirait des propositions inapplicables. Prérequis avant reprise : chiffrage du coût par analyse (PDF multipages = plusieurs appels), quota par plan, et développement minimal du moteur pour au moins exploiter la palette détectée.

## 19. Analyse des publications de référence — reporté (V2/V3)

Même raisonnement que §18 : limite de 3-10 fichiers conçue, mais non développée tant que le moteur reste à 7 templates fixes. Les qualificatifs utilisateur ("ce sont nos publications", "ne pas copier exactement") sont à conserver dans la conception V2 pour éviter toute promesse de reproduction exacte.

---

## 20. Sécurité

### 20.1 Constats sur l'existant (revue security-reviewer)
| # | Constat | Sévérité | Action requise avant/pendant la refonte |
|---|---|---|---|
| 1 | Upload logo sans validation MIME/taille (`app/api/clubs/logo/route.ts:10-20`) | Moyenne | Aligner sur `background/route.ts` (allowlist + `MAX_SIZE`) — prérequis V1 |
| 2 | Validation MIME basée sur l'en-tête déclaré, pas les octets réels | Faible-Moyenne | Vérification magic bytes pour tout nouvel upload (charte notamment, V2) |
| 3 | Stockage exclusivement public (`getPublicUrl`, jamais `createSignedUrl`) | Faible aujourd'hui / Moyenne si reconduit | Bucket privé + URLs signées pour tout nouveau type de fichier confidentiel (charte, références) — prérequis avant V2/V3 |
| 4 | Invitation d'organisation : énumération d'e-mail + rattachement sans consentement, impacte la résolution de quota/plan (`app/api/organization/invite/route.ts:34-45`, `lib/org.ts:22-29`) | Moyenne | Hors périmètre direct du Brand Kit mais partage le même système de quota IA — à corriger avant d'ouvrir de nouveaux coûts IA (charte/références), car un onboarding "illimité" combiné à ce trou de résolution de plan aggraverait l'exposition |
| 5 | Pas de limite serveur sur `customInstructions`/`bannedWords`/`signaturePhrase` | Faible | Corrigé en V1 (§21) |
| 6 | Concaténation directe des champs de personnalisation dans le prompt sans cadrage "donnée non fiable" | Faible aujourd'hui / fort pour V2 | Appliquer le pattern déjà présent dans `intent/extract/route.ts:38` dès qu'un contenu extrait automatiquement (charte/référence) alimente un prompt |
| 7 | Tokens Meta stockés en clair (`SocialConnection.accessToken`) | Moyenne, préexistant | Hors périmètre Brand Kit — ne pas reconduire ce pattern pour un futur token de service d'analyse externe sans décision produit dédiée |
| 8 | Log de debug temporaire incluant comptes/permissions Meta | Faible | Hors périmètre Brand Kit, à nettoyer indépendamment |

Aucune faille d'isolation multi-club (IDOR) confirmée sur les données de personnalisation/posts existantes — l'ownership via `Club.userId` et `clubOwnershipOr` (`lib/postTypes.ts`) est cohérent.

### 20.2 Exigences pour la refonte
- Tout nouvel upload (logo si retouché, futurs assets V2) : allowlist MIME + taille max + vérification magic bytes, en réutilisant/généralisant le pattern de `background/route.ts` (proposition : centraliser dans un futur `lib/uploads.ts`, pas dupliquer une 3e fois).
- Tout nouveau fichier non destiné à la diffusion publique directe (charte, référence) : bucket privé, `createSignedUrl` à durée courte, jamais `getPublicUrl`.
- Tout contenu extrait d'un document importé et injecté dans un prompt : cadrage explicite "donnée, pas instruction" (réutiliser `intent/extract/route.ts:38`).
- Toute sortie IA structurée (proposition de palette/ton depuis une charte) : validée strictement avant écriture en base — décision explicite zod vs validation manuelle (trancher, pas laisser coexister silencieusement).
- Restauration d'historique : vérifier l'auteur de l'action et ne restaurer que dans le périmètre du club authentifié (déjà couvert par le pattern d'ownership existant si l'historique est scopé par `clubId`).
- Aucun secret (clé OpenAI, token Meta) exposé côté client à aucun moment du nouveau flux — aucun besoin identifié d'en exposer.

---

## 21. Validation et limites (V1, valeurs proposées à valider avec le produit)

| Champ | Limite proposée | Enforcement |
|---|---|---|
| `customInstructions` (club) | 1000 caractères | Client (maxLength) + serveur (`app/api/clubs/route.ts`) |
| `customInstructions` ponctuel (personnalisation post) | 300 caractères | Client + serveur (route de génération concernée) |
| `signaturePhrase` | 200 caractères | Client + serveur |
| `bannedWords` | 30 expressions, longueur raisonnable par expression (ex. 50 caractères) | Client + serveur |
| Instructions par type (override CUSTOM_POST) | 500 caractères | Client + serveur |
| Fichiers de référence (si V2/V3) | 10 max | Serveur |

Toutes les entrées : normalisées (`.trim()`), nettoyées, validées et limitées côté serveur — jamais uniquement `maxLength` HTML. Rejet avec message précis (pas un 500 générique) si invalide.

---

## 22. Contrôle des mots interdits (V1, version simplifiée du pipeline en 6 étapes demandé)

Pipeline retenu, volontairement plus simple que celui à 7 étapes avec correction automatique demandé initialement (éviter un moteur linguistique complexe pour la V1, conforme à la contrainte scope-control du projet) :
1. Générer le texte (inchangé).
2. Normaliser texte et expressions interdites (casse, accents, ponctuation) pour la comparaison.
3. Rechercher les expressions interdites (recherche de sous-chaîne normalisée, gestion basique des limites de mots pour éviter les faux positifs sur mots inclus dans d'autres mots).
4. Si détection : marquer le post généré avec un avertissement visible côté UI, **bloquer la publication automatique/programmée** tant que le club n'a pas édité ou régénéré le texte. Pas de correction automatique en V1 (risque de dénaturer le texte sans supervision) — reporté.
5. Journaliser l'événement (pour mesurer la fréquence réelle et décider si une correction auto vaut le coût de développement en V2).

---

## 23. Pipeline de génération centralisé

Ne pas fusionner les 12 routes en une route générique unique — la forme du parent Prisma diffère réellement par type (justification déjà documentée dans `postGeneration.ts`). Noyau commun à ajouter/étendre :
- Extension de `lib/personalization.ts` avec `resolvePersonalization(club, postType, requestOverride)` (§15), appelée par les 12 routes à la place du `const voice = tone || club.contentTone` dupliqué.
- Généralisation du bloc CRUD create/update/regenerate via une fonction paramétrée par le modèle Prisma cible, en s'appuyant sur les métadonnées déjà présentes dans `lib/postTypes.ts` (`relation`, `parentIdField`) — le chaînon manquant identifié par l'audit.
- Contrôle des mots interdits (§22) intégré comme étape systématique après génération dans `generatePlatformPosts`, pas réimplémenté par route.
- Migration progressive : corriger `custom-post/route.ts` en premier (bug prioritaire), puis migrer les 11 autres routes vers `resolvePersonalization` une à une avec tests de non-régression par route (pas un big-bang).

---

## 24. Modèle de données cible

**Approche retenue : hybride**, pas de refonte massive (comparaison ci-dessous).

| Approche | Simplicité | Validation | Migration | Recommandation |
|---|---|---|---|---|
| Colonnes supplémentaires sur `Club` uniquement | Haute | Faible (pas de contrainte par ligne) | Triviale | Insuffisant pour l'override par type |
| JSON structuré unique sur `Club` | Moyenne | Faible sans zod | Triviale | Risque de champ fourre-tout non typé |
| Tables dédiées normalisées | Faible (sur-ingénierie pour le volume réel) | Haute | Plus lourde | Excessif pour V1 |
| **Hybride (retenu)** | Haute | Moyenne-Haute | Additive uniquement | Conserve l'existant, ajoute le minimum |

Changements proposés :
- **Conserver** les colonnes scalaires actuelles sur `Club` comme identité générale par défaut (déjà consommées telles quelles par `buildPersonalizationPrefix`).
- **Ajouter** `Club.updatedAt` (absent actuellement).
- **Ajouter** une table `ClubPersonalizationOverride` : `clubId`, `postType` (aligné `lib/postTypes.ts`), champs éditoriaux optionnels, `visualConfigKind` (pour rattacher explicitement CUSTOM_POST à sa propre clé visuelle au lieu de `'clubAnnouncement'` en dur), `updatedAt`, contrainte `@@unique([clubId, postType])`. V1 : une seule ligne possible (CUSTOM_POST) par club, mais le modèle supporte nativement l'extension à d'autres types en V2 sans migration supplémentaire.
- **Ajouter** `PostVisualKind` : nouvelle valeur `customPost` (§3 Bug 2), `postVisualConfigs` supporte déjà des clés arbitraires par JSON, changement TypeScript principalement.
- **Ajouter** une table `ClubPersonalizationHistory` (append-only, jamais modifiée) : snapshot JSON des champs de personnalisation à chaque sauvegarde réussie, purge applicative au-delà de N entrées (proposition N=20) par club — pas de trigger SQL, pas de notion de "brouillon" séparé de l'actif en V1 (la proposition d'onboarding rejoué reste en mémoire/état de formulaire jusqu'à validation, pas persistée comme brouillon distinct tant que ce besoin n'est pas confirmé).

---

## 25. Versionnement

V1 : historique simple, append-only (`ClubPersonalizationHistory`, §24). Fonctionnalités couvertes : configuration active (toujours `Club` + `ClubPersonalizationOverride`), date de dernière modification (`updatedAt`), auteur si plusieurs membres existent (`userId` sur le snapshot, réutilise le modèle d'organisation existant), restauration (relire un snapshot, le repasser en `PATCH /api/clubs`), rétention par nombre d'entrées. Comparaison synthétique avant/après et notion de "brouillon" persistant distinct de l'actif : reportées (§33) — disproportionnées pour des clubs mono/bi-utilisateurs sans édition concurrente réelle.

---

## 26. Migration de l'existant

Additive uniquement, aucune perte de personnalisation :
- Les 4 champs `Club` existants (`contentTone`, `customInstructions`, `bannedWords`, `signaturePhrase`) restent en place tels quels, aucune transformation nécessaire — ils deviennent le niveau "identité générale" de la nouvelle chaîne d'héritage sans changement de valeur.
- `postVisualConfigs` existant reste valide ; l'ajout de la clé `customPost` est optionnelle (absence = fallback explicite affiché "Style utilisé : Annonce du club", jamais un crash).
- `ClubPersonalizationOverride` démarre vide pour tous les clubs — la résolution d'héritage retombe naturellement sur les valeurs `Club` existantes (comportement identique à aujourd'hui par défaut).
- Migration Prisma additive uniquement (`CREATE TABLE`, ajout de colonnes) — aucun `ALTER`/`DROP` destructif sur `Club`.
- Pas de période de double-écriture nécessaire (pas de champ renommé/déplacé), donc pas de rollback complexe : un rollback de la migration additive est un simple `DROP TABLE` sans perte sur `Club`.

---

## 27. Coûts et quotas

Traitements à garder déterministes (pas d'appel modèle) :
- Détection de couleur dominante du logo (lecture pixels côté serveur).
- Application d'un preset (mapping statique).
- Rendu de l'aperçu visuel (même moteur que la publication réelle).

Traitements nécessitant réellement un appel modèle en V1 : aucun nouveau au-delà de l'existant (régénération de texte d'aperçu, qui réutilise le quota de génération standard déjà comptabilisé par `checkAiQuota`/`logAiUsage`). Les traitements coûteux (analyse de charte PDF, analyse de références) sont reportés avec le reste du parcours complet (§18-19) — leur chiffrage précis (coût par page PDF, par image, quota par plan) est un prérequis explicite avant toute reprise, pas une tâche parallèle au développement (objection bloquante de la contre-analyse, §33).

---

## 28. Tests

**Unitaires** : `resolvePersonalization` (tous les cas d'héritage à 2 niveaux + niveau CUSTOM_POST), normalisation/trim, limites de longueur, détection de mots interdits (casse/accents/ponctuation/faux positifs), migration des anciennes valeurs (club sans override = comportement identique à avant).

**Intégration** : sauvegarde d'une identité (`/api/clubs`), création/activation d'un override CUSTOM_POST, restauration depuis l'historique, upload logo (rejet MIME/taille invalide), isolation multi-club (un club ne peut ni lire ni modifier l'override d'un autre club), génération avec override ponctuel sur `custom-post` (vérifier que le bug §3 Bug 1 est bien corrigé — test de non-régression explicite).

**End-to-end** : onboarding rapide complet, relance de l'onboarding sans écraser l'actif, activation d'une proposition, restauration d'une version précédente, création d'un CUSTOM_POST avec son propre visuel.

**Non-régression** : les 11 autres types de publication génèrent un résultat identique avant/après le refactor de `resolvePersonalization` (mêmes entrées → même voix/instructions qu'avant).

---

## 29. Comparaison des MVP

| | MVP A — Correction | MVP B — Brand Kit V1 (recommandé) | MVP C — Personnalisation complète | MVP D — Système avancé |
|---|---|---|---|---|
| Contenu | Fix tone/voix, limites, mots interdits, CUSTOM_POST visuel propre, pipeline partagé | A + onboarding rapide, presets (3-4), héritage 2 niveaux, override CUSTOM_POST, aperçu déterministe, historique simple, onboarding rejouable | B + import charte, import références, analyse IA, brouillons multiples, comparaison avant/après | C + suggestions auto, apprentissage, campagnes multiples, sponsors avancés |
| Risque technique | Faible | Faible-Moyen | Élevé (moteur de rendu à faire évoluer, coûts IA à chiffrer) | Élevé |
| Cohérence avec le moteur actuel (7 templates) | Totale | Totale | Partielle — nécessite développement du moteur pour ne pas être trompeur | Dépend de C |
| Cohérence persona non-technique | Totale | Totale | Risque de complexité perçue | Risque élevé |

## 30. MVP recommandé

**MVP B — Brand Kit V1**, tel que détaillé dans les sections §6, §9-16, §21-25 de ce document. Ne pas sélectionner MVP C/D en l'état : ils reposent sur une capacité de reproduction visuelle que le moteur actuel ne peut pas honorer, et sur des coûts IA non chiffrés — un déploiement en l'état violerait deux principes explicites du projet (simplicité pour petits clubs, coûts IA maîtrisés).

---

## 31. Roadmap

| # | Étape | Objectif | Dépendances | Complexité | Fichiers principaux |
|---|---|---|---|---|---|
| 1 | Fix bug tone/voix CUSTOM_POST | Corriger un bug utilisateur actif | Aucune | Faible | `app/api/posts/custom-post/route.ts`, `lib/prompts/custom-post.ts` |
| 2 | Limites + normalisation serveur | Éviter coûts IA non maîtrisés | Aucune | Faible | `app/api/clubs/route.ts` |
| 3 | Validation upload logo | Fermer l'écart sécurité documenté | Aucune | Faible | `app/api/clubs/logo/route.ts` |
| 4 | Contrôle réel des mots interdits | Tenir la promesse existante | 1 | Moyenne | `lib/services/postGeneration.ts` |
| 5 | Visuel propre CUSTOM_POST | Lever la dette Bug 2 | Aucune | Moyenne | `lib/visualLayout.ts`, `ClubAnnouncementVisualGenerator.tsx`, `CustomPostTab.tsx` |
| 6 | Modèle de données (`ClubPersonalizationOverride`, `ClubPersonalizationHistory`, `updatedAt`) | Fondation du reste | 1-5 | Moyenne | `prisma/schema.prisma` + migration |
| 7 | `resolvePersonalization` + migration progressive des 12 routes | Centraliser l'héritage | 6 | Moyenne-Élevée | `lib/personalization.ts`, 12 routes |
| 8 | Onboarding rapide (logo → couleur → preset → questionnaire → aperçu) | Cœur de la promesse produit | 2, 3, 6 | Élevée | nouveau flux dashboard |
| 9 | Espace "Identité du club" réduit (5 sections) | Regrouper la personnalisation | 8 | Moyenne | refonte `PersonnalisationView.tsx` |
| 10 | Presets (3-4) | Point d'entrée rapide | 6, 9 | Moyenne | nouveau mapping serveur |
| 11 | Override CUSTOM_POST dans l'UI | Fermer la boucle héritage | 6, 7 | Moyenne | UI dédiée dans l'onglet CUSTOM_POST |
| 12 | Panneau "Personnaliser ce post" (ajustements) | UX ponctuelle | 7 | Faible-Moyenne | `PersonalizePostPanel.tsx` |
| 13 | Aperçu déterministe multi-exemples | Réduire coûts, accélérer itération | 9, 10 | Moyenne | fixture de données + réutilisation du moteur de rendu |
| 14 | Historique + restauration simple | Filet de sécurité onboarding rejouable | 6 | Faible-Moyenne | `ClubPersonalizationHistory` |
| 15 | Onboarding rejouable (comparaison simple, application/abandon) | Confiance utilisateur | 8, 14 | Moyenne | flux existant + historique |
| 16 | Bêta interne | Validation avant généralisation | 1-15 | — | — |
| 17 | Instrumentation (métriques §32) | Mesurer avant d'étendre | 16 | Faible | événements analytics existants |
| — | *(V2/V3, non planifié ici)* Import charte, import références, analyse IA, comparaison avant/après détaillée, héritage 4 niveaux, extension override aux autres types | Sous réserve de chiffrage et de développement du moteur de rendu | 1-17 | Élevée | voir §18-19, §33 |

---

## 32. Métriques de succès

Taux de démarrage/complétion de l'onboarding rapide, temps moyen de configuration, taux d'import du logo, taux d'utilisation d'un preset vs configuration manuelle, taux d'utilisation de l'override CUSTOM_POST, taux d'utilisation du panneau "Personnaliser ce post", taux de relance de l'onboarding, taux d'activation d'une nouvelle proposition après relance, nombre moyen de régénérations d'aperçu, taux de posts bloqués par un mot interdit détecté (pour calibrer la V2 du contrôle), taux de validation du premier post généré après onboarding. Éviter les métriques de vanité (nombre de vues de la page Identité du club sans action).

---

## 33. Critique contradictoire (synthèse de la contre-analyse)

Voir le rapport complet de l'agent contrarian-reviewer pour le détail ; résumé des objections retenues et intégrées dans ce plan :

**Bloquantes (intégrées en report V2/V3, pas en V1)**
1. Import de charte/références analysés par IA : le moteur ne rend que 7 templates fixes — promettre une "reproduction de style" serait trompeur. Reporté jusqu'à développement du moteur de composition.
2. Coûts IA non chiffrés pour un "onboarding illimité" combiné à de l'analyse de fichiers — contraire à la contrainte de coûts maîtrisés. Chiffrage exigé avant toute reprise de §18-19.
3. Bucket public reconduit pour des fichiers plus sensibles — corrigé par l'exigence bucket privé/URL signée dès que ces flux seraient développés (§20.2).

**Importantes (intégrées en réduction de scope V1)**
4. Parcours complet trop long pour le persona non-com → V1 = parcours rapide uniquement.
5. Héritage à 4 niveaux × 10 dimensions illisible → V1 = 2 niveaux (+ CUSTOM_POST).
6. Personnalisation par type pour 5+ types → V1 = CUSTOM_POST uniquement.
7. Système de versions complet (brouillon/comparaison/restauration riche) disproportionné → V1 = historique append-only simple.
8. 6 presets sur un rendu à 7 templates, différenciation douteuse → V1 = 3-4 presets.
9. Prévisualisation "instantanée" à vérifier avant promesse → V1 = rendu déterministe via le moteur existant, régénération texte explicite.
10. Volume de fichiers (multi-logos + charte + références) sans validation/rétention définies → non ouvert en V1 (un seul logo, validation déjà exigée en §3 Bug 4/§20).

**Éléments confirmés à ne pas couper** (contrepoint honnête de la contre-analyse) : fix bug tone/voix, visuel propre CUSTOM_POST, contrôle réel des mots interdits, modèle hybride de données, panneau "Personnaliser ce post" séparé, presets + questionnaire court comme point d'entrée principal — tous repris tels quels dans ce plan.

---

## 34. Liste des fichiers concernés (V1)

| Fichier | Type de changement |
|---|---|
| `prisma/schema.prisma` | Modification — `ClubPersonalizationOverride`, `ClubPersonalizationHistory`, `Club.updatedAt` |
| nouvelle migration `prisma/migrations/xxxx_.../migration.sql` | Nouveau (généré) |
| `lib/personalization.ts` | Modification — `resolvePersonalization()` |
| `lib/postTypes.ts` | Modification mineure — dérivation du nom de table d'override |
| `app/api/posts/custom-post/route.ts` | Modification — correction Bug 1 |
| `lib/prompts/custom-post.ts` | Modification — retrait/renommage de `CustomPostData.tone` |
| `app/dashboard/CustomPostTab.tsx` | Modification mineure |
| `app/api/clubs/route.ts` | Modification — limites/trim serveur, endpoint override CUSTOM_POST |
| `app/api/clubs/logo/route.ts` | Modification — validation MIME/taille |
| `app/dashboard/PersonnalisationView.tsx` | Modification substantielle — espace Identité du club réduit |
| nouveau composant onboarding rapide | Nouveau fichier |
| nouveau composant historique/restauration | Nouveau fichier |
| `lib/visualLayout.ts` | Modification — `PostVisualKind` + `customPost` |
| `app/dashboard/ClubAnnouncementVisualGenerator.tsx` | Modification — découplage CUSTOM_POST |
| `lib/services/postGeneration.ts` | Modification — intégration contrôle mots interdits |
| 11 routes de génération restantes | Modification progressive — migration vers `resolvePersonalization` |

## 35. Migrations envisagées

Une migration Prisma additive (§24/§26) : ajout de `Club.updatedAt`, création de `ClubPersonalizationOverride` et `ClubPersonalizationHistory`. Aucune modification/suppression de colonne existante. Vérification post-migration : `prisma migrate status` + requête de contrôle confirmant `ClubPersonalizationOverride` vide et aucun club existant affecté dans son comportement de génération (test de non-régression §28).

## 36. Risques bloquants

- Chiffrage de coût IA manquant pour tout ce qui dépasse le MVP B — bloquant pour toute reprise de §18-19, pas pour le MVP B lui-même (qui n'introduit aucun nouvel appel modèle).
- Décision produit non tranchée : le champ `CustomPostData.tone` doit-il être supprimé ou conservé sous un autre nom avec un usage distinct du `ToneSelector` ? Nécessaire avant d'implémenter le fix Bug 1 (roadmap #1).
- Décision produit non tranchée : CUSTOM_POST doit-il obtenir un vrai `PostVisualKind` dédié ou seulement une meilleure UI de transparence sur le partage actuel ? Ce document recommande le visuel dédié (§3 Bug 2, §24) mais c'est un choix produit à confirmer.
- Le bug de résolution de plan/quota via l'invitation d'organisation (§20.1 #4) n'est pas dans le périmètre du Brand Kit mais partage le système de quota — recommandé de le corriger avant d'augmenter la surface de coûts IA, même si ce n'est pas un blocage direct du MVP B.

## 37. Décision finale

**Périmètre validé pour proposition d'implémentation : MVP B — Brand Kit V1**, roadmap étapes 1 à 17 (§31). Le parcours complet (import charte/références, héritage 4 niveaux, système de versions riche) est documenté dans ce plan (§7, §17-19, wireframes §D-G) mais explicitement reporté, sous réserve de chiffrage de coûts et de développement préalable du moteur de rendu visuel. Aucune implémentation ne démarre sans validation explicite de ce document par le fondateur.

---

## Wireframes textuels

### A — Choix rapide ou complet (première configuration)
```
┌─────────────────────────────────────────────────┐
│  Configurons l'identité de votre club            │
│                                                    │
│  ┌───────────────────┐   ┌───────────────────┐  │
│  │  ⚡ Rapide          │   │  🎨 Complète        │  │
│  │  5 minutes         │   │  Pour aller plus loin│  │
│  │  Logo + couleurs + │   │  (bientôt disponible)│  │
│  │  quelques questions│   │                      │  │
│  │  [Commencer]       │   │  [Bientôt disponible]│  │
│  └───────────────────┘   └───────────────────┘  │
└─────────────────────────────────────────────────┘
```
*(En V1, seul le parcours rapide est actif — la carte "Complète" reste visible mais désactivée, pour ne pas promettre une fonctionnalité non livrée.)*

### B — Onboarding rapide
```
Étape 1/6 — Logo
[Zone de dépôt du logo]              ●○○○○○
"Formats acceptés : PNG, JPG — 2 Mo max"
[Suivant]

Étape 2/6 — Couleurs détectées
Couleur principale détectée : ■ #1A2B3C  [Modifier]
Couleur secondaire détectée : ■ #FFFFFF  [Modifier]
[Précédent] [Suivant]

Étape 3/6 — Style
( ) Énergique   ( ) Institutionnel   ( ) Communautaire
Aperçu du style sélectionné : [miniature]
[Précédent] [Suivant]

Étape 4/6 — Ton
Vos publications sont plutôt :
( ) Conviviales  ( ) Énergiques  ( ) Sobres
Emojis : ○──●───○ (peu → beaucoup)
Longueur habituelle : ○──●───○ (courte → détaillée)
[Précédent] [Suivant]

Étape 5/6 — Expressions
Expressions à privilégier (optionnel) : [ + Ajouter ]
Expressions à ne jamais utiliser (optionnel) : [ + Ajouter ]
[Précédent] [Suivant]

Étape 6/6 — Aperçu
[Aperçu annonce de match] [Aperçu résultat] [Aperçu publication libre]
"Ceci est un exemple avec des données de démonstration"
[Précédent] [Activer cette identité]
```

### C — Espace « Identité du club » (V1)
```
┌─ Identité du club ──────────────────────────────┐
│ Vue d'ensemble | Logo & couleurs | Ton & vocabulaire | Aperçus | Historique │
├──────────────────────────────────────────────────┤
│ État : ✓ configuré           [Tester le rendu]   │
│ Style actif : Communautaire   Ton actif : Fun     │
│ Logo : ✓   Couleurs : ✓ ■■                        │
│ Publications libres : héritent du style général   │
│   [Créer une variante pour les publications libres]│
│                                                    │
│                                    ⋯ [Réglages avancés] │ ← menu discret
└──────────────────────────────────────────────────┘
```

### D — Onboarding complet *(conception V2/V3, vue d'ensemble du parcours)*
```
Personnalisation complète — construisez votre identité

Choisissez une ou plusieurs méthodes (combinables) :
☐ Importer une charte graphique         → voir wireframe E
☐ Importer des publications de référence → voir wireframe F
☐ Ajouter vos logos et éléments de marque (principal, sombre, symbole, sponsors)
☐ Tout configurer manuellement (couleurs, polices, formes, ton, vocabulaire)

Progression : ●●○○○○  (sauvegarde automatique à chaque étape)
[Reprendre plus tard] [Étape suivante]

──── Enchaînement type si "Charte" + "Références" sont cochées ────
1. Import charte (E) → proposition détectée
2. Import références (F) → proposition détectée
3. Validation fusionnée des éléments détectés (G) — un seul écran
   récapitule couleurs/typo/ton, quelle que soit leur origine
4. Ajout des logos et rôles
5. Aperçu multi-publications (comme le parcours rapide, étape 6)
6. [Enregistrer comme brouillon] [Activer cette identité]
```
*(Ce parcours reste au stade de conception : non développé en V1, cf. §7 et §33 — dépend du chiffrage des coûts d'analyse et d'une évolution du moteur de rendu avant de pouvoir tenir la promesse de fidélité visuelle.)*

### E — Import de charte graphique *(conception V2/V3, non développé en V1)*
```
Importer votre charte graphique
[Déposer un PDF, PNG, JPEG ou WEBP — max 20 Mo]
Analyse en cours... (peut prendre jusqu'à 30 secondes)

Éléments détectés — à valider un par un :
Couleurs : ■ #1A2B3C ✓  ■ #F4B400 ✓  ■ #FFFFFF ✗ [ignorer]
Typographie : "proche de Montserrat" (équivalent proposé, pas garanti identique)
Ton détecté (si texte présent) : "institutionnel" [Appliquer] [Ignorer]
⚠ Ceci est une proposition. Rien n'est appliqué sans votre validation.
[Tout ignorer] [Créer un brouillon avec les éléments validés]
```

### F — Import de publications de référence *(conception V2/V3)*
```
Vos publications de référence (3 à 10)
[+ Ajouter une publication]  (2/10 ajoutées)

Pour chaque publication :
"D'où vient cette publication ?"
( ) C'est une de nos publications
( ) On aime ce style mais ce n'est pas de notre club
"Que doit-on en retenir ?"
( ) S'en inspirer largement   ( ) Reprendre juste quelques idées
⚠ Nous ne reproduisons jamais une création à l'identique — nous en tirons des règles générales compatibles avec nos modèles.
[Analyser mes références]
```

### G — Validation des éléments détectés *(V2/V3, générique charte/références)*
```
Proposition issue de l'analyse — rien n'est encore actif

┌─ Palette ──────────┐  ┌─ Ton ──────────────┐
│ ■ ■ ■  [Modifier]   │  │ Institutionnel      │
│ [✓ Garder] [✗ Rejeter] │ [✓ Garder] [✗ Rejeter] │
└────────────────────┘  └────────────────────┘

[Comparer avec la configuration actuelle]   [Appliquer la sélection] [Enregistrer comme brouillon]
```

### H — Personnalisation d'un type de publication (CUSTOM_POST, V1)
```
Publications libres
Style visuel utilisé : Annonce du club (hérité)
[Créer une variante pour les publications libres]

──── si variante créée ────
Ton : ( ) Hérité du club  (●) Personnalisé → [Fun ▾]
Signature : ( ) Héritée  (●) Personnalisée → [désactivée]
Instructions spécifiques : [zone de texte, 500 caractères max]
[Revenir à l'héritage] [Enregistrer]
```

### I — Panneau « Personnaliser ce post » (personnalisation ponctuelle)
```
┌─ Personnaliser ce post ─────────────┐
│ Voix :  ○ Standard  ● Fun  ○ Sobre   │
│ Longueur : court ──●──── détaillé    │
│ Emojis : peu ──●──── beaucoup        │
│ Consigne ponctuelle : [_________]    │
│ Signature : ☑ afficher               │
│                                       │
│ [Régénérer avec ces réglages]        │
│ ☐ Enregistrer ces réglages pour ce type de publication │
│    (s'appliquera à toutes les futures publications libres) │
└───────────────────────────────────────┘
```

### J — Comparaison avant/après *(V1 simplifiée — comparaison riche reportée en V2)*
```
Nouvelle proposition (onboarding relancé)

┌─ Actuel ──────────┐    ┌─ Proposition ─────┐
│ Style : Communautaire│  │ Style : Énergique  │
│ ■ ■ (couleurs)       │  │ ■ ■ (couleurs)     │
│ Ton : Fun            │  │ Ton : Standard     │
└──────────────────────┘  └────────────────────┘

[Abandonner] [Enregistrer comme brouillon] [Activer la proposition]
```

### K — Menu discret de relance de l'onboarding
```
Identité du club > Vue d'ensemble
                                          [⋯ Réglages avancés ▾]
                                          ├ Relancer la personnalisation rapide
                                          ├ Modifier uniquement le ton
                                          ├ Modifier uniquement les visuels
                                          ├ Repartir d'un preset
                                          └ Voir l'historique
```

---

*Fin du document. Aucune action d'implémentation, de migration ou de commit n'a été effectuée. En attente de validation explicite avant toute exécution.*
