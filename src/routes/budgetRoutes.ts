import { Router } from 'express';
import { withTenant } from '../lib/db';
import { requireTenantId } from '../middleware/authMiddleware';

const router = Router();

router.get('/budget-data', requireTenantId, async (req, res) => {
  const tenantId = req.tenantContext!.tenant_id;

  try {
    const rows = await withTenant(tenantId, async (client) => {
      const result = await client.query('SELECT id, budget_year, line_item, value FROM budget_data WHERE tenant_id = $1', [tenantId]);
      return result.rows;
    });
    res.json({ tenant_id: tenantId, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

export default router;
