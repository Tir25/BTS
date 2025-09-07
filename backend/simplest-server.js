const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create Express app
const app = express();

// Apply CORS middleware with maximum permissiveness
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
}));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server with absolute minimal configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true
  },
  // Use polling only - no WebSocket
  transports: ['polling']
});

// Basic routes
app.get('/', (req, res) => {
  res.send('Simplest Socket.IO Test Server');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Send welcome message
  socket.emit('welcome', { 
    message: 'Connected to simplest server',
    timestamp: new Date().toISOString()
  });
  
  // Handle ping
  socket.on('ping', () => {
    console.log(`💓 Ping received from ${socket.id}`);
    socket.emit('pong', { 
      timestamp: new Date().toISOString() 
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = 8080; // Using port 8080 instead of 3000
server.listen(PORT, () => {
  console.log(`🚀 Simplest Socket.IO Test Server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO URL: ws://localhost:${PORT}`);
  console.log(`⚙️ Configuration: Polling transport only, maximum CORS permissiveness`);
});
