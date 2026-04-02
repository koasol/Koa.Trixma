# ADR-002: GraphQL — Installed but Not Exposed

**Date:** 2026-03-31
**Status:** Pending decision

## Context

Hot Chocolate (GraphQL server) is installed in the Data layer and referenced in the project. No schema or resolvers have been implemented yet.

## Options

1. **REST only** — remove Hot Chocolate, keep the API purely REST. Simpler, less overhead.
2. **GraphQL for queries only** — expose a read-only GraphQL endpoint alongside the existing REST API. Useful for flexible frontend queries (e.g. dashboard summaries).
3. **Full GraphQL** — replace REST controllers with GraphQL mutations and queries.

## Current Status

Undecided. Hot Chocolate is installed but dormant. The REST API is the active interface.

## Decision

_To be made._ When a decision is reached, update this ADR with the rationale and close it as Accepted or Rejected.
