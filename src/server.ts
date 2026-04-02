import express from 'express';
import bodyParser from 'body-parser';
import { tenantAuthMiddleware } from './middleware/authMiddleware';
import budgetRoutes from './routes/budgetRoutes';

const app = express();
app.use(bodyParser.json());
app.use(tenantAuthMiddleware);
app.use('/api', budgetRoutes);

app.get('/api/ping', (req, res) => {
  const tenantId = req.tenantContext?.tenant_id ?? 'unknown';
  res.json({ status: 'ok', tenant_id: tenantId });
});

app.get('/', (_, res) => res.send('MTFS Simulator API')); 

export default app;
