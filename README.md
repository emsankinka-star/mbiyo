# 🚀 Mbiyo — Plateforme de Livraison Multi-Services

**Application complète de livraison (type Uber Eats) pour la RDC / Bukavu**

---

## 🌐 Liens de Production

| Application | URL |
|-------------|-----|
| Client | https://mbiyo-client.vercel.app |
| Livreur | https://mbiyo-driver.vercel.app |
| Fournisseur | https://mbiyo-supplier.vercel.app |
| Admin | https://mbiyo-admin.vercel.app |
| API Backend | https://mbiyo-production.up.railway.app |

---

## 📋 Architecture

```
Mbiyo/
├── apps/
│   ├── api/          → Backend Express.js (Railway)
│   │   ├── src/
│   │   │   ├── controllers/    → Logique métier (auth, order, driver, chat…)
│   │   │   ├── routes/         → Définition des routes REST
│   │   │   ├── middleware/     → Auth JWT, upload, validation
│   │   │   ├── socket/         → Événements WebSocket (temps réel)
│   │   │   ├── database/       → Migration, seed, connexion Knex
│   │   │   ├── services/       → Services externes (SerdiPay, Firebase, Cloudinary)
│   │   │   └── utils/          → Logger, helpers
│   │   └── package.json
│   ├── client/       → App Client Next.js (Vercel) — 🟠 Orange
│   ├── driver/       → App Livreur Next.js (Vercel) — 🔵 Bleu
│   ├── supplier/     → App Fournisseur Next.js (Vercel) — 🟢 Vert
│   └── admin/        → Dashboard Admin Next.js (Vercel) — 🟣 Violet
├── packages/
│   └── shared/       → Constantes partagées
├── package.json      → Monorepo (Turborepo + npm workspaces)
└── turbo.json        → Pipeline de build
```

---

## 🛠 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js, Express.js, PostgreSQL, Knex.js ^3.1.0 |
| Frontend | Next.js 14, React 18, TailwindCSS |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Temps réel | Socket.io (WebSocket) — commandes, chat, GPS |
| State | Zustand (persist middleware) |
| Paiement | SerdiPay API |
| Cartes | Mapbox GL JS ^3.1.0 (client + fournisseur) |
| Notifications | Firebase Cloud Messaging |
| Images | Sharp (compression) + Cloudinary (stockage) |
| Hébergement | Railway (API + PostgreSQL) + Vercel (4 frontends) |
| Monorepo | Turborepo + npm workspaces |
| Dépôt Git | GitHub (`emsankinka-star/mbiyo`, branche `main`) |

---

## 🔄 Flux de Commande Complet

```
1. CLIENT passe commande → statut: pending
2. FOURNISSEUR accepte → statut: accepted
3. FOURNISSEUR prépare → statut: preparing
4. FOURNISSEUR marque prêt → statut: ready
   ↳ Notification WebSocket aux livreurs disponibles
5. LIVREUR accepte la course → statut: picked_up
   ↳ GPS en temps réel vers le client
6. LIVREUR confirme livraison → statut: delivered
```

### Règles de Contact

| Relation | Appel téléphonique | Chat in-app |
|----------|-------------------|-------------|
| Client ↔ Livreur | ✅ | ✅ |
| Livreur ↔ Fournisseur | ✅ | ❌ |
| Client ↔ Fournisseur | ❌ | ❌ |

---

## 💬 Système de Chat (temps réel)

Chat in-app entre le **client** et le **livreur** pendant une commande active, similaire au chat Uber Eats.

### Fonctionnalités
- Messages en temps réel via Socket.io + persistance en base de données
- Accusés de lecture (✓✓)
- Badge de messages non lus sur le bouton chat
- Envoi optimiste (affichage immédiat côté émetteur)
- Désactivé automatiquement si commande livrée/annulée ou aucun livreur assigné

