import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../src/server';
import { signTenantToken } from '../src/auth/tenantAuth';

describe('Tenant Auth Middleware', () => {
  let validToken: string;
  let invalidToken = 'Bearer deadbeef';

  beforeAll(() => {
    validToken = `Bearer ${signTenantToken({ sub: 'user-1', tenant_id: '11111111-1111-1111-1111-111111111111', email: 'user@example.com', role: 'finance' })}`;
  });

  it('should reject requests with no Authorization header', async () => {
    const res = await request(app).get('/api/budget-data');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized, missing token' });
  });

  it('should reject requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/budget-data')
      .set('Authorization', invalidToken);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden, invalid token' });
  });

  it('should accept requests with valid token and return tenant context', async () => {
    const res = await request(app)
      .get('/api/ping')
      .set('Authorization', validToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      tenant_id: '11111111-1111-1111-1111-111111111111'
    });
  });
});
