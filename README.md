# SAGL - Système Associatif de Gestion Logistique

Système de gestion d'inventaire et de stock pour association de secourisme.

## Fonctionnalités

- **Gestion des stockages hiérarchiques** : ambulances, sacs, pochettes, sous-pochettes...
- **Templates** : contenu attendu par stockage (quantités minimales)
- **Inventaires mobile-first** : via QR code / lien unique, par secouriste
- **Types d'inventaire** : début de mission, fin de mission, autre
- **Réserve locale** : stock global, décompte automatique lors des réassorts
- **Dates de péremption** optionnelles par unité
- **Notifications admin** : stock faible, épuisé, périmé
- **Historique complet** des inventaires
- **Statistiques** et graphiques
- **Export PDF/CSV**
- **QR Codes** pour chaque stockage

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Node.js + Express + TypeScript |
| Base de données | SQLite + Prisma ORM |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Graphiques | Recharts |
| QR Codes | qrcode (npm) |
| Auth | JWT |

## Installation

### Prérequis

- Node.js >= 18
- npm >= 9

### Backend

```bash
cd backend
npm install
cp .env.example .env  # puis modifier les valeurs
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

**Identifiants par défaut** : `admin` / `admin`

## Déploiement (VPS Debian + Nginx)

1. Cloner le repo sur le serveur
2. Backend : `cd backend && npm install && npm run build`
3. Frontend : `cd frontend && npm install && npm run build`
4. Configurer Nginx avec `nginx.conf.example` comme base
5. Lancer le backend avec PM2 : `pm2 start backend/dist/index.js --name sagl`
6. Configurer SSL avec Let's Encrypt

## Licence

AGPL-3.0
