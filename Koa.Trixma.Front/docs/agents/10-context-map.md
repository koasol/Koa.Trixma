# Context Map (Project Structure)

This map helps locate key project areas and files for easier navigation and editing.

## Project Structure Overview

- **`src/`**: Main React + TypeScript application source.
  - `src/main.tsx`: App entry point.
  - `src/App.tsx`: Main application component, including routing.
  - `src/Dashboard.tsx`: Dashboard view logic.
  - `src/trixma.ts`: API client for the Trixma backend.
  - `src/assets/`: Static assets and some config like `firebase.ts`.
- **`infrastructure/`**: Pulumi code (using Node.js/TypeScript) for GCP Cloud Run and Artifact Registry deployment.
- **`public/`**: Public static assets served at the root.
- **`.github/workflows/`**: CI/CD configuration (deployment to dev/staging stacks).
- **`docker-compose.yml`, `Dockerfile`, `entrypoint.sh`, `nginx.conf`**: Everything related to containerization and local/production serving.
- **`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`**: Tooling and build configurations.

## Critical Files

- `package.json`: Frontend dependencies and scripts.
- `infrastructure/package.json`: Infrastructure dependencies.
- `entrypoint.sh`: Critical runtime script that injects environment variables before starting Nginx.
- `nginx.conf`: Nginx configuration for serving the built React app.
- `src/trixma.ts`: Central point for interacting with the backend.
