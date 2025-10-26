# Bus Tracking System (BTS) Setup Guide

This guide provides instructions for setting up the Bus Tracking System (BTS) development environment.

## Prerequisites

- Node.js v18.19.0 or higher (recommended v20+)
- npm v8 or higher
- Git

## Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd BTS
   ```

2. Install dependencies from the root directory:
   ```bash
   npm install
   ```

   This will install dependencies for both frontend and backend workspaces.

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create environment files:
   ```bash
   cp env.template .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The backend server will start on port 3001.

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Create environment files:
   ```bash
   cp env.template .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend server will start on port 5173.

## Troubleshooting

### Missing Dependencies

If you encounter errors about missing dependencies, try the following:

1. Clean install from the root directory:
   ```bash
   npm ci
   ```

2. If specific packages are missing, install them explicitly:
   ```bash
   # For frontend
   cd frontend
   npm install -D @vitejs/plugin-react

   # For backend
   cd backend
   npm install type-is
   ```

### Port Conflicts

If you encounter port conflicts:

1. For backend, modify the port in `backend/src/server.ts`:
   ```typescript
   const PORT = 3002; // Change to an available port
   ```

2. For frontend, the default port is 5173. If it's in use, Vite will automatically try the next available port.

## Development Workflow

1. Run both servers simultaneously:
   ```bash
   # From root directory
   npm run dev
   ```

2. For TypeScript type checking:
   ```bash
   # For frontend
   cd frontend
   npm run type-check
   ```

3. For linting:
   ```bash
   # For frontend
   cd frontend
   npm run lint

   # For backend
   cd backend
   npm run lint
   ```

## Project Structure

- `/frontend` - React frontend application
- `/backend` - Express backend server
- `/shared` - Shared types and utilities
- `/docs` - Documentation files

## Environment Variables

See `.env.template` files in both frontend and backend directories for required environment variables.
