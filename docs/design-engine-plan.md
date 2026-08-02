# Refonte du moteur de génération de visuels — d'un système de templates à un Design Engine

**Statut : document de réflexion et de plan architectural — aucun fichier du moteur actuel modifié, aucune migration créée, aucun commit effectué.**
Produit à partir d'un audit exhaustif du code existant (`architect`), le 2026-08-02.

---

## 1. Résumé exécutif

Le moteur de visuels actuel n'est pas un moteur de composition : c'est un **système de positionnement libre d'éléments pré-dessinés**, rendu à 100% côté navigateur en Canvas 2D. Trois sous-systèmes parallèles coexistent (Résultat de match, 7 types génériques, Tennis), chacun avec sa propre géométrie codée en dur dans de grandes fonctions `drawXxx()`. La "personnalisation" consiste à déplacer/redimensionner des blocs dont le contenu interne est figé — jamais à composer. Aucune génération de mise en page, aucune variation automatique, aucune notion de hiérarchie éditoriale par type de contenu.

Ce document :
1. synthétise l'audit factuel de l'existant et ses limites structurelles ;
2. pose les principes d'un vrai moteur de composition (Design Engine) ;
3. tranche le choix technologique le plus déterminant — le rendu ne peut pas rester en Canvas 2D navigateur si l'on veut une vraie hiérarchie typographique, une composition par contraintes et un rendu serveur automatisable ;
4. décrit l'architecture en couches indépendantes demandée (fond, grille, typographie, éléments graphiques, logo, informations, signature) et comment elles se combinent sans jamais sembler aléatoires ;
5. pose les fondations d'un Brand Kit extensible, sans sur-construire ce qui n'est pas encore utilisé ;
6. propose une trajectoire d'évolution à 5 ans ;
7. cadre un prototype isolé, sur branche dédiée, sans toucher au moteur actuel.

**Recommandation centrale, à valider avant implémentation** : passer d'un rendu Canvas 2D navigateur à un **rendu serveur déclaratif** (Satori → SVG → PNG). C'est le changement qui rend tout le reste possible — composition par contraintes, vraie hiérarchie typographique, cohérence garantie, et publication automatique (FULL_AUTO) qui fonctionne enfin sans dépendre d'un onglet navigateur ouvert. Détail et alternatives en §5.2.

---

## 2. Audit de l'existant

### 2.1 Rendu — 100% Canvas 2D navigateur, aucun rendu serveur

Tous les générateurs de visuels (`VisualGenerator.tsx` pour les résultats, les 6 `*VisualGenerator.tsx` génériques, `TennisVisualGenerator.tsx`) dessinent directement sur un `HTMLCanvasElement` via l'API Canvas 2D (`ctx.fillRect`, `ctx.fillText`, `ctx.drawImage`...), puis exportent avec `canvas.toDataURL()`/`canvas.toBlob()`. Le PNG final n'est **jamais produit côté serveur** — aucune dépendance de rendu image serveur n'existe dans `package.json` (pas de `sharp`, `canvas`, `satori`, `resvg`, `puppeteer`, `@vercel/og`). Les seules routes serveur liées aux visuels (`clubs/logo`, `clubs/background`) uploadent des fichiers bruts vers Supabase Storage, sans traitement.

**Conséquence produit non anodine** : le mode `FULL_AUTO` (publication automatique sans validation humaine, déjà implémenté) ne peut aujourd'hui produire un visuel que si le rendu a eu lieu dans un navigateur — il n'y a pas de mécanisme serveur pour regénérer l'image d'un post lors d'une publication automatisée. C'est un gap fonctionnel existant, indépendant de cette réflexion, mais qu'un moteur serveur résout naturellement.

### 2.2 Système de layout actuel — positionnement libre, pas composition

`lib/visualLayout.ts` (1284 lignes) concentre trois sous-systèmes :

