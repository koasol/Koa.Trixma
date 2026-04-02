import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as docker from "@pulumi/docker";
import * as path from "path";

// Import configuration
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

const apiBaseUrl = config.require("apiBaseUrl");
const firebaseApiKey = config.require("firebaseApiKey");
const firebaseAuthDomain = config.require("firebaseAuthDomain");
const firebaseProjectId = config.require("firebaseProjectId");
const firebaseStorageBucket = config.require("firebaseStorageBucket");
const firebaseMessagingSenderId = config.require("firebaseMessagingSenderId");
const firebaseAppId = config.require("firebaseAppId");
const firebaseMeasurementId = config.require("firebaseMeasurementId");

// Enable necessary GCP services
const artifactRegistryService = new gcp.projects.Service("artifactregistry-service", {
    service: "artifactregistry.googleapis.com",
    disableOnDestroy: false,
});

const cloudRunServiceApi = new gcp.projects.Service("cloudrun-service-api", {
    service: "run.googleapis.com",
    disableOnDestroy: false,
});

// 1. Create an Artifact Registry repository to store the Docker image
const repository = new gcp.artifactregistry.Repository("trixma-repo", {
    format: "DOCKER",
    repositoryId: "trixma-front",
    location: region,
    description: "Docker repository for Trixma Frontend",
}, { dependsOn: [artifactRegistryService] });

// 2. Build and push the Docker image
// Use a unique tag per deployment to avoid stale images being reused
// Prefer a tag provided by CI (GitHub SHA), then fallback to current timestamp
const imageTag = process.env.PULUMI_IMAGE_TAG || process.env.GITHUB_SHA || `${Date.now()}`;
const repositoryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${repository.repositoryId}/trixma-front`;

// Get current GCP client config to get an access token for pushing to Artifact Registry
// This allows pushing without running 'gcloud auth configure-docker' locally
const clientConfig = gcp.organizations.getClientConfig({});

const appImage = new docker.Image("trixma-image", {
    imageName: pulumi.interpolate`${repositoryUrl}:${imageTag}`,
    build: {
        context: path.join(__dirname, ".."),
        dockerfile: path.join(__dirname, "..", "Dockerfile"),
        platform: "linux/amd64",
    },
    registry: {
        server: pulumi.interpolate`${region}-docker.pkg.dev`,
        username: "oauth2accesstoken",
        password: clientConfig.then(config => config.accessToken),
    },
});

// 3. Create the Cloud Run service
const cloudRunService = new gcp.cloudrunv2.Service("trixma-service", {
    location: region,
    template: {
        containers: [{
            // Use the image digest so Cloud Run always picks up new revisions when the image content changes
            image: appImage.repoDigest,
            ports: {
                containerPort: 80,
            },
            envs: [
                { name: "VITE_API_BASE_URL", value: apiBaseUrl },
                { name: "VITE_FIREBASE_API_KEY", value: firebaseApiKey },
                { name: "VITE_FIREBASE_AUTH_DOMAIN", value: firebaseAuthDomain },
                { name: "VITE_FIREBASE_PROJECT_ID", value: firebaseProjectId },
                { name: "VITE_FIREBASE_STORAGE_BUCKET", value: firebaseStorageBucket },
                { name: "VITE_FIREBASE_MESSAGING_SENDER_ID", value: firebaseMessagingSenderId },
                { name: "VITE_FIREBASE_APP_ID", value: firebaseAppId },
                { name: "VITE_FIREBASE_MEASUREMENT_ID", value: firebaseMeasurementId },
                { name: "VITE_BUILD_ID", value: imageTag },
            ],
        }],
    },
}, { dependsOn: [cloudRunServiceApi] });

// 4. Allow unauthenticated access (Public access)
// This is necessary for a frontend application so that the browser can load the assets.
new gcp.cloudrunv2.ServiceIamMember("trixma-noauth", {
    location: region,
    name: cloudRunService.name,
    role: "roles/run.invoker",
    member: "allUsers",
});

// 1. Define your custom domain
const customDomainName = "www.trixma.app"; // <-- Change this to your domain

// 2. Create the domain mapping
const domainMapping = new gcp.cloudrun.DomainMapping("trixma-domain-mapping", {
    location: region,
    name: customDomainName,
    metadata: {
        namespace: project, // This refers to the 'project' variable already defined in your file
    },
    spec: {
        routeName: cloudRunService.name, // Maps to your 'trixma-service'
    },
});

// 3. Export the custom URL
export const customUrl = pulumi.interpolate`https://${domainMapping.name}`;

// Export the URL of the Cloud Run service
export const url = cloudRunService.uri;
