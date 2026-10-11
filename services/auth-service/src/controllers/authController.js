const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repository/userRepository');
const tokenRepository = require('../repository/tokenRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AuthController {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body || {};

      // 1. Validation
      const errors = [];
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push({ field: 'name', issue: 'Name must be at least 2 characters long' });
      }

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        errors.push({ field: 'email', issue: 'A valid email address is required' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        errors.push({ field: 'password', issue: 'Password must be at least 6 characters long' });
      }

      const validRoles = ['customer', 'vendor'];
      if (!role || !validRoles.includes(role)) {
        errors.push({
          field: 'role',
          issue: role === 'admin'
            ? 'Admin registration is not permitted in V1'
            : "Role must be either 'customer' or 'vendor'",
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: errors,
          },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 2. Check for duplicate email
      const existingUser = await userRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already registered',
            details: [{ field: 'email', issue: 'Email already in use' }],
          },
        });
      }

      // 3. Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // 4. Create user
      const id = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      const newUser = await userRepository.createUser({
        id,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
      });

      // 5. Response (201)
      return res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at,
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already registered',
            details: [{ field: 'email', issue: 'Email already in use' }],
          },
        });
      }
      next(err);
    }
  }

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            details: [],
          },
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = await userRepository.findByEmail(normalizedEmail);

      // Generic authentication error to prevent user enumeration
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            details: [],
          },
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            details: [],
          },
        });
      }

      // 1. Issue access token (expires in 900 seconds)
      const accessToken = jwt.sign(
        {
          sub: user.id,
          role: user.role,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // 2. Issue refresh token
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const tokenId = `rft_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
      const expiresAt = new Date(Date.now() + config.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

      await tokenRepository.createRefreshToken({
        id: tokenId,
        userId: user.id,
        token: refreshToken,
        expiresAt,
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        expiresIn: config.jwtExpiresIn,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body || {};

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
            details: [],
          },
        });
      }

      const tokenRecord = await tokenRepository.findRefreshToken(refreshToken);

      if (!tokenRecord || tokenRecord.revoked || new Date(tokenRecord.expires_at) < new Date()) {
        return res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token is invalid, expired, or revoked',
            details: [],
          },
        });
      }

      const user = await userRepository.findById(tokenRecord.user_id);
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Associated user no longer exists',
            details: [],
          },
        });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          sub: user.id,
          role: user.role,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return res.status(200).json({
        accessToken: newAccessToken,
        expiresIn: config.jwtExpiresIn,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      const userId = req.user?.id;
      const { refreshToken } = req.body || {};

      if (refreshToken) {
        await tokenRepository.revokeRefreshToken(refreshToken);
      }

      if (userId) {
        await tokenRepository.revokeAllUserTokens(userId);
      }

      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me
  async getMe(req, res, next) {
    try {
      const userId = req.user?.id;
      const user = await userRepository.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            details: [],
          },
        });
      }

      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/auth/me
  async updateMe(req, res, next) {
    try {
      const userId = req.user?.id;
      const { name } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name must be at least 2 characters long',
            details: [{ field: 'name', issue: 'Must be at least 2 characters' }],
          },
        });
      }

      const updated = await userRepository.updateName(userId, name.trim());
      if (!updated) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            details: [],
          },
        });
      }

      return res.status(200).json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.created_at,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/internal/users/:id
  async getInternalUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userRepository.findById(id);

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: `User ${id} not found`,
            details: [],
          },
        });
      }

      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
