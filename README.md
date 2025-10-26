# University Bus Tracking System

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
