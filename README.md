# 🚌 University Bus Tracking System

A real-time bus tracking system for university students and faculty, built with modern web technologies and real-time GPS tracking capabilities.

## 🌟 Features

### ✅ Implemented (Phase 1 & 2)
- **Real-time GPS Tracking**: Live location updates via WebSockets
- **Driver Interface**: Mobile-friendly dashboard for bus drivers
- **Authentication**: Secure login with Supabase Auth
- **Database**: PostgreSQL with PostGIS for spatial data
- **WebSocket Server**: Real-time communication
- **Responsive Design**: Works on desktop and mobile devices

### 🚧 Coming Soon (Phase 3-6)
- **Student Map Interface**: Real-time map with bus markers
- **Admin Panel**: Bus and driver management
- **ETA Calculations**: Arrival time predictions
- **Route Visualization**: Interactive route display
- **Historical Data**: Location history and analytics

## 🛠️ Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST API
- **Socket.IO** for real-time communication
- **PostgreSQL** with PostGIS extension
- **Supabase** for authentication and database
- **Joi** for data validation

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time updates
- **MapLibre GL** for maps (Phase 3)
- **React Router** for navigation

## 📁 Project Structure

```
bus-tracking-system/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── config/         # Database, environment configs
│   │   ├── middleware/     # CORS, rate limiting
│   │   ├── models/         # Database models
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # WebSocket handlers
│   │   └── utils/          # Helper functions
│   ├── scripts/            # Database initialization
│   └── server.ts           # Main server file
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── config/         # Supabase config
│   │   ├── services/       # API services
│   │   └── App.tsx         # Main app component
│   └── index.html          # HTML entry point
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+ with PostGIS extension
- Supabase account

### 1. Clone the Repository
```bash
git clone https://github.com/Tir25/BTS.git
cd BTS
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env
# Edit .env with your database and Supabase credentials

# Initialize database
psql -d your_database -f scripts/init-database.sql

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp env.example .env
# Edit .env with your Supabase and backend URLs

# Start development server
npm run dev
```

### 4. Access the Application
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Driver Interface**: http://localhost:5173/driver
- **Health Check**: http://localhost:3000/health

## 🔧 Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Database Schema

### Key Tables
- `profiles`: User profiles with roles (student, driver, admin)
- `drivers`: Driver information
- `buses`: Bus fleet management
- `routes`: Route paths with PostGIS LineString geometry
- `driver_bus_assignments`: Driver-bus-route assignments
- `live_locations`: Real-time location data with PostGIS Point geometry

### PostGIS Features
- Spatial indexing for fast geospatial queries
- Point geometry for bus locations
- LineString geometry for route paths
- Distance and ETA calculations

## 🔌 WebSocket Events

### Driver Events
- `driver:authenticate` - Authenticate driver with token
- `driver:locationUpdate` - Send location update
- `driver:authenticated` - Authentication confirmation
- `driver:locationConfirmed` - Location update confirmation

### Student Events (Phase 3)
- `student:connect` - Connect as student
- `student:connected` - Connection confirmation
- `bus:locationUpdate` - Receive bus location updates

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### WebSocket Testing
```bash
cd backend
node test-websocket.js
```

## 📱 Driver Interface

The driver interface is fully functional and includes:
- **Authentication**: Secure login with Supabase
- **GPS Tracking**: Real-time location tracking
- **WebSocket Connection**: Live updates to backend
- **Mobile Responsive**: Optimized for mobile devices
- **Status Monitoring**: Connection and tracking status

## 🔒 Security Features

- **Authentication**: Supabase Auth with JWT tokens
- **Role-based Access**: Driver, Admin, Student roles
- **Data Validation**: Comprehensive input validation
- **CORS Protection**: Domain-specific access control
- **Rate Limiting**: API request throttling

## 🚧 Development Phases

### Phase 1 ✅ - Backend Foundation
- Express server setup
- PostgreSQL + PostGIS integration
- Supabase authentication
- Basic API endpoints

### Phase 2 ✅ - Real-time Location
- WebSocket server implementation
- Driver interface
- GPS tracking functionality
- Database schema completion

### Phase 3 🚧 - Student Map Interface
- MapLibre GL integration
- Real-time bus markers
- Route visualization
- ETA calculations

### Phase 4 📋 - Admin Panel
- Bus management interface
- Driver management
- Route management
- Analytics dashboard

### Phase 5 📋 - Advanced Features
- Historical data tracking
- Route optimization
- Delay notifications
- Multi-city support

### Phase 6 📋 - Deployment
- Production environment setup
- Docker configuration
- CI/CD pipeline
- Monitoring & logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Tir25** - [GitHub Profile](https://github.com/Tir25)

## 🙏 Acknowledgments

- Supabase for authentication and database services
- MapLibre for open-source mapping
- PostgreSQL and PostGIS for spatial data management
- Socket.IO for real-time communication

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/Tir25/BTS/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Status**: Phase 2 Complete - Ready for Phase 3 Development
**Last Updated**: August 2025
