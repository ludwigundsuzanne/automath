# AutoMath

Application de calcul mental : carrés de 1 à 20 et tables de 2 à 9.
Entraînement adaptatif, chrono 60 s et fiche de révision.

En ligne : https://ludwigundsuzanne.github.io/automath/

C'est une application web installable (PWA) : ouverte dans Chrome sur Android,
« Installer l'application » l'ajoute à l'écran d'accueil, en plein écran et hors ligne.

## Fichiers

- `index.html` : toute l'application (interface, styles, logique).
- `manifest.webmanifest` : nom, couleurs et icônes de l'app installée.
- `sw.js` : service worker, pour le hors ligne et les mises à jour automatiques.
- `icons/` : icônes et favicon, issues du kit de logo AutoMath.

## Charte graphique

Bleu Réflexe `#2B59FF` (logo, actions, minuteur), Encre `#111317` (texte), Papier `#F6F4EF` (fond).
Police d'interface : Outfit. Le logo est dessiné : il est intégré en SVG dans `index.html`,
ne jamais réécrire le nom avec une police.

## Mettre à jour

Modifier `index.html`, puis publier. Le service worker charge la nouvelle version
dès que le téléphone est en ligne ; la progression (stockée sur l'appareil) est conservée.
En cas de changement de la liste des fichiers mis en cache, augmenter `CACHE` dans `sw.js`.

## Tester en local

```
python -m http.server 8766
```

puis ouvrir http://localhost:8766.
