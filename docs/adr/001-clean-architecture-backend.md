# ADR-001: Clean Architecture for Backend

**Date:** 2026-03-31
**Status:** Accepted

## Context

The backend needs to be maintainable, testable, and not tightly coupled to infrastructure concerns (database, external services).

## Decision

Use Clean Architecture with four distinct layers:

1. **Domain** — pure entities, no dependencies
2. **Data** — EF Core, repositories, migrations
3. **Application** — business logic, service interfaces and implementations
4. **API** — ASP.NET Core controllers, middleware, DI configuration

Dependency rule: outer layers depend on inner layers, never the reverse.

## Consequences

- Controllers never access `DbContext` directly — always via a service
- Services never access EF Core directly — always via a repository
- Domain entities have no framework dependencies
- Enables unit testing of Application layer by mocking repository interfaces
