const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { db } = require('../database');
const { apiResponse, normalizePhone, generateTokens } = require('../utils/helpers');
const logger = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');

// generateTokens est maintenant dans helpers.js (partagé entre auth, supplier, driver)

const authController = {
  /**
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse(res, 400, errors.array(), 'Données invalides');
      }

      const { full_name, email, password } = req.body;
      const phone = normalizePhone(req.body.phone);

      // IMPORTANT: Tout utilisateur est créé comme 'client'.
      // Le rôle sera mis à jour vers 'supplier' ou 'driver'
      // uniquement lors de la création du profil correspondant
      // (POST /suppliers/register ou POST /drivers/register).
      const role = 'client';

      // Vérifier si l'utilisateur existe
      const existing = await db('users').where('phone', phone).first();
      if (existing) {
        return apiResponse(res, 409, null, 'Ce numéro de téléphone est déjà utilisé');
      }

      if (email) {
        const existingEmail = await db('users').where('email', email).first();
        if (existingEmail) {
          return apiResponse(res, 409, null, 'Cet email est déjà utilisé');
        }
      }

      // Hasher le mot de passe
      const password_hash = await bcrypt.hash(password, 12);

      // Créer l'utilisateur
      const [user] = await db('users')
        .insert({ full_name, email, phone, password_hash, role })
        .returning(['id', 'full_name', 'email', 'phone', 'role', 'created_at']);

      // Générer les tokens
      const tokens = generateTokens(user);

      // Sauvegarder le refresh token
      await db('users').where('id', user.id).update({
        refresh_token: tokens.refreshToken,
      });

      logger.info(`Nouvel utilisateur inscrit: ${user.phone} (${user.role})`);

      return apiResponse(res, 201, {
        user,
        ...tokens,
      }, 'Inscription réussie');
    } catch (error) {
      logger.error('Erreur inscription:', error);
      return apiResponse(res, 500, null, 'Erreur lors de l\'inscription');
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse(res, 400, errors.array(), 'Données invalides');
      }

      const { email, password } = req.body;
      const phone = normalizePhone(req.body.phone);

      if (!phone && !email) {
        return apiResponse(res, 400, null, 'Téléphone ou email requis');
      }

      // Trouver l'utilisateur par téléphone ou email
      const user = phone
        ? await db('users').where('phone', phone).first()
        : await db('users').where('email', email).first();
      if (!user) {
        return apiResponse(res, 401, null, 'Identifiants incorrects');
      }

      if (!user.is_active) {
        return apiResponse(res, 403, null, 'Compte désactivé');
      }

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return apiResponse(res, 401, null, 'Identifiants incorrects');
      }

      // Générer les tokens
      const tokens = generateTokens(user);

      await db('users').where('id', user.id).update({
        refresh_token: tokens.refreshToken,
      });

      const { password_hash, refresh_token, ...safeUser } = user;

      logger.info(`Connexion: ${user.phone}`);

      return apiResponse(res, 200, {
        user: safeUser,
        ...tokens,
      }, 'Connexion réussie');
    } catch (error) {
      logger.error('Erreur login:', error);
      return apiResponse(res, 500, null, 'Erreur lors de la connexion');
    }
  },

  /**
   * POST /api/auth/refresh-token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken: token } = req.body;
      if (!token) {
        return apiResponse(res, 400, null, 'Refresh token requis');
      }

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await db('users').where('id', decoded.id).first();

      if (!user || user.refresh_token !== token) {
        return apiResponse(res, 401, null, 'Refresh token invalide');
      }

      const tokens = generateTokens(user);
      await db('users').where('id', user.id).update({
        refresh_token: tokens.refreshToken,
      });

      return apiResponse(res, 200, tokens);
    } catch (error) {
      return apiResponse(res, 401, null, 'Refresh token invalide ou expiré');
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      await db('users').where('id', req.user.id).update({ refresh_token: null, fcm_token: null });
      return apiResponse(res, 200, null, 'Déconnexion réussie');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur lors de la déconnexion');
    }
  },

  /**
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const user = await db('users')
        .select('id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'lang', 'is_verified', 'latitude', 'longitude', 'created_at')
        .where('id', req.user.id)
        .first();

      if (!user) {
        return apiResponse(res, 404, null, 'Utilisateur non trouvé');
      }

      // Ajouter les infos spécifiques au rôle
      if (user.role === 'driver') {
        user.driver = await db('drivers').where('user_id', user.id).first();
      } else if (user.role === 'supplier') {
        user.supplier = await db('suppliers').where('user_id', user.id).first();
      }

      return apiResponse(res, 200, user);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/auth/me
   */
  async updateProfile(req, res) {
    try {
      const { full_name, email, avatar_url, lang } = req.body;
      const updates = {};
      if (full_name) updates.full_name = full_name;
      if (email) updates.email = email;
      if (avatar_url) updates.avatar_url = avatar_url;
      if (lang) updates.lang = lang;

      const [user] = await db('users')
        .where('id', req.user.id)
        .update(updates)
        .returning(['id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'lang']);

      return apiResponse(res, 200, user, 'Profil mis à jour');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur lors de la mise à jour');
    }
  },

  /**
   * PUT /api/auth/me/avatar
   */
  async uploadAvatar(req, res) {
    try {
      if (!req.file) return apiResponse(res, 400, null, 'Image requise');

      // Supprimer l'ancien avatar
      const existing = await db('users').where('id', req.user.id).first();
      if (existing?.avatar_url) await deleteFromCloudinary(existing.avatar_url);

      const { url } = await uploadToCloudinary(req.file, 'avatars', COMPRESS_PRESETS.avatar);

      const [user] = await db('users')
        .where('id', req.user.id)
        .update({ avatar_url: url })
        .returning(['id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'lang']);

      return apiResponse(res, 200, user, 'Avatar mis à jour');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur upload avatar');
    }
  },

  /**
   * PUT /api/auth/me/password
   */
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const user = await db('users').where('id', req.user.id).first();

      const isValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isValid) {
        return apiResponse(res, 400, null, 'Mot de passe actuel incorrect');
      }

      const password_hash = await bcrypt.hash(new_password, 12);
      await db('users').where('id', req.user.id).update({ password_hash });

      return apiResponse(res, 200, null, 'Mot de passe modifié');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur lors du changement de mot de passe');
    }
  },

  /**
   * PUT /api/auth/me/location
   */
  async updateLocation(req, res) {
    try {
      const { latitude, longitude } = req.body;
      await db('users').where('id', req.user.id).update({ latitude, longitude });

      // Si c'est un livreur, mettre à jour aussi dans la table drivers
      if (req.user.role === 'driver') {
        await db('drivers').where('user_id', req.user.id).update({
          current_lat: latitude,
          current_lng: longitude,
        });
      }

      return apiResponse(res, 200, { latitude, longitude });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur de mise à jour de la position');
    }
  },

  /**
   * PUT /api/auth/me/fcm-token
   */
  async updateFcmToken(req, res) {
    try {
      const { fcm_token } = req.body;
      await db('users').where('id', req.user.id).update({ fcm_token });
      return apiResponse(res, 200, null, 'Token FCM mis à jour');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur');
    }
  },
};

module.exports = authController;
