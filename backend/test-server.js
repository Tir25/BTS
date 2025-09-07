const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Basic CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Socket.IO with minimal configuration
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Test Socket.IO Server', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Log connection details
  console.log('🔌 Connection details:', {
    socketId: socket.id,
    transport: socket.conn.transport.name,
    headers: socket.handshake.headers,
    query: socket.handshake.query,
    timestamp: new Date().toISOString()
  });

  // Handle student connection
  socket.on('student:connect', () => {
    console.log('📚 Student connected:', socket.id);
    socket.emit('student:connected', { 
      message: 'Student connected successfully',
      timestamp: new Date().toISOString() 
    });
  });

  // Handle ping
  socket.on('ping', () => {
    console.log('💓 Ping received from:', socket.id);
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Add connection error logging
io.engine.on('connection_error', (err) => {
  console.error('❌ WebSocket connection error:', {
    message: err.message,
    context: err.context,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

// Add upgrade logging
io.engine.on('upgrade', (req, socket) => {
  console.log('🔄 WebSocket upgrade attempt:', {
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Add transport logging
io.engine.on('transport', (req, socket) => {
  console.log('🚌 Transport established:', {
    transport: socket.transport.name,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });
});

const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🧪 Test Socket.IO Server Started!');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready on ws://127.0.0.1:${PORT}`);
  console.log('📝 Waiting for connections...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  io.close();
  server.close(() => {
    console.log('✅ Test server stopped');
    process.exit(0);
  });
});
