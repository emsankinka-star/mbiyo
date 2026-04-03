/**
 * Seed - Données initiales pour Mbiyo
 */
const { db } = require('./index');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

async function seed() {
  try {
    logger.info('🌱 Insertion des données initiales...');

    // Admin par défaut
    const adminPassword = await bcrypt.hash('admin123456', 12);
    const adminId = uuidv4();
    await db('users').insert({
      id: adminId,
      email: 'admin@mbiyo.cd',
      phone: '+243990000000',
      password_hash: adminPassword,
      full_name: 'Admin Mbiyo',
      role: 'admin',
      is_active: true,
      is_verified: true,
      lang: 'fr',
    }).onConflict('email').ignore();

    // Catégories
    const categories = [
      { name: 'Restaurants', name_sw: 'Mikahawa', slug: 'restaurants', sort_order: 1 },
      { name: 'Supermarchés', name_sw: 'Maduka makubwa', slug: 'supermarches', sort_order: 2 },
      { name: 'Pharmacies', name_sw: 'Famasia', slug: 'pharmacies', sort_order: 3 },
      { name: 'Carburant', name_sw: 'Mafuta', slug: 'carburant', sort_order: 4 },
      { name: 'Boutiques', name_sw: 'Maduka', slug: 'boutiques', sort_order: 5 },
      { name: 'Boissons', name_sw: 'Vinywaji', slug: 'boissons', sort_order: 6 },
      { name: 'Boulangeries', name_sw: 'Mikate', slug: 'boulangeries', sort_order: 7 },
      { name: 'Électronique', name_sw: 'Elektroniki', slug: 'electronique', sort_order: 8 },
    ];

    for (const cat of categories) {
      await db('categories').insert({
        id: uuidv4(),
        ...cat,
        is_active: true,
      }).onConflict('slug').ignore();
    }

    // Zone de livraison par défaut - Bukavu
    await db('delivery_zones').insert({
      id: uuidv4(),
      name: 'Bukavu Centre',
      city: 'Bukavu',
      center_lat: -2.5083,
      center_lng: 28.8608,
      radius_km: 15,
      base_fee: 2000,
      per_km_fee: 500,
      is_active: true,
    });

    await db('delivery_zones').insert({
      id: uuidv4(),
      name: 'Bukavu Ibanda',
      city: 'Bukavu',
      center_lat: -2.4912,
      center_lng: 28.8447,
      radius_km: 8,
      base_fee: 1500,
      per_km_fee: 400,
      is_active: true,
    });

    await db('delivery_zones').insert({
      id: uuidv4(),
      name: 'Bukavu Kadutu',
      city: 'Bukavu',
      center_lat: -2.5167,
      center_lng: 28.8667,
      radius_km: 7,
      base_fee: 1500,
      per_km_fee: 400,
      is_active: true,
    });

    logger.info('✅ Seed terminé avec succès!');
  } catch (error) {
    logger.error('❌ Erreur seed:', error);
    throw error;
  }
}

if (require.main === module) {
  require('dotenv').config({ path: '../../../../.env' });
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed };
