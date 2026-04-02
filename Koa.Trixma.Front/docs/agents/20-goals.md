# Goals & Non-Goals

## Primary Goals

- **System Management**: Provide a user interface for users to list, view, and create "Systems" managed by the Trixma backend.
- **Secure Access**: Ensure only authenticated users (via Google/Firebase) can access system data and management features.
- **Responsive & Consistent UI**: Offer a modern, theme-aware (Light/Dark mode) dashboard experience.
- **Cloud-Native Deployment**: Maintain a reliable CI/CD pipeline for deploying the frontend to GCP Cloud Run using Pulumi.

## Key Features

- **Google Authentication**: Seamless login using Firebase Auth.
- **Systems Dashboard**: Overview of all registered systems with status and stats.
- **System Detail View**: Deep dive into specific system configurations and status.
- **Creation Flow**: Form for registering new systems.
- **Dynamic Theming**: Support for user-selected or system-preferred light/dark themes.

## Non-Goals

- **Direct Database Manipulation**: The frontend must not interact with any database directly; all data must flow through the `trixma` API client.
- **Mobile Native Apps**: This project is a web-only frontend; mobile support is achieved via responsive web design.
- **Backend Logic**: Data processing, storage, and complex business logic are handled by the Trixma backend.
