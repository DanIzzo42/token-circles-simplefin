#!/bin/bash

# Install dependencies script for cloud sessions

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  echo "Not in cloud session, skipping dependency installation"
  exit 0
fi

echo "Installing dependencies for cloud session..."

# Navigate to project directory (this script lives in <repo>/scripts)
cd "$(dirname "$0")/.."

# Install Node.js dependencies
npm install

# Build the application
npm run build

echo "Dependencies installed successfully!"