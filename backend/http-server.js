const express = require('express');
const http = require('http');
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

// Basic routes
app.get('/', (req, res) => {
  res.send('HTTP Test Server');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint successful', 
    timestamp: new Date().toISOString(),
    headers: req.headers,
    ip: req.ip
  });
});

// Start server - listen on all interfaces
const PORT = 8000; // Using port 8000
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTP Test Server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Server URL: http://127.0.0.1:${PORT}`);
  console.log(`⚙️ Configuration: HTTP only, maximum CORS permissiveness, listening on all interfaces`);
});
