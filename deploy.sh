#!/bin/sh -e
# Build on host and restart the moodtune-app container.
# Usage: ./deploy.sh

cd "$(dirname "$0")"

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Restarting moodtune-app..."
./prod.sh up -d --force-recreate moodtune-app

echo "Done."
