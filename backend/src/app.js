// app.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import job from './config/cron.js';
import { ENV } from './config/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './db/schema.js';

import { clerkMiddleware } from '@clerk/express';

// Route imports
import authRoutes from './routes/auth.routes.js';
import moodRoutes from './routes/moods.routes.js';
import habitRoutes from './routes/habits.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import goalRoutes from './routes/goals.routes.js';
import meditationRoutes from './routes/meditations.routes.js';
import mindfulnessRoutes from './routes/mindfulness.routes.js';
import chatRoutes from './routes/chat.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import forumRoutes from './routes/forum.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import hotlineRoutes from './routes/hotlines.routes.js';
import suggestionRoutes from './routes/suggestions.routes.js';
import environmentRoutes from './routes/environment.routes.js';

const app = express(); 
app.use(express.json()); 

// CORS configuration
const allowedOrigins = [
  'http://localhost:8081', // For local development
  'http://192.168.1.3:8081', // Example local IP for Expo Go
  'http://192.168.1.6:8081', // Example local IP for Expo Go
  // Add other local IPs as needed for Expo Go development
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or direct API calls)
    if (!origin) {
      return callback(null, true);
    }

    // Allow specific origins for local development
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Expo Go development server origins (e.g., exp://192.168.1.X:19000)
    if (origin.startsWith('exp://')) {
      return callback(null, true);
    }

    // Allow Render.com production URL
    if (ENV.RENDER_EXTERNAL_URL && origin === ENV.RENDER_EXTERNAL_URL) {
      return callback(null, true);
    }

    // For any other origin, deny access
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Important for cookies, authorization headers etc.
};
app.use(cors(corsOptions)); 

// Add a middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// DB setup
const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: ENV.NODE_ENV !== 'production' ? { rejectUnauthorized: false } : undefined, // Required for Neon.tech in development
});
export const db = drizzle(pool, { schema });

app.use(clerkMiddleware({ 
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
    secretKey: ENV.CLERK_SECRET_KEY,
}));

// Routes
app.use('/api/users', authRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/meditations', meditationRoutes);
app.use('/api/mindfulness', mindfulnessRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/emergency-contacts', emergencyRoutes);
app.use('/api/hotlines', hotlineRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/environment', environmentRoutes);

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    error: ENV.NODE_ENV === 'development' ? err : {}, // Send error details only in development
  });
});

// Start the server
const PORT = ENV.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${ENV.NODE_ENV || 'development'} mode`);
});

export default app;
