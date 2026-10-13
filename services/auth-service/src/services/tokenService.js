const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function generateRefreshTokenData(userId, existingFamilyId = null) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const tokenId = `rft_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const familyId = existingFamilyId || `fam_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

  return {
    tokenId,
    rawToken,
    tokenHash,
    familyId,
    expiresAt,
  };
}

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshTokenData,
};