- **Système Résultat** (`LayoutElement`/`VisualConfig`) : 9 types d'éléments fermés, coordonnées absolues x/y/w/h en pixels sur canevas 1080×1080 (post) / 1080×1920 (story). `drawElements()` est un grand switch où chaque type d'élément a sa géométrie interne câblée en dur (tailles de police, marges, offsets).
- **Système générique 7 types** (`PostVisualElement`/`PostVisualConfig`), canevas 1080×1350 (post — **incohérent avec les 1080×1080 du système Résultat**) / 1080×1920 (story) : 12 types de briques (`heading`, `paragraph`, `matchList`, `photo`, `statsBlock`...), une combinaison fixe de briques par type de contenu (`POST_VISUAL_CORE_ELEMENTS`), positions par défaut codées en dur (14 layouts figés au total), rendu dans `drawPostVisualElements()` — même logique de switch géant.
- **Système Tennis** (`TennisVisualGenerator.tsx`, 863 lignes) : entièrement séparé, paramétré par 6 presets de palette fixes (`sobre/pro/neon/glass/magazine/classique`), mise en page procédurale (pas de positionnement libre). C'est le sous-système le plus proche d'un langage graphique cohérent, mais fermé à 6 choix pré-écrits.

**Ce que ce système sait faire** : laisser un club déplacer/redimensionner/recolorer des blocs pré-dessinés (position, taille, police, opacité, rotation, ombre, avec snapping magnétique).
**Ce qu'il ne sait pas faire** : décider d'une composition, proposer des alternatives, adapter la hiérarchie visuelle au contenu, produire une variation contrôlée entre deux générations, garantir une cohérence de marque au-delà de la couleur.

### 2.3 Personnalisation existante

- `Club.visualConfig` / `Club.tennisVisualConfig` / `Club.postVisualConfigs` (Json) stockent des positions d'éléments par type — c'est un stockage de **résultat d'édition manuelle**, pas de préférences de design de haut niveau.
- `ClubPersonalizationOverride.visualConfig` existe en base mais semble non branché au rendu (à reconfirmer si repris).
- Aucune notion de "famille de direction artistique", de palette secondaire, de style graphique, de personnalité de marque.

### 2.4 Typographie

Une seule police chargée (Inter, via `<link>` classique, pas `next/font`), aucune hiérarchie typographique centralisée — chaque type d'élément a sa taille/graisse câblée en dur dans le code de dessin, seul levier utilisateur : un multiplicateur (0.4–2.5×) sur cette base fixe. 8 polices alternatives possibles par élément, toutes web-safe.

### 2.5 Photos utilisateur

Aucun traitement serveur (pas de crop interactif, pas de filtre). Toujours un "cover fit" automatique centré côté canvas. Le flux tennis, contrairement à l'hypothèse initiale, ne traite aucune photo utilisateur — il est 100% piloté par la donnée (scores, classements).

### 2.6 Couplage structurel

30 fichiers importent `lib/visualLayout.ts` : les 7+1 générateurs, les 3 éditeurs interactifs (drag & drop, resize, snapping), une dizaine de tabs d'orchestration, les vues de personnalisation/aperçu, et une sanitisation serveur côté `app/api/clubs/route.ts` (application des règles de plan). Toute l'UI de personnalisation actuelle est câblée sur les types exacts de ce fichier.

---

## 3. Limites structurelles identifiées

1. **Fusion décision/rendu.** Chaque brique "sait se dessiner elle-même" — la décision de composition (où, comment, avec quelle emphase) et le rendu pixel sont le même code. Impossible de faire varier l'un sans réécrire l'autre.
2. **Absence de modèle de hiérarchie.** Rien ne dit qu'un score est plus important qu'une date. La taille de police est un paramètre utilisateur, pas une décision du système fondée sur l'importance de l'information.
3. **Zéro variation algorithmique.** Le seul mécanisme de "variantes" est le choix manuel de 6 presets tennis. Rien ne génère automatiquement une composition différente à partir des mêmes données.
4. **Pas de notion de marque au-delà de la couleur.** Aucune "signature" persistante, aucun style graphique, aucune texture — la reconnaissance de marque repose entièrement sur le logo.
5. **Rendu client-only.** Bloque toute automatisation serveur fiable (FULL_AUTO), bloque tout contrôle fin de typographie (le Canvas 2D navigateur est un outil de dessin, pas un moteur de mise en page).
6. **Duplication de systèmes.** Trois moteurs parallèles (Résultat / 7-types / Tennis) avec des tailles de canevas incohérentes (1080×1080 vs 1080×1350) et aucun partage de logique de composition.

