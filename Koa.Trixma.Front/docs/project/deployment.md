# Deployment Guide

This project uses Pulumi to manage infrastructure and deploy to GCP Cloud Run.

## Prerequisites

1.  **GCP Project**: Created as `funkoa-trixma-front`.
2.  **Pulumi CLI**: Installed on your local machine.
3.  **Docker**: Installed and running (required for building the image).
4.  **Google Cloud SDK (gcloud)**: Required for authentication.
    *   **Installation**: [Download and install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
    *   **Authentication**: After installation, run `gcloud auth application-default login` to allow Pulumi to access your GCP account.

## Infrastructure Setup

1.  Navigate to the infrastructure directory:
    ```bash
    cd infrastructure
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment variables in `Pulumi.dev.yaml` or via command line:
    ```bash
    pulumi config set trixma-infra:apiBaseUrl https://your-api.com
    # ... and other variables
    ```

## Deploying

To deploy the application, run:
```bash
pulumi up
```

This will:
1.  Create a Google Artifact Registry repository.
2.  Build the Docker image locally.
3.  Push the image to the registry.
4.  Deploy the image to Cloud Run (v2).
5.  Set up public access.

After the deployment is complete, Pulumi will output the `url` of your application.

## Troubleshooting

### 'gcloud' is not recognized
If you see an error stating that `gcloud` is not recognized:
1.  **Install the Google Cloud CLI**: Download it from [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install).
2.  **Restart your terminal**: Ensure the new PATH variables are loaded.
3.  **Alternative (Service Account)**: If you cannot install `gcloud`, you can use a Service Account Key:
    *   Create a Service Account in GCP with `Editor` or `Owner` permissions.
    *   Download the JSON key file.
    *   Set the environment variable: `set GOOGLE_APPLICATION_CREDENTIALS=path/to/your/key.json` (Windows) or `export GOOGLE_APPLICATION_CREDENTIALS=path/to/your/key.json` (Linux/Mac).
    *   Pulumi will use this key instead of your personal login.
