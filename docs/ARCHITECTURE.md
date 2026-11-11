# Architecture et feuille de route — PREX’ING

## Répartition du travail

| Phase | Qui | Contenu |
|---|---|---|
| 1. Fondations | Claude | Schéma Supabase, sécurité RLS, triggers, docs, prompt n° 1 ✅ |
| 2. Écrans | **Lovable** | Auth, mise en page, catalogue, comptoir, dépôts, clients, caisse, dépenses, stock, équipe, rapports, livraisons, commandes en ligne |
| 3. Hors ligne | Claude | Intégration PowerSync (base locale SQLite dans le navigateur), file de synchronisation, numérotation des dépôts par appareil |
| 4. Natif & matériel | Claude | Tauri (Windows), Capacitor (Android / iPhone), impression ESC/POS, étiquettes, tiroir-caisse, douchette |
| 5. Services externes | Claude | Edge Functions : paiements mobile money (agrégateur), WhatsApp Business, SMS, relances planifiées, abonnement PREX’ING |
| 6. Finitions | Lovable + Claude | Portail client final, administration PREX’ING, corrections |

Lovable est utilisé pour ce qu’il fait le mieux (les écrans). Les parties techniques
délicates (hors ligne, matériel, paiements) sont écrites avec Claude, de préférence
avec Claude Code directement dans le dépôt.

## Prompts Lovable prévus (phase 2)

1. Fondations : auth, onboarding, mise en page, tableau de bord, catalogue ✅ (`LOVABLE_PROMPT_01.md`)
2. Clients : liste, fiche, historique, débiteurs
3. Comptoir : création de dépôt en 6 étapes (mode article d’abord)
4. Dépôts : liste, filtres, détail, changement de statut, retrait
5. Caisse : ouverture, encaissements, clôture, paiements « à vérifier »
6. Modes kilo, forfait et abonnement client
7. Dépenses et stock
8. Équipe : membres, rôles, employés, pointage, salaires
9. Rapports et exports
10. Livraisons et écran livreur
11. Commandes en ligne et portail client final

## Numérotation des dépôts (compatible hors ligne)

Format : `{prefixe_boutique}-{code_appareil}-{compteur}` → ex. `A-B2-0043`.
Chaque appareil a un code unique et son propre compteur : pas de collision sans Internet.
Étiquettes : `{numero}-{n° article}/{nombre d’articles}` → ex. `A-B2-0043-2/5`.

## Règles de synchronisation (phase 3)

- Paiements, mouvements de caisse et historique : **ajout uniquement**, jamais écrasés.
- Fiches (clients, tarifs, dépôts) : la modification la plus récente l’emporte ; l’audit garde l’historique.
- Les totaux des dépôts sont recalculés par les triggers à la réception sur le serveur.
- Paiement mobile money hors ligne : statut `a_verifier`, rapproché au retour d’Internet.
