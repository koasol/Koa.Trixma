# Architecture Overview

Koa.Trixma.Front is a modern web application designed for scalability and ease of deployment.

## Frontend Stack

- **React**: Component-based UI library.
- **Vite**: Ultra-fast build tool and development server.
- **TypeScript**: Static typing for improved developer experience and code quality.
- **React Router**: Client-side routing for a Single Page Application (SPA) experience.
- **Firebase Auth**: Managed authentication service for secure Google Sign-in.

## Serving & Containerization

- **Docker**: The application is packaged as a Docker image for consistent behavior across environments.
- **Nginx**: High-performance web server used to serve static assets and handle client-side routing.
- **`entrypoint.sh`**: A critical custom script that:
  1. Detects environment variables at container startup.
  2. Injects them into a `window._env_` global variable (or replaces placeholders in the built JS).
  3. Starts Nginx.

## Infrastructure as Code (IaC)

- **Pulumi**: Used to define and manage GCP resources in TypeScript.
- **GCP Cloud Run**: Serverless platform for running containerized applications.
- **GCP Artifact Registry**: Secure storage for Docker images.

## Data Flow

1. **User Request**: Browser hits the Cloud Run URL.
2. **Nginx**: Serves `index.html` and static JS/CSS.
3. **App Initialization**: React app starts, Firebase checks auth state.
4. **API Calls**: App communicates with the Trixma backend API via the base URL injected at runtime.
