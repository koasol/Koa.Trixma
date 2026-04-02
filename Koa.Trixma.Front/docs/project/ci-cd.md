# CI/CD with GitHub Actions

This project includes a GitHub Actions workflow for automated testing and deployment.

## Required GitHub Secrets

Before the workflow can run successfully, you must add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

1.  **`PULUMI_ACCESS_TOKEN`**: Your Pulumi personal access token. You can create one at [app.pulumi.com](https://app.pulumi.com/account/tokens).
2.  **`GCP_SA_KEY`**: A Google Cloud Service Account JSON key.
    *   The Service Account needs permissions for: Artifact Registry, Cloud Run, Storage, and IAM (to assign the `run.invoker` role).
    *   Create the key in the [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts) and paste the entire JSON content into this secret.

## Workflow Logic

The workflow defined in `.github/workflows/deploy.yml` operates as follows:

-   **Lint & Type Check**: Runs on every push and pull request to ensure code quality.
-   **Deployment**:
    -   When you push to **`main`**, it automatically deploys to the **`dev`** stack.
    -   When you push to **`develop`**, it deploys to a **`staging`** stack (if configured).
-   **Previews**: On Pull Requests to `main`, it runs `pulumi preview` so you can see infrastructure changes before merging.

## Environment Promotion

To add a new environment (e.g., `production`):
1.  Create a new Pulumi stack: `pulumi stack init prod`.
2.  Copy `Pulumi.dev.yaml` to `Pulumi.prod.yaml` and update the values.
3.  Update the `PULUMI_STACK` mapping in `.github/workflows/deploy.yml` to include your production branch.

## Environment Variables at Runtime

The application uses a "Build Once, Run Anywhere" approach. Environment variables are injected at runtime by the `entrypoint.sh` script, meaning you can promote the same image across different environments just by changing the Cloud Run configuration.
