#!/bin/bash
set -e

echo "🚀 Starting comprehensive build process..."

# Set production environment
export NODE_ENV=production

echo "📦 Installing dependencies..."
npm install

echo "🔍 Checking for TypeScript errors..."
npx tsc --noEmit

echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"

echo "📁 Checking build output..."
ls -la dist/

echo "📄 Checking dist contents..."
find dist/ -type f -name "*.html" -o -name "*.js" -o -name "*.css" | head -10

echo "🎉 Build process completed successfully!"
