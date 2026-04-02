# Requirements & Constraints

This document lists the technical requirements and constraints for building, running, and deploying the project.

## Core Tooling

- **Runtime**: Node.js (current LTS recommended)
- **Package Manager**: npm
- **Framework**: React 18+ with Vite
- **Language**: TypeScript (strict mode enabled)
- **Infrastructure**: Pulumi CLI, Google Cloud SDK (`gcloud`)
- **Containerization**: Docker & Docker Compose

## Environment Variables

The application uses a "Build Once, Run Anywhere" approach. Variables are injected at runtime via `entrypoint.sh`.

- `apiBaseUrl`: The base URL for the Trixma API.
- `VITE_FIREBASE_API_KEY`: (and other Firebase config vars, if used via Vite)

## Deployment Constraints

- **Platform**: GCP Cloud Run (v2).
- **Registry**: Google Artifact Registry.
- **CI/CD**: GitHub Actions.
- **Authentication**: `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS` JSON key.

## Technical Constraints

- **Single Page App (SPA)**: Routing must be handled by `react-router-dom`. Nginx is configured to serve `index.html` for all 404s.
- **State Management**: Local React state and hooks are currently preferred over global stores like Redux unless complexity increases significantly.
- **Styling**: Standard CSS with a focus on CSS Variables for theming.
- **API Interaction**: All backend calls must go through the `src/trixma.ts` client.