Ces limites ne sont pas des bugs à corriger une par une — elles découlent d'un même choix fondateur (positionnement manuel de blocs pré-dessinés, en Canvas 2D navigateur) qu'il faut remplacer, pas amender.

---

## 4. Principes directeurs du nouveau moteur

1. **Séparer QUOI, DÉCIDER et COMMENT.** Le contenu (les données) est indépendant des décisions de composition, qui sont indépendantes du rendu pixel. Trois couches, trois responsabilités, remplaçables indépendamment.
2. **La composition est une décision du moteur, pas une position que l'utilisateur pousse.** Le levier utilisateur se déplace : moins "je place ce bloc à x=340", plus "je choisis parmi ces variantes / j'ajuste les tokens de marque / je régénère".
3. **Variation maîtrisée, jamais aléatoire.** Une graine (seed) déterministe par contenu (ex. dérivée de l'id du match) garantit que régénérer le même contenu redonne un résultat stable, tout en assurant que deux contenus différents produisent des compositions différentes au sein de la même identité.
4. **Chaque type de contenu a sa propre hiérarchie visuelle**, déclarée comme donnée (un "blueprint" par type), pas comme code de dessin dédié.
5. **Le Brand Kit est un modèle de données pur**, indépendant du moteur de composition — extensible sans réécrire le moteur.
6. **Tout est additif et réversible.** Nouveau code, nouveau module, aucune modification du moteur actuel avant qu'une décision de bascule ne soit prise consciemment.

---

## 5. Architecture proposée — le Design Engine

### 5.1 Vue d'ensemble en 4 couches

```
Content Model  →  Brand Kit  →  Composition Engine  →  Renderer
   (quoi)          (identité)      (décisions)           (pixels)
```

- **Content Model** : les données brutes du post (score, adversaire, texte, photo...), déjà largement produites par le pipeline IA existant — pas de refonte nécessaire ici, seulement une normalisation légère par type.
- **Brand Kit** : l'identité visuelle du club, en données structurées et versionnées (voir §5.4).
- **Composition Engine** : reçoit `(Content, BrandKit, ContentType, Format, seed)` et produit une **Composition** — un arbre déclaratif de boîtes/texte/images avec leurs propriétés de mise en page (flex, tailles relatives, espacement), **pas encore des pixels**.
- **Renderer** : transforme une Composition en image. Couche volontairement "bête" — aucune décision, seulement du rendu.

Cette séparation est le vrai levier stratégique : elle permet de faire évoluer les décisions de composition (années 1 à 5) sans jamais retoucher le rendu, et inversement d'ajouter un jour un second renderer (vidéo, export imprimable) sans toucher aux décisions.

### 5.2 Choix technologique du rendu — décision à valider

C'est le choix le plus structurant de tout le document. Trois options réalistes :

**A — Rester en Canvas 2D navigateur, construire un petit moteur de layout par-dessus (flex-like, résolu en JS).**
Zéro nouvelle dépendance, zéro coût serveur. Mais reste bloqué côté client (FULL_AUTO non résolu), et réinvente un moteur de mise en page déjà résolu ailleurs — risque d'ingénierie pour un résultat plus pauvre.

**B — Rendu serveur déclaratif : Satori (Vercel) → SVG → PNG via `@resvg/resvg-js`.**
Satori prend un arbre JSX-like avec un sous-ensemble de CSS (flexbox, dégradés, `border-radius`, retour à la ligne et espacement typographique réels) et produit du SVG de façon déterministe, sans navigateur — c'est exactement ce qui alimente les images Open Graph de Vercel/Next.js (`next/og`) en production à grande échelle. `@resvg/resvg-js` convertit ensuite en PNG, rapide, léger, compatible fonctions serverless.
- Correspond nativement à la demande : flexbox = grille de composition, gestion réelle du texte = vraie hiérarchie typographique, rendu déterministe = cohérence garantie.
- Rend le rendu exécutable côté serveur → **résout le gap FULL_AUTO au passage**.
- Coût et latence faibles, pas de binaire lourd (contrairement à C) — cohérent avec l'exigence produit de coûts d'infrastructure prévisibles (déjà posée dans les instructions du projet).
- Limite : sous-ensemble CSS restreint (pas de vraie grille CSS, pas de filtres avancés) — largement suffisant pour un langage graphique éditorial/minimal de type Stripe/Linear/Vercel, qui est lui-même très majoritairement construit en flexbox.

**C — Navigateur headless (Playwright/Puppeteer), capture d'un rendu HTML/CSS complet.**
Fidélité CSS totale (vraie grille, filtres, blend modes). Mais lourd (binaire navigateur), lent au cold start en serverless, coûteux à l'échelle pour un moteur qui génère potentiellement des dizaines de visuels par club — à l'opposé de la contrainte de coûts prévisibles. À écarter pour un moteur de génération à volume, envisageable seulement pour un cas d'usage ponctuel (ex. export PDF haut de gamme rare).

**Recommandation : B.** C'est le seul choix qui coche à la fois "vrai moteur de composition", "coûts prévisibles" et "corrige un vrai gap produit existant (FULL_AUTO)". Le coût est un sous-ensemble CSS à respecter dans la conception des composants — acceptable pour le langage graphique visé (minimal, éditorial, beaucoup d'espace, peu d'éléments — précisément ce que flexbox fait bien).

*Point ouvert à trancher avant d'écrire le prototype : confirmer l'option B, ou indiquer une préférence différente.*

### 5.3 Content Model

Un type de contenu (`MatchResultContent`, `PlayerSpotlightContent`, ...) reste une donnée simple — ce qui existe déjà dans le pipeline de génération n'a pas besoin d'être repensé. La seule addition : un **Content Blueprint** par type, qui déclare la hiérarchie d'importance des champs (`hero`, `primary`, `secondary`, `tertiary`) au lieu de la coder dans une fonction de dessin. C'est ce blueprint que consomment les composers de typographie et de grille — c'est la traduction directe de "chaque type de contenu possède sa propre hiérarchie visuelle" en donnée plutôt qu'en code dupliqué par type.

Exemple (illustratif, pas un schéma final) :

```
MatchResultBlueprint = {
  hero: 'score',
  primary: ['opponent', 'result'],
  secondary: ['competition', 'date'],
  tertiary: ['venue'],
}
PlayerSpotlightBlueprint = {
  hero: 'photo',
  primary: ['playerName'],
  secondary: ['achievement'],
  tertiary: [],
}
```

### 5.4 Brand Kit — aujourd'hui minimal, pensé pour demain

Le Brand Kit est un modèle de données indépendant du moteur, versionnable, avec une distinction claire entre **ce qui est utilisé aujourd'hui** et **ce que le schéma réserve pour demain** — sans construire de logique inutilisée maintenant.

```
BrandKit = {
  // Utilisé dès le prototype
  logo: LogoAsset
  primaryColor: string
  secondaryColor: string
  signature: SignatureToken        // motif reconnaissable du club — voir §5.5

  // Réservé, schéma présent, non exploité en V1
  secondaryPalette?: string[]
  typography?: TypographyChoice
  graphicStyle?: 'minimal' | 'editorial' | 'bold' | ...
  personality?: PersonalityTokens  // ex. { energy: 0-1, formality: 0-1 }
  texture?: TextureToken
  patterns?: PatternToken[]
  shapeLanguage?: ShapeToken
  borderStyle?: BorderToken
  iconStyle?: IconToken
  photoTreatment?: PhotoTreatmentToken
}
```

Chaque champ non utilisé aujourd'hui a une valeur par défaut neutre dérivée des champs utilisés (ex. `graphicStyle` par défaut = la famille de direction artistique choisie au niveau du club ou du plan). Le moteur de composition doit lire `BrandKit` dans son intégralité dès le premier jour, même si la majorité des champs sont vides — ainsi, activer un nouveau facet plus tard ne demande **aucune** modification du Composition Engine, seulement de remplir le champ.

### 5.5 Composition Engine — les couches indépendantes et leur assemblage

Reprend exactement le pipeline demandé, comme des **composers** indépendants :

```
Background      → propose 2-4 variantes compatibles (fond uni, dégradé de marque, photo traitée, texture)
Grid            → propose une structure de grille (densité, marges, rythme) adaptée au format et au blueprint
Typography      → résout la hiérarchie (hero/primary/secondary/tertiary) en tailles/graisses réelles
GraphicElements → motifs, formes, séparateurs compatibles avec la famille de direction artistique
Logo            → placement + traitement (halo, fond, découpe) cohérent avec le Background choisi
Information     → assemble les champs du Content Model selon la Typography résolue
Signature       → insère le motif de reconnaissance du club (§ ci-dessous), toujours présent, jamais aléatoire
```

Chaque composer est une fonction pure `(content, brandKit, blueprint, family, seed) → variantes compatibles[]`. Un **Orchestrateur** résout l'ensemble :
1. filtre les variantes de chaque couche par compatibilité mutuelle (contraintes déclarées — ex. "cette variante de Background exige un texte clair" élimine les variantes de Typography en couleur sombre) ;
2. parmi les combinaisons restantes, sélectionne via une graine pseudo-aléatoire déterministe (dérivée de l'id du contenu), pondérée pour éviter de répéter la dernière combinaison utilisée par ce club (historique court conservé) ;
3. produit l'arbre de Composition final, consommé par le Renderer.

C'est ce mécanisme (filtrage par compatibilité + graine déterministe + anti-répétition) qui répond précisément à la demande : jamais deux visuels identiques pour deux contenus différents, jamais une sensation d'aléatoire, toujours la même identité.

**Familles de direction artistique** (Minimal, Editorial, Bold, Premium, Dynamic, Neo Sport) ne sont **pas du code séparé** — ce sont des jeux de paramètres (tokens de densité de grille, échelle typographique, générosité d'espacement, vocabulaire de formes) qui traversent les mêmes composers. Ajouter une 7ᵉ famille = ajouter un jeu de tokens, jamais une nouvelle branche de rendu.

**Signature de club** : un ou plusieurs motifs graphiques persistants (ligne, halo, forme, motif, angle, texture, rythme de grille), stockés dans `BrandKit.signature`, que le composer Signature est **obligé** d'intégrer dans toute composition, de façon cohérente avec la famille choisie mais jamais absente. En V1, un seul type de signature suffit (ex. une forme géométrique + un angle caractéristique) ; le schéma permet d'en enrichir la nature sans migration structurelle.

### 5.6 Renderer

Couche fine : reçoit l'arbre de Composition, le traduit en JSX Satori-compatible, produit le SVG, convertit en PNG via `@resvg/resvg-js`. Aucune décision de design ne doit fuiter dans cette couche — c'est le test de la bonne séparation.

---

## 6. Trajectoire d'évolution

- **V1 (ce prototype)** : 1 type de contenu (Résultat de match — le plus utilisé), 2 familles de direction artistique, Brand Kit minimal (logo + couleurs + 1 signature), rendu serveur Satori, variation par seed visible sur plusieurs générations du même type de contenu, comparable côté à côté avec le moteur actuel.
- **V2** : couverture des 8 types de contenu, 4 à 6 familles, le club peut choisir/orienter sa famille de direction artistique.
- **V3** : boucle de retour d'usage — suivre quelles variantes sont publiées telles quelles vs régénérées/rejetées, en tirer une pondération qui affine les choix de l'Orchestrateur dans le temps. C'est ici que se construit un avantage difficile à répliquer : de la donnée d'usage propriétaire, pas seulement du code.
- **V4** : Brand Kit pleinement exploité (texture, motifs, style d'icônes, traitement photo), personnalisation exposée comme réglages de "personnalité de marque" plutôt que positionnement manuel.
- **V5** : nouveaux renderers branchés sur le même arbre de Composition (variantes animées pour Stories/Reels, export imprimable) — possible sans retoucher les décisions, précisément parce que la séparation a été posée dès la V1.

---

## 7. Isolation et mise en œuvre du prototype

Conformément aux contraintes posées :

- **Nouvelle branche dédiée**, ex. `design-engine/prototype`, créée depuis `main` sans y revenir avant décision.
- **Nouveau module isolé** : `lib/designEngine/` (Content Model, Brand Kit, composers, orchestrateur) + `lib/designEngine/render/` (adaptateur Satori). **Zéro import depuis/vers `lib/visualLayout.ts`.**
- **Aucune modification de fichier existant** au sens strict pour la première itération : le prototype est exposé via une route/page interne non liée à la navigation normale (ex. `/dashboard/design-lab`, accessible seulement en connaissant l'URL, ou réservée à un compte admin), qui prend un club + un type de contenu + une seed et affiche côte à côte plusieurs générations du nouveau moteur.
- **Pas de migration Prisma pour le prototype** : pas de nouveau champ `Club`, pas de feature flag en base. Le flag est au niveau route/page — le plus simple à supprimer intégralement (suppression d'un dossier) si l'expérimentation n'est pas concluante. Un flag persistant (champ `Club`) ne sera envisagé que si le prototype est validé et qu'on prépare un vrai A/B en production.
- **Nouvelles dépendances additives uniquement** : `satori`, `@resvg/resvg-js`. Aucun impact sur le moteur actuel, suppression triviale si besoin (`npm uninstall`).
- **Le moteur actuel continue de fonctionner à l'identique** — aucun de ses fichiers n'est touché par ce chantier tant que la bascule n'est pas décidée.

## 8. Périmètre concret du prototype proposé

1. Content Model + Blueprint pour **Résultat de match** uniquement.
2. Brand Kit minimal : logo, `primaryColor`, `secondaryColor`, 1 signature simple (dérivée déterministiquement du club en attendant un choix explicite).
3. 2 familles de direction artistique contrastées (ex. **Minimal** et **Editorial**) pour bien démontrer que les familles partagent les composers mais parlent un langage différent.
4. Composers Background / Grid / Typography / Logo / Information / Signature, orchestrateur avec seed déterministe + anti-répétition sur un historique court.
5. Renderer Satori → SVG → `@resvg/resvg-js` → PNG.
6. Page interne `/dashboard/design-lab` (ou équivalent) : sélection d'un match existant, génération de 3-4 variantes visibles côte à côte pour un même contenu, afin de juger concrètement la variation maîtrisée et la qualité perçue face au moteur actuel.

## 9. Points ouverts

1. **Confirmer le choix technologique §5.2** (Satori + resvg, rendu serveur) avant d'écrire le prototype — c'est la décision qui conditionne tout le reste.
2. Le champ `ClubPersonalizationOverride.visualConfig` semble non branché au rendu actuel — à reconfirmer s'il devient pertinent pour le nouveau moteur.
3. Devenir des éditeurs manuels actuels (`VisualEditor`, `PostVisualEditor`, `TennisVisualEditor`) : hors périmètre de cette décision — ils continuent de servir le moteur actuel ; leur avenir sur le nouveau moteur (probablement : moins de positionnement pixel, plus de choix de variantes/réglages de marque) est un sujet de V2, pas du prototype.
