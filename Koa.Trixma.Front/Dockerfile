# Stage 1: Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Set placeholder environment variables for Vite build
# These will be replaced at runtime by entrypoint.sh
ENV VITE_API_BASE_URL=__VITE_API_BASE_URL__
ENV VITE_FIREBASE_API_KEY=__VITE_FIREBASE_API_KEY__
ENV VITE_FIREBASE_AUTH_DOMAIN=__VITE_FIREBASE_AUTH_DOMAIN__
ENV VITE_FIREBASE_PROJECT_ID=__VITE_FIREBASE_PROJECT_ID__
ENV VITE_FIREBASE_STORAGE_BUCKET=__VITE_FIREBASE_STORAGE_BUCKET__
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=__VITE_FIREBASE_MESSAGING_SENDER_ID__
ENV VITE_FIREBASE_APP_ID=__VITE_FIREBASE_APP_ID__
ENV VITE_FIREBASE_MEASUREMENT_ID=__VITE_FIREBASE_MEASUREMENT_ID__
ENV VITE_BUILD_ID=__VITE_BUILD_ID__

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copy the build output to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and setup the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Use the entrypoint script to inject env vars at runtime
ENTRYPOINT ["/entrypoint.sh"]
