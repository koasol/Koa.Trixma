# ADR-003: TimescaleDB for Measurement Storage

**Date:** 2026-03-31
**Status:** Accepted

## Context

IoT devices report measurements continuously. Over time this table will be the largest in the database and must support efficient range queries (e.g. "all readings for unit X in the last 7 days").

## Decision

Use TimescaleDB extension on PostgreSQL. The `Measurements` table is converted to a hypertable partitioned by `Timestamp`.

- Composite primary key: `(Id, Timestamp)` — required by TimescaleDB hypertables
- Index on `(UnitId, Timestamp)` for fast per-device range queries
- Migration handles `CREATE EXTENSION timescaledb` and `create_hypertable` call

## Consequences

- PostgreSQL instance must have TimescaleDB installed
- EF Core migrations include raw SQL for TimescaleDB setup (not portable to other DBs)
- Standard EF Core queries work normally — TimescaleDB optimizes execution transparently
- Composite PK means EF `Find()` requires both Id and Timestamp — use repository methods instead