### API Chat

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/chat/:orderId` | Récupérer les messages d'une commande |
| POST | `/api/chat/:orderId` | Envoyer un message |
| PATCH | `/api/chat/:orderId/read` | Marquer les messages comme lus |
| GET | `/api/chat/:orderId/unread` | Nombre de messages non lus |

### WebSocket Chat
- `chat:message` — Envoi/réception d'un message (persiste en DB + relais temps réel)
- `chat:read` — Notification de lecture

---

## 📍 Système d'Adresses

### Adresse du Client (delivery_details)
Lors de la commande, le client saisit une adresse détaillée stockée en JSONB :
```json
{
  "commune": "Ibanda",
  "quartier": "Panzi",
  "avenue": "Avenue de la Paix",
  "numero": "42",
  "repere": "En face de l'église",
  "lat": -2.5083,
  "lng": 28.8608
}
```
Le livreur voit l'ensemble de ces détails sur sa page de livraison, incluant le repère pour faciliter la localisation.

### Adresse du Fournisseur (address_details)
Le fournisseur configure son adresse via un sélecteur de carte Mapbox avec repère (point de référence) :
```json
{
  "commune": "Kadutu",
  "quartier": "Nyalukemba",
  "avenue": "Av. P.E. Lumumba",
  "numero": "15",
  "repere": "À côté de la station Total"
}
```

### Sélection sur carte
- Client : modal de carte Mapbox pour choisir l'adresse de livraison
- Fournisseur : carte Mapbox dans les paramètres pour définir l'emplacement du commerce

---

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

---

## 🚀 Installation

### Prérequis
- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

### 1. Cloner et installer
```bash
git clone https://github.com/emsankinka-star/mbiyo.git
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

#### Variables d'environnement Frontend
```env
# Toutes les apps Next.js
NEXT_PUBLIC_API_URL=http://localhost:5000

# Client + Fournisseur (carte Mapbox)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### 3. Base de données
```bash
cd apps/api
node src/database/migrate.js    # Créer les tables (idempotent)
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

---

## 📊 Base de Données (15 tables)

