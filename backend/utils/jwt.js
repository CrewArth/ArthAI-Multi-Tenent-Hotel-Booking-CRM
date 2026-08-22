import jwt from 'jsonwebtoken';
import { normalizeRole } from './roles.js';

export const generateToken = (user, tenantContext = {}) => {
    const {
        tenantId = 'default',
        dbName = process.env.DEFAULT_TENANT_DB || 'gh_tenant_default',
        secret_key = null,
        ip_address = '127.0.0.1',
        config = {}
    } = tenantContext;

    return jwt.sign({
        id: user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        role: normalizeRole(user.role),
        tenantId,
        dbName,
        secret_key,
        ip_address,
        config,
        eSignatureUrl: user.eSignatureUrl || null,
    },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

export const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};