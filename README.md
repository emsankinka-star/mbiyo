# 🚀 Mbiyo — Plateforme de Livraison Multi-Services

**Application complète de livraison (type Uber Eats) pour la RDC / Bukavu**

## 🌐 Liens de Production

| Application | URL |
|-------------|-----|
| Client | https://mbiyo-client.vercel.app |
| Livreur | https://mbiyo-driver.vercel.app |
| Fournisseur | https://mbiyo-supplier.vercel.app |
| Admin | https://mbiyo-admin.vercel.app |
| API Backend | https://mbiyo-production.up.railway.app |

## 📋 Architecture

```
Mbiyo/
├── apps/
│   ├── api/          → Backend Express.js (Railway)
│   ├── client/       → App Client Next.js (Vercel) — Orange
│   ├── driver/       → App Livreur Next.js (Vercel) — Bleu
│   ├── supplier/     → App Fournisseur Next.js (Vercel) — Vert
│   └── admin/        → Dashboard Admin Next.js (Vercel) — Violet
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
| Images | Sharp (compression) + Cloudinary (stockage) |
| Hébergement | Railway (API + PostgreSQL) + Vercel (4 frontends) |
| Monorepo | Turborepo + npm workspaces |

## 🖼️ Gestion des Images

Toutes les images sont **compressées avec Sharp** avant upload vers **Cloudinary**.

| Type | Taille max | Qualité | Format |
|------|-----------|---------|--------|
| Avatar | 300px | 75% | WebP |
| Logo fournisseur | 500px | 80% | WebP |
| Cover fournisseur | 1200×600px | 80% | WebP |
| Produit | 800px | 80% | WebP |
| Catégorie | 400px | 80% | WebP |
| Document livreur | 1200×1600px | 85% | WebP |

### Endpoints d'upload

| Endpoint | Description |
|----------|-------------|
| `PUT /api/products/:id/image` | Image produit |
| `PUT /api/suppliers/me/logo` | Logo fournisseur |
| `PUT /api/suppliers/me/cover` | Cover fournisseur |
| `PUT /api/auth/me/avatar` | Avatar utilisateur |
| `PUT /api/admin/categories/:id/image` | Image catégorie |
| `PUT /api/admin/categories/:id/icon` | Icône catégorie |
| `POST /api/drivers/register` | Documents livreur (multi-fichier) |

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
# Éditer .env avec vos paramètres
```

#### Variables d'environnement requises (API)
```env
# Base de données
DATABASE_URL=postgresql://user:password@host:5432/mbiyo

# Auth
JWT_SECRET=your-secret-key

# Cloudinary (stockage images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Firebase (notifications push — optionnel)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# CORS (domaines autorisés, séparés par virgules)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
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

## 🔐 Comptes par défaut
- **Admin:** admin@mbiyo.cd / admin123456
- **Téléphone admin:** +243990000000

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
| POST /api/auth/login | Connexion (téléphone ou email) |
| PUT /api/auth/me/avatar | Upload avatar |
| GET /api/suppliers | Liste fournisseurs |
| PUT /api/suppliers/me/logo | Upload logo fournisseur |
| PUT /api/suppliers/me/cover | Upload cover fournisseur |
| GET /api/products | Liste produits |
| PUT /api/products/:id/image | Upload image produit |
| POST /api/orders | Créer commande |
| PUT /api/orders/:id/accept | Accepter commande |
| PUT /api/orders/:id/delivered | Livraison confirmée |
| POST /api/payments/initiate | Initier paiement SerdiPay |
| GET /api/admin/stats | Statistiques globales |
| PUT /api/admin/categories/:id/image | Upload image catégorie |
| PUT /api/admin/categories/:id/icon | Upload icône catégorie |

## 🌐 WebSocket Events
- `driver:location_update` — Position GPS du livreur
- `driver:status` — En ligne / hors ligne
- `order:new` — Nouvelle commande (fournisseur)
- `order:status_update` — Mise à jour statut
- `order:assigned` — Commande assignée au livreur

## 📜 Licence
Propriétaire — Mbiyo © 2024-2026
