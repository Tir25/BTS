# University Bus Tracking System

A production-ready realtime bus tracking platform for universities. Drivers publish live locations, students monitor buses on interactive maps, and administrators manage fleet operations—all backed by Supabase, Express, React, and Socket.IO.

> 📚 For the full technical reference (architecture, APIs, deployment, troubleshooting), read `docs/PROJECT_DOCUMENTATION.md`.

## Folder Structure (High-Level)

This project follows a clear, navigable structure so new developers can get productive quickly:

- `backend/` – Express API, middleware, sockets, services, models, and config
  - `src/controllers/` – Route controllers (business logic per route)
  - `src/routes/` – Express routers (wires endpoints to controllers/middleware)
  - `src/middleware/` – Cross-cutting concerns (auth, validation, rate limits, error handling)
  - `src/services/` – Domain services (DB, caching, monitoring, websockets)
  - `src/utils/` – Utilities (logger, performance guards, etc.)
  - `src/websocket/` – Modular WebSocket handlers (connection, location, driver, student, admin)
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

## 🧭 Architecture At A Glance

- **Realtime pipeline:** Driver WebSocket updates → Express services → Postgres/PostGIS persistence → Socket.IO broadcasts → Student map/Web clients.
- **Backend services:** Modular Express routes/controllers with Redis caching, monitoring endpoints, and Supabase-backed auth.
- **Frontend app:** Vite + React SPA with lazy loading, Zustand stores, React Query, and MapLibre for live visualizations.
- **Ops & tooling:** Docker Compose stack (Postgres, Redis, backend, frontend, Prometheus, Grafana), Render + Vercel deployment targets, Kubernetes manifests, and comprehensive monitoring APIs.

Dive deeper in the [Architecture section of the project documentation](docs/PROJECT_DOCUMENTATION.md#4-architecture-overview).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### Installation & Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd university-bus-tracking-system

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Copy environment templates (fill in Supabase and DB credentials)
cp backend/env.template backend/.env.local
cp frontend/env.template frontend/.env.local
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

## 🚢 Deployment Options

- **Local Docker Stack:** `docker-compose -f deploy/docker-compose.yml up --build` brings up Postgres, Redis, backend, frontend (nginx), Prometheus, and Grafana for an end-to-end lab environment.
- **Render + Vercel:** Deploy backend via `render.yaml`, serve the frontend with `frontend/vercel.json`, and provision Supabase for database/auth.
- **Kubernetes:** Sample manifests live in `infrastructure/k8s/`; pair with the load balancer and monitoring configs in `infrastructure/load-balancer/` and `infrastructure/monitoring/`.
- **Environment management:** Keep production secrets in platform secret stores. Rotate Supabase service-role keys regularly and update `backend/.env.production`.

See [Deployment & Environments](docs/PROJECT_DOCUMENTATION.md#9-deployment-environments--tooling) for detailed instructions and operational checklists.

## 📁 Project Structure

```
├── backend/                 # Backend API server
│   ├── src/               # Source code
│   │   ├── services/      # Business logic services
│   │   │   ├── database/  # Database services (Bus, Driver, Route)
│   │   │   ├── assignments/ # Assignment services (Dashboard, Creation, Validation)
│   │   │   └── routes/    # Route services (Query, Mutation)
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # Express routers
│   │   ├── middleware/    # Express middleware
│   │   └── models/        # Database models
│   └── dist/              # Compiled JavaScript
├── frontend/              # React frontend
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   │   ├── driver/    # Driver interface components and hooks
│   │   │   └── map/       # Map components and hooks
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── driverTracking/ # Driver tracking hooks
│   │   ├── services/      # Client-side services
│   │   └── utils/         # Utility functions
│   └── dist/              # Built frontend
├── docs/                  # Documentation
│   └── PROJECT_DOCUMENTATION.md    # Comprehensive system guide
└── scripts/               # Utility scripts
```

### Service Architecture (Backend)

The backend uses a **facade pattern** for backward compatibility while encouraging the use of specialized services:

- **Database Services:** `BusDatabaseService`, `DriverDatabaseService`, `RouteDatabaseService`
- **Assignment Services:** `AssignmentDashboardService`, `AssignmentCreationService`, `AssignmentValidationService`
- **Route Services:** `RouteQueryService`, `RouteMutationService`

> **Note:** Legacy services (`UnifiedDatabaseService`, `ProductionAssignmentService`, `RouteService`) still work but are marked as `@deprecated`. New code should use the specialized services directly.

### Component Architecture (Frontend)

The frontend uses **custom hooks** to extract logic from components:

- **Driver Interface:** `useStopsManagement`, `useDriverInterfaceState`, `useDriverSignOut`, `useStopReachedHandler`
- **Driver Tracking:** `useGPSAccuracy`, `useTrackingErrors`, `useWebSocketLocationSync`
- **Student Map:** `useStudentMapState`, `useBusMarkerManagement`, `useRouteManagement`, `useBusIdManagement`

> **See:** [Project Documentation – Frontend Architecture](docs/PROJECT_DOCUMENTATION.md#7-frontend-application-react--vite) for migration guidance and detailed component patterns.

## 📚 Documentation

- **[Project Documentation](docs/PROJECT_DOCUMENTATION.md)** – Single source of truth covering architecture, APIs, realtime flows, deployment, security, and troubleshooting.
- `README.md` (this file) – Quick start reference for environment setup and repository structure.

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
