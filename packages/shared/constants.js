// Constantes partagées entre toutes les apps Mbiyo

const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

const ORDER_STATUS_LABELS = {
  pending: 'En attente',
  accepted: 'Acceptée',
  preparing: 'En préparation',
  ready: 'Prête',
  picked_up: 'Récupérée',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
};

const ORDER_STATUS_COLORS = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  preparing: '#8B5CF6',
  ready: '#10B981',
  picked_up: '#6366F1',
  delivering: '#F97316',
  delivered: '#059669',
  cancelled: '#EF4444',
  refunded: '#6B7280',
};

const BUSINESS_TYPES = {
  restaurant: { label: 'Restaurant', icon: '🍽️', labelSw: 'Mkahawa' },
  supermarket: { label: 'Supermarché', icon: '🛒', labelSw: 'Duka kubwa' },
  pharmacy: { label: 'Pharmacie', icon: '💊', labelSw: 'Famasia' },
  fuel: { label: 'Carburant', icon: '⛽', labelSw: 'Mafuta' },
  shop: { label: 'Boutique', icon: '🏪', labelSw: 'Duka' },
};

const USER_ROLES = {
  CLIENT: 'client',
  DRIVER: 'driver',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

// Coordonnées Bukavu par défaut
const DEFAULT_LOCATION = {
  latitude: -2.5083,
  longitude: 28.8608,
  city: 'Bukavu',
  country: 'RDC',
};

const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  BUSINESS_TYPES,
  USER_ROLES,
  API_URL,
  WS_URL,
  DEFAULT_LOCATION,
  MAPBOX_STYLE,
};
