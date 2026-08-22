import jwt from 'jsonwebtoken';

export const generateSaToken = (saUser) => {
  return jwt.sign({
    id: saUser._id,
    name: saUser.name,
    email: saUser.email,
    role: 'SUPER_SUPER_ADMIN',
  },
  process.env.JWT_SECRET || 'SuperSuperAdminSecretJwtKey2026!',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const verifySaToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'SuperSuperAdminSecretJwtKey2026!');
};
