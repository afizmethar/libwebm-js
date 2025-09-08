# libwebm-js Worker Environment Tests

Ce répertoire contient des tests spécialisés pour valider le fonctionnement de libwebm-js dans les environnements worker (Web Workers, Cloudflare Workers, Service Workers, etc.).

## Fichiers de test

### `worker-environment-tests.js`
Suite de tests complète pour les environnements worker, incluant :
- Détection d'environnement
- Initialisation de la bibliothèque
- Tests des utilitaires WebM
- Tests du parser minimal
- Tests du muxer
- Tests des contraintes mémoire (64MB)
- Tests de gestion d'erreurs

### `worker-test-runner.html`
Interface web pour exécuter les tests dans un navigateur avec :
- Interface utilisateur moderne
- Indicateurs de progression en temps réel
- Résumé des résultats
- Support pour les Web Workers

### `cloudflare-worker-tests.js`
Tests spécialisés pour Cloudflare Workers avec :
- Format de réponse JSON pour l'intégration CI/CD
- Tests d'environnement Cloudflare spécifiques
- Gestion des contraintes de Cloudflare Workers

## Comment exécuter les tests

### Dans un navigateur

1. Ouvrez `worker-test-runner.html` dans votre navigateur
2. Les tests se lanceront automatiquement au chargement de la page
3. Ou cliquez sur "Run All Tests" pour les relancer

### Dans un Web Worker

```javascript
import WorkerEnvironmentTests from './worker-environment-tests.js';

const tests = new WorkerEnvironmentTests();
const success = await tests.runAllTests();
console.log('Tests passed:', success);
```

### Dans Cloudflare Workers

1. Déployez `cloudflare-worker-tests.js` sur Cloudflare Workers
2. Accédez à l'URL `/test` pour exécuter les tests
3. Les résultats sont retournés au format JSON

## Tests inclus

### 1. Environment Detection (Détection d'environnement)
- Vérifie que l'environnement worker est correctement détecté
- Confirme l'absence d'APIs Node.js
- Valide la disponibilité des APIs Web Worker

### 2. Library Initialization (Initialisation de la bibliothèque)
- Teste l'initialisation de libwebm-js
- Vérifie la disponibilité de toutes les APIs requises
- Confirme le mode worker

### 3. WebM Utils (Utilitaires WebM)
- Teste la détection de codecs supportés
- Valide les fonctions de conversion temps
- Vérifie les listes de codecs

### 4. Minimal Parser (Parser minimal)
- Teste la création de parser à partir de buffer
- Valide l'analyse des en-têtes
- Teste la gestion d'erreurs

### 5. Muxer Functionality (Fonctionnalités du muxer)
- Teste la création de muxer
- Valide l'ajout de pistes
- Teste l'écriture de frames
- Vérifie la finalisation de fichiers

### 6. Memory Constraints (Contraintes mémoire)
- Teste les limites de 64MB
- Valide la gestion de gros buffers
- Teste les erreurs de mémoire

### 7. Error Handling (Gestion d'erreurs)
- Teste avec des buffers invalides
- Valide les messages d'erreur
- Teste la robustesse

## Résultats attendus

Tous les tests devraient passer dans un environnement worker correctement configuré :

```
🧪 Running Worker Environment Tests
=====================================
✅ Environment detected: 1 environment(s)
✅ No Node.js require() function (expected in worker)
✅ libwebm-js initialized successfully
✅ Worker mode enabled
✅ Property WebMErrorCode available
✅ Property WebMTrackType available
✅ Property WebMUtils available
✅ Property WebMFile available
✅ Property WebMParser available
✅ Property WebMMuxer available
✅ VP8 video codec support detected
✅ Opus audio codec support detected
✅ Time conversion functions working
✅ Parser created successfully from minimal WebM buffer
✅ Parser headers parsed
✅ Muxer created successfully
✅ Video track added with ID: 1
✅ Audio track added with ID: 2
✅ Video frame written
✅ Audio frame written
✅ WebM file finalized, size: 1234 bytes

📊 Test Results: 25/25 tests passed
🎉 All worker environment tests passed!
```

## Dépannage

### Erreur "libwebm-js not initialized"
- Vérifiez que `createLibWebM()` est appelée avant les tests
- Assurez-vous que le module est correctement importé

### Erreur "Environment not detected"
- Vérifiez que vous êtes dans un environnement worker
- Pour les tests navigateur, utilisez un Web Worker

### Erreur "Memory limit exceeded"
- Réduisez la taille des buffers de test
- Vérifiez les limites de l'environnement worker

### Erreur "Codec not supported"
- Vérifiez que les codecs testés sont dans la liste des codecs supportés
- Les codecs supportés sont : VP8, VP9, AV1 (video), Opus, Vorbis (audio)

## Intégration CI/CD

Pour intégrer ces tests dans un pipeline CI/CD :

```javascript
// Exemple pour Cloudflare Workers
const response = await fetch('https://your-worker-url/test');
const results = await response.json();

if (results.summary.failed > 0) {
    console.error('Tests failed:', results.summary.failed);
    process.exit(1);
} else {
    console.log('All tests passed!');
}
```

## Environnements supportés

- ✅ Web Workers (navigateur)
- ✅ Service Workers
- ✅ Cloudflare Workers
- ✅ Deno Workers
- ❌ Node.js (utilisez les tests principaux à la place)

## Contribution

Pour ajouter de nouveaux tests :

1. Ajoutez la méthode de test dans `WorkerEnvironmentTests`
2. Appelez-la depuis `runAllTests()`
3. Créez la section correspondante dans `worker-test-runner.html`
4. Mettez à jour ce README

## Licence

BSD 3-Clause License - voir le fichier LICENSE du projet principal.
