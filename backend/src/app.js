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
const allowedOrigins = ['http://192.168.1.3:8081', 'http://localhost:8081'];
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
app.use(cors(corsOptions)); 

// Add a middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// DB setup
const pool = new Pool({ connectionString: ENV.DATABASE_URL });
export const db = drizzle(pool, { schema });

app.use(clerkMiddleware({ 
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
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

export default app;