| Table | Description |
|-------|-------------|
| `users` | Tous les utilisateurs (client, driver, supplier, admin) |
| `suppliers` | Profils fournisseurs (nom, type, coordonnées, address_details JSONB) |
| `drivers` | Profils livreurs (véhicule, documents, position GPS, gains) |
| `categories` | Catégories de produits (nom FR/SW, icône, image) |
| `products` | Produits (prix, stock, unité, variantes, extras) |
| `orders` | Commandes (statut, montants, coordonnées, delivery_details JSONB) |
| `order_items` | Lignes de commande (quantité décimale, unité, variantes) |
| `payments` | Paiements SerdiPay (client, fournisseur, livreur, remboursement) |
| `reviews` | Avis et notes (livreur ou fournisseur) |
| `notifications` | Notifications push (commande, paiement, promo, système, chat) |
| `delivery_zones` | Zones de livraison (centre, rayon, tarifs) |
| `support_tickets` | Tickets de support (sujet, priorité, assignation) |
| `support_messages` | Messages dans les tickets de support |
| `promotions` | Codes promo (pourcentage ou fixe, limites d'utilisation) |
| `messages` | Chat client ↔ livreur (par commande, accusés de lecture) |

### Tarification par unité
Les produits supportent différentes unités de mesure : `piece`, `kg`, `g`, `L`, `mL`, `m`, `pack`.
Chaque produit définit une `min_quantity` (quantité minimale) et un `step` (incrément), permettant des quantités décimales (ex: 0.5 kg).

---

## 🔐 Comptes par défaut
- **Admin:** admin@mbiyo.cd / admin123456
- **Téléphone admin:** +243990000000

## 💰 Monnaie & Tarification
- **Devise:** CDF (Franc Congolais)
- **Frais de livraison:** 2 000 CDF base + 500 CDF/km
- **Commission plateforme:** 15%
- **Localisation par défaut:** Bukavu (-2.5083, 28.8608)

---

## 📱 Fonctionnalités par Application

### Client (🟠 Orange)
- Inscription/Connexion par téléphone
- Parcourir restaurants et fournisseurs à proximité
- Panier multi-produits avec détection multi-fournisseur
- Adresse de livraison détaillée (commune, quartier, avenue, repère) avec carte Mapbox
- Suivi de commande en temps réel avec GPS du livreur
- **Chat in-app** avec le livreur (messages temps réel, accusés de lecture)
- **Appel téléphonique** du livreur (bouton d'appel direct)
- Estimation des frais de livraison
- Système d'avis et notes

### Livreur (🔵 Bleu)
- Inscription avec upload de documents (ID, permis, photo véhicule)
- Toggle en ligne/hors ligne
- Commandes disponibles triées par distance (avec nom du client)
- **Adresse détaillée du client** visible (commune, quartier, avenue, repère)
- **Chat in-app** avec le client
- **Appel téléphonique** du client et du fournisseur
- Navigation vers pickup et livraison
- Suivi GPS en temps réel
- Tableau de bord des gains (jour/semaine/mois)
- Historique des livraisons (avec noms fournisseur + client)

### Fournisseur (🟢 Vert)
- Inscription de commerce avec type (restaurant, pharmacie, supermarché...)
- Adresse du commerce avec carte Mapbox et repère
- Gestion des produits (CRUD, stock, disponibilité, photos, **unités de mesure**)
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

---

## 🔌 API Endpoints

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion (téléphone ou email) |
| PUT | `/api/auth/me/avatar` | Upload avatar |

### Fournisseurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/suppliers` | Liste fournisseurs |
| PUT | `/api/suppliers/me/logo` | Upload logo |
| PUT | `/api/suppliers/me/cover` | Upload cover |

### Produits
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/products` | Liste produits |
| PUT | `/api/products/:id/image` | Upload image produit |

### Commandes
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/orders` | Créer commande (avec delivery_details) |
| GET | `/api/orders/:id` | Détails commande (+ infos client/livreur) |
| PUT | `/api/orders/:id/accept` | Accepter commande (fournisseur) |
| PUT | `/api/orders/:id/delivered` | Confirmer livraison |

### Livreurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/drivers/available-orders` | Commandes disponibles (+ infos client) |
| GET | `/api/drivers/delivery-history` | Historique livraisons |

### Chat
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/chat/:orderId` | Messages d'une commande |
| POST | `/api/chat/:orderId` | Envoyer un message |
| PATCH | `/api/chat/:orderId/read` | Marquer comme lus |
| GET | `/api/chat/:orderId/unread` | Nombre de non lus |

### Paiement
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/payments/initiate` | Initier paiement SerdiPay |

### Admin
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admin/stats` | Statistiques globales |
| PUT | `/api/admin/categories/:id/image` | Image catégorie |
| PUT | `/api/admin/categories/:id/icon` | Icône catégorie |

### Autres routes
`/api/users`, `/api/categories`, `/api/reviews`, `/api/support`, `/api/delivery-zones`

---

## 🌐 WebSocket Events

### Commandes & Livreurs
| Événement | Direction | Description |
|-----------|-----------|-------------|
| `driver:location_update` | Client → Serveur | Position GPS du livreur |
| `driver:status` | Client → Serveur | En ligne / hors ligne |
| `order:new` | Serveur → Fournisseur | Nouvelle commande reçue |
| `order:status_update` | Serveur → Tous | Mise à jour statut commande |
| `order:assigned` | Serveur → Client | Livreur assigné à la commande |
| `order:track` | Client → Serveur | S'abonner au suivi d'une commande |
| `order:untrack` | Client → Serveur | Se désabonner du suivi |

### Chat
| Événement | Direction | Description |
|-----------|-----------|-------------|
| `chat:message` | Bidirectionnel | Envoi/réception de message (persiste en DB) |
| `chat:read` | Serveur → Client | Notification d'accusé de lecture |

---

## 🚢 Déploiement

### Backend (Railway)
```bash
# Depuis la RACINE du monorepo (pas depuis apps/api/)
railway up
```
Le Procfile ou nixpacks détecte automatiquement le service API.

### Frontend (Vercel)
Chaque app est déployée séparément en modifiant le fichier `.vercel/project.json` :
```bash
# Exemple : déployer l'app client
echo '{"projectId":"prj_AU4qmKEsXQ60XSiT1INxsjWLpc49","orgId":"..."}' > .vercel/project.json
vercel --prod

# App Livreur : prj_IKDl87oU8SZON8C70AmeNwxhIqIo
# App Fournisseur : prj_MO8uAbJSi1GhUlNsBQhlOaoEM2xJ
# App Admin : prj_iigKrrigSSAMN7WuwUWdDblEtXRB
```

> **Note :** Le plan gratuit Vercel est limité à 100 déploiements/jour.

---

## 📜 Licence
Propriétaire — Mbiyo © 2024-2026
