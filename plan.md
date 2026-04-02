# S151 Sovereign MTFS Simulator Plan

## Project Vision
Build a high-precision, multi-tenant MTFS Simulator for UK Local Government Finance that delivers 5-year deterministic forecasts, tenant-isolated data, and scenario overlay visual comparison. This is for Section 151 Officers and must align with Local Government Finance Act 1988/2003 and CIPFA FReM/FMC best practice.

---

## Sprint 1: The Secure Foundation

- [ ] Setup Next.js + Node.js + TypeScript monorepo
- [ ] Setup PostgreSQL database w/ schema for tenants, users, budgets, ledger_entries
- [ ] Implement PostgreSQL Row-Level Security (RLS) concept and policy drafts
- [ ] Secure auth layer with JWT + tenant_id embed (sub + tenant_id)
- [ ] Implement middleware prototype: JWT-to-tenant scoping
- [ ] Implement error handling for unauthorized cross-tenant access
- [ ] Setup unit tests for JWT scoping and unauthorized access rejection
- [ ] CI: run tests on push/pull request

### Sprint 1 Milestones
- [ ] `db/migrations` created + initial tables
- [ ] `src/auth` JWT tenant scope middleware in place
- [ ] `tests/auth.spec.ts` validating tenant-bound requests
- [ ] RLS policy in DB with `tenant_id` enforcement

---

## Sprint 2: The Logic Engine & API Layer

- [ ] Implement `services/finance/forecastService.ts` with Decimal.js for all money calculations
- [ ] Build Council Tax, Business Rates, Pay Awards curve engines
- [ ] Guarantee 1.99% cap enforcement as max annual increase in service code
- [ ] Create `api/data-ingestion` endpoints (ERP actuals, balance sheet, capex, opex)
- [ ] Build API layer to surface `tenant_id` from auth context
- [ ] Add ledger entry write path for immutable entries on each budget update
- [ ] Add memoization cache for what-if recalculation (in-memory + redis optional)
- [ ] Unit tests for 100% coverage on formulas, including boundary conditions

### Sprint 2 Milestones
- [ ] `services/finance/forecastService.ts` with all Decimal.js formulas
- [ ] `api/ingest/erp.ts` endpoint with tenant scoping and validation
- [ ] `tests/finance/forecast.spec.ts` all formula branches covered
- [ ] `ledger_entries` writes with user/timestamp + version-hash

---

## Sprint 3: The Interactive UI & Scenario Branching

- [ ] Build 
  - `components/WhatIfSlider`, `components/ScenarioToolbar`, `components/FanChartOverlay`
  - Using Tailwind CSS and Recharts/D3 fan chart overlay
- [ ] Implement branching logic in client state store:
  - baseline, cabinet proposal, council option, stress scenario
- [ ] Persist scenario branches via API (budget branches + parent link)
- [ ] Build scenario diffing engine and incremental recalculation hook
- [ ] Storybook stories for interactive controls and overlay chart
- [ ] Unit tests for UI state management and scenario diff logic

### Sprint 3 Milestones
- [ ] `storybook` components configured
- [ ] `tests/ui/branching.spec.ts` for diffing and user actions
- [ ] `components/FanChartOverlay` with synchronized multi-line path and variance labels
- [ ] `memoization` validated <100ms for precomputed what-if model calls

---

## Sprint 4: Compliance, Reporting & Stress Testing

- [ ] Implement `services/stress/stochasticStressTest.ts` for Black Swan modeling
- [ ] Add pre-defined events (inflation spike, funding cut, interest shock) with distribution sampling
- [ ] Implement Section 25 robustness report generator
- [ ] Add Puppeteer-based PDF exporter from report pages
- [ ] Full WCAG 2.1 accessibility checks on key flows
- [ ] Unit tests for stress test output and PDF generation checksum/integrity

### Sprint 4 Milestones
- [ ] `tests/stress/stress.spec.ts` scenario rating and avoidable shortfall detection
- [ ] `reports/section25.ts` route + PDF exporter in `utils/pdfExporter.ts`
- [ ] `tests/accessibility/wcag.spec.ts` pass for all route snapshots
- [ ] `ledger_entries` receives versioned report snapshots + audit trail

---

## Non-Functional Requirements

- Decimal.js for all currency and rate math. No float in core forecasting.
- PostgreSQL RLS enforced by `tenant_id` and builtin row-level security
- Immutable audit ledger in `ledger_entries` (user_id, timestamp, payload, hash, previous_hash)
- Memoization for what-if recalculation, <100ms on 5-year scenario path
- Scenario overlays in chart layer (Recharts/D3 fan chart with multi-line variance)
- Full test coverage for business-critical math and security paths

---

## Output Samples

### Code Sample 1 (Precision): TypeScript 5-year forecast service

