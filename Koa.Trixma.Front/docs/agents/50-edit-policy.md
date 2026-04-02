# Edit Policy

To maintain project quality and reliability, all contributors (including AI agents) must follow these rules when modifying the codebase.

## General Principles

1. **Safety First**: Never hardcode secrets, API keys, or service account credentials.
2. **Consistency**: Follow existing patterns for components, styling, and file organization.
3. **Minimalism**: Implement the smallest change necessary to achieve the goal.
4. **Validation**: Always verify changes by building the project or running tests (if available).

## Safe Areas for AI Edits

- **UI Components (`src/components/`, `src/*.tsx`)**: Adding or refining UI elements following existing CSS patterns.
- **Documentation (`docs/`, `README.md`)**: Updating or clarifying documentation.
- **TypeScript Types**: Improving type safety or adding new interface definitions.

## Restricted Areas (Require Caution)

- **Infrastructure (`infrastructure/`)**: Any change to Pulumi code can impact deployment and costs. Review with `pulumi preview`.
- **Build Config (`vite.config.ts`, `package.json`)**: Changes here can break the build pipeline.
- **Runtime Scripts (`entrypoint.sh`, `nginx.conf`)**: Critical for the containerized application.

## Style Guide

- **Indentation**: 2 spaces.
- **Naming**: PascalCase for components, camelCase for functions/variables.
- **CSS**: Use CSS variables for colors (see `App.css` for defined themes).
- **Comments**: Keep comments sparse and high-signal. Avoid commenting on obvious code.

## Verification Checklist

- [ ] Does it compile? (`npm run build`)
- [ ] Does it follow the existing style?
- [ ] Are all environment variables handled via `entrypoint.sh` injection?
- [ ] For infrastructure: did you run `pulumi preview`?
