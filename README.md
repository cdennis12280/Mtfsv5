# Mtfsv5

## S151 Sovereign MTFS Simulator

This repository holds the architectural plan for a high-precision, multi-tenant MTFS Simulator aligned to UK local government finance requirements.

## Files created

- `plan.md` - Sprint plan with mandatory controls and code samples.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Run unit tests:

```bash
npm test
# or
npm run vitest -- --run
```

4. Lint & format:

```bash
npm run lint
npm run format
```

## PostgreSQL setup snippet

```bash
psql -v ON_ERROR_STOP=1 -U postgres -d mtfs_dev -f db/migrations/initial.sql
```

## Notes

- Use Decimal.js for all currency math.
- Use PostgreSQL RLS with tenant context (`app.current_tenant`).
- Keep `ledger_entries` append-only.
