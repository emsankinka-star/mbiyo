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
│   │   │   ├── controllers/    → Logique métier (auth, order, driver, chat, payment…)
│   │   │   ├── routes/         → Définition des routes REST (13 fichiers)
│   │   │   ├── middleware/     → Auth JWT, upload Multer, gestion erreurs
│   │   │   ├── socket/         → Événements WebSocket (temps réel)
│   │   │   ├── database/       → Migration idempotente, seed, connexion Knex
│   │   │   ├── services/       → Matching livreurs, notifications push
│   │   │   └── utils/          → Logger, helpers (tokens, distance, tarifs), Cloudinary
│   │   └── package.json
│   ├── client/       → App Client Next.js (Vercel) — 🟠 Orange
│   ├── driver/       → App Livreur Next.js (Vercel) — 🔵 Bleu
│   ├── supplier/     → App Fournisseur Next.js (Vercel) — 🟢 Vert
│   └── admin/        → Dashboard Admin Next.js (Vercel) — 🟣 Violet
├── packages/
│   └── shared/       → Constantes partagées (statuts, rôles, couleurs, localisations)
├── package.json      → Monorepo (Turborepo + npm workspaces)
└── turbo.json        → Pipeline de build
```

---

## 🛠 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js, Express.js, PostgreSQL, Knex.js ^3.1.0 |
| Frontend | Next.js 14, React 18, TailwindCSS |
| Auth | JWT (access 7j + refresh 30j), bcryptjs (12 rounds) |
| Temps réel | Socket.io (WebSocket) — commandes, chat, GPS |
| State | Zustand (persist middleware) |
| Paiement | SerdiPay API (webhook + signature) |
| Cartes | Mapbox GL JS ^3.1.0 (client + fournisseur) |
| Notifications | Firebase Cloud Messaging |
| Images | Sharp (compression WebP) + Cloudinary (stockage CDN) |
| Hébergement | Railway (API + PostgreSQL) + Vercel (4 frontends) |
| Monorepo | Turborepo + npm workspaces |
| Dépôt Git | GitHub (`emsankinka-star/mbiyo`, branche `main`, auto-deploy) |

---

## 🔐 Système d'Authentification

### Inscription en 2 étapes

L'inscription est **séparée par application** :

**Étape 1 — Création du compte (`POST /api/auth/register`) :**
- Le rôle est **toujours forcé à `client`** côté serveur, quel que soit le body envoyé
- Le téléphone est normalisé au format `+243XXXXXXXXX` (gère `0997…`, `997…`, `+243…`, `243…`)
- Mot de passe hashé avec bcrypt (12 rounds)
- Retourne `accessToken` (7j) + `refreshToken` (30j)

**Étape 2 — Mise à niveau du rôle (fournisseur ou livreur) :**
- `POST /api/suppliers/register` → crée le profil fournisseur, met à jour `users.role` à `supplier`, retourne **nouveaux tokens** avec le rôle mis à jour
- `POST /api/drivers/register` → crée le profil livreur (+ upload documents), met à jour `users.role` à `driver`, retourne **nouveaux tokens**

### Connexion stricte par application

Chaque app vérifie le rôle lors de la connexion :
- **App Client** → accepte uniquement `role === 'client'`
- **App Fournisseur** → accepte uniquement `role === 'supplier'`
- **App Livreur** → accepte uniquement `role === 'driver'`

Un utilisateur inscrit via l'app client **ne peut pas** se connecter sur l'app fournisseur ou livreur, et vice versa.

### Tokens JWT

| Token | Durée | Secret | Payload |
|-------|-------|--------|---------|
| Access Token | 7 jours | `JWT_SECRET` | `{ id, role, phone }` |
| Refresh Token | 30 jours | `JWT_REFRESH_SECRET` | `{ id, role, phone }` |

Le refresh token est persisté en base (`users.refresh_token`) et renouvelé via `POST /api/auth/refresh-token` (rotation complète).

---

## 🔄 Flux de Commande Complet

```
1. CLIENT passe commande → statut: pending
2. FOURNISSEUR accepte → statut: accepted
3. FOURNISSEUR prépare → statut: preparing
4. FOURNISSEUR marque prêt → statut: ready
   ↳ Recherche des livreurs les plus proches (en ligne, validés, non occupés)
   ↳ Notification WebSocket aux livreurs disponibles
