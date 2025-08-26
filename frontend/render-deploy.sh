#!/bin/bash
set -e

echo "🚀 Starting Render deployment script..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building application..."
npm run build

# Create the expected directory structure
echo "📁 Creating expected directory structure..."
mkdir -p ../frontend/dist
cp -r dist/* ../frontend/dist/

echo "📂 Verifying frontend/dist directory..."
ls -la ../frontend/dist/

echo "🎉 Render deployment script completed successfully!"
