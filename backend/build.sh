#!/bin/bash

# Build script that ensures environment variables are loaded properly
set -e

echo "🏗️  Starting build process..."

# Load environment variables
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Copy generated files
if [ -d "src/generated" ]; then
    echo "📋 Copying generated files..."
    cp -r src/generated dist/src/
fi

# Copy environment file
if [ -f .env ]; then
    echo "📋 Copying .env to dist/"
    cp .env dist/
fi

echo "✅ Build completed successfully!"
