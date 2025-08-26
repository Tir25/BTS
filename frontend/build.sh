#!/bin/bash
echo "Starting build process..."
npm install
npm run build
echo "Build completed. Checking dist directory..."
ls -la dist/
echo "Build script finished."
