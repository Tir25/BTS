import { Server as SocketIOServer, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import { saveLocationUpdate, getDriverBusInfo } from '../services/locationService';
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
}

export const initializeWebSocket = (io: SocketIOServer) => {
  console.log('🔌 WebSocket server initialized');

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Handle driver authentication
    socket.on('driver:authenticate', async (data: { token: string }) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('error', { message: 'Authentication token required' });
          return;
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (error || !user) {
          socket.emit('error', { message: 'Invalid authentication token' });
          return;
        }

        // Check if user is a driver
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role, driver_id')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'driver') {
          socket.emit('error', { message: 'Access denied. Driver role required.' });
          return;
        }

        // Get driver's assigned bus info
        const busInfo = await getDriverBusInfo(profile.driver_id);
        if (!busInfo) {
          socket.emit('error', { message: 'No bus assigned to driver' });
          return;
        }

        // Store driver info in socket
        socket.driverId = profile.driver_id;
        socket.busId = busInfo.bus_id;

        // Join driver to their specific room
        socket.join(`driver:${profile.driver_id}`);
        socket.join(`bus:${busInfo.bus_id}`);

        console.log(`✅ Driver ${profile.driver_id} authenticated and assigned to bus ${busInfo.bus_id}`);

        // Send bus info to driver
        socket.emit('driver:authenticated', {
          driverId: profile.driver_id,
          busId: busInfo.bus_id,
          busInfo: busInfo
        });

        // Notify admin about driver connection
        io.to('admin').emit('driver:connected', {
          driverId: profile.driver_id,
          busId: busInfo.bus_id,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Handle location updates from drivers
    socket.on('driver:locationUpdate', async (data: LocationUpdate) => {
      try {
        // Validate driver is authenticated
        if (!socket.driverId || !socket.busId) {
          socket.emit('error', { message: 'Driver not authenticated' });
          return;
        }

        // Validate location data
        const validationError = validateLocationData(data);
        if (validationError) {
          socket.emit('error', { message: validationError });
          return;
        }

        // Ensure driver can only send updates for their assigned bus
        if (data.driverId !== socket.driverId) {
          socket.emit('error', { message: 'Unauthorized location update' });
          return;
        }

        // Save location to database
        const savedLocation = await saveLocationUpdate({
          driverId: data.driverId,
          busId: socket.busId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading
        });

        if (!savedLocation) {
          socket.emit('error', { message: 'Failed to save location update' });
          return;
        }

        // Get bus route information for ETA calculation
        const busInfo = await getDriverBusInfo(data.driverId);
        let etaInfo = null;
        let nearStopInfo = null;

        if (busInfo && busInfo.route_id) {
          // Calculate ETA
          etaInfo = await RouteService.calculateETA({
            bus_id: socket.busId!,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp
          }, busInfo.route_id);

          // Check if bus is near a stop
          nearStopInfo = await RouteService.checkBusNearStop({
            bus_id: socket.busId!,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp
          }, busInfo.route_id);
        }

        // Broadcast location update to all connected clients
        const locationData = {
          busId: socket.busId,
          driverId: data.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
          speed: data.speed,
          heading: data.heading,
          eta: etaInfo,
          nearStop: nearStopInfo
        };

        // Broadcast to admin panel and student map
        io.emit('bus:locationUpdate', locationData);

        // If bus is near a stop, emit special event
        if (nearStopInfo && nearStopInfo.is_near_stop) {
          io.emit('bus:arriving', {
            busId: socket.busId,
            routeId: busInfo?.route_id,
            location: [data.longitude, data.latitude],
            timestamp: data.timestamp
          });
        }

        // Send confirmation to driver
        socket.emit('driver:locationConfirmed', {
          timestamp: data.timestamp,
          locationId: savedLocation.id
        });

        console.log(`📍 Location update from driver ${data.driverId} for bus ${socket.busId}`);

      } catch (error) {
        console.error('❌ Location update error:', error);
        socket.emit('error', { message: 'Failed to process location update' });
      }
    });

    // Handle admin authentication
    socket.on('admin:authenticate', async (data: { token: string }) => {
      try {
        const { token } = data;
        
        if (!token) {
          socket.emit('error', { message: 'Authentication token required' });
          return;
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (error || !user) {
          socket.emit('error', { message: 'Invalid authentication token' });
          return;
        }

        // Check if user is an admin
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          socket.emit('error', { message: 'Access denied. Admin role required.' });
          return;
        }

        // Join admin room
        socket.join('admin');

        console.log(`✅ Admin ${user.id} authenticated`);

        // Send confirmation to admin
        socket.emit('admin:authenticated', {
          adminId: user.id,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Admin authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Handle student/faculty connection (no authentication required for viewing)
    socket.on('student:connect', () => {
      socket.join('students');
      console.log(`✅ Student connected: ${socket.id}`);
      socket.emit('student:connected', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // If it was a driver, notify admin about disconnection
      if (socket.driverId && socket.busId) {
        io.to('admin').emit('driver:disconnected', {
          driverId: socket.driverId,
          busId: socket.busId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  return io;
};