```ts
// services/finance/forecastService.ts
import Decimal from 'decimal.js';

type ForecastParams = {
  startYear: number;
  years: number;
  baseCouncilTax: string; // use strings for exact Decimal construction
  councilTaxIncreaseRate: string; // percent
  baseBusinessRates: string;
  businessRatesGrowth: string;
  payAwardRate: string;
};

type ForecastPoint = {
  year: number;
  councilTax: Decimal;
  businessRates: Decimal;
  payCosts: Decimal;
  totalExpenditure: Decimal;
};

export class ForecastService {
  static MAX_INCREASE = new Decimal(1.99);

  static enforceCap(ratePct: Decimal) {
    if (ratePct.gt(ForecastService.MAX_INCREASE)) {
      return ForecastService.MAX_INCREASE;
    }
    return ratePct;
  }

  static fiveYearForecast(params: ForecastParams): ForecastPoint[] {
    const results: ForecastPoint[] = [];

    let councilTax = new Decimal(params.baseCouncilTax);
    let businessRates = new Decimal(params.baseBusinessRates);
    let payCosts = new Decimal(params.baseBusinessRates).mul(new Decimal(0.5)); // example base

    const councilRate = ForecastService.enforceCap(new Decimal(params.councilTaxIncreaseRate));
    const businessRate = ForecastService.enforceCap(new Decimal(params.businessRatesGrowth));
    const payAwardRate = ForecastService.enforceCap(new Decimal(params.payAwardRate));

    for (let i = 0; i < params.years; i++) {
      const year = params.startYear + i;

      councilTax = councilTax.mul(new Decimal(1).plus(councilRate.div(100)));
      businessRates = businessRates.mul(new Decimal(1).plus(businessRate.div(100)));
      payCosts = payCosts.mul(new Decimal(1).plus(payAwardRate.div(100)));

      const totalExpenditure = councilTax.plus(businessRates).plus(payCosts);

      results.push({
        year,
        councilTax: councilTax.toDecimalPlaces(2),
        businessRates: businessRates.toDecimalPlaces(2),
        payCosts: payCosts.toDecimalPlaces(2),
        totalExpenditure: totalExpenditure.toDecimalPlaces(2),
      });
    }

    return results;
  }
}
```

### Code Sample 2 (Unit Test): Vitest/Jest forecast-suite for 100% math accuracy

```ts
// tests/finance/forecast.spec.ts
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { ForecastService } from '../../services/finance/forecastService';

describe('ForecastService', () => {
  it('enforces the 1.99% cap on inputs', () => {
    expect(ForecastService.enforceCap(new Decimal(2.5)).toString()).toBe('1.99');
    expect(ForecastService.enforceCap(new Decimal(1.5)).toString()).toBe('1.5');
  });

  it('returns deterministic 5-year output with exact Decimal math', () => {
    const points = ForecastService.fiveYearForecast({
      startYear: 2026,
      years: 5,
      baseCouncilTax: '100000000.00',
      councilTaxIncreaseRate: '1.99',
      baseBusinessRates: '50000000.00',
      businessRatesGrowth: '1.99',
      payAwardRate: '1.99',
    });

    expect(points).toHaveLength(5);

    const first = points[0];
    expect(first.councilTax.toString()).toBe(new Decimal('100000000').mul(new Decimal(1.0199)).toDecimalPlaces(2).toString());

    const last = points[4];
    expect(last.year).toBe(2030);
    expect(last.totalExpenditure.eq(
      points.reduce((sum, p) => sum.plus(p.totalExpenditure), new Decimal(0)),
    )).toBe(false); // explicit calculation ensures no accidental reuse
  });
});
```

### Code Sample 3 (Security): PostgreSQL RLS policy for `budget_data`

```sql
-- db/migrations/2026xx_create_budget_data.sql
CREATE TABLE IF NOT EXISTS budget_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  budget_year INT NOT NULL,
  line_item TEXT NOT NULL,
  value NUMERIC(20,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_data_tenant_policy
  ON budget_data
  FOR ALL
  TO public
  USING (tenant_id = current_setting('app.current_tenant')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::UUID);

-- In session setup, set tenant context from JWT middleware:
-- SET app.current_tenant = '...';
```

---

## Audit Ledger (`ledger_entries` table spec)

- `id` UUID PK
- `tenant_id` UUID NOT NULL
- `user_id` UUID NOT NULL
- `action` TEXT NOT NULL
- `payload` JSONB NOT NULL
- `entry_hash` TEXT NOT NULL
- `prev_hash` TEXT NULL
- `created_at` TIMESTAMPTZ DEFAULT NOW()

`ledger_entries` is append-only; every mutation path journaling ensures immutable history for S151 governance.
