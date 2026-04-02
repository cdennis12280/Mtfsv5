-- 0001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  budget_year INT NOT NULL,
  line_item TEXT NOT NULL,
  value NUMERIC(20,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  entry_hash TEXT NOT NULL,
  prev_hash TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on budget_data and ledger_entries
ALTER TABLE budget_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS policy, tenant-based scoping
CREATE POLICY tenant_isolation_policy
  ON budget_data
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY ledger_tenant_isolation_policy
  ON ledger_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);