5. LIVREUR accepte la course → statut: picked_up
   ↳ GPS en temps réel vers le client
6. LIVREUR en route → statut: delivering
7. LIVREUR confirme livraison → statut: delivered
   ↳ Mise à jour des gains du livreur
   ↳ Libération du livreur (is_busy = false)
```

### Règles de Contact

| Relation | Appel téléphonique | Chat in-app |
|----------|-------------------|-------------|
| Client ↔ Livreur | ✅ | ✅ |
| Livreur ↔ Fournisseur | ✅ | ❌ |
| Client ↔ Fournisseur | ❌ | ❌ |

### Validation Fournisseur

1. Le fournisseur s'inscrit → `is_validated = false`
2. L'admin valide via `PATCH /api/admin/suppliers/:id/validate`
3. Le fournisseur peut ajouter des produits **avant d'être validé**
4. Mais il n'apparaît dans les résultats clients (`GET /suppliers`, `/nearby`) que **après validation**

---

## 💬 Système de Chat (temps réel)

Chat in-app entre le **client** et le **livreur** pendant une commande active, similaire au chat Uber Eats.

### Fonctionnalités
- Messages en temps réel via Socket.io + persistance en base de données
- Accusés de lecture (✓✓)
- Badge de messages non lus sur le bouton chat
- Envoi optimiste (affichage immédiat côté émetteur)
- Désactivé automatiquement si commande livrée/annulée ou aucun livreur assigné

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

---

## 🔌 API Endpoints Complets

### Auth (`/api/auth`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/register` | Non | Inscription (rôle toujours `client`) |
| POST | `/login` | Non | Connexion par téléphone ou email |
| POST | `/refresh-token` | Non | Renouveler les tokens JWT |
| POST | `/logout` | Oui | Déconnexion (efface refresh + FCM) |
| GET | `/me` | Oui | Profil utilisateur + profil spécifique au rôle |
| PUT | `/me` | Oui | Modifier nom, email, avatar_url, langue |
| PUT | `/me/avatar` | Oui | Upload avatar (Sharp → Cloudinary) |
| PUT | `/me/password` | Oui | Changer le mot de passe |
| PUT | `/me/location` | Oui | Mettre à jour GPS (+ table drivers si livreur) |
| PUT | `/me/fcm-token` | Oui | Mettre à jour le token FCM |

### Fournisseurs (`/api/suppliers`)

