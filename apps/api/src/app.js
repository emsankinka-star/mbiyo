const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const supplierRoutes = require('./routes/supplier.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const driverRoutes = require('./routes/driver.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const reviewRoutes = require('./routes/review.routes');
const supportRoutes = require('./routes/support.routes');
const deliveryZoneRoutes = require('./routes/deliveryZone.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Sécurité
app.use(helmet());

// CORS
const corsOriginsEnv = process.env.CORS_ORIGINS || '*';
const corsOrigins = corsOriginsEnv === '*' ? '*' : corsOriginsEnv.split(',').filter(Boolean);
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Compression pour connexions lentes (Afrique)
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
});
app.use('/api/', limiter);

// Parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Logs
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Mbiyo API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/delivery-zones', deliveryZoneRoutes);

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

module.exports = app;
