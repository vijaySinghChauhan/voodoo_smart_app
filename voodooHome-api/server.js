const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const { initSqlSchema } = require('./models/sqlInit');
const errorHandler = require('./middleware/errorHandler');
const socketio = require('socket.io');
const http = require('http');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Connect to database
connectDB();

// Initialize SQL tables
initSqlSchema().catch(err => {
  console.error('Failed to initialize SQL schema:', err);
});

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Define routes
app.use('/voodoo/api/auth', require('./routes/auth'));
app.use('/voodoo/api/devices', require('./routes/devices'));
app.use('/voodoo/api/rooms', require('./routes/rooms'));
app.use('/voodoo/api/products', require('./routes/products'));
app.use('/voodoo/api/chat', require('./routes/chat'));
app.use('/voodoo/api/help', require('./routes/help'));
app.use('/voodoo/api/health', require('./routes/health'));
app.use('/voodoo/api/orders', require('./routes/orders'));
app.use('/voodoo/api/addresses', require('./routes/addresses'));
app.use('/voodoo/api/payments', require('./routes/payments'));
app.use('/voodoo/api/phonepe', require('./routes/phonepe'));
// Error handler middleware
app.use(errorHandler);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  // Track polling timers per socket
  const timers = new Map();
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });
  
  socket.on('sendMessage', ({ room, message }) => {
    io.to(room).emit('message', message);
  });

  // Brightness subscription: client provides deviceId and ip (SoftAP or LAN)
  socket.on('brightness:subscribe', ({ deviceId, ip }) => {
    if (!ip) {
      socket.emit('brightness:error', { deviceId, error: 'Missing device IP' });
      return;
    }
    // Clear any existing timer for this deviceId on this socket
    const key = `b:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
    }
    // Poll device every 2s for brightness-like data (e.g., /getdata)
    const baseUrl = `http://${ip}`;
    const interval = setInterval(async () => {
      try {
        const resp = await axios.get(`${baseUrl}/getdata`, { timeout: 4000 });
        let value = resp.data;
        // Normalize numeric brightness 0-100
        if (typeof value === 'string') {
          const num = parseFloat(value);
          if (!isNaN(num)) value = num;
        }
        if (typeof value === 'number') {
          value = Math.max(0, Math.min(100, value));
        }
        socket.emit('brightness:update', { deviceId, value });
      } catch (err) {
        socket.emit('brightness:error', { deviceId, error: err.message });
      }
    }, 2000);
    timers.set(key, interval);
    socket.emit('brightness:subscribed', { deviceId });
  });

  socket.on('brightness:unsubscribe', ({ deviceId }) => {
    const key = `b:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
      socket.emit('brightness:unsubscribed', { deviceId });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Clear all timers for this socket
    for (const [, t] of timers) clearInterval(t);
    timers.clear();
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));