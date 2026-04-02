import jwt from 'jsonwebtoken';

export type TenantJwtPayload = {
  sub: string; // user id
  tenant_id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

export function signTenantToken(payload: Omit<TenantJwtPayload, 'iat' | 'exp'>, expiresIn = '1h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyTenantToken(token: string): TenantJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as TenantJwtPayload;

  if (!decoded.tenant_id) {
    throw new Error('tenant_id missing in token');
  }

  return decoded;
}
