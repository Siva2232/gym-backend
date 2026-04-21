import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import trainerRoutes from './routes/trainer.js';
import customerRoutes from './routes/customer.js';
import dietRoutes from './routes/diet.js';
import workoutRoutes from './routes/workout.js';
import progressRoutes from './routes/progress.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach io to every request
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Socket.io Connection Handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('send_message', (data) => {
    io.to(data.receiverId).emit('receive_message', {
      ...data,
      timestamp: new Date(),
    });
  });

  socket.on('mark_notification_read', ({ notificationId, userId }) => {
    io.to(userId).emit('notification_read', notificationId);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'Gym SaaS API Running' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
});

export { io };
