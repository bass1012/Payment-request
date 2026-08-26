// Point d'entrée conservé pour signaler explicitement l'ancienne commande.
throw new Error(
  'Lancement direct refusé. Utilisez "npm run test:integration" afin de créer une base SQLite de test isolée.'
);
