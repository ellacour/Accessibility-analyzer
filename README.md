# Clair — Accessibility Analyzer

Application web responsive en français, utilisable sur ordinateur, tablette et mobile. Première version fonctionnelle, sans compte ni API d’IA.

## Démarrage

Node.js 22 ou supérieur (validé sous Node 24).

```sh
npm ci
npm test
npm run check
npm start
```

Port 3000 par défaut ; `PORT` et `HOST` sont configurables. `npm run dev` relance le serveur à chaque modification. Aucun secret n’est requis.

## Fonctionnalités

- Import JPG / JPEG / PNG avec OCR français local, PDF textuel (40 pages maximum), DOC et DOCX. Taille maximale : 15 Mo. Une analyse simultanée par instance.
- Choix du profil, de l’âge (3–25 ans), du niveau scolaire et des besoins individuels.
- Synthèse, indice pondéré et rapport avec observations, recommandations et références cliquables.
- Version HTML de lecture segmentée, consultable et téléchargeable ; impression ou enregistrement PDF depuis le navigateur.
- Rapport téléchargeable en texte et lecture vocale via le navigateur.

Les documents sont traités en mémoire sans sauvegarde sur disque ni appel à un service d’IA externe. Les polices de l’interface utilisent Google Fonts avec repli sur Arial. L’OCR français est fourni par une dépendance npm et ne télécharge pas son modèle au moment de l’analyse.

## Méthode et limites

L’indice est le pourcentage pondéré des critères mesurés satisfaits. Les critères non mesurables sont affichés et exclus du calcul. Il ne représente **pas** un pourcentage de connaissances accessibles, une mesure de compréhension, un diagnostic ou une certification WCAG. Les seuils de longueur sont des heuristiques de conception, pas des lois neuroscientifiques.

Les profils TDAH et combiné pondèrent les consignes et la segmentation ; TSA, combiné et trouble du langage pondèrent le langage explicite ; la déficience visuelle pondère la taille des caractères lorsqu’elle est mesurable. Les besoins explicites attention/langage ajoutent ces pondérations. Les autres besoins guident la revue humaine : aucune mesure spécifique automatisée n’est encore disponible pour tous les profils. Le niveau scolaire est un contexte pour l’enseignant, pas une vérification automatique du programme.

Références : WCAG 2.2, Sweller (1988), Mayer & Moreno (2003), Diamond (2013), CAST UDL 3.0. Le rapport distingue ces cadres des heuristiques appliquées.

Les PDF scannés sans couche texte ne sont pas OCRisés : exporter leurs pages en JPG. Les tableaux, les images, la couleur, le contraste et l’ordre de lecture ne sont pas complètement analysés. L’adaptation conserve le texte extrait et le segmente ; elle ne réécrit pas le sens, ne conserve pas les illustrations et doit être validée avant distribution. La pertinence des contenus et les connaissances préalables exigent une revue enseignante.

Cette version est une application web mobile responsive, pas une application native publiée sur les stores. Pour une mise en production publique, ajouter authentification, quotas persistants, isolation des traitements, politique de conservation et supervision. Le serveur de développement n’est pas un déploiement de production.

## Vérification

`npm test` vérifie le calcul et l’échappement HTML. Les tests d’intégration couvrent l’API, les imports réels PDF/DOC/DOCX/JPG et les erreurs. Le parcours navigateur et les exports ont aussi été vérifiés sur ordinateur et mobile. Le corpus de validation scientifique et des essais auprès d’élèves restent à constituer.

## Audit des dépendances

Au moment de la validation : aucun avis de sévérité haute ou critique ; trois avis modérés transitifs associés à `sprintf-js` via `argparse` et Mammoth. Ce chemin concerne la CLI de Mammoth, que l’application n’utilise pas. Aucun correctif forcé rétrogradant Mammoth n’a été appliqué. Suivre les mises à jour amont avant une mise en production.
