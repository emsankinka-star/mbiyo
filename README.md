# 🚀 Mbiyo — Plateforme de Livraison Multi-Services

**Application complète de livraison (type Uber Eats) pour la RDC / Bukavu**

## 📋 Architecture

```
Mbiyo/
├── apps/
│   ├── api/          → Backend Express.js (port 5000)
│   ├── client/       → App Client Next.js (port 3000) — Orange
│   ├── driver/       → App Livreur Next.js (port 3001) — Bleu
│   ├── supplier/     → App Fournisseur Next.js (port 3002) — Vert
│   └── admin/        → Dashboard Admin Next.js (port 3003) — Violet
├── packages/
│   └── shared/       → Constantes partagées
├── package.json      → Monorepo (Turborepo + npm workspaces)
└── turbo.json        → Pipeline de build
```

## 🛠 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js, Express.js, PostgreSQL, Knex.js |
| Frontend | Next.js 14, React 18, TailwindCSS |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Temps réel | Socket.io (WebSocket) |
| State | Zustand (persist middleware) |
| Paiement | SerdiPay API |
| Cartes | Mapbox GL JS |
| Notifications | Firebase Cloud Messaging |
| Monorepo | Turborepo + npm workspaces |

## 🚀 Installation

### Prérequis
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### 1. Cloner et installer
```bash
cd Mbiyo
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Éditer .env avec vos paramètres (DB, JWT secret, SerdiPay, Mapbox, Firebase)
```

### 3. Base de données
```bash
cd apps/api
node src/database/migrate.js    # Créer les tables
node src/database/seed.js       # Données initiales
```

### 4. Démarrer
```bash
# Depuis la racine — lance tous les services
npm run dev

# Ou individuellement
npm run dev --workspace=@mbiyo/api        # API → :5000
npm run dev --workspace=@mbiyo/client     # Client → :3000
npm run dev --workspace=@mbiyo/driver     # Livreur → :3001
npm run dev --workspace=@mbiyo/supplier   # Fournisseur → :3002
npm run dev --workspace=@mbiyo/admin      # Admin → :3003
```

## 📊 Base de Données (14 tables)

users, suppliers, drivers, categories, products, orders, order_items, payments, reviews, notifications, delivery_zones, support_tickets, support_messages, promotions

## 🔐 Compte Admin par défaut
- **Téléphone:** +243970000000
- **Mot de passe:** admin123456

## 💰 Monnaie & Tarification
- **Devise:** CDF (Franc Congolais)
- **Frais de livraison:** 2 000 CDF base + 500 CDF/km
- **Commission plateforme:** 15%
- **Localisation par défaut:** Bukavu (-2.5083, 28.8608)

## 📱 Fonctionnalités par Application

### Client (🟠 Orange)
- Inscription/Connexion par téléphone
- Parcourir restaurants et fournisseurs à proximité
- Panier multi-produits avec détection multi-fournisseur
- Suivi de commande en temps réel avec GPS du livreur
- Estimation des frais de livraison
- Système d'avis et notes

### Livreur (🔵 Bleu)
- Inscription avec upload de documents (ID, permis, photo véhicule)
- Toggle en ligne/hors ligne
- Commandes disponibles triées par distance
- Navigation vers pickup et livraison
- Suivi GPS en temps réel
- Tableau de bord des gains (jour/semaine/mois)
- Historique des livraisons

### Fournisseur (🟢 Vert)
- Inscription de commerce avec type (restaurant, pharmacie, supermarché...)
- Gestion des produits (CRUD, stock, disponibilité, photos)
- Gestion des commandes (accepter/refuser/préparer/prêt)
- Toggle ouvert/fermé
- Statistiques et revenus
- Notifications en temps réel des nouvelles commandes

### Admin (🟣 Violet)
- Dashboard avec KPIs et graphiques (Recharts)
- Gestion des utilisateurs (activation/désactivation)
- Validation des livreurs et fournisseurs
- Suivi de toutes les commandes
- Gestion des zones de livraison (CRUD)
- Système de support (tickets)
- Statistiques avancées (tendances, répartition, top fournisseurs)

## 🔌 API Endpoints (résumé)

| Route | Description |
|-------|-------------|
| POST /api/auth/register | Inscription |
| POST /api/auth/login | Connexion |
| GET /api/suppliers | Liste fournisseurs |
| GET /api/products | Liste produits |
| POST /api/orders | Créer commande |
| PUT /api/orders/:id/accept | Accepter commande |
| PUT /api/orders/:id/delivered | Livraison confirmée |
| POST /api/payments/initiate | Initier paiement SerdiPay |
| GET /api/admin/stats | Statistiques globales |

## 🌐 WebSocket Events
- `driver:location_update` — Position GPS du livreur
- `driver:status` — En ligne / hors ligne
- `order:new` — Nouvelle commande (fournisseur)
- `order:status_update` — Mise à jour statut
- `order:assigned` — Commande assignée au livreur

## 📜 Licence
Propriétaire — Mbiyo © 2024
