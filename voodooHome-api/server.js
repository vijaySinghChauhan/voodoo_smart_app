const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const { initSqlSchema } = require('./models/sqlInit');
const errorHandler = require('./middleware/errorHandler');
const socketio = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./Static/constants');
const axios = require('axios');
const Device = require('./models/Device');

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
  },
  // Align with frontend CHAT_BASE_URL "https://<host>/voodoo" so client hits /voodoo/socket.io
  path: '/voodoo/socket.io'
});
// Expose io to controllers via Express app
app.set('io', io);

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

// Authenticate socket connections using JWT from handshake
io.use((socket, next) => {
  try {
    const bearer = socket.handshake.headers && socket.handshake.headers['authorization'];
    const tokenFromHeader = bearer && bearer.startsWith('Bearer ') ? bearer.substring(7) : undefined;
    const tokenFromAuth = socket.handshake.auth && socket.handshake.auth.token ? socket.handshake.auth.token : undefined;
    const tokenFromQuery = socket.handshake.query && socket.handshake.query.token ? socket.handshake.query.token : undefined;
    const token = tokenFromAuth || tokenFromHeader || tokenFromQuery;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    const secret = process.env.JWT_SECRET || JWT_SECRET || 'fallback_secret';
    const payload = jwt.verify(token, secret);
    socket.user = { id: payload.id };
    return next();
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  // Track polling timers per socket
  const timers = new Map();
  const lastValues = new Map();
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });
  
  socket.on('sendMessage', ({ room, message }) => {
    // Optionally enrich with server-side timestamp/user id
    const enriched = {
      ...message,
      timestamp: message.timestamp || new Date(),
      senderId: socket.user?.id
    };
    io.to(room).emit('message', enriched);
  });

  // Brightness subscription: client provides deviceId and ip (SoftAP or LAN)
  socket.on('brightness:subscribe', ({ deviceId, ip }) => {
    if (!ip) {
      socket.emit('brightness:error', { deviceId, error: 'Missing device IP' });
      // Continue with DB-based updates even without device IP
    }
    // Clear any existing timer for this deviceId on this socket
    const key = `b:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
    }
    // Join device-specific room
    socket.join(`device:${deviceId}`);
    // If IP is provided, poll device for brightness
    if (ip) {
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
          const last = lastValues.get(key);
          if (last !== value) {
            lastValues.set(key, value);
            io.to(`device:${deviceId}`).emit('brightness:update', { deviceId, value });
          }
        } catch (err) {
          socket.emit('brightness:error', { deviceId, error: err.message });
        }
      }, 2000);
      timers.set(key, interval);
    }
    socket.emit('brightness:subscribed', { deviceId });

    // Poll DB for changes to brightness and broadcast updates
    const dbKey = `bd:${deviceId}`;
    if (timers.has(dbKey)) {
      clearInterval(timers.get(dbKey));
      timers.delete(dbKey);
    }
    const dbInterval = setInterval(async () => {
      try {
        const dev = await Device.findById(deviceId);
        if (dev && typeof dev.brightness === 'number') {
          const dbValue = Math.max(0, Math.min(100, dev.brightness));
          const lastDb = lastValues.get(dbKey);
          if (lastDb !== dbValue) {
            lastValues.set(dbKey, dbValue);
            io.to(`device:${deviceId}`).emit('brightness:update', { deviceId, value: dbValue });
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    timers.set(dbKey, dbInterval);
  });

  socket.on('brightness:unsubscribe', ({ deviceId }) => {
    const key = `b:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
      socket.emit('brightness:unsubscribed', { deviceId });
    }
    const dbKey = `bd:${deviceId}`;
    if (timers.has(dbKey)) {
      clearInterval(timers.get(dbKey));
      timers.delete(dbKey);
    }
  });

  // Flow subscription: broadcast flowRate and totalLiters from DB
  socket.on('flow:subscribe', ({ deviceId }) => {
    const key = `f:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
    }
    socket.join(`device:${deviceId}`);
    const interval = setInterval(async () => {
      try {
        const dev = await Device.findById(deviceId);
        if (dev) {
          const flowRate = typeof dev.flowRate === 'number' ? dev.flowRate : 0;
          const totalLiters = typeof dev.totalLiters === 'number' ? dev.totalLiters : 0;
          const payload = `${flowRate}:${totalLiters}`;
          const last = lastValues.get(key);
          if (last !== payload) {
            lastValues.set(key, payload);
            io.to(`device:${deviceId}`).emit('flow:update', { deviceId, flowRate, totalLiters });
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    timers.set(key, interval);
    socket.emit('flow:subscribed', { deviceId });
  });

  socket.on('flow:unsubscribe', ({ deviceId }) => {
    const key = `f:${deviceId}`;
    if (timers.has(key)) {
      clearInterval(timers.get(key));
      timers.delete(key);
      socket.emit('flow:unsubscribed', { deviceId });
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
