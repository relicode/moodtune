#!/bin/sh -e
# Build on host and restart the moodtune-app container.
# Usage: ./deploy.sh

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Restarting moodtune-app..."
docker compose up -d --force-recreate --remove-orphans moodtune-app

echo "Done."
