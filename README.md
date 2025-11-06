# University Bus Tracking System

## Folder Structure (High-Level)

This project follows a clear, navigable structure so new developers can get productive quickly:

- `backend/` – Express API, middleware, sockets, services, models, and config
  - `src/controllers/` – Route controllers (business logic per route)
  - `src/routes/` – Express routers (wires endpoints to controllers/middleware)
  - `src/middleware/` – Cross-cutting concerns (auth, validation, rate limits, error handling)
  - `src/services/` – Domain services (DB, caching, monitoring, websockets)
  - `src/utils/` – Utilities (logger, performance guards, etc.)
  - `src/sockets/` – WebSocket server initialization
  - `src/models/` – DB models and initialization

- `frontend/` – React app (Vite)
  - `src/components/` – UI components grouped by domain; reusable UI in `components/common`
    - `common/` – Reusable UI primitives (`Button`, `Input`, `Card`, `Modal`)
    - `error/` – Error boundaries and error UI
  - `src/pages/` – Page-level components (if present)
  - `src/hooks/` – Reusable hooks (`useApi`, `useSafeAsync`, etc.)
  - `src/utils/` – Utilities (logger, error handling, validation, interceptors)
  - `src/services/` – Client-side services (API, websocket, storage, resilience)
  - `src/context/` – React contexts/providers
  - `src/assets/` – Static assets (if present)

## Naming Conventions

- Components: `PascalCase` (e.g., `BusCard.tsx`, `ErrorBoundary.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useAuth.ts`, `useApi.ts`)
- Functions/variables: `camelCase`
- Constants: `UPPER_CASE`
- Files: meaningful, domain-oriented names (e.g., `MapService.ts`, `LocationService.ts`)

## Key Cross-Cutting Patterns

- Centralized logging: `backend/src/utils/logger.ts`, `frontend/src/utils/logger.ts`
- Centralized error handling: `backend/src/middleware/errorHandler.ts`, `frontend/src/utils/errorHandler.ts`
- Fault isolation: React Error Boundaries (`frontend/src/components/error/ErrorBoundary.tsx`) and async wrappers
- DRY API: `frontend/src/services/api.ts` (generic HTTP helpers), `frontend/src/hooks/useApi.ts`
- Reusable UI: `frontend/src/components/common/` exports in `index.ts`

## Import Shortcuts

- Reusable UI: `import { Button, Input } from '@/components/common'`
- Hooks: `import { useApi } from '@/hooks/useApi'`
- Services: `import { api } from '@/services/api'`

> Tip: See each folder's `index.ts` to discover available exports.

A real-time bus tracking system designed for university campuses, providing live location updates, route management, and comprehensive administrative controls.

## 🚀 Features

### For Students
- **Real-time Bus Tracking**: Live location updates with interactive maps
- **Route Information**: Detailed route information with stops and schedules
- **ETA Predictions**: Accurate arrival time estimates with real-time updates
- **Mobile-Friendly Interface**: Responsive design optimized for all devices

### For Drivers
- **Location Sharing**: Automatic GPS location updates with high accuracy
- **Route Navigation**: Turn-by-turn directions and route guidance
- **Status Updates**: Easy status reporting and communication

### For Administrators
- **Fleet Management**: Complete bus and driver management with real-time status
- **Route Planning**: Visual route editor with stop management
- **Analytics Dashboard**: Real-time statistics and performance metrics
- **User Management**: Driver and admin account management with role-based access

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for responsive styling
- **MapLibre GL** for interactive maps
- **Socket.IO Client** for real-time updates
- **Supabase** for authentication

### Backend
- **Node.js** with TypeScript
- **Express.js** for RESTful API
- **Socket.IO** for real-time communication
- **PostgreSQL** with PostGIS for spatial data
- **Supabase** for database and real-time subscriptions
- **JWT** for secure authentication

## 🚀 Production Status

✅ **PRODUCTION READY** - The system is thoroughly tested and ready for deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd university-bus-tracking-system

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Development
```bash
# Start both servers
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
```

### Production
```bash
# Build and start
npm run build
npm start
```

## 📁 Project Structure

```
├── backend/                 # Backend API server
│   ├── src/               # Source code
│   └── dist/              # Compiled JavaScript
├── frontend/              # React frontend
│   ├── src/               # Source code
│   └── dist/              # Built frontend
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API and WebSocket reference
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Technical architecture details
- **[Server Management](SERVER_MANAGEMENT_GUIDE.md)** - Server management and troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Open an issue on GitHub
