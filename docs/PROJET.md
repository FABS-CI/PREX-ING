# PREX’ING

Logiciel de gestion de pressing vendu en abonnement (SaaS) — Côte d’Ivoire.
Comptoir (POS), suivi des dépôts, caisse, mobile money, WhatsApp/SMS, livraison,
commande en ligne, employés, stock. Fonctionne hors ligne. Multi-boutiques.

## Technologies

| Couche | Choix |
|---|---|
| Interface | React + TypeScript + Vite + Tailwind + shadcn/ui (généré avec Lovable) |
| Serveur / base | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Hors ligne | PowerSync (SDK web / JavaScript) — phase 3 |
| Windows | Tauri — phase 4 |
| Android / iPhone | Capacitor — phase 4 |
| Impression | ESC/POS (ticket thermique, étiquettes, tiroir-caisse) — phase 4 |

## Structure

```
database/   Schéma SQL (tables, triggers, sécurité RLS, catalogue par défaut)
docs/                  Guide de démarrage, architecture, prompts Lovable
src/                   Code de l’application (créé par Lovable)
```

## Règles importantes

1. **La base de données se modifie uniquement par des fichiers de migration** dans
   `database/`, jamais à la main ni par Lovable sans validation.
2. Tous les montants sont en **FCFA entiers** (pas de décimales).
3. Les **identifiants sont des UUID générés côté appareil** (indispensable pour le hors ligne).
4. Les **totaux d’un dépôt sont calculés par la base** (triggers) : l’interface les affiche,
   elle ne les envoie pas.
5. Les **paiements ne sont jamais supprimés** : on change leur statut (`annule`).
6. Chaque donnée porte un `pressing_id` ; la sécurité RLS isole les pressings entre eux.

Voir `docs/GUIDE_DEMARRAGE.md` pour installer le projet pas à pas.
