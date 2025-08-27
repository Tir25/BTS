import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import {
  saveLocationUpdate,
  getDriverBusInfo,
} from '../services/locationService';
import { RouteService } from '../services/routeService';
import { validateLocationData } from '../utils/validation';

interface LocationUpdate {
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface AuthenticatedSocket extends Socket {
  driverId?: string;
  busId?: string;
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  lastActivity?: number;
}

export const initializeWebSocket = (io: SocketIOServer) => {
  console.log('🔌 WebSocket server initialized');

  // Enhanced Socket.IO configuration for production deployment
  io.engine.opts.pingTimeout = 60000; // 60 seconds
  io.engine.opts.pingInterval = 25000; // 25 seconds
  io.engine.opts.upgradeTimeout = 10000; // 10 seconds
  io.engine.opts.maxHttpBufferSize = 1e6; // 1MB
  io.engine.opts.allowEIO3 = true; // Allow Engine.IO v3 clients
  io.engine.opts.cors = {
    origin: true, // Allow all origins (handled by CORS middleware)
    credentials: true,
  };

  // Connection monitoring
  let totalConnections = 0;
  let activeConnections = 0;

  io.on('connection', async (socket: AuthenticatedSocket) => {
    totalConnections++;
    activeConnections++;
    socket.lastActivity = Date.now();
    
    console.log(`🔌 New client connected: ${socket.id} (Total: ${totalConnections}, Active: ${activeConnections})`);

    // Set socket options for better mobile support
    socket.conn.on('packet', ({ type }) => {
      if (type === 'pong') {
        console.log(`💓 Pong received from ${socket.id}`);
        socket.lastActivity = Date.now();
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      socket.lastActivity = Date.now();
      console.log(`💓 Ping received from ${socket.id}`);
    });

    // Enhanced driver authentication with better error handling
    socket.on('driver:authenticate', async (data: { token: string }) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('driver:authentication_failed', { 
            message: 'Authentication token required',
            code: 'MISSING_TOKEN'
          });
          return;
        }

        // Validate token format
        if (typeof token !== 'string' || token.length < 10) {
          socket.emit('driver:authentication_failed', { 
            message: 'Invalid token format',
            code: 'INVALID_TOKEN_FORMAT'
          });
          return;
        }

        const {
          data: { user },
          error,
        } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
          console.error('❌ Authentication error:', error);
          socket.emit('driver:authentication_failed', { 
            message: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          });
          return;
        }

        console.log(
          '🔐 Driver authentication attempt for user:',
          user.id,
          user.email
        );

        // Check for dual-role users in auth metadata
        const authRoles = user.user_metadata?.roles;
        const isDualRoleUser =
          authRoles && Array.isArray(authRoles) && authRoles.includes('driver');

        // Check profiles table for role
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // Allow access if user has driver role in auth metadata OR profiles table
        const hasDriverRole =
          isDualRoleUser || (profile && profile.role === 'driver');

        if (!hasDriverRole) {
          socket.emit('driver:authentication_failed', {
            message: 'Access denied. Driver role required.',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
          return;
        }

        const busInfo = await getDriverBusInfo(user.id);
        console.log('🚌 Bus info for driver:', user.id, ':', busInfo);

        if (!busInfo) {
          console.log('❌ No bus assigned to driver:', user.id);
          socket.emit('driver:authentication_failed', { 
            message: 'No bus assigned to driver',
            code: 'NO_BUS_ASSIGNED'
          });
          return;
        }

        // Set socket properties
        socket.driverId = user.id;
        socket.busId = busInfo.bus_id;
        socket.isAuthenticated = true;
        socket.lastActivity = Date.now();

        // Join relevant rooms
        socket.join(`driver:${user.id}`);
        socket.join(`bus:${busInfo.bus_id}`);

        console.log(
          `✅ Driver ${user.id} authenticated and assigned to bus ${busInfo.bus_id}`
        );

        const authResponse = {
          driverId: user.id,
          busId: busInfo.bus_id,
          busInfo: busInfo,
        };

        console.log('✅ Sending authentication response:', authResponse);
        socket.emit('driver:authenticated', authResponse);
      } catch (error) {
        console.error('❌ Authentication error:', error);
        socket.emit('driver:authentication_failed', { 
          message: 'Authentication failed',
          code: 'AUTH_ERROR'
        });
      }
    });

    // Enhanced location update with validation
    socket.on('driver:locationUpdate', async (data: LocationUpdate) => {
      try {
        socket.lastActivity = Date.now();
        
        console.log('📍 Received location update from driver:', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          socketDriverId: socket.driverId,
          socketBusId: socket.busId,
        });

        if (!socket.driverId || !socket.busId || !socket.isAuthenticated) {
          socket.emit('error', { 
            message: 'Driver not authenticated',
            code: 'NOT_AUTHENTICATED'
          });
          return;
        }

        const validationError = validateLocationData(data);
        if (validationError) {
          socket.emit('error', { 
            message: validationError,
            code: 'VALIDATION_ERROR'
          });
          return;
        }

        if (data.driverId !== socket.driverId) {
          socket.emit('error', { 
            message: 'Unauthorized location update',
            code: 'UNAUTHORIZED'
          });
          return;
        }

        const savedLocation = await saveLocationUpdate({
          driverId: data.driverId,
          busId: socket.busId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading,
        });

        if (!savedLocation) {
          socket.emit('error', { 
            message: 'Failed to save location update',
            code: 'SAVE_ERROR'
          });
          return;
        }

        const busInfo = await getDriverBusInfo(data.driverId);
        let etaInfo = null;
        let nearStopInfo = null;

        if (busInfo?.route_id) {
          etaInfo = await RouteService.calculateETA(
            {
              bus_id: socket.busId!,
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp,
            },
            busInfo.route_id
          );

          nearStopInfo = await RouteService.checkBusNearStop(
            {
              bus_id: socket.busId!,
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp,
            },
            busInfo.route_id
          );
        }

        const locationData = {
          busId: socket.busId,
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading,
          eta: etaInfo,
          nearStop: nearStopInfo,
        };

        // Broadcast location update to all connected clients
        console.log('📡 Broadcasting location update:', locationData);
        io.emit('bus:locationUpdate', locationData);

        console.log(
          `📡 Broadcasting location update for bus ${socket.busId} to ${io.engine.clientsCount} clients`
        );

        if (nearStopInfo?.is_near_stop) {
          io.emit('bus:arriving', {
            busId: socket.busId,
            routeId: busInfo?.route_id,
            location: [data.longitude, data.latitude],
            timestamp: data.timestamp,
          });
        }

        socket.emit('driver:locationConfirmed', {
          timestamp: data.timestamp,
          locationId: savedLocation.id,
        });

        console.log(
          `📍 Location update from driver ${data.driverId} for bus ${socket.busId}`
        );
      } catch (error) {
        console.error('❌ Location update error:', error);
        socket.emit('error', { 
          message: 'Failed to process location update',
          code: 'PROCESSING_ERROR'
        });
      }
    });

    // Enhanced student connection
    socket.on('student:connect', () => {
      socket.lastActivity = Date.now();
      socket.join('students');
      console.log(`✅ Student connected: ${socket.id}`);
      socket.emit('student:connected', { timestamp: new Date().toISOString() });
    });

    // Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
      activeConnections--;
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason} (Active: ${activeConnections})`);

      // Log additional info for debugging mobile disconnections
      if (reason === 'transport close') {
        console.log(`📱 Mobile client likely disconnected: ${socket.id}`);
      } else if (reason === 'ping timeout') {
        console.log(`⏰ Ping timeout for client: ${socket.id}`);
      } else if (reason === 'transport error') {
        console.log(`🚨 Transport error for client: ${socket.id}`);
      }

      // Clean up authenticated driver
      if (socket.isAuthenticated && socket.driverId) {
        console.log(`🚌 Driver ${socket.driverId} disconnected from bus ${socket.busId}`);
      }
    });

    // Enhanced error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      socket.lastActivity = Date.now();
    });

    // Activity monitoring
    socket.onAny((eventName, ...args) => {
      socket.lastActivity = Date.now();
    });
  });

  // Server-wide monitoring
  setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    
    io.sockets.sockets.forEach((socket: AuthenticatedSocket) => {
      if (socket.lastActivity && (now - socket.lastActivity) > inactiveThreshold) {
        console.log(`⏰ Inactive socket detected: ${socket.id}, last activity: ${new Date(socket.lastActivity).toISOString()}`);
      }
    });
  }, 60000); // Check every minute

  return io;
};
