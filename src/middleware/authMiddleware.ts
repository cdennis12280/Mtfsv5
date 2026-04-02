import { Request, Response, NextFunction } from 'express';
import { verifyTenantToken, TenantJwtPayload } from '../auth/tenantAuth';

declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: TenantJwtPayload;
  }
}

export function tenantAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized, missing token' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyTenantToken(token);
    req.tenantContext = payload;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden, invalid token' });
  }
}

export function requireTenantId(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantContext?.tenant_id) {
    return res.status(403).json({ error: 'Forbidden, tenant scope required' });
  }
  next();
}
