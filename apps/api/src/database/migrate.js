/**
 * Migration initiale - Création de toutes les tables Mbiyo
 */
const { db } = require('./index');
const logger = require('../utils/logger');

async function migrate() {
  try {
    logger.info('🔄 Début de la migration...');

    // Extension UUID
    await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // ==========================================
    // TABLE: users
    // ==========================================
    await db.schema.createTableIfNotExists('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('email').unique();
      table.string('phone', 20).unique();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.enu('role', ['client', 'driver', 'supplier', 'admin']).notNullable().defaultTo('client');
      table.string('avatar_url');
      table.string('lang', 5).defaultTo('fr');
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_verified').defaultTo(false);
      table.decimal('latitude', 10, 7);
      table.decimal('longitude', 10, 7);
      table.string('fcm_token');
      table.string('refresh_token');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: suppliers
    // ==========================================
    await db.schema.createTableIfNotExists('suppliers', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.string('business_name').notNullable();
      table.enu('business_type', ['restaurant', 'supermarket', 'pharmacy', 'fuel', 'shop']).notNullable();
      table.text('description');
      table.string('logo_url');
      table.string('cover_url');
      table.decimal('latitude', 10, 7);
      table.decimal('longitude', 10, 7);
      table.string('address');
      table.jsonb('opening_hours').defaultTo('{}');
      table.decimal('rating', 3, 2).defaultTo(0);
      table.integer('total_reviews').defaultTo(0);
      table.boolean('is_validated').defaultTo(false);
      table.boolean('is_open').defaultTo(false);
      table.decimal('commission_rate', 5, 4).defaultTo(0.15);
      table.integer('preparation_time').defaultTo(30); // minutes
      table.decimal('minimum_order', 12, 2).defaultTo(0);
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: drivers
    // ==========================================
    await db.schema.createTableIfNotExists('drivers', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.string('vehicle_type').defaultTo('moto');
      table.string('license_plate');
      table.string('id_document_url');
      table.string('license_url');
      table.string('vehicle_photo_url');
      table.boolean('is_online').defaultTo(false);
      table.boolean('is_validated').defaultTo(false);
      table.boolean('is_busy').defaultTo(false);
      table.decimal('current_lat', 10, 7);
      table.decimal('current_lng', 10, 7);
      table.decimal('rating', 3, 2).defaultTo(0);
      table.integer('total_reviews').defaultTo(0);
      table.integer('total_deliveries').defaultTo(0);
      table.decimal('total_earnings', 15, 2).defaultTo(0);
      table.decimal('today_earnings', 15, 2).defaultTo(0);
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: categories
    // ==========================================
    await db.schema.createTableIfNotExists('categories', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('name_sw'); // Swahili
      table.string('slug').unique().notNullable();
      table.string('icon_url');
      table.string('image_url');
      table.integer('sort_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: products
    // ==========================================
    await db.schema.createTableIfNotExists('products', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('supplier_id').references('id').inTable('suppliers').onDelete('CASCADE').notNullable();
      table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.string('name').notNullable();
      table.text('description');
      table.decimal('price', 12, 2).notNullable();
      table.decimal('promo_price', 12, 2);
      table.string('image_url');
      table.integer('stock_quantity').defaultTo(-1); // -1 = illimité
      table.boolean('is_available').defaultTo(true);
      table.jsonb('variants').defaultTo('[]');
      table.jsonb('extras').defaultTo('[]');
      table.string('unit').defaultTo('piece'); // piece, kg, g, L, mL, m, pack
      table.decimal('min_quantity', 10, 3).defaultTo(1); // quantité minimum
      table.decimal('step', 10, 3).defaultTo(1); // incrément (ex: 0.1 pour kg)
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: orders
    // ==========================================
    await db.schema.createTableIfNotExists('orders', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('order_number').unique().notNullable();
      table.uuid('client_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('supplier_id').references('id').inTable('suppliers').onDelete('SET NULL');
      table.uuid('driver_id').references('id').inTable('drivers').onDelete('SET NULL');
      table.enu('status', [
        'pending', 'accepted', 'preparing', 'ready',
        'picked_up', 'delivering', 'delivered', 'cancelled', 'refunded'
      ]).defaultTo('pending');
      table.decimal('subtotal', 12, 2).notNullable();
      table.decimal('delivery_fee', 12, 2).notNullable();
      table.decimal('commission', 12, 2).defaultTo(0);
      table.decimal('total', 12, 2).notNullable();
      table.decimal('pickup_lat', 10, 7);
      table.decimal('pickup_lng', 10, 7);
      table.decimal('delivery_lat', 10, 7);
      table.decimal('delivery_lng', 10, 7);
      table.string('delivery_address');
      table.text('notes');
      table.decimal('distance_km', 8, 2);
      table.timestamp('estimated_delivery');
      table.timestamp('accepted_at');
      table.timestamp('prepared_at');
      table.timestamp('picked_up_at');
      table.timestamp('delivered_at');
      table.timestamp('cancelled_at');
      table.string('cancellation_reason');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: order_items
    // ==========================================
    await db.schema.createTableIfNotExists('order_items', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE').notNullable();
      table.uuid('product_id').references('id').inTable('products').onDelete('SET NULL');
      table.string('product_name').notNullable();
      table.decimal('quantity', 10, 3).notNullable().defaultTo(1);
      table.decimal('unit_price', 12, 2).notNullable();
      table.decimal('total_price', 12, 2).notNullable();
      table.string('unit').defaultTo('piece'); // snapshot de l'unité au moment de la commande
      table.jsonb('selected_variants').defaultTo('[]');
      table.jsonb('selected_extras').defaultTo('[]');
      table.text('special_instructions');
    });

    // ==========================================
    // TABLE: payments
    // ==========================================
    await db.schema.createTableIfNotExists('payments', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('serdipay_tx_id');
      table.string('serdipay_reference');
      table.decimal('amount', 15, 2).notNullable();
      table.string('currency', 5).defaultTo('CDF');
      table.enu('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
      table.enu('type', ['client_payment', 'supplier_payout', 'driver_payout', 'refund']).notNullable();
      table.string('phone_number');
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: reviews
    // ==========================================
    await db.schema.createTableIfNotExists('reviews', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.uuid('reviewer_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('target_id').notNullable(); // driver or supplier id
      table.enu('target_type', ['driver', 'supplier']).notNullable();
      table.integer('rating').notNullable(); // 1-5
      table.text('comment');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: notifications
    // ==========================================
    await db.schema.createTableIfNotExists('notifications', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.string('title').notNullable();
      table.text('body');
      table.enu('type', ['order', 'payment', 'promo', 'system', 'chat']).defaultTo('system');
      table.boolean('is_read').defaultTo(false);
      table.jsonb('data').defaultTo('{}');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: delivery_zones
    // ==========================================
    await db.schema.createTableIfNotExists('delivery_zones', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('city').defaultTo('Bukavu');
      table.decimal('center_lat', 10, 7);
      table.decimal('center_lng', 10, 7);
      table.decimal('radius_km', 8, 2);
      table.decimal('base_fee', 12, 2).defaultTo(2000);
      table.decimal('per_km_fee', 12, 2).defaultTo(500);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: support_tickets
    // ==========================================
    await db.schema.createTableIfNotExists('support_tickets', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('order_id').references('id').inTable('orders').onDelete('SET NULL');
      table.string('subject').notNullable();
      table.text('description');
      table.enu('status', ['open', 'in_progress', 'resolved', 'closed']).defaultTo('open');
      table.enu('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
      table.uuid('assigned_to').references('id').inTable('users');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: support_messages
    // ==========================================
    await db.schema.createTableIfNotExists('support_messages', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('ticket_id').references('id').inTable('support_tickets').onDelete('CASCADE');
      table.uuid('sender_id').references('id').inTable('users').onDelete('SET NULL');
      table.text('message').notNullable();
      table.string('attachment_url');
      table.timestamps(true, true);
    });

    // ==========================================
    // TABLE: promotions
    // ==========================================
    await db.schema.createTableIfNotExists('promotions', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('supplier_id').references('id').inTable('suppliers').onDelete('CASCADE');
      table.string('code').unique();
      table.string('title').notNullable();
      table.text('description');
      table.enu('discount_type', ['percentage', 'fixed']).notNullable();
      table.decimal('discount_value', 12, 2).notNullable();
      table.decimal('min_order_amount', 12, 2).defaultTo(0);
      table.integer('max_uses').defaultTo(-1);
      table.integer('used_count').defaultTo(0);
      table.timestamp('starts_at');
      table.timestamp('expires_at');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    // ==========================================
    // INDEXES
    // ==========================================
    await db.raw('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online, is_validated, is_busy)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)');
    await db.raw('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)');

    // ==========================================
    // ALTER existing tables (idempotent)
    // ==========================================
    const addColIfMissing = async (tbl, col, fn) => {
      const has = await db.schema.hasColumn(tbl, col);
      if (!has) await db.schema.alterTable(tbl, fn);
    };
    await addColIfMissing('products', 'min_quantity', (t) => t.decimal('min_quantity', 10, 3).defaultTo(1));
    await addColIfMissing('products', 'step', (t) => t.decimal('step', 10, 3).defaultTo(1));
    await addColIfMissing('order_items', 'unit', (t) => t.string('unit').defaultTo('piece'));
    // Change quantity from integer to decimal (safe for existing data)
    await db.raw(`ALTER TABLE order_items ALTER COLUMN quantity TYPE decimal(10,3) USING quantity::decimal(10,3)`);
    // Set default unit on products that have null
    await db.raw(`UPDATE products SET unit = 'piece' WHERE unit IS NULL`);
    await db.raw(`UPDATE products SET min_quantity = 1 WHERE min_quantity IS NULL`);
    await db.raw(`UPDATE products SET step = 1 WHERE step IS NULL`);

    logger.info('✅ Migration terminée avec succès!');
  } catch (error) {
    logger.error('❌ Erreur de migration:', error);
    throw error;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  require('dotenv').config({ path: '../../../../.env' });
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrate };
