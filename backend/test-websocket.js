const io = require('socket.io-client');

console.log('🔌 Testing WebSocket connection...');

// Connect to the WebSocket server
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  timeout: 5000
});

// Test connection
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('🆔 Socket ID:', socket.id);
  
  // Test authentication
  console.log('🔐 Testing authentication...');
  socket.emit('auth:login', {
    email: 'john.smith@university.edu',
    password: 'test123'
  });
});

// Listen for authentication response
socket.on('auth:response', (data) => {
  console.log('🔐 Authentication response:', data);
  
  if (data.success) {
    // Test location update
    console.log('📍 Testing location update...');
    socket.emit('driver:locationUpdate', {
      latitude: 23.0225,
      longitude: 72.5714,
      speed: 25.5,
      heading: 90.0,
      timestamp: new Date().toISOString()
    });
  }
});

// Listen for location broadcast
socket.on('bus:locationUpdate', (data) => {
  console.log('📍 Received location update:', data);
});

// Listen for errors
socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Listen for disconnect
socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Test timeout
setTimeout(() => {
  console.log('⏰ Test completed');
  socket.disconnect();
  process.exit(0);
}, 10000);
