# University Bus Tracking System

A comprehensive bus tracking system with real-time location tracking, admin dashboard, and role-based authentication.

## Project Structure

\\\
â”œâ”€â”€ frontend/                 # React frontend application
â”œâ”€â”€ backend/                  # Node.js backend API
â”œâ”€â”€ docs/                     # Project documentation
â”œâ”€â”€ sql/                      # Database scripts and migrations
â”œâ”€â”€ scripts/                  # Utility scripts
â””â”€â”€ temp/                     # Temporary files (to be deleted)
\\\

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Supabase account
- Git

### Installation
1. Clone the repository
2. Install dependencies:
   \\\ash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   \\\

3. Set up environment variables (see docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

4. Run the development servers:
   \\\ash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   \\\

## Authentication

The system uses Supabase Authentication with role-based access:
- **Admin**: Full system access
- **Driver**: Location updates and route management
- **Student**: View-only access to bus locations

### Default Admin Credentials
- Email: tirthraval27@gmail.com
- Password: Tirth Raval27

## Documentation

- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Supabase Authentication Implementation](docs/SUPABASE_AUTH_IMPLEMENTATION.md)
- [Live Map Integration Guide](docs/LIVE_MAP_INTEGRATION_GUIDE.md)
- [Management System Implementation](docs/COMPLETE_MANAGEMENT_SYSTEM_IMPLEMENTATION.md)

## Database

The system uses Supabase (PostgreSQL) with the following main tables:
- \profiles\ - User profiles and roles
- \uses\ - Bus information
- \outes\ - Bus routes
- \live_locations\ - Real-time bus locations
- \users\ - User management

## Features

- Real-time bus tracking
- Admin dashboard
- Role-based authentication
- Media upload and management
- Live map integration
- CRUD operations for buses, routes, and drivers
- Production-ready deployment

## Monitoring

- Supabase Dashboard for database monitoring
- Real-time authentication logs
- Performance monitoring
- Error tracking

## Development

### Frontend
- React with TypeScript
- Vite for build tooling
- Leaflet for maps
- Supabase client for authentication

### Backend
- Node.js with Express
- TypeScript
- Supabase integration
- WebSocket for real-time updates

## Deployment

See [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## License

This project is part of a university assignment.

## Contributing

This is a university project. For questions or issues, contact the development team.