| Méthode | Route | Auth | Rôle | Description |
|---------|-------|------|------|-------------|
| GET | `/` | Non | — | Liste fournisseurs validés (paginé, filtre type/recherche) |
| GET | `/nearby` | Non | — | Fournisseurs proches, ouverts et validés (lat/lng/rayon) |
| GET | `/me` | Oui | — | Profil du fournisseur connecté |
| GET | `/me/stats` | Oui | supplier | Revenus, commandes, note (période: 7j/30j/1an) |
| GET | `/me/orders` | Oui | supplier | Commandes du fournisseur (paginé, filtre statut) |
| GET | `/:id` | Non | — | Détails publics d'un fournisseur |
| GET | `/:id/products` | Non | — | Produits disponibles d'un fournisseur |
| POST | `/register` | Oui | — | Étape 2 : créer profil fournisseur + tokens mis à jour |
| PUT | `/me` | Oui | supplier | Modifier le profil |
| PUT | `/me/logo` | Oui | supplier | Upload logo (Cloudinary) |
| PUT | `/me/cover` | Oui | supplier | Upload image de couverture |
| PUT | `/me/status` | Oui | supplier | Basculer ouvert/fermé (inverse l'état courant) |
| PUT | `/me/hours` | Oui | supplier | Mettre à jour les horaires d'ouverture (JSON) |

### Produits (`/api/products`)

| Méthode | Route | Auth | Rôle | Description |
|---------|-------|------|------|-------------|
| GET | `/` | Non | — | Liste produits disponibles (paginé, filtre fournisseur/catégorie) |
| GET | `/search` | Non | — | Recherche par nom/description (ilike) |
| GET | `/:id` | Non | — | Détail d'un produit |
| POST | `/` | Oui | supplier | Créer un produit (mode dual avec fallback) |
| PUT | `/:id` | Oui | supplier | Modifier un produit (mode dual avec fallback) |
| DELETE | `/:id` | Oui | supplier | Supprimer un produit |
| PUT | `/:id/image` | Oui | supplier | Upload image produit (Cloudinary) |
| PATCH | `/:id/availability` | Oui | supplier | Basculer la disponibilité |
| PATCH | `/:id/stock` | Oui | supplier | Mettre à jour le stock |

> **Mode dual :** La création/modification tente avec toutes les colonnes ; en cas d'erreur de colonne manquante en production, retente avec les colonnes de base uniquement (`name`, `description`, `price`, `promo_price`, `stock_quantity`, `category_id`).

### Commandes (`/api/orders`)

| Méthode | Route | Auth | Rôle | Description |
|---------|-------|------|------|-------------|
| POST | `/` | Oui | — | Créer commande (transaction, vérif. stock, calcul distance) |
| GET | `/my` | Oui | — | Commandes du client (avec items, fournisseur, livreur) |
| GET | `/:id` | Oui | — | Détails commande |
| POST | `/:id/cancel` | Oui | — | Annuler (seulement pending/accepted) |
| PATCH | `/:id/accept` | Oui | supplier | Fournisseur accepte |
| PATCH | `/:id/reject` | Oui | supplier | Fournisseur refuse (→ cancelled) |
| PATCH | `/:id/preparing` | Oui | supplier | Marquer en préparation |
| PATCH | `/:id/ready` | Oui | supplier | Marquer prêt → recherche livreurs proches → notifier |
| POST | `/:id/accept-delivery` | Oui | driver | Livreur accepte la livraison |
| PATCH | `/:id/picked-up` | Oui | driver | Livreur a récupéré |
| PATCH | `/:id/delivering` | Oui | driver | En route |
| PATCH | `/:id/delivered` | Oui | driver | Livré (gains, libération livreur) |
| POST | `/estimate` | Oui | — | Estimation frais de livraison + durée |

### Livreurs (`/api/drivers`)

| Méthode | Route | Auth | Rôle | Description |
|---------|-------|------|------|-------------|
| POST | `/register` | Oui | — | Étape 2 : profil livreur + documents + tokens mis à jour |
| GET | `/me` | Oui | driver | Profil livreur |
| PUT | `/me/status` | Oui | driver | Basculer en ligne/hors ligne |
| PUT | `/me/location` | Oui | driver | Mettre à jour GPS (users + drivers) |
| GET | `/me/earnings` | Oui | driver | Gains (jour/semaine/mois/total) |
| GET | `/me/deliveries` | Oui | driver | Historique livraisons (livrées/annulées) |
| GET | `/me/stats` | Oui | driver | Note, taux de complétion, totaux |
| GET | `/available-orders` | Oui | driver | Commandes prêtes sans livreur, triées par distance |

### Paiement (`/api/payments`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/initiate` | Oui | Initier paiement SerdiPay |
| POST | `/webhook/serdipay` | Non | Webhook SerdiPay (validation signature) |
| GET | `/:id/status` | Oui | Vérifier statut d'un paiement |
| GET | `/my` | Oui | Historique des paiements |

### Chat (`/api/chat`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/:orderId` | Oui | Messages d'une commande |
| POST | `/:orderId` | Oui | Envoyer un message |
| PATCH | `/:orderId/read` | Oui | Marquer comme lus |
| GET | `/:orderId/unread` | Oui | Nombre de messages non lus |

### Catégories (`/api/categories`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/` | Non | Liste catégories actives |
| GET | `/:slug` | Non | Catégorie par slug |

### Avis (`/api/reviews`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/` | Oui | Créer un avis (1-5, livreur ou fournisseur, commande livrée) |
| GET | `/:target_type/:target_id` | Non | Avis pour un livreur ou fournisseur |

### Utilisateurs (`/api/users`) — Admin

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/` | Admin | Liste utilisateurs (paginé, filtre rôle/recherche) |
| PATCH | `/:id/status` | Admin | Activer/désactiver un utilisateur |

### Zones de livraison (`/api/delivery-zones`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/` | Non | Liste zones actives |

### Support (`/api/support`)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/` | Oui | Créer un ticket de support |
| GET | `/my` | Oui | Mes tickets |
| GET | `/:id` | Oui | Détail ticket + messages |
| POST | `/:id/messages` | Oui | Ajouter un message au ticket |
| GET | `/` | Admin | Tous les tickets (filtre statut/priorité) |
| PATCH | `/:id` | Admin | Mettre à jour statut/assignation |

### Admin (`/api/admin`) — Toutes les routes nécessitent `authenticate + authorize('admin')`

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/users` | Liste tous les utilisateurs (paginé, filtre rôle/statut/recherche) |
| GET | `/drivers` | Liste tous les livreurs |
| GET | `/drivers/pending` | Livreurs en attente de validation |
| PATCH | `/drivers/:id/validate` | Valider/refuser un livreur + notification |
| GET | `/suppliers` | Liste tous les fournisseurs |
| GET | `/suppliers/pending` | Fournisseurs en attente de validation |
| PATCH | `/suppliers/:id/validate` | Valider/refuser un fournisseur + notification |
| PATCH | `/suppliers/:id/commission` | Définir le taux de commission |
| GET | `/orders` | Toutes les commandes (paginé, filtre statut/date) |
| GET | `/stats` | Dashboard : utilisateurs, commandes, revenus, tendances, top fournisseurs |
| GET | `/delivery-zones` | Toutes les zones (y compris inactives) |
| POST | `/delivery-zones` | Créer une zone |
| PUT | `/delivery-zones/:id` | Modifier une zone |
| DELETE | `/delivery-zones/:id` | Supprimer une zone |
| POST | `/categories` | Créer une catégorie |
| PUT | `/categories/:id/image` | Upload image catégorie |
| PUT | `/categories/:id/icon` | Upload icône catégorie |
| GET | `/monitoring` | Temps réel : commandes actives + livreurs en ligne |

---

## 🌐 WebSocket Events

### Connexion
Le client se connecte avec un JWT (`socket.handshake.auth.token`). Le serveur rejoint automatiquement les rooms :
- `user_{id}` — tous les utilisateurs
- `drivers` / `driver_{id}` — si rôle livreur
- `suppliers` / `supplier_{id}` — si rôle fournisseur
- `admins` — si rôle admin

### Client → Serveur

| Événement | Données | Description |
|-----------|---------|-------------|
| `driver:location_update` | `{ latitude, longitude, order_id? }` | Position GPS du livreur (persisté en DB) |
| `driver:status` | `{ is_online }` | En ligne / hors ligne |
| `order:track` | `{ order_id }` | S'abonner au suivi d'une commande (rejoint room `order_{id}`) |
| `order:untrack` | `{ order_id }` | Se désabonner du suivi |
| `chat:message` | `{ to_user_id, message, order_id }` | Envoyer un message chat (persisté en DB) |

### Serveur → Client

| Événement | Room / Cible | Données | Description |
|-----------|-------------|---------|-------------|
| `driver:location` | `order_{id}`, `admins` | `{ driver_id, latitude, longitude, timestamp }` | Position GPS mise à jour |
| `driver:status_change` | `admins` | `{ driver_id, is_online }` | Changement statut livreur |
| `chat:message` | `user_{to_user_id}` | `{ from_user_id, content, order_id, timestamp }` | Message reçu |
| `new_order` | `supplier_{user_id}` | `{ order_id, order_number, total, items_count }` | Nouvelle commande |
| `order_update` | `user_{client_id}`, `supplier_{user_id}` | `{ order_id, status, driver? }` | Mise à jour statut |
| `new_delivery_request` | `driver_{user_id}` | `{ order_id, order_number, pickup, delivery, delivery_fee, distance_km }` | Demande de livraison |
| `delivery_taken` | broadcast | `{ order_id }` | Livraison déjà prise par un autre livreur |

---

## 📊 Base de Données (15 tables)

### Tables principales

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

### Schéma détaillé

<details>
<summary>Cliquer pour voir toutes les colonnes</summary>

#### `users`
`id` (UUID PK), `email` (unique), `phone` (unique, +243), `password_hash`, `full_name`, `role` (client/driver/supplier/admin, défaut 'client'), `avatar_url`, `lang` (défaut 'fr'), `is_active` (défaut true), `is_verified`, `latitude`, `longitude`, `fcm_token`, `refresh_token`, `created_at`, `updated_at`

#### `suppliers`
`id` (UUID PK), `user_id` (FK→users), `business_name`, `business_type` (restaurant/supermarket/pharmacy/fuel/shop/bakery/butcher/bar/cafe/hotel/laundry/beauty_salon/gym/electronics/clothing/bookstore/hardware/florist/other), `rccm`, `email`, `description`, `logo_url`, `cover_url`, `latitude`, `longitude`, `address`, `address_details` (JSONB), `opening_hours` (JSONB), `rating`, `total_reviews`, `is_validated` (défaut false), `is_open` (défaut false), `commission_rate` (défaut 0.15), `preparation_time` (défaut 30 min), `minimum_order` (défaut 0), `created_at`, `updated_at`

#### `drivers`
`id` (UUID PK), `user_id` (FK→users), `vehicle_type` (défaut 'moto'), `license_plate`, `id_document_url`, `license_url`, `vehicle_photo_url`, `is_online`, `is_validated`, `is_busy`, `current_lat`, `current_lng`, `rating`, `total_reviews`, `total_deliveries`, `total_earnings`, `today_earnings`, `created_at`, `updated_at`

#### `categories`
`id` (UUID PK), `name`, `name_sw` (swahili), `slug` (unique), `icon_url`, `image_url`, `sort_order`, `is_active`, `created_at`, `updated_at`

#### `products`
`id` (UUID PK), `supplier_id` (FK→suppliers), `category_id` (FK→categories), `name`, `description`, `price`, `promo_price`, `image_url`, `stock_quantity` (défaut -1 = illimité), `is_available`, `variants` (JSONB), `extras` (JSONB), `unit` (défaut 'piece'), `min_quantity` (défaut 1), `step` (défaut 1), `sort_order`, `created_at`, `updated_at`

#### `orders`
`id` (UUID PK), `order_number` (unique, format MBY-YYYYMMDD-XXXX), `client_id` (FK→users), `supplier_id` (FK→suppliers), `driver_id` (FK→drivers), `status` (pending/accepted/preparing/ready/picked_up/delivering/delivered/cancelled/refunded), `subtotal`, `delivery_fee`, `commission`, `total`, `pickup_lat`, `pickup_lng`, `delivery_lat`, `delivery_lng`, `delivery_address`, `delivery_details` (JSONB), `notes`, `distance_km`, `estimated_delivery`, `accepted_at`, `prepared_at`, `picked_up_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`, `created_at`, `updated_at`

#### `order_items`
`id` (UUID PK), `order_id` (FK→orders), `product_id` (FK→products), `product_name`, `quantity` (décimal), `unit_price`, `total_price`, `unit`, `selected_variants` (JSONB), `selected_extras` (JSONB), `special_instructions`

#### `payments`
`id` (UUID PK), `order_id` (FK→orders), `user_id` (FK→users), `serdipay_tx_id`, `serdipay_reference`, `amount`, `currency` (défaut 'CDF'), `status` (pending/completed/failed/refunded), `type` (client_payment/supplier_payout/driver_payout/refund), `phone_number`, `metadata` (JSONB), `created_at`, `updated_at`

#### `reviews`
`id` (UUID PK), `order_id` (FK→orders), `reviewer_id` (FK→users), `target_id` (UUID), `target_type` (driver/supplier), `rating` (1-5), `comment`, `created_at`, `updated_at`

#### `notifications`
`id` (UUID PK), `user_id` (FK→users), `title`, `body`, `type` (order/payment/promo/system/chat), `is_read`, `data` (JSONB), `created_at`, `updated_at`

#### `delivery_zones`
`id` (UUID PK), `name`, `city` (défaut 'Bukavu'), `center_lat`, `center_lng`, `radius_km`, `base_fee` (défaut 2000), `per_km_fee` (défaut 500), `is_active`, `created_at`, `updated_at`

#### `support_tickets`
`id` (UUID PK), `user_id` (FK→users), `order_id` (FK→orders), `subject`, `description`, `status` (open/in_progress/resolved/closed), `priority` (low/medium/high/urgent), `assigned_to` (FK→users), `created_at`, `updated_at`

#### `support_messages`
`id` (UUID PK), `ticket_id` (FK→support_tickets), `sender_id` (FK→users), `message`, `attachment_url`, `created_at`, `updated_at`

#### `promotions`
`id` (UUID PK), `supplier_id` (FK→suppliers), `code` (unique), `title`, `description`, `discount_type` (percentage/fixed), `discount_value`, `min_order_amount`, `max_uses`, `used_count`, `starts_at`, `expires_at`, `is_active`, `created_at`, `updated_at`

#### `messages`
`id` (UUID PK), `order_id` (FK→orders), `sender_id` (FK→users), `receiver_id` (FK→users), `content`, `is_read`, `created_at`, `updated_at`

</details>

### Index de performance
`idx_users_role`, `idx_users_phone`, `idx_orders_status`, `idx_orders_client`, `idx_orders_supplier`, `idx_orders_driver`, `idx_orders_created`, `idx_products_supplier`, `idx_products_category`, `idx_drivers_online` (composite: is_online, is_validated, is_busy), `idx_payments_order`, `idx_notifications_user` (composite: user_id, is_read), `idx_messages_order`, `idx_messages_receiver`

### Migration idempotente
La migration utilise `createTableIfNotExists` pour chaque table, puis `addColIfMissing()` pour les ALTER TABLE. Chaque opération est enveloppée dans un `try/catch` individuel pour éviter les échecs en cascade. La migration s'exécute automatiquement au démarrage du serveur.

### Tarification par unité
Les produits supportent différentes unités de mesure : `piece`, `kg`, `g`, `L`, `mL`, `m`, `pack`.
Chaque produit définit une `min_quantity` (quantité minimale) et un `step` (incrément), permettant des quantités décimales (ex: 0.5 kg).

---

## 🛡️ Middleware

| Middleware | Description |
|------------|-------------|
| `authenticate` | Vérifie le JWT Bearer token, définit `req.user = { id, role, phone }`. Retourne 401 si absent/invalide/expiré |
| `authorize(...roles)` | Vérifie que `req.user.role` fait partie des rôles autorisés. Retourne 403 si non autorisé |
| `optionalAuth` | Comme `authenticate` mais ne bloque jamais — continue sans `req.user` si token absent |
| `upload` | Middleware Multer pour l'upload de fichiers (mémoire), limité à 10 Mo |
| `errorHandler` | Gestionnaire d'erreurs global avec logging structuré |

---

## 🧰 Fonctions Utilitaires (helpers.js)

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `generateTokens(user)` | `(user) → { accessToken, refreshToken }` | Génère les JWT (partagé entre auth/supplier/driver controllers) |
| `normalizePhone(phone)` | `(string?) → string` | Normalise au format `+243XXXXXXXXX` (gère 0997, 997, +243, 243) |
| `generateOrderNumber()` | `() → string` | Format `MBY-YYYYMMDD-XXXX` (alphanumérique aléatoire) |
| `calculateDistance(lat1, lon1, lat2, lon2)` | `(n, n, n, n) → number` | Formule Haversine, retourne km |
| `calculateDeliveryFee(distanceKm, base?, perKm?)` | `(n, n?, n?) → number` | `base + (km × perKm)`, défauts: 2000 CDF + 500/km |
| `calculateCommission(subtotal, rate?)` | `(n, n?) → number` | `subtotal × rate`, défaut 15% |
| `formatCDF(amount)` | `(number) → string` | Formatte en CDF avec séparateurs |
| `paginate(query, page, limit)` | `(any, n, n) → { limit, offset }` | Limite max 100 |
| `apiResponse(res, code, data, msg?)` | `(Response, n, any, string?) → Response` | Enveloppe standard `{ success, message?, data? }` |

---

## 📦 Constantes Partagées (packages/shared)

| Constante | Description |
|-----------|-------------|
| `ORDER_STATUS` | `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `PICKED_UP`, `DELIVERING`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `ORDER_STATUS_LABELS` | Libellés en français pour chaque statut |
| `ORDER_STATUS_COLORS` | Couleur hex par statut |
| `BUSINESS_TYPES` | Types de commerce avec label FR, SW et icône emoji |
| `USER_ROLES` | `CLIENT`, `DRIVER`, `SUPPLIER`, `ADMIN` |
| `API_URL` | Depuis `NEXT_PUBLIC_API_URL` ou `http://localhost:5000/api` |
| `WS_URL` | Depuis `NEXT_PUBLIC_WS_URL` ou `http://localhost:5000` |
| `DEFAULT_LOCATION` | `{ latitude: -2.5083, longitude: 28.8608, city: 'Bukavu', country: 'RDC' }` |
| `MAPBOX_STYLE` | `mapbox://styles/mapbox/streets-v12` |

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
- Inscription/Connexion par téléphone (+243)
- Connexion stricte — seuls les comptes `role=client` sont acceptés
- Parcourir restaurants et fournisseurs à proximité (validés et ouverts)
- Panier multi-produits avec détection multi-fournisseur
- Adresse de livraison détaillée (commune, quartier, avenue, repère) avec carte Mapbox
- Suivi de commande en temps réel avec GPS du livreur
- **Chat in-app** avec le livreur (messages temps réel, accusés de lecture)
- **Appel téléphonique** du livreur (bouton d'appel direct)
- Estimation des frais de livraison
- Système d'avis et notes

### Livreur (🔵 Bleu)
- Inscription en 2 étapes : compte + profil avec upload de documents (ID, permis, photo véhicule)
- Connexion stricte — seuls les comptes `role=driver` sont acceptés
- Toggle en ligne/hors ligne
- Commandes disponibles triées par distance (avec nom du client)
- **Adresse détaillée du client** visible (commune, quartier, avenue, repère)
- **Chat in-app** avec le client
- **Appel téléphonique** du client et du fournisseur
- Navigation vers pickup et livraison
- Suivi GPS en temps réel (broadcast WebSocket)
- Tableau de bord des gains (jour/semaine/mois)
- Historique des livraisons (avec noms fournisseur + client)

### Fournisseur (🟢 Vert)
- Inscription en 2 étapes : compte + profil de commerce (restaurant, pharmacie, supermarché...)
- Connexion stricte — seuls les comptes `role=supplier` sont acceptés
- En attente de validation admin (`is_validated = false` par défaut)
- Peut ajouter des produits avant validation
- Adresse du commerce avec carte Mapbox et repère
- Gestion des produits (CRUD, stock, disponibilité, photos, **unités de mesure**, variantes, extras)
- Gestion des commandes (accepter/refuser/préparer/prêt)
- Toggle ouvert/fermé (inverse l'état courant en base)
- Statistiques et revenus
- Notifications en temps réel des nouvelles commandes

### Admin (🟣 Violet)
- Dashboard avec KPIs et graphiques (Recharts)
- Gestion des utilisateurs (activation/désactivation)
- Validation des livreurs et fournisseurs (avec notification)
- Définition des taux de commission par fournisseur
- Suivi de toutes les commandes
- Gestion des zones de livraison (CRUD)
- Gestion des catégories (CRUD, images, icônes)
- Système de support (tickets)
- Statistiques avancées (tendances, répartition, top fournisseurs)
- Monitoring temps réel (commandes actives + livreurs en ligne)

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
JWT_REFRESH_SECRET=your-refresh-secret-key

# Cloudinary (stockage images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Firebase (notifications push — optionnel)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# SerdiPay (paiement — optionnel)
SERDIPAY_API_KEY=your-api-key
SERDIPAY_SECRET_KEY=your-secret-key
SERDIPAY_WEBHOOK_SECRET=your-webhook-secret

# Livraison (optionnel, avec défauts)
BASE_DELIVERY_FEE=2000
PER_KM_FEE=500

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
Les migrations s'exécutent **automatiquement** au démarrage du serveur. Pour les lancer manuellement :
```bash
cd apps/api
node src/database/migrate.js    # Créer les tables (idempotent, resilient)
node src/database/seed.js       # Données initiales (admin, catégories, zones)
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

## 🚢 Déploiement

### Backend (Railway)
- Auto-deploy depuis la branche `main` de GitHub
- PostgreSQL hébergé sur Railway
- Les migrations s'exécutent automatiquement au démarrage

```bash
# Déploiement manuel (optionnel)
railway up
```

### Frontend (Vercel)
- Auto-deploy depuis la branche `main` de GitHub
- Chaque app est un projet Vercel séparé

```bash
# Déploiement manuel (optionnel)
# Modifier .vercel/project.json avec le projectId correspondant
vercel --prod

# Project IDs :
# Client     : prj_AU4qmKEsXQ60XSiT1INxsjWLpc49
# Livreur    : prj_IKDl87oU8SZON8C70AmeNwxhIqIo
# Fournisseur: prj_MO8uAbJSi1GhUlNsBQhlOaoEM2xJ
# Admin      : prj_iigKrrigSSAMN7WuwUWdDblEtXRB
```

> **Note :** Le plan gratuit Vercel est limité à 100 déploiements/jour.

---

## 📜 Licence
Propriétaire — Mbiyo © 2024-2026
