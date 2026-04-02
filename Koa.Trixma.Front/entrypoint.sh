#!/bin/sh

# Replace placeholders in JS files
# This allows us to use the same image for different environments
# Placeholders should be in the format __VITE_VARIABLE_NAME__

echo "Replacing environment variables in JS files..."

for file in /usr/share/nginx/html/assets/*.js; do
  sed -i "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" "$file"
  sed -i "s|__VITE_FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY}|g" "$file"
  sed -i "s|__VITE_FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN}|g" "$file"
  sed -i "s|__VITE_FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID}|g" "$file"
  sed -i "s|__VITE_FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET}|g" "$file"
  sed -i "s|__VITE_FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID}|g" "$file"
  sed -i "s|__VITE_FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID}|g" "$file"
  sed -i "s|__VITE_FIREBASE_MEASUREMENT_ID__|${VITE_FIREBASE_MEASUREMENT_ID}|g" "$file"
  sed -i "s|__VITE_BUILD_ID__|${VITE_BUILD_ID}|g" "$file"
done

echo "Done. Starting Nginx..."
exec nginx -g 'daemon off;'
