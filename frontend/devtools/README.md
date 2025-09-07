# Development and Testing Tools

This directory contains HTML files used during development and testing. These files are not part of the production build and won't be deployed to Vercel.

## Contents

- `test-*.html` - Various test files for WebSocket, API, CORS, and other functionality
- `debug-*.html` - Debug utilities for cross-laptop connections and network configurations
- `*-client.html` - Different client implementations for testing
- `raw-websocket-test.html` - WebSocket testing utility
- `clear-cache.html` - Browser cache management utility

## Usage

These files can be accessed directly from the filesystem during local development or through the dev server when running `npm run dev`.

## Deployment

None of these files are included in the production build output (`dist/`) and are not deployed to Vercel. They are maintained in the repository for development and testing purposes only.
