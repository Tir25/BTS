const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
}));

// Create Socket.IO server with very permissive CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  // Disable WebSocket compression which can cause issues in Firefox
  perMessageDeflate: false,
  // WebSocket only, no polling
  transports: ['websocket'],
  // Additional settings for compatibility
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6
});

// Basic routes
app.get('/', (req, res) => {
  res.send('Minimal Socket.IO Test Server');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Raw WebSocket handler for direct WebSocket testing
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/raw-websocket') {
    console.log('🔌 Raw WebSocket connection request received');
    
    // Accept the WebSocket connection
    const ws = new (require('ws')).WebSocket(null);
    ws.setSocket(socket, head, {
      maxPayload: 1024 * 1024, // 1MB
      skipUTF8Validation: false
    });
    
    // Handle WebSocket events
    ws.on('open', () => {
      console.log('✅ Raw WebSocket connection opened');
    });
    
    ws.on('message', (data) => {
      console.log(`📩 Raw WebSocket message received: ${data}`);
      // Echo the message back
      ws.send(JSON.stringify({
        type: 'echo',
        message: JSON.parse(data.toString()),
        timestamp: new Date().toISOString()
      }));
    });
    
    ws.on('close', (code, reason) => {
      console.log(`❌ Raw WebSocket connection closed: ${code} - ${reason}`);
    });
    
    ws.on('error', (error) => {
      console.error(`❌ Raw WebSocket error:`, error);
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Log connection details
  console.log('🔍 Connection details:', {
    id: socket.id,
    transport: socket.conn.transport.name,
    headers: socket.handshake.headers,
    query: socket.handshake.query,
    timestamp: new Date().toISOString()
  });

  // Handle ping event
  socket.on('ping', () => {
    console.log(`💓 Ping received from: ${socket.id}`);
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Handle student connection
  socket.on('student:connect', (data) => {
    console.log(`📚 Student connected: ${socket.id}`, data);
    socket.emit('student:connected', { timestamp: new Date().toISOString() });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Minimal Socket.IO Test Server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  io.close();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
