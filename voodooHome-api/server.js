const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const { initSqlSchema } = require('./models/sqlInit');
const errorHandler = require('./middleware/errorHandler');
const socketio = require('socket.io');
const http = require('http');

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
// Error handler middleware
app.use(errorHandler);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });
  
  socket.on('sendMessage', ({ room, message }) => {
    io.to(room).emit('message', message);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));