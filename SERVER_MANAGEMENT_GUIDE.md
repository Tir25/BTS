# 🚀 Server Management Guide

## Quick Start

### Start Both Servers
```bash
npm run dev
```

### Start Servers Individually
```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend
```

## Server Management Commands

### Development
- `npm run dev` - Start both servers with comprehensive monitoring
- `npm run dev:simple` - Start both servers with basic concurrently
- `npm run dev:backend` - Start backend in development mode
- `npm run dev:frontend` - Start frontend in development mode
- `npm run dev:backend:prod` - Start backend with compiled JavaScript

### Production
- `npm run build` - Build both backend and frontend
- `npm run start` - Start backend in production mode
- `npm run start:backend` - Start backend server
- `npm run start:frontend` - Start frontend server

### Health Checks
- `npm run health` - Comprehensive health check of all services
- `npm run health:backend` - Quick backend health check
- `npm run health:frontend` - Quick frontend health check

### Testing
- `npm run test:backend` - Test backend server startup
- `npm run test:minimal` - Minimal backend test

## Server Ports

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **WebSocket**: ws://localhost:3000

## Health Endpoints

- **Basic Health**: http://localhost:3000/health
- **Detailed Health**: http://localhost:3000/health/detailed
- **Frontend**: http://localhost:5173

## Troubleshooting

### Backend Issues
1. Check if backend is compiled: `cd backend && npm run build`
2. Check environment variables: `cd backend && cat .env.local`
3. Test database connection: `npm run test:backend`
4. Check logs for specific errors

### Frontend Issues
1. Check if dependencies are installed: `cd frontend && npm install`
2. Check environment variables: `cd frontend && cat .env.local`
3. Clear cache: `cd frontend && rm -rf node_modules/.vite`
4. Rebuild: `cd frontend && npm run build`

### Common Solutions

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 5173
npx kill-port 3000 5173
```

#### Environment Issues
```bash
# Copy environment templates
cp backend/env.example backend/.env.local
cp frontend/env.template frontend/.env.local
```

#### Database Connection Issues
- Check if Supabase credentials are correct
- Verify database URL format
- Test connection with health check

#### Build Issues
```bash
# Clean and rebuild
npm run build:backend
npm run build:frontend
```

## Monitoring and Logs

### Backend Logs
- Console output with colored logging
- Database connection status
- WebSocket connection status
- Request/response logging

### Frontend Logs
- Vite development server logs
- Build process logs
- Environment configuration logs

### Health Monitoring
- Use `npm run health` for comprehensive checks
- Monitor response times
- Check service availability
- Verify all endpoints are responding

## Performance Optimization

### Backend
- Database connection pooling
- Request rate limiting
- CORS optimization
- WebSocket connection management

### Frontend
- Vite build optimization
- Asset compression
- Code splitting
- Lazy loading

## Security Considerations

### Environment Variables
- Never commit `.env` files
- Use strong passwords for production
- Rotate API keys regularly
- Monitor access logs

### CORS Configuration
- Configured for development and production
- Supports VS Code tunnels
- Network access for cross-laptop testing

### Rate Limiting
- API rate limiting enabled
- Authentication rate limiting
- WebSocket connection limits

## Deployment

### Production Checklist
- [ ] Environment variables set
- [ ] Database credentials configured
- [ ] CORS origins updated
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Health checks passing
- [ ] Logs configured
- [ ] Monitoring enabled

### Build Process
1. `npm run build` - Build both servers
2. `npm run health` - Verify health
3. Deploy to production environment
4. Monitor logs and performance

## Support

For issues or questions:
1. Check this guide first
2. Run health checks
3. Check server logs
4. Verify environment configuration
5. Test individual components

## Advanced Usage

### Custom Ports
```bash
# Backend on custom port
PORT=4000 npm run dev:backend

# Frontend on custom port  
npm run dev:frontend -- --port 3001
```

### Debug Mode
```bash
# Backend with debug logs
DEBUG=* npm run dev:backend

# Frontend with verbose logs
npm run dev:frontend -- --debug
```

### Network Access
- Backend: http://0.0.0.0:3000
- Frontend: http://0.0.0.0:5173
- WebSocket: ws://0.0.0.0:3000
