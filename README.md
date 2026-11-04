# AutoMath

Préparation au sous-test de calcul du TAGE MAGE (objectif 36–41/60) et calcul mental.
Séance du jour d'environ 20 minutes : échauffement, révisions espacées, notion du jour, défi chrono.

En ligne : https://ludwigundsuzanne.github.io/automath/

C'est une application web installable (PWA) : ouverte dans Chrome sur Android,
« Installer l'application » l'ajoute à l'écran d'accueil, en plein écran et hors ligne.

## Fichiers

- `index.html` : la structure des écrans.
- `js/gen.js` : chapitres, générateurs de questions (QCM à 5 réponses), automatismes et fiches méthode.
- `js/app.js` : accueil, séance du jour, chapitres, progrès, note estimée et révisions.
- `js/mental.js` : onglet Mental (carrés et tables).
- `css/base.css`, `css/app.css` : styles et charte.
- `manifest.webmanifest` : nom, couleurs et icônes de l'app installée.
- `sw.js` : service worker, pour le hors ligne et les mises à jour automatiques.
- `icons/` : icônes et favicon, issues du kit de logo AutoMath.

## Charte graphique

Bleu Réflexe `#2B59FF` (logo, actions, minuteur), Encre `#111317` (texte), Papier `#F6F4EF` (fond).
Police d'interface : Outfit. Le logo est dessiné : il est intégré en SVG dans `index.html`,
ne jamais réécrire le nom avec une police.

## Mettre à jour

Modifier les fichiers, puis publier (commit + push). Le service worker charge la nouvelle version
dès que le téléphone est en ligne ; la progression (stockée sur l'appareil) est conservée.
En cas de changement de la liste des fichiers mis en cache, augmenter `CACHE` dans `sw.js`.

## Vérifier les générateurs

```
node -e "console.log(require('./js/gen.js').selfTest())"
```

Puis la vérification indépendante des réponses (recalcul par énumération) :

```
node tools/verify.js
```

## Tester en local

```
python -m http.server 8766
```

puis ouvrir http://localhost:8766.
