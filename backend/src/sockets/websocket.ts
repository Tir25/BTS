import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import {
  saveLocationUpdate,
  getDriverBusInfo,
} from '../services/locationService';
import { RouteService } from '../services/routeService';
import { validateLocationData } from '../utils/validation';

// Connection tracking for monitoring and cleanup
const activeConnections = new Map<string, {
  driverId?: string;
  busId?: string;
  connectedAt: Date;
  lastActivity: Date;
}>();

// Rate limiting for authentication attempts
const authRateLimit = new Map<string, number>();
const AUTH_RATE_LIMIT_WINDOW = 5000; // 5 seconds between attempts
const AUTH_TIMEOUT = 10000; // 10 seconds timeout for auth calls

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
}

export const initializeWebSocket = (io: SocketIOServer) => {
  console.log('🔌 WebSocket server initialized');

  // Configure Socket.IO for better mobile support
  io.engine.opts.pingTimeout = 60000; // 60 seconds
  io.engine.opts.pingInterval = 25000; // 25 seconds
  io.engine.opts.upgradeTimeout = 10000; // 10 seconds
  io.engine.opts.maxHttpBufferSize = 1e6; // 1MB

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Track connection
    activeConnections.set(socket.id, {
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    // Set socket options for better mobile support
    socket.conn.on('packet', ({ type }) => {
      if (type === 'pong') {
        console.log(`💓 Pong received from ${socket.id}`);
        // Update last activity
        const connection = activeConnections.get(socket.id);
        if (connection) {
          connection.lastActivity = new Date();
        }
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      console.log(`💓 Ping received from ${socket.id}`);
    });

    socket.on('driver:authenticate', async (data: { token: string }) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('error', { message: 'Authentication token required' });
          return;
        }

        // Rate limiting check
        const clientId = socket.handshake.address;
        const now = Date.now();
        const lastAttempt = authRateLimit.get(clientId) || 0;
        
        if (now - lastAttempt < AUTH_RATE_LIMIT_WINDOW) {
          socket.emit('error', { message: 'Too many authentication attempts. Please wait 5 seconds.' });
          return;
        }
        
        authRateLimit.set(clientId, now);

        // Add timeout for Supabase auth call
        const authPromise = supabaseAdmin.auth.getUser(token);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout')), AUTH_TIMEOUT)
        );
        
        const {
          data: { user },
          error,
        } = await Promise.race([authPromise, timeoutPromise]);

        if (error || !user) {
          socket.emit('error', { message: 'Invalid authentication token' });
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
          socket.emit('error', {
            message: 'Access denied. Driver role required.',
          });
          return;
        }

        const busInfo = await getDriverBusInfo(user.id);
        console.log('🚌 Bus info for driver:', user.id, ':', busInfo);

        if (!busInfo) {
          console.log('❌ No bus assigned to driver:', user.id);
          socket.emit('error', { message: 'No bus assigned to driver' });
          return;
        }

        socket.driverId = user.id;
        socket.busId = busInfo.bus_id;

        // Update connection tracking
        const connection = activeConnections.get(socket.id);
        if (connection) {
          connection.driverId = user.id;
          connection.busId = busInfo.bus_id;
          connection.lastActivity = new Date();
        }

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
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    socket.on('driver:locationUpdate', async (data: LocationUpdate) => {
      try {
        // Update last activity
        const connection = activeConnections.get(socket.id);
        if (connection) {
          connection.lastActivity = new Date();
        }

        console.log('📍 Received location update from driver:', {
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          socketDriverId: socket.driverId,
          socketBusId: socket.busId,
        });

        if (!socket.driverId || !socket.busId) {
          socket.emit('error', { message: 'Driver not authenticated' });
          return;
        }

        const validationError = validateLocationData(data);
        if (validationError) {
          socket.emit('error', { message: validationError });
          return;
        }

        if (data.driverId !== socket.driverId) {
          socket.emit('error', { message: 'Unauthorized location update' });
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
          socket.emit('error', { message: 'Failed to save location update' });
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
        socket.emit('error', { message: 'Failed to process location update' });
      }
    });

    socket.on('student:connect', () => {
      socket.join('students');
      console.log(`✅ Student connected: ${socket.id}`);
      socket.emit('student:connected', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);

      // Cleanup connection tracking
      const connection = activeConnections.get(socket.id);
      if (connection) {
        console.log(`🧹 Cleaning up connection for driver: ${connection.driverId}, bus: ${connection.busId}`);
        activeConnections.delete(socket.id);
      }

      // Leave specific rooms if they exist
      if (connection?.driverId) {
        socket.leave(`driver:${connection.driverId}`);
      }
      if (connection?.busId) {
        socket.leave(`bus:${connection.busId}`);
      }
      socket.leave('students');

      // Log additional info for debugging mobile disconnections
      if (reason === 'transport close') {
        console.log(`📱 Mobile client likely disconnected: ${socket.id}`);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  // Add periodic health check for inactive connections
  setInterval(() => {
    const now = new Date();
    activeConnections.forEach((connection, socketId) => {
      const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
      if (timeSinceActivity > 300000) { // 5 minutes of inactivity
        console.log(`⚠️ Inactive connection detected: ${socketId}`);
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    });
  }, 60000); // Check every minute

  return io;
};
